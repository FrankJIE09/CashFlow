import type { BugLogEntry, GameAction, GameState } from '../types/game';
import { checkBankruptcy, getMonthlyCashFlow, needsLiquidation, calcHighDebtHappinessPenalty } from './financial';
import { generateId } from './random';

const CHILDREN_LIMIT = 3;
const DOODAD_CHILD_EXPENSE_IDS = new Set(['family_school_choice']);

function appendBug(
  state: GameState,
  entry: Omit<BugLogEntry, 'id' | 'timestamp' | 'round' | 'playerId'>
): GameState {
  const player = state.players[state.currentPlayerIndex];
  const bug: BugLogEntry = {
    id: generateId(),
    timestamp: Date.now(),
    round: state.round,
    playerId: player?.id ?? 'unknown',
    ...entry,
  };
  return {
    ...state,
    bugLogs: [...(state.bugLogs ?? []), bug],
  };
}

function bumpPhaseTimeout(state: GameState, phase: string): Record<string, number> {
  const record = { ...(state.testTimeoutRecord ?? {}) };
  record[phase] = (record[phase] ?? 0) + 1;
  return record;
}

function resetOtherPhaseTimeouts(state: GameState, currentPhase: string): Record<string, number> {
  const record = { ...(state.testTimeoutRecord ?? {}) };
  for (const key of Object.keys(record)) {
    if (key !== currentPhase) record[key] = 0;
  }
  return record;
}

function validateBranchCoverage(state: GameState, prevState: GameState, action: GameAction): GameState {
  let next = state;
  const player = state.players[state.currentPlayerIndex];
  if (!player) return next;

  const space = state.spaces[player.position];

  if (
    action.type === 'MOVE_PLAYER' &&
    space.type === 'baby' &&
    player.marriageStatus === 'married' &&
    player.children < CHILDREN_LIMIT &&
    state.phase !== 'CARD_DECISION'
  ) {
    next = appendBug(next, {
      category: 'branch_missing',
      severity: 'critical',
      message: '已婚玩家落在生育格但未进入 CARD_DECISION',
      action: action.type,
      snapshot: { phase: state.phase, currentCard: state.currentCard },
    });
  }

  if (
    action.type === 'MOVE_PLAYER' &&
    space.type === 'marriage' &&
    (player.marriageStatus === 'single' || player.marriageStatus === 'divorced' || player.marriageStatus === 'married') &&
    state.phase !== 'CARD_DECISION'
  ) {
    next = appendBug(next, {
      category: 'branch_missing',
      severity: 'critical',
      message: '玩家落在婚恋格但未进入 CARD_DECISION',
      action: action.type,
    });
  }

  if (
    action.type === 'MOVE_PLAYER' &&
    space.type === 'settlement' &&
    state.phase !== 'CARD_DECISION' &&
    state.phase !== 'GAME_OVER'
  ) {
    next = appendBug(next, {
      category: 'branch_missing',
      severity: 'critical',
      message: '税务结算格未进入 CARD_DECISION 弹窗',
      action: action.type,
      snapshot: { phase: state.phase },
    });
  }

  if (
    action.type === 'REPAY_LIABILITY' &&
    prevState.phase === 'TURN_END' &&
    state.phase !== 'TURN_END' &&
    state.phase !== 'GAME_OVER'
  ) {
    next = appendBug(next, {
      category: 'branch_missing',
      severity: 'warning',
      message: '偿还负债后阶段异常',
      action: action.type,
      snapshot: { phase: state.phase },
    });
  }

  return next;
}

function validateFinancialSanity(state: GameState, prevState: GameState, action: GameAction): GameState {
  let next = state;
  const player = state.players[state.currentPlayerIndex];
  if (!player) return next;

  if (player.cash < -1_000_000) {
    next = appendBug(next, {
      category: 'financial',
      severity: 'critical',
      message: `现金异常：${player.cash}`,
      action: action.type,
    });
  }

  if (player.cash > 1_000_000_000) {
    next = appendBug(next, {
      category: 'financial',
      severity: 'warning',
      message: `现金过高疑似计算错误：${player.cash}`,
      action: action.type,
    });
  }

  const prevPlayer = prevState.players[state.currentPlayerIndex];
  if (!prevPlayer) return next;

  const cashDelta = player.cash - prevPlayer.cash;
  const largeMoveActions = new Set([
    'BUY_ASSET',
    'BUY_DISCOUNTED_ASSET',
    'PAY_DOODAD',
    'SELL_ASSET',
    'REPAY_LIABILITY',
    'MOVE_PLAYER',
    'TAKE_LOAN',
  ]);

  if (largeMoveActions.has(action.type) && Math.abs(cashDelta) > 50_000_000) {
    next = appendBug(next, {
      category: 'financial',
      severity: 'warning',
      message: `单次现金变动过大：${cashDelta}（${action.type}）`,
      action: action.type,
    });
  }

  if (player.children < 0 || player.children > 10) {
    next = appendBug(next, {
      category: 'data_invalid',
      severity: 'critical',
      message: `子女数量异常：${player.children}`,
      action: action.type,
    });
  }

  if (player.marriageHappiness < 0 || player.marriageHappiness > 100) {
    next = appendBug(next, {
      category: 'data_invalid',
      severity: 'critical',
      message: `幸福度越界：${player.marriageHappiness}`,
      action: action.type,
    });
  }

  return next;
}

export function runTestValidators(
  state: GameState,
  prevState: GameState,
  action: GameAction
): GameState {
  if (!state.testMode) return state;

  let next = { ...state };
  const player = next.players[next.currentPlayerIndex];

  if (action.type === 'MOVE_PLAYER' && next.pendingDice !== null) {
    next = appendBug(next, {
      category: 'state_machine',
      severity: 'critical',
      message: 'MOVE_PLAYER 后 pendingDice 未清除',
      action: action.type,
      snapshot: { pendingDice: next.pendingDice },
    });
  }

  if (next.phase !== prevState.phase) {
    next = { ...next, testTimeoutRecord: resetOtherPhaseTimeouts(next, next.phase) };
  } else {
    next = { ...next, testTimeoutRecord: bumpPhaseTimeout(next, next.phase) };
  }

  const phaseStuck = next.testTimeoutRecord?.[next.phase] ?? 0;
  if (phaseStuck > 5) {
    next = appendBug(next, {
      category: 'deadlock',
      severity: 'critical',
      message: `阶段 ${next.phase} 连续停留 ${phaseStuck} 次`,
      action: action.type,
    });
  }

  if (next.phase === 'CARD_DECISION') {
    const space = player ? next.spaces[player.position] : null;
    const needsCard = space && ['opportunity', 'market', 'doodad'].includes(space.type);
    const cardStuckKey = 'CARD_DECISION_null_card';
    const cardStuck =
      !next.currentCard &&
      !next.promotionOffer &&
      !next.careerEvent &&
      next.pendingLifeEvent !== 'retirement' &&
      !next.pendingSettlement &&
      !next.pendingLiquidation &&
      !next.pendingCashFlowSettlement &&
      space &&
      !['baby', 'marriage', 'charity', 'promotion', 'settlement'].includes(space.type);

    if (cardStuck || (needsCard && !next.currentCard)) {
      const count = (next.testTimeoutRecord?.[cardStuckKey] ?? 0) + 1;
      next = {
        ...next,
        testTimeoutRecord: { ...(next.testTimeoutRecord ?? {}), [cardStuckKey]: count },
      };
      if (count > 3) {
        next = appendBug(next, {
          category: 'card_stuck',
          severity: 'critical',
          message: 'CARD_DECISION 阶段缺少 currentCard 超过 3 次',
          action: action.type,
          snapshot: { phase: next.phase, currentCard: next.currentCard },
        });
      }
    } else {
      next = {
        ...next,
        testTimeoutRecord: { ...(next.testTimeoutRecord ?? {}), [cardStuckKey]: 0 },
      };
    }
  }

  if (
    player &&
    checkBankruptcy(player, next.cashFlowMultiplier, next.sectorMultiplier) &&
    !player.isBankrupt &&
    next.phase !== 'GAME_OVER'
  ) {
    const cf = getMonthlyCashFlow(player, next.cashFlowMultiplier, next.sectorMultiplier);
    next = appendBug(next, {
      category: 'bankruptcy',
      severity: 'critical',
      message: `应触发破产（${cf}）但未进入 GAME_OVER`,
      action: action.type,
    });
  }

  if (
    player &&
    needsLiquidation(player, next.cashFlowMultiplier, next.sectorMultiplier) &&
    !next.pendingLiquidation &&
    next.phase !== 'GAME_OVER' &&
    !player.isBankrupt
  ) {
    next = appendBug(next, {
      category: 'bankruptcy',
      severity: 'critical',
      message: '现金耗尽且有可变卖资产，但未弹出强制变卖',
      action: action.type,
    });
  }

  next = validateFinancialSanity(next, prevState, action);
  next = validateBranchCoverage(next, prevState, action);

  // 【新增】v3.7 子卡牌校验
  if (action.type === 'PAY_DOODAD' && prevState.currentCard?.type === 'doodad') {
    const doodadCard = prevState.currentCard;
    const player = next.players[next.currentPlayerIndex];

    // 子女费用对无子女玩家触发
    if (doodadCard.id && DOODAD_CHILD_EXPENSE_IDS.has(doodadCard.id) && player.children === 0) {
      next = appendBug(next, {
        category: 'branch_missing',
        severity: 'critical',
        message: '子女费用doodad卡在无子女玩家上触发',
        action: action.type,
      });
    }

    // 配偶失业卡对单身触发
    if (doodadCard.id === 'family_spouse_unemployed' && player.marriageStatus !== 'married') {
      next = appendBug(next, {
        category: 'branch_missing',
        severity: 'critical',
        message: '配偶失业卡在未婚玩家上触发',
        action: action.type,
      });
    }
  }

  // 【新增】v3.7 晋升事件对失业/退休玩家
  if (action.type === 'CHOOSE_PROMOTION' && prevState.careerEvent) {
    const player = next.players[next.currentPlayerIndex];
    const eventType = prevState.careerEvent.type;
    if (eventType !== 'reemployment' && eventType !== 'layoff') {
      if (player.isRetired) {
        next = appendBug(next, {
          category: 'branch_missing',
          severity: 'critical',
          message: '晋升事件在退休玩家上触发',
          action: action.type,
        });
      }
      if (player.isUnemployed) {
        next = appendBug(next, {
          category: 'branch_missing',
          severity: 'critical',
          message: '晋升事件在失业玩家上触发（失业应只触发再就业）',
          action: action.type,
        });
      }
    }
  }

  // 【新增】v3.7 高负债幸福惩罚缺失
  if (player) {
    const highDebtPenalty = calcHighDebtHappinessPenalty(player);
    if (highDebtPenalty > 0 && player.marriageStatus === 'married' && next.phase !== 'GAME_OVER') {
      if (!player.highDebtHappinessPenalty || player.highDebtHappinessPenalty <= 0) {
        next = appendBug(next, {
          category: 'branch_missing',
          severity: 'warning',
          message: '高负债幸福惩罚缺失（总负债>3x年收入应扣幸福度）',
          action: action.type,
        });
      }
    }
  }

  if (next.testMaxRounds && next.round > next.testMaxRounds && next.phase !== 'GAME_OVER') {
    next = appendBug(next, {
      category: 'state_machine',
      severity: 'warning',
      message: `已超过测试最大回合 ${next.testMaxRounds}`,
      action: action.type,
    });
  }

  return next;
}
