/**
 * Headless auto-test runner — mirrors useAutoTestAgent decisions via gameReducer.
 * Usage: npx tsx scripts/runAutoTest.ts [rounds]
 *
 * v3.8: 大幅扩展每回合快照数据，支持人工/AI 事后审查异常模式
 */
import { gameReducer, getInitialGameState } from '../src/context/GameReducer.ts';
import type { AssetType, Card, GameAction, GameState, Player, Asset } from '../src/types/game.ts';
import {
  canPurchaseOpportunity,
  checkBankruptcy,
  getHighestPriorityDebt,
  getMonthlyCashFlow,
  getPassiveIncome,
  getSellableAssets,
  getTotalExpenses,
  isStockLotAsset,
  previewRepayment,
  stockLotBuyCost,
  calcCurrentStockPrice,
  calcCurrentStockMarketValue,
  getStockBasePe,
  getTotalAssetsValue,
  getNetWorth,
} from '../src/utils/financial.ts';
import { rollDice, rollTwoDice } from '../src/utils/random.ts';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const DEFENSIVE_SECTORS = new Set(['金融', '公用事业', '消费', '利率债', '贵金属']);
const GROWTH_SECTORS = new Set(['科技', '新能源', '先进制造']);

// ──────────────────────────────────────────────
// 丰富快照类型：涵盖玩家画像、持仓估值、负债结构、市场状态
// ──────────────────────────────────────────────
interface RichSnapshot {
  round: number;
  phase: string;
  // 玩家画像
  age: number;
  gender: string;
  marriageStatus: string;
  happiness: number;
  children: number;
  unemployed: boolean;
  retired: boolean;
  isBankrupt: boolean;
  // 财务概览
  cash: number;
  cashFlow: number;
  salary: number;
  passiveIncome: number;
  expenses: number;
  netWorth: number;
  totalAssetsValue: number;
  // 负债
  liabilityCount: number;
  liabilityTotalPrincipal: number;
  rentExpense: number;
  // 持仓股票明细（摘要）
  stockCount: number;
  stockTotalValue: number;
  stockTotalCost: number;
  stockPositions: string[]; // "名称:PE/PB/股息率/浮盈%" 摘要文本
  // 市场状态
  interestRate: number;
  marketEvent: string; // 最近发生的市场事件
}

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
    if (state.phase === 'CARD_DECISION') {
      return dispatch(state, { type: 'DECLINE_CARD' });
    }
    return state;
  }

  if (state.phase === 'ROLLING' || state.phase === 'FAST_TRACK') {
    return rollAndMove(state);
  }

  if (state.phase === 'CARD_DECISION') {
    const space = state.spaces[player.position];
    const card = state.currentCard;

    if (state.pendingLiquidation) {
      const sellable = getSellableAssets(player);
      if (sellable.length > 0) {
        return dispatch(state, {
          type: 'LIQUIDATE_ASSET',
          payload: { assetId: sellable[0].id, isSecretSell: false },
        });
      }
      return dispatch(state, { type: 'DECLINE_CARD' });
    }
    if (state.pendingCashFlowSettlement) {
      return dispatch(state, { type: 'CONFIRM_CASH_FLOW_SETTLEMENT' });
    }

    if (state.pendingLifeEvent === 'retirement') {
      return dispatch(state, { type: 'CONFIRM_RETIREMENT' });
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
    if (space.type === 'family') {
      if (player.marriageStatus === 'ineligible') {
        return dispatch(state, { type: 'DECLINE_CARD' });
      }
      if (player.marriageStatus === 'married') {
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
      const cashFlow = getMonthlyCashFlow(player, state.cashFlowMultiplier, state.sectorMultiplier);
      return dispatch(state, { type: 'CHOOSE_MARRIAGE', payload: { marry: cashFlow > 2000 } });
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
          ? player.assets.filter((a) => a.type === targetType && !a.isSelfLiving)
          : player.assets.filter((a) => !a.isSelfLiving);
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
      const sellable = getSellableAssets(player);
      if (sellable.length > 0) {
        return dispatch(state, {
          type: 'LIQUIDATE_ASSET',
          payload: { assetId: sellable[0].id, isSecretSell: false },
        });
      }
      return dispatch(state, { type: 'TAKE_LOAN', payload: { amount: Math.abs(player.cash) + 1000 } });
    }

    // AI 偶尔卖出估值偏高股票（基于现价/合理价值，非旧 PE 比值）
    const overvaluedStock = player.assets.find((a) => {
      if (!isStockLotAsset(a) || a.basePe == null) return false;
      const curPrice = calcCurrentStockPrice(a);
      const fairValue = a.intrinsicPrice ?? 0;
      if (fairValue <= 0) return false;
      return curPrice / fairValue > 1.1 && (a.shareHand ?? 0) >= 1;
    });
    if (overvaluedStock && Math.random() < 0.4) {
      const sellHand = Math.ceil((overvaluedStock.shareHand ?? 0) * 0.5);
      return dispatch(state, {
        type: 'MANUAL_SELL_STOCK',
        payload: { assetId: overvaluedStock.id, sellHand },
      });
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

/** 构建丰富快照 */
function buildSnapshot(state: GameState): RichSnapshot {
  const p = state.players[state.currentPlayerIndex];
  if (!p) {
    return {
      round: state.round, phase: state.phase,
      age: 0, gender: '', marriageStatus: '', happiness: 0, children: 0,
      unemployed: false, retired: false, isBankrupt: false,
      cash: 0, cashFlow: 0, salary: 0, passiveIncome: 0, expenses: 0,
      netWorth: 0, totalAssetsValue: 0,
      liabilityCount: 0, liabilityTotalPrincipal: 0, rentExpense: 0,
      stockCount: 0, stockTotalValue: 0, stockTotalCost: 0, stockPositions: [],
      interestRate: state.interestRate, marketEvent: '',
    };
  }

  const cf = getMonthlyCashFlow(p, state.cashFlowMultiplier, state.sectorMultiplier);
  const stocks = p.assets.filter((a) => isStockLotAsset(a));
  let stockTotalValue = 0;
  let stockTotalCost = 0;
  const stockPositions: string[] = [];

  for (const a of stocks) {
    const curPrice = calcCurrentStockPrice(a);
    const mv = calcCurrentStockMarketValue(a);
    stockTotalValue += mv;
    stockTotalCost += a.cost ?? 0;

    const basePe = getStockBasePe(a);
    const currentPe = a.currentPe ?? basePe;
    const fairValue = a.intrinsicPrice ?? 0;
    const pct = a.cost && a.cost > 0 ? Math.round(((mv - a.cost) / a.cost) * 100) : 0;
    const pb = a.metadata?.pb;
    const divYield = a.metadata?.dividendYield;

    const summary =
      `${a.name} PE${currentPe.toFixed(1)}` +
      (pb != null ? `/PB${pb.toFixed(2)}` : '') +
      (divYield != null ? `/息${(divYield * 100).toFixed(1)}%` : '') +
      `/浮${pct >= 0 ? '+' : ''}${pct}%` +
      (fairValue > 0 ? `/合理¥${fairValue.toFixed(0)}` : '');
    stockPositions.push(summary);
  }

  const totalPrincipal = p.liabilities.reduce((s, l) => s + l.principal, 0);

  // 最近的日志（查找最近市场事件）
  const recentLogs = state.logs.slice(-5).map((l) => l.message).join('; ');

  return {
    round: state.round,
    phase: state.phase,
    age: p.age ?? 0,
    gender: p.gender ?? '',
    marriageStatus: p.marriageStatus ?? '',
    happiness: p.marriageHappiness ?? 0,
    children: p.children ?? 0,
    unemployed: p.isUnemployed ?? false,
    retired: p.isRetired ?? false,
    isBankrupt: p.isBankrupt ?? false,
    cash: p.cash ?? 0,
    cashFlow: cf,
    salary: p.salary ?? 0,
    passiveIncome: getPassiveIncome(p, state.cashFlowMultiplier, state.sectorMultiplier),
    expenses: getTotalExpenses(p),
    netWorth: getNetWorth(p, state.marketMultiplier, state.sectorMultiplier),
    totalAssetsValue: getTotalAssetsValue(p, state.marketMultiplier, state.sectorMultiplier),
    liabilityCount: p.liabilities.length,
    liabilityTotalPrincipal: totalPrincipal,
    rentExpense: p.rentExpense ?? 0,
    stockCount: stocks.length,
    stockTotalValue,
    stockTotalCost,
    stockPositions,
    interestRate: state.interestRate,
    marketEvent: recentLogs,
  };
}

/** 端到端分析：遍历快照识别异常模式 */
function analyzeAnomalies(snapshots: RichSnapshot[]): string[] {
  const warnings: string[] = [];

  for (const s of snapshots) {
    // 股价与合理价值偏差过大
    for (const pos of s.stockPositions) {
      const m = pos.match(/浮([+-]\d+)%/);
      if (m) {
        const pct = parseInt(m[1], 10);
        if (pct > 200) warnings.push(`R${s.round} ${pos.split(' ')[0]} 浮盈${pct}% 异常偏高`);
        if (pct < -80) warnings.push(`R${s.round} ${pos.split(' ')[0]} 亏损${pct}% 需关注`);
      }
    }

    // 月现金流/月支出比异常（严重入不敷出）
    if (s.expenses > 0 && s.cashFlow / s.expenses < -0.8 && s.cash > 10000) {
      warnings.push(`R${s.round} 现金流/支出比 ${(s.cashFlow / s.expenses * 100).toFixed(0)}% 但现金仍充裕（¥${s.cash}），可能未触发破产`);
    }

    // 子女数+幸福度异常
    if (s.children > 0 && s.happiness > 90) {
      warnings.push(`R${s.round} 有${s.children}子但幸福度${s.happiness}极高，可能未施加育儿惩罚`);
    }

    // 负债笔数多但金额小（零碎负债扣月供但影响不大）
    if (s.liabilityCount >= 5 && s.liabilityTotalPrincipal < 10000) {
      warnings.push(`R${s.round} 负债${s.liabilityCount}笔但总额仅¥${s.liabilityTotalPrincipal}，疑似零碎负债堆积`);
    }
  }

  // 跨回合模式：工资未发持续多回合
  let salaryDryStreak = 0;
  for (const s of snapshots) {
    if (s.unemployed) {
      salaryDryStreak++;
    } else {
      if (salaryDryStreak >= 6) {
        warnings.push(`失业持续 ${salaryDryStreak} 回合未再就业`);
      }
      salaryDryStreak = 0;
    }
  }

  // 跨回合模式：现金持续下降但无破产
  let cashDropCount = 0;
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const cur = snapshots[i];
    if (prev.cash > 0 && cur.cash < prev.cash * 0.5) {
      cashDropCount++;
    }
  }
  if (cashDropCount >= 5) warnings.push(`现金在 ${cashDropCount} 个回合出现骤降(>50%)，可能隐瞒破产条件`);

  return warnings;
}

function runAutoTest(maxRounds: number, seed?: number): GameState {
  if (seed !== undefined) {
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
      humanGender: 'female',
      testMode: true,
      testMaxRounds: maxRounds,
    },
  });

  const maxSteps = maxRounds * 50 * 3;
  let steps = 0;
  let prevRound = 0;
  let prevPhase = state.phase;
  const snapshotHistory: RichSnapshot[] = [];

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
        pendingSettlement: state.pendingSettlement,
        liabilities: p?.liabilities.length,
      });
      break;
    }
    if (state.round !== prevRound) {
      prevRound = state.round;
      snapshotHistory.push(buildSnapshot(state));
      process.stdout.write(`\r回合 ${state.round}/${maxRounds} ...`);
    }
    if (state.phase === prevPhase && state.phase === 'MOVING') {
      state = dispatch(state, { type: 'MOVE_PLAYER' });
    }
    prevPhase = state.phase;
  }

  console.log('');

  // ── 打印逐回合宽表 ──
  if (snapshotHistory.length > 0) {
    console.log('\n── 逐回合数据分析 ──');
    const header = [
      '回合', '阶段',
      '年龄', '婚姻', '幸福', '子女',
      '现金→', '现金流', '支出', '工资', '被动',
      '负债笔', '负债总额',
      '资产总值', '净资产',
      '股票数', '股票市值',
      '利率',
    ];
    console.log(header.join('\t'));
    for (const s of snapshotHistory) {
      console.log(
        `${s.round}\t` +
        `${s.phase.substring(0, 6)}\t` +
        `${s.age}\t` +
        `${s.marriageStatus === 'married' ? '已婚' : s.marriageStatus === 'single' ? '单身' : s.marriageStatus === 'divorced' ? '离异' : s.marriageStatus}\t` +
        `${s.happiness}\t` +
        `${s.children}\t` +
        `${s.cash.toLocaleString().padStart(7)}\t` +
        `${s.cashFlow.toLocaleString().padStart(5)}\t` +
        `${s.expenses.toLocaleString().padStart(5)}\t` +
        `${s.salary.toLocaleString().padStart(5)}\t` +
        `${s.passiveIncome.toLocaleString().padStart(5)}\t` +
        `${s.liabilityCount}\t` +
        `${s.liabilityTotalPrincipal.toLocaleString().padStart(8)}\t` +
        `${s.totalAssetsValue.toLocaleString().padStart(8)}\t` +
        `${s.netWorth.toLocaleString().padStart(8)}\t` +
        `${s.stockCount}\t` +
        `${s.stockTotalValue.toLocaleString().padStart(8)}\t` +
        `${(s.interestRate * 100).toFixed(2)}%`
      );
      // 打印持仓摘要
      if (s.stockPositions.length > 0) {
        console.log(`  📊 ${s.stockPositions.join(' | ')}`);
      }
      // 打印市场事件
      if (s.marketEvent) {
        console.log(`  📰 ${s.marketEvent}`);
      }
    }
  }

  // ── 异常模式分析 ──
  const anomalies = analyzeAnomalies(snapshotHistory);
  if (anomalies.length > 0) {
    console.log('\n── ⚠️ 异常模式警告 ──');
    for (const w of anomalies) {
      console.log(`  ⚠️  ${w}`);
    }
  } else {
    console.log('\n✅ 未检测到明显异常模式');
  }

  // ── 保存完整快照到文件 ──
  const __filename = fileURLToPath(import.meta.url);
  const resultsDir = join(dirname(__filename), '..', 'test-output');
  if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outFile = join(resultsDir, `test-run-${maxRounds}r-${timestamp}.json`);
  const finalBugs = state.bugLogs ?? [];
  writeFileSync(outFile, JSON.stringify({
    meta: {
      maxRounds,
      roundsCompleted: state.round,
      finalPhase: state.phase,
      bugCount: finalBugs.length,
      timestamp: new Date().toISOString(),
    },
    snapshots: snapshotHistory,
    bugs: finalBugs,
    anomalies,
  }, null, 2), 'utf-8');
  console.log(`\n💾 数据已保存到: ${outFile}`);

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
