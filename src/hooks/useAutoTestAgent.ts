import { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useGameActions } from './useGameActions';
import {
  canPurchaseOpportunity,
  checkBankruptcy,
  getHighestPriorityDebt,
  getMonthlyCashFlow,
  getSellableAssets,
  isStockLotAsset,
  previewRepayment,
  stockLotBuyCost,
  calcCurrentStockPrice,
} from '../utils/financial';
import type { AssetType, Card, Player } from '../types/game';

const DEFENSIVE_SECTORS = new Set(['金融', '公用事业', '消费', '利率债', '贵金属']);
const GROWTH_SECTORS = new Set(['科技', '新能源', '先进制造']);

function isCrisisEvent(card: Card): boolean {
  if (card.type !== 'market') return false;
  const id = card.id;
  return id.includes('crisis') || id.includes('recession') || id.includes('crackdown');
}

function shouldBuyOpportunity(
  player: Player,
  card: Card,
  marketMultiplier: Record<AssetType, number>,
  sectorMultiplier: Record<string, number>,
  recentCrisis: boolean,
  recentGrowth: boolean
): boolean {
  if (card.type !== 'opportunity') return false;

  const gate = canPurchaseOpportunity(player, card, marketMultiplier, sectorMultiplier);
  if (!gate.allowed) return false;

  const asset = card.asset;
  const sector = asset.metadata?.sector;
  const isStock = isStockLotAsset(asset);
  const roi = isStock
    ? (asset.yearDivPerShare ?? 0) * 100 / Math.max(asset.singlePrice ?? 1, 0.01) / 12
    : asset.downPayment > 0
      ? asset.cashFlow / asset.downPayment
      : 0;

  const yearsToRetire =
    player.retireStandardAge != null ? player.retireStandardAge - player.age : 99;
  const nearRetirement = player.age >= 45 || yearsToRetire <= 10;
  if (nearRetirement) {
    const passiveTypes = new Set(['realEstate', 'reit', 'bond', 'stock']);
    if (passiveTypes.has(asset.type) && asset.cashFlow > 0) return true;
    if (asset.type === 'business' && roi < 0.03) return false;
  }

  if (isStock && player.cash >= stockLotBuyCost(1, asset.singlePrice ?? 0)) {
    return roi > 0.003;
  }

  if (recentCrisis) {
    if (asset.type === 'bond' || asset.type === 'commodity') return true;
    if (sector && DEFENSIVE_SECTORS.has(sector)) return roi > 0.01;
    if (sector && GROWTH_SECTORS.has(sector)) return false;
  }

  if (recentGrowth && sector && GROWTH_SECTORS.has(sector)) return true;

  if (sector && DEFENSIVE_SECTORS.has(sector)) return roi > 0.02;
  if (asset.type === 'bond' || asset.type === 'reit') return roi > 0.02;
  return roi > 0.05;
}

function shouldSellInCrisis(player: Player, card: Card): boolean {
  if (card.type !== 'market' || card.effect.type !== 'buyout') return false;
  if (!isCrisisEvent(card)) return true;
  const targetType = card.effect.targetAssetType;
  const sellable = targetType
    ? player.assets.filter((a) => a.type === targetType && !a.isSelfLiving)
    : player.assets.filter((a) => !a.isSelfLiving);
  const growthAssets = sellable.filter((a) => a.metadata?.sector && GROWTH_SECTORS.has(a.metadata.sector));
  return growthAssets.length > 0 ? Math.random() > 0.3 : sellable.length > 0;
}

/** 【新增】v3.3 自动测试 Agent：testMode 下自动推进全部玩家回合 */
export function useAutoTestAgent() {
  const { state } = useGame();
  const actions = useGameActions();
  const player = state.players[state.currentPlayerIndex];

  useEffect(() => {
    if (!state.testMode || state.testStopped || state.phase === 'SETUP') return;
    if (state.phase === 'GAME_OVER') return;
    if (!player) return;
    if (player.isBankrupt) {
      if (state.phase === 'TURN_END') {
        actions.endTurn();
      } else if (state.phase === 'CARD_DECISION') {
        actions.declineCard();
      }
      return;
    }

    const timer = setTimeout(() => {
      if (state.phase === 'ROLLING' || state.phase === 'FAST_TRACK') {
        actions.rollAndMove(player.isInFastTrack, player.charityTurns > 0);
      } else if (state.phase === 'CARD_DECISION') {
        const space = state.spaces[player.position];
        const card = state.currentCard;

        if (state.pendingLiquidation) {
          const sellable = getSellableAssets(player);
          if (sellable.length > 0) {
            actions.liquidateAsset(sellable[0].id, false);
          }
          return;
        }

        if (state.pendingCashFlowSettlement) {
          actions.confirmCashFlowSettlement();
          return;
        }

        if (state.pendingLifeEvent === 'retirement') {
          actions.confirmRetirement();
        } else if (state.pendingDivorce) {
          // 能负担折价款则保留房产，否则卖房分割
          const totalSpouseShare = state.pendingDivorce.maritalAssets.reduce((s, a) => s + a.spouseShare, 0);
          const canAfford = player.cash >= totalSpouseShare + state.pendingDivorce.cashToSpouse + state.pendingDivorce.legalFees;
          actions.confirmDivorce(canAfford);
        } else if (space.type === 'settlement' && state.pendingSettlement) {
          actions.confirmSettlement();
        } else if (space.type === 'promotion' && state.careerEvent) {
          const event = state.careerEvent;
          if (event.type === 'jobHop') {
            actions.choosePromotion(true, player.cash > player.salary * 2 ? 'highPay' : 'stable');
          } else if (event.type === 'promotion') {
            const cost = event.cost ?? 0;
            actions.choosePromotion(player.cash >= cost || player.cash + player.salary >= cost);
          } else if (event.type === 'careerChange') {
            actions.choosePromotion(player.cash > player.salary);
          } else {
            actions.choosePromotion(true);
          }
        } else if (space.type === 'charity') {
          actions.donateCharity(false);
        } else if (space.type === 'family') {
          if (player.marriageStatus === 'ineligible') {
            actions.declineCard();
          } else if (player.marriageStatus === 'married') {
            // 已婚 → 育儿逻辑
            if (player.hasPregnancy) {
              actions.choosePregnancyPath('postpone');
            } else if (player.children < 3 && getMonthlyCashFlow(player, state.cashFlowMultiplier, state.sectorMultiplier) > player.expenses.perChild * 4) {
              actions.choosePregnancyPath('plan');
            } else {
              actions.choosePregnancyPath('postpone');
            }
          } else {
            // 单身/离异 → 结婚/再婚逻辑
            const cashFlow = getMonthlyCashFlow(player, state.cashFlowMultiplier, state.sectorMultiplier);
            actions.chooseMarriage(cashFlow > 2000);
          }
        } else if (card?.type === 'opportunity') {
          const recentLogs = state.logs.slice(-5).map((l) => l.message).join(' ');
          const recentCrisis = /金融危机|股灾|衰退|整改/.test(recentLogs);
          const recentGrowth = /AI 产业|算力|新质生产力|科技行业/.test(recentLogs);
          const buy = shouldBuyOpportunity(
            player,
            card,
            state.marketMultiplier,
            state.sectorMultiplier,
            recentCrisis,
            recentGrowth
          );

          if (buy) {
            const oppAsset = card.asset;
            const lots = isStockLotAsset(oppAsset)
              ? Math.min(5, Math.max(1, Math.floor(player.cash / stockLotBuyCost(1, oppAsset.singlePrice ?? 1))))
              : undefined;
            if (space.type === 'market') {
              actions.buyDiscountedAsset(lots);
            } else {
              actions.buyAsset(lots);
            }
          } else {
            actions.declineCard();
          }
        } else if (card?.type === 'doodad') {
          actions.payDoodad();
        } else if (card?.type === 'market') {
          const effect = card.effect;
          if (effect.type === 'buyout') {
            const targetType = effect.targetAssetType;
            const sellable = targetType
              ? player.assets.filter((a) => a.type === targetType)
              : player.assets;
            if (sellable.length > 0 && shouldSellInCrisis(player, card)) {
              const worst = sellable.reduce((prev, curr) =>
                curr.cashFlow / Math.max(curr.downPayment, 1) < prev.cashFlow / Math.max(prev.downPayment, 1)
                  ? curr
                  : prev
              );
              actions.sellAsset(worst.id, effect.multiplier || 1);
            } else {
              actions.declineCard();
            }
          } else if (effect.type === 'discount') {
            actions.drawDiscountedOpportunity();
          } else {
            actions.applyMarketEffect();
          }
        } else {
          actions.declineCard();
        }
      } else if (state.phase === 'TURN_END') {
        if (player.cash < 0 && !checkBankruptcy(player, state.cashFlowMultiplier, state.sectorMultiplier)) {
          const sellable = getSellableAssets(player);
          if (sellable.length > 0) {
            actions.liquidateAsset(sellable[0].id, false);
            return;
          }
          actions.takeLoan(Math.abs(player.cash) + 1000);
          return;
        }

        // 【新增】v3.6 AI 偶尔卖出严重高估股票
        const overvaluedStock = player.assets.find((a) => {
          if (!isStockLotAsset(a) || a.basePe == null) return false;
          const currentPrice = calcCurrentStockPrice(a);
          const fairValue = a.intrinsicPrice ?? 0;
          if (fairValue <= 0) return false;
          const priceRatio = currentPrice / fairValue;
          return priceRatio > 1.1 && (a.shareHand ?? 0) >= 1;
        });
        if (overvaluedStock && Math.random() < 0.4) {
          const sellHand = Math.ceil((overvaluedStock.shareHand ?? 0) * 0.5);
          actions.sellStockManually(overvaluedStock.id, sellHand);
          return;
        }

        const cashFlow = getMonthlyCashFlow(player, state.cashFlowMultiplier, state.sectorMultiplier);
        const targetDebt = getHighestPriorityDebt(player);
        const repaidThisTurn = state.logs.length > 0 && state.logs[state.logs.length - 1].type === 'repay';
        if (
          !repaidThisTurn &&
          targetDebt &&
          cashFlow > 500 &&
          player.cash > player.salary * 0.5 &&
          player.liabilities.length > 0
        ) {
          const repayAmount = Math.min(
            targetDebt.principal,
            Math.max(1000, Math.floor(player.cash * 0.25))
          );
          const preview = previewRepayment(targetDebt, repayAmount);
          if (preview.totalCost <= player.cash && preview.repayAmount > 0) {
            actions.repayLiability(targetDebt.id, preview.repayAmount);
            actions.endTurn();
            return;
          }
        }

        actions.endTurn();
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [state, player, actions]);
}
