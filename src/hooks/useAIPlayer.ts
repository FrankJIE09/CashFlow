import { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useGameActions } from './useGameActions';
import {
  canAffordDownPayment,
  canPurchaseOpportunity,
  checkBankruptcy,
  getHighestPriorityDebt,
  getMonthlyCashFlow,
  previewRepayment,
} from '../utils/financial';
import type { AssetType, Card, Player } from '../types/game';

const DEFENSIVE_SECTORS = new Set(['金融', '公用事业', '消费', '利率债', '贵金属']);
const GROWTH_SECTORS = new Set(['科技', '新能源', '先进制造']);

function isCrisisEvent(card: Card): boolean {
  if (card.type !== 'market') return false;
  const id = card.id;
  return id.includes('crisis') || id.includes('recession') || id.includes('crackdown');
}

function isGrowthEvent(card: Card): boolean {
  if (card.type !== 'market') return false;
  const id = card.id;
  return id.includes('ai_boom') || id.includes('new_quality') || id.includes('tech_boom');
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
  const roi = asset.downPayment > 0 ? asset.cashFlow / asset.downPayment : 0;

  if (recentCrisis) {
    if (asset.type === 'bond' || asset.type === 'commodity') return true;
    if (sector && DEFENSIVE_SECTORS.has(sector)) return roi > 0.01;
    if (sector && GROWTH_SECTORS.has(sector)) return false;
  }

  if (recentGrowth && sector && GROWTH_SECTORS.has(sector)) return true;

  if (player.difficulty === 'hard') {
    if (sector && DEFENSIVE_SECTORS.has(sector)) return roi > 0.02;
    if (asset.type === 'bond' || asset.type === 'reit') return roi > 0.02;
    return roi > 0.05;
  }

  if (player.difficulty === 'medium') {
    if (sector && DEFENSIVE_SECTORS.has(sector)) return asset.cashFlow >= 0;
    if (asset.type === 'bond') return asset.cashFlow > 0;
    return asset.cashFlow > 0 && canAffordDownPayment(player, asset);
  }

  if (sector && GROWTH_SECTORS.has(sector)) return Math.random() > 0.4;
  return Math.random() > 0.7;
}

function shouldSellInCrisis(player: Player, card: Card): boolean {
  if (card.type !== 'market' || card.effect.type !== 'buyout') return false;
  if (!isCrisisEvent(card)) return true;
  const targetType = card.effect.targetAssetType;
  const sellable = targetType ? player.assets.filter((a) => a.type === targetType) : player.assets;
  const growthAssets = sellable.filter((a) => a.metadata?.sector && GROWTH_SECTORS.has(a.metadata.sector));
  return growthAssets.length > 0 ? Math.random() > 0.3 : sellable.length > 0;
}

export function useAIPlayer() {
  const { state } = useGame();
  const actions = useGameActions();
  const player = state.players[state.currentPlayerIndex];

  useEffect(() => {
    if (!player || !player.isAI || player.isBankrupt) return;

    const timer = setTimeout(() => {
      if (state.phase === 'ROLLING' || state.phase === 'FAST_TRACK') {
        actions.rollAndMove(player.isInFastTrack, player.charityTurns > 0);
      } else if (state.phase === 'CARD_DECISION') {
        const space = state.spaces[player.position];
        const card = state.currentCard;

        if (space.type === 'charity') {
          actions.donateCharity(player.difficulty === 'hard' && player.cash > player.salary * 2);
        } else if (space.type === 'baby') {
          const cashFlow = getMonthlyCashFlow(player, state.cashFlowMultiplier, state.sectorMultiplier);
          const wantBaby =
            player.children < 3 &&
            (player.difficulty === 'easy'
              ? Math.random() > 0.6
              : cashFlow > player.expenses.perChild * 3);
          actions.chooseBaby(wantBaby);
        } else if (card?.type === 'opportunity') {
          const recentLogs = state.logs.slice(-5).map((l) => l.message).join(' ');
          const recentCrisis = /金融危机|股灾|衰退|整改/.test(recentLogs);
          const recentGrowth = /AI 产业|算力|新质生产力|科技行业/.test(recentLogs);
          let buy = shouldBuyOpportunity(
            player,
            card,
            state.marketMultiplier,
            state.sectorMultiplier,
            recentCrisis,
            recentGrowth
          );

          if (buy) {
            if (space.type === 'market') {
              actions.buyDiscountedAsset();
            } else {
              actions.buyAsset();
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
            if (isGrowthEvent(card) || Math.random() > 0.4) {
              actions.drawDiscountedOpportunity();
            } else {
              actions.declineCard();
            }
          } else {
            actions.applyMarketEffect();
          }
        } else {
          actions.declineCard();
        }
      } else if (state.phase === 'TURN_END') {
        if (player.cash < 0 && !checkBankruptcy(player, state.cashFlowMultiplier, state.sectorMultiplier)) {
          actions.takeLoan(Math.abs(player.cash) + 1000);
          return;
        }

        const cashFlow = getMonthlyCashFlow(player, state.cashFlowMultiplier, state.sectorMultiplier);
        const targetDebt = getHighestPriorityDebt(player);
        if (
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
            return;
          }
        }

        actions.endTurn();
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [state, player, actions]);
}
