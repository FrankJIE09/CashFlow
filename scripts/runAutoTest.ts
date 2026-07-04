/**
 * Headless auto-test runner — mirrors useAutoTestAgent decisions via gameReducer.
 * Usage: npx tsx scripts/runAutoTest.ts [rounds]
 */
import { gameReducer, getInitialGameState } from '../src/context/GameReducer.ts';
import type { AssetType, Card, GameAction, GameState, Player } from '../src/types/game.ts';
import {
  canPurchaseOpportunity,
  checkBankruptcy,
  getHighestPriorityDebt,
  getMonthlyCashFlow,
  isStockLotAsset,
  previewRepayment,
  stockLotBuyCost,
} from '../src/utils/financial.ts';
import { rollDice, rollTwoDice } from '../src/utils/random.ts';

const DEFENSIVE_SECTORS = new Set(['金融', '公用事业', '消费', '利率债', '贵金属']);
const GROWTH_SECTORS = new Set(['科技', '新能源', '先进制造']);

function dispatch(state: GameState, action: GameAction): GameState {
  return gameReducer(state, action);
}

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
    ? ((asset.yearDivPerShare ?? 0) * 100) / Math.max(asset.singlePrice ?? 1, 0.01) / 12
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
  const sellable = targetType ? player.assets.filter((a) => a.type === targetType) : player.assets;
  const growthAssets = sellable.filter(
    (a) => a.metadata?.sector && GROWTH_SECTORS.has(a.metadata.sector)
  );
  return growthAssets.length > 0 ? Math.random() > 0.3 : sellable.length > 0;
}

function rollAndMove(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];
  let dice: number;
  if (player.isInFastTrack || player.charityTurns > 0) {
    const [d1, d2] = rollTwoDice();
    dice = Math.max(d1, d2);
  } else {
    dice = rollDice();
  }
  let next = dispatch(state, { type: 'ROLL_DICE', payload: { dice } });
  next = dispatch(next, { type: 'MOVE_PLAYER' });
  return next;
}

function autoStep(state: GameState): GameState {
  if (!state.testMode || state.testStopped || state.phase === 'SETUP') return state;
  if (state.phase === 'GAME_OVER') return state;

  const player = state.players[state.currentPlayerIndex];
  if (!player) return state;
  if (player.isBankrupt) {
    if (state.phase === 'TURN_END') {
      return dispatch(state, { type: 'END_TURN' });
    }
    return state;
  }

  if (state.phase === 'ROLLING' || state.phase === 'FAST_TRACK') {
    return rollAndMove(state);
  }

  if (state.phase === 'CARD_DECISION') {
    const space = state.spaces[player.position];
    const card = state.currentCard;

    if (state.pendingLifeEvent === 'retirement') {
      return dispatch(state, { type: 'CONFIRM_RETIREMENT' });
    }
    if (space.type === 'payday' && state.pendingPaydayAmount != null) {
      return dispatch(state, { type: 'CONFIRM_PAYDAY' });
    }
    if (space.type === 'settlement' && state.pendingSettlement) {
      return dispatch(state, { type: 'CONFIRM_SETTLEMENT' });
    }
    if (space.type === 'promotion' && state.careerEvent) {
      const event = state.careerEvent;
      if (event.type === 'jobHop') {
        return dispatch(state, {
          type: 'CHOOSE_PROMOTION',
          payload: { accept: true, jobHopChoice: player.cash > player.salary * 2 ? 'highPay' : 'stable' },
        });
      }
      if (event.type === 'promotion') {
        const cost = event.cost ?? 0;
        return dispatch(state, {
          type: 'CHOOSE_PROMOTION',
          payload: { accept: player.cash >= cost || player.cash + player.salary >= cost },
        });
      }
      if (event.type === 'careerChange') {
        return dispatch(state, {
          type: 'CHOOSE_PROMOTION',
          payload: { accept: player.cash > player.salary },
        });
      }
      return dispatch(state, { type: 'CHOOSE_PROMOTION', payload: { accept: true } });
    }
    if (space.type === 'charity') {
      return dispatch(state, { type: 'DONATE_CHARITY', payload: { donate: false } });
    }
    if (space.type === 'marriage') {
      if (player.marriageStatus === 'single' || player.marriageStatus === 'divorced') {
        const cashFlow = getMonthlyCashFlow(player, state.cashFlowMultiplier, state.sectorMultiplier);
        return dispatch(state, { type: 'CHOOSE_MARRIAGE', payload: { marry: cashFlow > 2000 } });
      }
      if (player.marriageStatus === 'married') {
        if (player.marriageHappiness < 40) {
          return dispatch(state, {
            type: 'RESOLVE_MARRIAGE_GRID',
            payload: { counseling: player.cash >= player.salary * 0.5 },
          });
        }
        return dispatch(state, { type: 'RESOLVE_MARRIAGE_GRID', payload: {} });
      }
      return dispatch(state, { type: 'DECLINE_CARD' });
    }
    if (space.type === 'baby') {
      if (player.marriageStatus !== 'married') {
        return dispatch(state, { type: 'DECLINE_CARD' });
      }
      if (player.hasPregnancy) {
        return dispatch(state, { type: 'CHOOSE_PREGNANCY_PATH', payload: { path: 'postpone' } });
      }
      if (
        player.children < 3 &&
        getMonthlyCashFlow(player, state.cashFlowMultiplier, state.sectorMultiplier) >
          player.expenses.perChild * 4
      ) {
        return dispatch(state, { type: 'CHOOSE_PREGNANCY_PATH', payload: { path: 'plan' } });
      }
      return dispatch(state, { type: 'CHOOSE_PREGNANCY_PATH', payload: { path: 'postpone' } });
    }
    if (card?.type === 'opportunity') {
      const recentLogs = state.logs
        .slice(-5)
        .map((l) => l.message)
        .join(' ');
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
          ? Math.min(
              5,
              Math.max(1, Math.floor(player.cash / stockLotBuyCost(1, oppAsset.singlePrice ?? 1)))
            )
          : undefined;
        if (space.type === 'market') {
          return dispatch(state, {
            type: 'BUY_DISCOUNTED_ASSET',
            payload: lots !== undefined ? { shareHand: lots } : undefined,
          });
        }
        return dispatch(state, {
          type: 'BUY_ASSET',
          payload: lots !== undefined ? { shareHand: lots } : undefined,
        });
      }
      return dispatch(state, { type: 'DECLINE_CARD' });
    }
    if (card?.type === 'doodad') {
      return dispatch(state, { type: 'PAY_DOODAD' });
    }
    if (card?.type === 'market') {
      const effect = card.effect;
      if (effect.type === 'buyout') {
        const targetType = effect.targetAssetType;
        const sellable = targetType
          ? player.assets.filter((a) => a.type === targetType)
          : player.assets;
        if (sellable.length > 0 && shouldSellInCrisis(player, card)) {
          const worst = sellable.reduce((prev, curr) =>
            curr.cashFlow / Math.max(curr.downPayment, 1) <
            prev.cashFlow / Math.max(prev.downPayment, 1)
              ? curr
              : prev
          );
          return dispatch(state, {
            type: 'SELL_ASSET',
            payload: { assetId: worst.id, multiplier: effect.multiplier || 1 },
          });
        }
        return dispatch(state, { type: 'DECLINE_CARD' });
      }
      if (effect.type === 'discount') {
        return dispatch(state, { type: 'DRAW_DISCOUNTED_OPPORTUNITY' });
      }
      return dispatch(state, { type: 'APPLY_MARKET_EFFECT' });
    }
    return dispatch(state, { type: 'DECLINE_CARD' });
  }

  if (state.phase === 'TURN_END') {
    if (
      player.cash < 0 &&
      !checkBankruptcy(player, state.cashFlowMultiplier, state.sectorMultiplier)
    ) {
      return dispatch(state, { type: 'TAKE_LOAN', payload: { amount: Math.abs(player.cash) + 1000 } });
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
        let next = dispatch(state, {
          type: 'REPAY_LIABILITY',
          payload: { liabilityId: targetDebt.id, amount: preview.repayAmount },
        });
        return dispatch(next, { type: 'END_TURN' });
      }
    }
    return dispatch(state, { type: 'END_TURN' });
  }

  return state;
}

function runAutoTest(maxRounds: number, seed?: number): GameState {
  if (seed !== undefined) {
    // deterministic runs for debugging
    let s = seed;
    Math.random = () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  let state = dispatch(getInitial(), {
    type: 'SETUP_GAME',
    payload: {
      humanPlayerName: '测试员',
      humanProfessionId: 'engineer',
      cityId: 'shanghai',
      aiCount: 2,
      aiDifficulty: 'medium',
      testMode: true,
      testMaxRounds: maxRounds,
    },
  });

  const maxSteps = maxRounds * 50 * 3;
  let steps = 0;
  let prevRound = 0;
  let prevPhase = state.phase;

  while (state.phase !== 'GAME_OVER' && !state.testStopped && steps < maxSteps) {
    const before = state;
    state = autoStep(state);
    steps++;
    if (state === before) {
      const p = state.players[state.currentPlayerIndex];
      console.error('STUCK: no state change', {
        phase: state.phase,
        round: state.round,
        player: p?.name,
        isBankrupt: p?.isBankrupt,
        cash: p?.cash,
        cashFlow: p ? getMonthlyCashFlow(p, state.cashFlowMultiplier, state.sectorMultiplier) : null,
        position: p?.position,
        space: state.spaces[p?.position ?? 0]?.type,
        currentCard: state.currentCard?.type,
        pendingPayday: state.pendingPaydayAmount,
        pendingSettlement: state.pendingSettlement,
        liabilities: p?.liabilities.length,
      });
      break;
    }
    if (state.round !== prevRound) {
      prevRound = state.round;
      process.stdout.write(`\r回合 ${state.round}/${maxRounds} ...`);
    }
    if (state.phase === prevPhase && state.phase === 'MOVING') {
      // MOVING should never persist in headless mode
      state = dispatch(state, { type: 'MOVE_PLAYER' });
    }
    prevPhase = state.phase;
  }

  console.log('');
  return state;
}

function getInitial(): GameState {
  return getInitialGameState();
}

const maxRounds = Number(process.argv[2] ?? 50);
console.log(`=== CashFlow 自动测试 (${maxRounds} 回合) ===\n`);

const finalState = runAutoTest(maxRounds);
const bugs = finalState.bugLogs ?? [];

console.log(`\n完成：回合 ${finalState.round}，阶段 ${finalState.phase}，Bug 数 ${bugs.length}`);

if (bugs.length > 0) {
  console.log('\n--- Bug 日志 ---');
  for (const bug of bugs) {
    console.log(
      `[${bug.severity}] ${bug.category} · R${bug.round} · ${bug.message}${bug.action ? ` (${bug.action})` : ''}`
    );
    if (bug.snapshot) console.log('  snapshot:', JSON.stringify(bug.snapshot));
  }
}

process.exit(bugs.some((b) => b.severity === 'critical') ? 1 : 0);
