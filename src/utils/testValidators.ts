import type { BugLogEntry, GameAction, GameState, Player } from '../types/game';
import { checkBankruptcy, getMonthlyCashFlow, needsLiquidation, calcHighDebtHappinessPenalty, getTotalLiabilities, isStockLotAsset, isDcaSupportedType, getDcaSmartMultiplier } from './financial';
import { generateId } from './random';

const CHILDREN_LIMIT = 3;
const DOODAD_CHILD_EXPENSE_IDS = new Set(['family_school_choice']);

/** 【v3.8】辅助：检测玩家是否为女性且有无 0-3 岁子嗣 */
function hasZeroToThreeChild(player: Player): boolean {
  return player.gender === 'female' && player.childAges.length > 0;
}

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
    space.type === 'family' &&
    player.marriageStatus === 'married' &&
    player.children < CHILDREN_LIMIT &&
    state.phase !== 'CARD_DECISION'
  ) {
    next = appendBug(next, {
      category: 'branch_missing',
      severity: 'critical',
      message: '已婚玩家落在家庭格但未进入 CARD_DECISION',
      action: action.type,
      snapshot: { phase: state.phase, currentCard: state.currentCard },
    });
  }

  if (
    action.type === 'MOVE_PLAYER' &&
    space.type === 'family' &&
    (player.marriageStatus === 'single' || player.marriageStatus === 'divorced') &&
    state.phase !== 'CARD_DECISION'
  ) {
    next = appendBug(next, {
      category: 'branch_missing',
      severity: 'critical',
      message: '单身/离异玩家落在家庭格但未进入 CARD_DECISION',
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
  if (phaseStuck > 5 && !(
    next.phase === 'CARD_DECISION' && (next.pendingLiquidation || next.pendingCashFlowSettlement)
  )) {
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
      !['family', 'charity', 'promotion', 'settlement'].includes(space.type);

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
    !player.isBankrupt &&
    // 仅在结算/移动时检查变卖遗漏，中间态操作（BUY_ASSET/PAY_DOODAD 等）不触发
    (action.type === 'END_TURN' || action.type === 'MOVE_PLAYER')
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

  // 【v3.8】女性产检 & 产假验证
  if (player && player.maternityLeaveRemaining > 0 && player.gender !== 'female') {
    next = appendBug(next, {
      category: 'data_invalid',
      severity: 'critical',
      message: `非女性玩家出现产假（maternityLeaveRemaining=${player.maternityLeaveRemaining}）`,
      action: action.type,
    });
  }

  // 【v3.8】女性 0-3 子嗣幸福度惩罚验证
  if (player && hasZeroToThreeChild(player) && player.marriageHappiness > 100) {
    next = appendBug(next, {
      category: 'data_invalid',
      severity: 'warning',
      message: `女性 0-3 子嗣幸福度异常高：${player.marriageHappiness}`,
      action: action.type,
    });
  }

  // 【v3.8】childAges 不超出范围验证
  if (player) {
    const invalidAge = (player.childAges ?? []).find((a) => a < 0 || a > 36);
    if (invalidAge !== undefined) {
      next = appendBug(next, {
        category: 'data_invalid',
        severity: 'critical',
        message: `childAges 超出 0-36 范围：${invalidAge}`,
        action: action.type,
      });
    }
  }

  // 【v3.8】合并家庭现金流验证（已婚应有 familyIncome）
  if (player && player.marriageStatus === 'married' && !player.familyIncome && !player.isRetired) {
    next = appendBug(next, {
      category: 'data_invalid',
      severity: 'warning',
      message: '已婚玩家无 familyIncome',
      action: action.type,
    });
  }

  // 【新增】v3.7 子卡牌校验
  if (action.type === 'PAY_DOODAD' && prevState.currentCard?.type === 'doodad') {
    const doodadCard = prevState.currentCard;
    const player = next.players[next.currentPlayerIndex];

    // 子女费用对无子女玩家触发
    if (doodadCard.id && DOODAD_CHILD_EXPENSE_IDS.has(doodadCard.id) && player.children === 0 && next.phase === 'CARD_DECISION') {
      next = appendBug(next, {
        category: 'branch_missing',
        severity: 'critical',
        message: '子女费用doodad卡在无子女玩家上触发',
        action: action.type,
      });
    }

    // 配偶失业卡对单身触发
    if (doodadCard.id === 'family_spouse_unemployed' && player.marriageStatus !== 'married' && next.phase === 'CARD_DECISION') {
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

  // 【新增】v3.7 高负债幸福惩罚缺失（仅在月度结算后检查，限制频率）
  if (player && action.type === 'MOVE_PLAYER' && player.marriageStatus === 'married' && next.phase === 'ROLLING') {
    const highDebtPenalty = calcHighDebtHappinessPenalty(player);
    if (highDebtPenalty > 0 && !player.highDebtHappinessPenalty) {
      // 只检测一次，避免重复 warning
      next = appendBug(next, {
        category: 'branch_missing',
        severity: 'warning',
        message: `高负债幸福惩罚缺失（总负债${getTotalLiabilities(player)}>3x年收入=${((player.baseSalary ?? player.salary) * 12 * 3).toLocaleString()}应扣幸福度）`,
        action: action.type,
      });
    }
  }

  // 【新增】v3.11 DCA 定投校验
  if (player && action.type === 'MOVE_PLAYER') {
    const dcaPlans = player.dcaPlans ?? [];
    for (const plan of dcaPlans) {
      // 校验1: 非定投资产非法创建定投
      if (!isDcaSupportedType(plan.assetType)) {
        next = appendBug(next, {
          category: 'data_invalid',
          severity: 'critical',
          message: `不支持的定投资产类型：${plan.assetType}（${plan.assetName}）`,
          action: action.type,
        });
      }

      // 校验2: 定投计划关联的资产存在
      const targetAsset = player.assets.find((a) => a.id === plan.assetId);
      if (!targetAsset) {
        next = appendBug(next, {
          category: 'data_invalid',
          severity: 'warning',
          message: `定投计划 ${plan.id} 关联资产 ${plan.assetId} 不存在`,
          action: action.type,
        });
        continue;
      }

      // 校验3: 智能定投倍率合法性
      if (plan.smartEnabled && isStockLotAsset(targetAsset)) {
        const mult = getDcaSmartMultiplier(targetAsset);
        if (mult !== 2 && mult !== 1 && mult !== 0.5) {
          next = appendBug(next, {
            category: 'data_invalid',
            severity: 'critical',
            message: `智能定投倍率异常：${mult}`,
            action: action.type,
          });
        }
      }

      // 校验4: 定投金额合理性
      if (plan.monthlyAmount < 0 || plan.monthlyAmount > 1_000_000) {
        next = appendBug(next, {
          category: 'data_invalid',
          severity: 'warning',
          message: `定投金额异常：${plan.monthlyAmount}`,
          action: action.type,
        });
      }
    }

    // 校验5: 最多5条定投计划
    if (dcaPlans.length > 5) {
      next = appendBug(next, {
        category: 'data_invalid',
        severity: 'critical',
        message: `定投计划数量超过上限（${dcaPlans.length} > 5）`,
        action: action.type,
      });
    }

    // 校验6: 退休玩家无定投计划
    if (player.isRetired && dcaPlans.length > 0) {
      next = appendBug(next, {
        category: 'data_invalid',
        severity: 'warning',
        message: '退休玩家仍有定投计划',
        action: action.type,
      });
    }
  }

  // 校验7: 终止定投后不再买入（SET_DCA_PLAN 触发检查）
  if (action.type === 'DELETE_DCA_PLAN') {
    const { planId } = action.payload as { planId: string };
    const prevPlans = prevState.players[state.currentPlayerIndex]?.dcaPlans ?? [];
    const plan = prevPlans.find((p) => p.id === planId);
    if (plan && next.players[next.currentPlayerIndex]?.dcaPlans?.some((p) => p.id === planId)) {
      next = appendBug(next, {
        category: 'state_machine',
        severity: 'critical',
        message: 'DELETE_DCA_PLAN 后计划仍存在',
        action: action.type,
      });
    }
  }

  // 【v3.11】校验重复持仓：同一只股票不应存在多个独立 Asset
  if (player && action.type === 'MOVE_PLAYER') {
    const stockAssets = player.assets.filter((a) => isStockLotAsset(a));
    const seen = new Map<string, number>();
    for (const sa of stockAssets) {
      const key = sa.metadata?.ticker ?? sa.name;
      const existing = seen.get(key);
      if (existing !== undefined) {
        // 找到重复：比较当前价格是否一致
        const first = stockAssets[existing];
        if (first.shareHand !== sa.shareHand || Math.abs(first.cost - sa.cost) > 1) {
          next = appendBug(next, {
            category: 'data_invalid',
            severity: 'critical',
            message: `同一只股票 "${sa.name}" 存在 ${stockAssets.filter((x) => (x.metadata?.ticker ?? x.name) === key).length} 个独立持仓（应为合并为 1 个）`,
            action: action.type,
            snapshot: {
              players: [
                {
                  ...next.players[next.currentPlayerIndex],
                  assets: player.assets.filter((a) =>
                    isStockLotAsset(a) && (a.metadata?.ticker ?? a.name) === key
                  ),
                },
              ],
            },
          });
          break;
        }
      } else {
        seen.set(key, stockAssets.indexOf(sa));
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
