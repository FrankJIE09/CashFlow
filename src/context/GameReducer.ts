import type { Asset, AssetType, Card, CardType, DoodadCard, DcaPlan, GameAction, GameConfig, GameState, Liability, MarketEffect, OpportunityCard, Player, PregnancyPath, Space } from '../types/game';
import { runTestValidators } from '../utils/testValidators';
import { PROFESSIONS, PLAYER_COLORS, CUSTOM_PROFESSION_ID, buildCustomProfession, getProfessionAgeConfig, isSelfEmployedProfession } from '../data/professions';
import { getCityById, DEFAULT_CITY_ID } from '../data/cities';
import { SPACES } from '../data/boardLayout';
import { OPPORTUNITY_CARDS } from '../data/opportunityCards';
import { MARKET_CARDS } from '../data/marketCards';
import { DOODAD_CARDS } from '../data/doodadCards';
import {
  calculateBuyCost,
  calculateSellProceeds,
  calcPrepaymentPenalty,
  canPurchaseOpportunity,
  checkBankruptcy,
  checkFinancialFreedom,
  calcUnemploymentHappinessPenalty,
  calcStockProfit,
  createDefaultMultiplierRecord,
  createLiability,
  getAssetPriceMultiplier,
  getAssetTypeLabel,
  getMonthlyCashFlow,
  getOpportunityAsset,
  getPassiveIncome,
  getPropertyTax,
  getRealEstateMortgageDebtType,
  getTotalAssetsValue,
  inferDebtTypeFromLiability,
  inferProfessionDebtType,
  isAssetTypeKey,
  isSellableAsset,
  isStockLotAsset,
  buildStockLotAsset,
  liquidateAsset,
  needsLiquidation,
  normalizeLiability,
  syncExpenseOnRepay,
  calcLiabilityMonthlyPayment,
  applyCityTierDownPayment,
  scaleAssetByPlayerCity,
  recalcAllPlayersMortgagesOnRateChange,
  weddingCost,
  remarriageCost,
  calcPartnerSalary,
  marriageOverhead,
  pregnancyMedicalCost,
  miscarriageCost,
  divorceSettlement,
  getDivorceProbability,
  rollMarriageHappinessDelta,
  getUnemploymentProbability,
  calcAgeUnemploymentRate,
  calcPensionIncome,
  calcElderlyMedicalExpense,
  calcMarriageHappinessBySalary,
  calcHighDebtHappinessPenalty,
  stockLotSellProceeds,
  updateStockPeByPercent,
  getStockBasePe,
  calcCurrentStockPrice,
  syncPbAndDivYieldOnPeChange,
  applyMonthlyIntrinsicGrowth,
  getRentExpense,
  // DCA imports used in GameReducer
  isDcaSupported,
  getDcaSmartMultiplier,
  calcDcaBuyLots,
  calcDcaActualCost,
  getAssetAverageCost,
  STOCK_LOT_SIZE,
  findExistingStockHolding,
  consolidateStockHoldings,
  applyCardIntrinsicGrowth,
  simulateCardPeDrift,
} from '../utils/financial';
import { applyInsuranceDeductible } from '../utils/financial';
import { drawCard, generateId, shuffle } from '../utils/random';
import { canReceiveCareerEvent, rollCareerEvent } from '../utils/career';
import type { CareerEvent } from '../types/game';

const CHARITY_TURNS = 3;
const CHILDREN_LIMIT = 3;
const FAST_TRACK_WIN_AMOUNT = 500000;
const PREGNANCY_DURATION = 9;
const MATERNITY_LEAVE_MONTHS = 6;

/** 【v3.8】按城市线级获取一次性生育补贴 */
function getOneTimeChildbirthSubsidy(cityId: string): number {
  const city = getCityById(cityId);
  // tier1=5000, tier2=4000, tier3=3000, tier4=2000
  switch (city.tier) {
    case 'tier1': return 5000;
    case 'tier2': return 4000;
    case 'tier3': return 3000;
    case 'tier4': return 2000;
    default: return 3000;
  }
}

/** 【v3.8】流产一次性康复补助 */
function getMiscarriageRehabAllowance(cityId: string): number {
  const city = getCityById(cityId);
  switch (city.tier) {
    case 'tier1': return 2000;
    case 'tier2': return 1500;
    case 'tier3': return 1000;
    case 'tier4': return 500;
    default: return 1000;
  }
}

/** 【v3.8】0-3 岁儿童月度补贴（每人每月） */
function getChildMonthlySubsidy(cityId: string): number {
  const city = getCityById(cityId);
  switch (city.tier) {
    case 'tier1': return 300;
    case 'tier2': return 200;
    case 'tier3': return 150;
    case 'tier4': return 100;
    default: return 200;
  }
}

/** 【v3.8】女性产假月度补贴 = 城市 tier 基础 */
function getMaternityLeaveMonthlySubsidy(cityId: string): number {
  const city = getCityById(cityId);
  switch (city.tier) {
    case 'tier1': return 2500;
    case 'tier2': return 2000;
    case 'tier3': return 1500;
    case 'tier4': return 1000;
    default: return 2000;
  }
}

/** 【v3.8】女性 0-3 岁育儿月度幸福度惩罚 */
function getChildHappinessPenalty(childCount: number): number {
  return childCount * 5;
}

function getProfessionTier(player: Player): import('../types/game').ProfessionTier {
  const prof = PROFESSIONS.find((p) => p.id === player.professionId);
  return prof?.tier ?? 'service';
}

function canReceivePromotion(player: Player): boolean {
  return canReceiveCareerEvent(player);
}

function careerEventToLegacyOffer(event: CareerEvent): { salaryBoostPct: number; cost: number } | null {
  if (event.type === 'promotion' && event.salaryBoostPct != null && event.cost != null) {
    return { salaryBoostPct: event.salaryBoostPct, cost: event.cost };
  }
  return null;
}

function advanceOneMonth(state: GameState, playerIndex: number): GameState {
  const prevAge = state.players[playerIndex].age;
  let newState = updatePlayer(state, playerIndex, (p) => {
    let ageMonths = (p.ageMonths ?? 0) + 1;
    let age = p.age;
    let currentGameYear = p.currentGameYear;
    if (ageMonths >= 12) {
      ageMonths = 0;
      age += 1;
      currentGameYear += 1;
    }
    // 【v3.8】子嗣年龄增长：所有 childAges +1，移除满 36 月（3 岁）的孩子
    const childAges = p.childAges.map(a => a + 1).filter(a => a <= 36);
    // 【v3.8】产假递减
    let maternityLeaveRemaining = p.maternityLeaveRemaining;
    let maternitySubsidy = p.maternitySubsidy;
    if (maternityLeaveRemaining > 0) {
      maternityLeaveRemaining -= 1;
      if (maternityLeaveRemaining <= 0) {
        maternitySubsidy = 0;
      }
    }
    return { ...p, ageMonths, age, currentGameYear, childAges, maternityLeaveRemaining, maternitySubsidy };
  });
  const updated = newState.players[playerIndex];

  if (updated.age > prevAge) {
    newState = addLog(
      newState,
      updated.id,
      `${updated.name} 又长一岁，现年 ${updated.age}岁${updated.ageMonths ? `${updated.ageMonths}月` : ''}`,
      'system'
    );
  }

  if (
    updated.retireStandardAge != null &&
    updated.age >= updated.retireStandardAge &&
    !updated.isRetired
  ) {
    return applyMonthlyStockPeDrift({ ...newState, pendingLifeEvent: 'retirement' as const });
  }
  return applyMonthlyStockPeDrift(newState);
}

function onLapCrossed(state: GameState, playerIndex: number): GameState {
  const updated = state.players[playerIndex];
  return addLog(state, updated.id, `${updated.name} 跑完一圈`, 'system');
}

function executeRetirement(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  const lastSalary = player.baseSalary ?? player.salary;
  const pension = calcPensionIncome(lastSalary, player.cityId);
  const elderlyMedical = calcElderlyMedicalExpense(player.cityId);

  let newState = updatePlayer(state, playerIndex, (p) => ({
    ...p,
    isRetired: true,
    salary: 0,
    pensionIncome: pension,
    baseSalary: lastSalary,
    isUnemployed: false,
    unemploymentTurnsRemaining: 0,
    expenses: { ...p.expenses, medicalElderly: elderlyMedical },
  }));
  newState = addLog(
    newState,
    player.id,
    `${player.name} 正式退休！养老金 ${pension}/月，老年医疗 +${elderlyMedical}/月`,
    'system'
  );
  return checkAndHandleBankruptcy(newState);
}

function processMonthlyLifeEvents(state: GameState, playerIndex: number): GameState {
  let newState = state;

  // 【v3.11】自动合并重复的同一只股票持仓
  newState = updatePlayer(newState, playerIndex, (p) => ({
    ...p,
    assets: consolidateStockHoldings(p.assets),
  }));

  // 月度资产刷新：持有月数/车辆折旧/大宗商品价格波动
  newState = updatePlayer(newState, playerIndex, (p) => ({
    ...p,
    assets: p.assets.map((a) => {
      // 股票：持有月数 +1
      if (isStockLotAsset(a)) {
        return { ...a, heldMonths: (a.heldMonths ?? 0) + 1 };
      }
      // 车辆（entity + sector=汽车）：每月 0.5% 折旧
      if (a.type === 'entity' && a.metadata?.sector === '汽车') {
        const depRate = 0.005;
        const newMV = Math.round(a.marketValue * (1 - depRate));
        const newCF = -Math.round(newMV * depRate * 0.3);
        return { ...a, marketValue: newMV, cashFlow: Math.min(0, newCF) };
      }
      // 大宗商品：每月随机 ±2% 价格波动
      if (a.type === 'commodity') {
        const fluct = 0.98 + Math.random() * 0.04;
        const newMV = Math.round(a.marketValue * fluct);
        const ratio = newMV / Math.max(a.marketValue, 1);
        const newCF = Math.round((a.cashFlow ?? 0) * ratio);
        return { ...a, marketValue: newMV, cashFlow: newCF };
      }
      return applyMonthlyIntrinsicGrowth(a);
    }),
  }));

  const updated = newState.players[playerIndex];

  // 临时裁员风险上升倒计时
  if ((updated.layoffRiskBoostTurnsRemaining ?? 0) > 0) {
    const remaining = (updated.layoffRiskBoostTurnsRemaining ?? 1) - 1;
    newState = updatePlayer(newState, playerIndex, (p) => ({
      ...p,
      layoffRiskBoostTurnsRemaining: remaining,
      ...(remaining <= 0
        ? { layoffRiskModifier: Math.max(0.05, (p.layoffRiskModifier ?? 1) / 1.5) }
        : {}),
    }));
  }

  // 职业转型薪资恢复
  if ((updated.careerTransitionTurnsRemaining ?? 0) > 0) {
    const remaining = (updated.careerTransitionTurnsRemaining ?? 1) - 1;
    const base = updated.careerTransitionBaseSalary ?? updated.baseSalary ?? updated.salary;
    const targetBoost = updated.careerTransitionTargetBoostPct ?? 0.15;
    const targetSalary = Math.round(base * (1 + targetBoost));
    const startSalary = Math.round(base * 0.5);
    const totalTurns = 5;
    const elapsed = totalTurns - remaining;
    const progress = Math.min(1, elapsed / totalTurns);
    const newSalary = Math.round(startSalary + (targetSalary - startSalary) * progress);
    newState = updatePlayer(newState, playerIndex, (p) => ({
      ...p,
      careerTransitionTurnsRemaining: remaining,
      salary: newSalary,
      ...(remaining <= 0
        ? {
            baseSalary: targetSalary,
            careerTransitionBaseSalary: undefined,
            careerTransitionTargetBoostPct: undefined,
            layoffRiskModifier: Math.max(0.05, (p.layoffRiskModifier ?? 1) * 0.85),
          }
        : {}),
    }));
    if (remaining <= 0) {
      newState = addLog(
        newState,
        updated.id,
        `${updated.name} 职业转型完成，月薪 ${targetSalary} 元`,
        'income'
      );
    }
  }

  const afterCareer = newState.players[playerIndex];

  // 失业倒计时与婚姻惩罚
  if (afterCareer.isUnemployed) {
    const consecutive = (afterCareer.consecutiveUnemployedTurns ?? 0) + 1;
    const penalty = calcUnemploymentHappinessPenalty(
      { ...afterCareer, consecutiveUnemployedTurns: consecutive },
      state.cashFlowMultiplier,
      state.sectorMultiplier
    );
    newState = updatePlayer(newState, playerIndex, (p) => ({
      ...p,
      consecutiveUnemployedTurns: consecutive,
      marriageHappiness:
        p.marriageStatus === 'married'
          ? Math.max(0, p.marriageHappiness - penalty)
          : p.marriageHappiness,
    }));

    if ((afterCareer.unemploymentTurnsRemaining ?? 0) > 0) {
      const remaining = (afterCareer.unemploymentTurnsRemaining ?? 1) - 1;
      newState = updatePlayer(newState, playerIndex, (p) => ({
        ...p,
        unemploymentTurnsRemaining: remaining,
      }));
      if (remaining <= 0) {
        const base = afterCareer.baseSalary ?? afterCareer.salary;
        const reduced = Math.round(base * (0.85 + Math.random() * 0.1));
        newState = updatePlayer(newState, playerIndex, (p) => ({
          ...p,
          isUnemployed: false,
          unemploymentTurnsRemaining: 0,
          consecutiveUnemployedTurns: 0,
          postEmploymentScarTurnsRemaining: 3,
          salary: reduced,
        }));
        newState = addLog(
          newState,
          afterCareer.id,
          `${afterCareer.name} 失业期结束，再就业月薪 ${reduced} 元（3 回合幸福度疤痕）`,
          'system'
        );
      }
    }
  } else if ((afterCareer.postEmploymentScarTurnsRemaining ?? 0) > 0) {
    const remaining = (afterCareer.postEmploymentScarTurnsRemaining ?? 1) - 1;
    const penalty = calcUnemploymentHappinessPenalty(afterCareer, state.cashFlowMultiplier, state.sectorMultiplier);
    newState = updatePlayer(newState, playerIndex, (p) => ({
      ...p,
      postEmploymentScarTurnsRemaining: remaining,
      marriageHappiness:
        p.marriageStatus === 'married' && penalty > 0
          ? Math.max(0, p.marriageHappiness - penalty)
          : p.marriageHappiness,
    }));
  } else if ((afterCareer.partnerUnemployedTurnsRemaining ?? 0) > 0) {
    const penalty = calcUnemploymentHappinessPenalty(afterCareer, state.cashFlowMultiplier, state.sectorMultiplier);
    newState = updatePlayer(newState, playerIndex, (p) => ({
      ...p,
      marriageHappiness:
        p.marriageStatus === 'married'
          ? Math.max(0, p.marriageHappiness - penalty)
          : p.marriageHappiness,
    }));
  }

  const afterUnemployment = newState.players[playerIndex];

  // 【新增】v3.2 临时支出倒计时
  if ((afterUnemployment.tempExpenseTurnsRemaining ?? 0) > 0) {
    const remaining = (afterUnemployment.tempExpenseTurnsRemaining ?? 1) - 1;
    newState = updatePlayer(newState, playerIndex, (p) => ({
      ...p,
      tempExpenseTurnsRemaining: remaining,
      ...(remaining <= 0 ? { tempPerChildBoost: 0 } : {}),
    }));
  }

  // 配偶失业倒计时
  if ((afterUnemployment.partnerUnemployedTurnsRemaining ?? 0) > 0) {
    const remaining = (afterUnemployment.partnerUnemployedTurnsRemaining ?? 1) - 1;
    newState = updatePlayer(newState, playerIndex, (p) => ({
      ...p,
      partnerUnemployedTurnsRemaining: remaining,
    }));
    if (remaining <= 0) {
      newState = updatePlayer(newState, playerIndex, (p) => ({
        ...p,
        partnerUnemployedTurnsRemaining: 0,
        // 清除 familyIncome 快照，让 getEffectiveSalary 重新完整计算
        familyIncome: undefined,
      }));
      newState = addLog(
        newState,
        afterUnemployment.id,
        `${afterUnemployment.name} 的伴侣重新找到工作`,
        'system'
      );
    }
  }

  const afterTemp = newState.players[playerIndex];

    // 婚恋幸福度与 DINK
  if (afterTemp.marriageStatus === 'married') {
    const passiveIncome = getPassiveIncome(afterTemp, state.cashFlowMultiplier, state.sectorMultiplier);
    const city = getCityById(afterTemp.cityId);
    const salaryBonus = calcMarriageHappinessBySalary(afterTemp.salary, passiveIncome, city.expenseMultiplier);
    const promoBoost = afterTemp.monthlyMarriageHappinessBoost ?? 0;
    const delta = rollMarriageHappinessDelta() + salaryBonus + promoBoost;
    newState = updatePlayer(newState, playerIndex, (p) => {
      let happiness = Math.min(100, Math.max(0, p.marriageHappiness + delta));
      // 【v3.8】女性持有0-3岁子嗣时月幸福度 -5
      if (p.gender === 'female' && p.childAges.length > 0) {
        happiness = Math.max(0, happiness - getChildHappinessPenalty(p.childAges.length));
      }
      // 【新增】v3.10 高负债婚姻幸福惩罚
      const highDebtPenalty = calcHighDebtHappinessPenalty(p);
      if (highDebtPenalty > 0) {
        happiness = Math.max(0, happiness - highDebtPenalty);
      }
      return { ...p, marriageHappiness: happiness, highDebtHappinessPenalty: highDebtPenalty };
    });

    // 【v3.8】孕期处理（含性别差异化流产、产假、生育补贴）
    if (afterTemp.hasPregnancy) {
      const months = (afterTemp.pregnancyMonths ?? 0) + 1;
      if (Math.random() < 0.05) {
        const cost = miscarriageCost(afterTemp.cityId);
        const rehabAllowance = getMiscarriageRehabAllowance(afterTemp.cityId);
        // 女性流产幸福度惩罚翻倍
        const happinessPenalty = afterTemp.gender === 'female' ? 20 : 10;
        newState = updatePlayer(newState, playerIndex, (p) => ({
          ...p,
          hasPregnancy: false,
          pregnancyMonths: 0,
          cash: p.cash - cost + rehabAllowance,
          expenses: {
            ...p.expenses,
            medicalPregnancy: 0,
          },
          marriageHappiness: Math.max(0, p.marriageHappiness - happinessPenalty),
        }));
        newState = addLog(
          newState,
          afterTemp.id,
          `${afterTemp.name} 遭遇流产，支出 ${cost} 元，康复补助 ${rehabAllowance} 元`,
          'expense'
        );
      } else if (months >= PREGNANCY_DURATION) {
        if (afterTemp.children < CHILDREN_LIMIT) {
          // 【v3.8】一次性生育补贴 + 女性产假启动 + 0-3岁追踪
          const oneTimeSubsidy = getOneTimeChildbirthSubsidy(afterTemp.cityId);
          const insuranceBoost = afterTemp.hasMedicalInsuranceCard ? 1.5 : 1;
          const totalSubsidy = Math.round(oneTimeSubsidy * insuranceBoost);
          // 女性产妇：6个月产假补贴
          const maternitySubsidy = afterTemp.gender === 'female' ? getMaternityLeaveMonthlySubsidy(afterTemp.cityId) : 0;
          const maternityLeave = afterTemp.gender === 'female' ? MATERNITY_LEAVE_MONTHS : 0;

          newState = updatePlayer(newState, playerIndex, (p) => ({
            ...p,
            hasPregnancy: false,
            pregnancyMonths: 0,
            children: p.children + 1,
            childAges: [...p.childAges, 0],
            cash: p.cash + totalSubsidy,
            expenses: { ...p.expenses, medicalPregnancy: 0 },
            marriageHappiness: Math.min(100, p.marriageHappiness + 10),
            maternityLeaveRemaining: maternityLeave,
            maternitySubsidy,
          }));
          newState = addLog(
            newState,
            afterTemp.id,
            `${afterTemp.name} 顺利分娩，孩子 +1，一次性生育补贴 ${totalSubsidy} 元${afterTemp.gender === 'female' ? `，产假 ${MATERNITY_LEAVE_MONTHS} 月` : ''}`,
            'system'
          );
        } else {
          newState = updatePlayer(newState, playerIndex, (p) => ({
            ...p,
            hasPregnancy: false,
            pregnancyMonths: 0,
            expenses: { ...p.expenses, medicalPregnancy: 0 },
          }));
        }
      } else {
        newState = updatePlayer(newState, playerIndex, (p) => ({
          ...p,
          pregnancyMonths: months,
        }));
      }
    }

    // 离婚判定：改为设置待确认弹窗
    const afterLife = newState.players[playerIndex];
    const divorceProb = getDivorceProbability(afterLife);
    if (divorceProb > 0 && Math.random() < divorceProb) {
      newState = prepareDivorcePending(newState, playerIndex);
    }
  }

  return checkAndHandleBankruptcy(newState);
}

function executeDivorce(state: GameState, playerIndex: number, keepHouse: boolean): GameState {
  const player = state.players[playerIndex];
  const settlement = divorceSettlement(player);
  const legalFees = settlement.legalFees;
  const cashToSpouse = settlement.cashToSpouse;
  const discount = settlement.forcedAssetDiscount;
  const divorceCount = (player.divorceCount ?? 0) + 1;
  const newStatus = divorceCount >= 2 ? ('ineligible' as const) : ('divorced' as const);

  const maritalAssets = player.assets.filter((a) => a.type === 'realEstate' || a.type === 'stock');
  const mult = (asset: Asset) => discount * getAssetPriceMultiplier(asset, state.marketMultiplier, state.sectorMultiplier);

  let newState = state;
  const soldIds = new Set<string>();
  const keptIds = new Set<string>();

  for (const asset of maritalAssets) {
    const isRealEstate = asset.type === 'realEstate';
    let grossProceeds = isRealEstate
      ? calculateSellProceeds(asset, mult(asset), state.sectorMultiplier)
      : stockLotSellProceeds(asset, asset.shareHand ?? 0, mult(asset), state.sectorMultiplier);

    // 找到关联贷款本金
    const securedLiabilities = player.liabilities.filter(l => l.securedAssetId === asset.id);
    const mortgagePrincipal = securedLiabilities.reduce((sum, l) => sum + l.principal, 0);
    const equity = Math.max(0, grossProceeds - mortgagePrincipal);
    const spouseShare = Math.round(equity * 0.5);

    if (isRealEstate && keepHouse) {
      // 保留房产：从现金中支付配偶份额
      keptIds.add(asset.id);
      newState = updatePlayer(newState, playerIndex, (p) => ({
        ...p,
        cash: Math.max(0, p.cash - spouseShare),
      }));
    } else {
      // 卖房/卖股票
      soldIds.add(asset.id);
      if (isRealEstate) {
        newState = updatePlayer(newState, playerIndex, (p) => {
          const { netCash, updatedLiabilities } = settleAssetLoan(p, asset.id, grossProceeds, '离婚房贷差额');
          const playerHalf = Math.round(netCash * 0.5);
          return {
            ...p,
            cash: p.cash + playerHalf,
            assets: p.assets.filter((a) => a.id !== asset.id),
            liabilities: updatedLiabilities,
          };
        });
      } else {
        const playerHalf = Math.round(grossProceeds * 0.5);
        newState = updatePlayer(newState, playerIndex, (p) => ({
          ...p,
          cash: p.cash + playerHalf,
          assets: p.assets.filter((a) => a.id !== asset.id),
        }));
      }
    }
  }

  // 统一处理婚姻状态变更、现金分割、律师费、支出调整
  newState = updatePlayer(newState, playerIndex, (p) => ({
    ...p,
    cash: Math.max(0, p.cash - cashToSpouse - legalFees),
    marriageStatus: newStatus,
    marriageHappiness: 0,
    partnerSalary: 0,
    divorceCount,
    monthlyMarriageHappinessBoost: 0,
    hasPregnancy: false,
    pregnancyMonths: 0,
    dinkTurns: 0,
    familyIncome: undefined,
    expenses: {
      ...p.expenses,
      medicalPregnancy: 0,
      other: Math.max(0, p.expenses.other - marriageOverhead(p.cityId)),
    },
  }));

  const statusNote =
    newStatus === 'ineligible'
      ? '，永久失去再婚资格'
      : settlement.isPostRemarriage
        ? '（再婚后再离，分割更严）'
        : '';
  const sellOrKeep = keepHouse
    ? `保留${keptIds.size}处房产`
    : `出售${soldIds.size}处资产`;
  newState = addLog(
    newState,
    player.id,
    `${player.name} 离婚：${sellOrKeep}，分割现金 ${Math.round((settlement.isPostRemarriage ? 0.6 : 0.5) * 100)}%、律师费 ${legalFees} 元${statusNote}`,
    'expense'
  );
  return {
    ...checkAndHandleBankruptcy(newState),
    pendingDivorce: null,
  };
}

/** 准备离婚待确认弹窗：计算共有财产明细，不执行任何分割 */
function prepareDivorcePending(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  const settlement = divorceSettlement(player);
  const discount = settlement.forcedAssetDiscount;

  const maritalAssets = player.assets.filter((a) => a.type === 'realEstate' || a.type === 'stock');
  const assetInfos = maritalAssets.map((asset) => {
    const mult = discount * getAssetPriceMultiplier(asset, state.marketMultiplier, state.sectorMultiplier);
    const marketValue = Math.round(
      asset.type === 'realEstate'
        ? calculateSellProceeds(asset, mult, state.sectorMultiplier)
        : stockLotSellProceeds(asset, asset.shareHand ?? 0, mult, state.sectorMultiplier)
    );
    const securedLiabilities = player.liabilities.filter(l => l.securedAssetId === asset.id);
    const mortgagePrincipal = securedLiabilities.reduce((sum, l) => sum + l.principal, 0);
    const equity = Math.max(0, marketValue - mortgagePrincipal);
    return {
      id: asset.id,
      name: asset.name,
      type: asset.type,
      isSelfLiving: asset.type === 'realEstate' ? (asset.isSelfLiving ?? false) : false,
      marketValue,
      mortgagePrincipal,
      equity,
      spouseShare: Math.round(equity * 0.5),
    };
  });

  return {
    ...state,
    pendingDivorce: {
      cashToSpouse: settlement.cashToSpouse,
      legalFees: settlement.legalFees,
      forcedAssetDiscount: discount,
      isPostRemarriage: settlement.isPostRemarriage ?? false,
      maritalAssets: assetInfos,
    },
  };
}

function updatePlayer(state: GameState, index: number, updater: (player: Player) => Player): GameState {
  const players = [...state.players];
  players[index] = updater({ ...players[index] });
  return { ...state, players };
}

function addLog(
  state: GameState,
  playerId: string,
  message: string,
  type: GameState['logs'][number]['type'] = 'system'
): GameState {
  return {
    ...state,
    logs: [
      ...state.logs,
      {
        id: generateId(),
        timestamp: Date.now(),
        playerId,
        message,
        type,
      },
    ],
  };
}

function findNextActivePlayer(state: GameState): number {
  let index = state.currentPlayerIndex;
  for (let i = 0; i < state.players.length; i++) {
    index = (index + 1) % state.players.length;
    if (!state.players[index].isBankrupt) return index;
  }
  return index;
}

/** 每月市场自然波动：资产价格随机游走 + 均值回归
 * 权益类（stock/overseas/derivative）：乘数波动转为 currentPe 同比例变化，然后重置乘数为 1
 * 非权益类：保留乘数直接作用于价格
 */
function applyMonthlyMarketDrift(state: GameState): GameState {
  let newMult = { ...state.marketMultiplier };
  let newCF = { ...state.cashFlowMultiplier };
  let newSector = { ...state.sectorMultiplier };

  const VOLATILITY = 0.025;
  const MEAN_REVERSION = 0.05;

  // 对所有资产类型做随机游走 + 均值回归
  for (const type of Object.keys(newMult) as AssetType[]) {
    const pull = (1 - newMult[type]) * MEAN_REVERSION;
    const walk = (Math.random() - 0.5) * VOLATILITY * 2;
    const delta = pull + walk;
    newMult[type] = Math.max(0.5, Math.min(2.5, newMult[type] + newMult[type] * delta));
    newCF[type] = Math.max(0.5, Math.min(2.5, newCF[type] + newCF[type] * delta));
  }

  // sectorMultiplier 也做自然波动
  for (const sector of Object.keys(newSector)) {
    const pull = (1 - newSector[sector]) * MEAN_REVERSION;
    const walk = (Math.random() - 0.5) * VOLATILITY * 2;
    const delta = pull + walk;
    newSector[sector] = Math.max(0.5, Math.min(2.5, newSector[sector] + newSector[sector] * delta));
  }

  let newState = { ...state, marketMultiplier: newMult, cashFlowMultiplier: newCF, sectorMultiplier: newSector };

  // 将 equity 类型的乘数变动折算到 currentPe，然后重置乘数为 1
  newState = convertEquityMultiplierToPe(newState);

  return newState;
}

/** 将 equity 类资产的市场乘数 / 行业乘数变动折算到 currentPe */
function convertEquityMultiplierToPe(state: GameState): GameState {
  const EQUITY_TYPES: ReadonlySet<AssetType> = new Set(['stock', 'overseas', 'derivative']);
  const { marketMultiplier, sectorMultiplier } = state;

  const newPlayers = state.players.map((player) => ({
    ...player,
    assets: player.assets.map((asset) => {
      if (!isStockLotAsset(asset) || asset.basePe == null) return asset;
      if (!EQUITY_TYPES.has(asset.type)) return asset;

      const typeMult = marketMultiplier[asset.type] ?? 1;
      const sectorMult = asset.metadata?.sector ? (sectorMultiplier[asset.metadata.sector] ?? 1) : 1;
      const combinedRate = typeMult * sectorMult;

      if (Math.abs(combinedRate - 1) < 0.001) return asset;

      const basePe = asset.basePe!;
      const oldPe = asset.currentPe ?? basePe;
      let newPe = oldPe * combinedRate;
      const minPe = basePe * 0.4;
      const maxPe = basePe * 2.0;
      newPe = Math.max(minPe, Math.min(maxPe, Math.round(newPe * 100) / 100));

      return syncPbAndDivYieldOnPeChange(asset, newPe);
    }),
  }));

  // 重置 equity 类型的 marketMultiplier 为 1
  const newMarketMult = { ...marketMultiplier };
  for (const t of EQUITY_TYPES) {
    newMarketMult[t] = 1;
  }

  return { ...state, players: newPlayers, marketMultiplier: newMarketMult };
}

/**
 * 月度股票 PE 随机波动：对所有玩家持有的股票资产，
 * 每个游戏月施加 ±6% 随机漂移（控制在 basePe×0.4 ~ basePe×2.0 范围内防止极端偏离）
 */
function applyMonthlyStockPeDrift(state: GameState): GameState {
  const players = state.players.map((player) => {
    const assets = player.assets.map((asset) => {
      if (!isStockLotAsset(asset) || asset.basePe == null || asset.type === 'reit') return asset;
      const basePe = asset.basePe;
      const currentPe = asset.currentPe ?? basePe;
      const DRIFT_RANGE = 0.06; // ±6%
      const driftPct = (Math.random() - 0.5) * 2 * DRIFT_RANGE;
      let newPe = currentPe * (1 + driftPct);
      const minPe = basePe * 0.4;
      const maxPe = basePe * 2.0;
      newPe = Math.max(minPe, Math.min(maxPe, Math.round(newPe * 100) / 100));
      return syncPbAndDivYieldOnPeChange(asset, newPe);
    });
    return { ...player, assets };
  });
  return { ...state, players };
}

function advanceTurn(state: GameState): GameState {
  const nextIndex = findNextActivePlayer(state);
  const isNewRound = nextIndex === 0;
  const round = isNewRound ? state.round + 1 : state.round;
  let newState = { ...state, currentPlayerIndex: nextIndex, round };

  // 每回合市场自然波动
  if (isNewRound) {
    newState = applyMonthlyMarketDrift(newState);
  }

  return newState;
}

function finishEndTurn(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];

  if (
    !player.isBankrupt &&
    checkFinancialFreedom(player, state.cashFlowMultiplier, state.sectorMultiplier) &&
    !player.isInFastTrack
  ) {
    const newState = updatePlayer(state, playerIndex, (p) => ({
      ...p,
      isInFastTrack: true,
      fastTrackPosition: 0,
      cash: p.cash + getTotalAssetsValue(p, state.marketMultiplier, state.sectorMultiplier),
      liabilities: [],
      position: 0,
    }));
    const logState = addLog(newState, player.id, `${player.name} 实现财务自由，进入快车道！`, 'system');
    return { ...advanceTurn(logState), phase: 'ROLLING' };
  }

  if (player.isInFastTrack && player.cash >= FAST_TRACK_WIN_AMOUNT) {
    const winnerState = { ...state, winner: player, phase: 'GAME_OVER' as const };
    return addLog(winnerState, player.id, `${player.name} 在快车道积累 ${FAST_TRACK_WIN_AMOUNT} 元，赢得游戏！`, 'win');
  }

  // 【v3.10】更新租金支出
  const rentState = updatePlayer(state, playerIndex, (p) => ({
    ...p,
    rentExpense: getRentExpense(p, p.cityId),
  }));

  const nextState = advanceTurn(rentState);

  if (state.testMode && state.testMaxRounds && nextState.round > state.testMaxRounds) {
    return addLog(
      { ...nextState, testStopped: true, phase: 'GAME_OVER' as const, winner: null },
      player.id,
      `【自动测试】已达 ${state.testMaxRounds} 回合上限，测试结束`,
      'system'
    );
  }

  let activeState = checkAndHandleBankruptcy(nextState);
  if (activeState.phase === 'GAME_OVER') {
    return activeState;
  }

  let safety = 0;
  while (activeState.players[activeState.currentPlayerIndex].isBankrupt && safety < activeState.players.length) {
    activeState = advanceTurn(activeState);
    activeState = checkAndHandleBankruptcy(activeState);
    if (activeState.phase === 'GAME_OVER') {
      return activeState;
    }
    safety++;
  }

  const nextPlayer = activeState.players[activeState.currentPlayerIndex];
  if (nextPlayer.isInFastTrack) {
    return { ...activeState, phase: 'FAST_TRACK' };
  }
  return { ...activeState, phase: 'ROLLING' };
}

function checkAndHandleBankruptcy(state: GameState): GameState {
  const playerIndex = state.currentPlayerIndex;
  const player = state.players[playerIndex];
  const cf = getMonthlyCashFlow(player, state.cashFlowMultiplier, state.sectorMultiplier);

  // 现金流已恢复正值：清除变卖标记
  if (cf >= 0) {
    if (state.pendingLiquidation) {
      return { ...state, pendingLiquidation: false };
    }
    return state;
  }

  // 现金已为正数（如变卖资产后）：清除变卖标记，不需继续变卖
  if (player.cash > 0 && state.pendingLiquidation) {
    return { ...state, pendingLiquidation: false };
  }

  if (needsLiquidation(player, state.cashFlowMultiplier, state.sectorMultiplier)) {
    if (state.pendingLiquidation && state.phase === 'CARD_DECISION') return state;
    return {
      ...state,
      phase: 'CARD_DECISION',
      pendingLiquidation: true,
      currentCard: null,
    };
  }

  if (!checkBankruptcy(player, state.cashFlowMultiplier, state.sectorMultiplier)) return state;

  const cashFlow = cf;
  let newState = updatePlayer(state, playerIndex, (p) => ({
    ...p,
    isBankrupt: true,
    cash: 0,
  }));
  newState = addLog(
    newState,
    player.id,
    `${player.name} 现金耗尽且无可变卖资产，月现金流 ${cashFlow} 元，游戏失败！`,
    'system'
  );

  const activePlayers = newState.players.filter((p) => !p.isBankrupt);

  if (!player.isAI) {
    const aiWinner = activePlayers.find((p) => p.isAI) ?? null;
    return { ...newState, winner: aiWinner, phase: 'GAME_OVER' };
  }

  if (activePlayers.length === 1) {
    return { ...newState, winner: activePlayers[0], phase: 'GAME_OVER' };
  }

  if (activePlayers.length === 0) {
    return { ...newState, phase: 'GAME_OVER' };
  }

  return {
    ...newState,
    phase: 'TURN_END',
    currentCard: null,
    pendingLiquidation: false,
    pendingCashFlowSettlement: null,
    careerEvent: null,
    pendingSettlement: null,
  };
}

function handleSettlement(state: GameState, playerIndex: number, space: Space): GameState {
  const player = state.players[playerIndex];
  const propertyTax = getPropertyTax(player);
  const isAnnual = space.name === '年度结算';
  let taxAmount = propertyTax;

  if (isAnnual && propertyTax > 0) {
    taxAmount = propertyTax * 12;
  }

  let newState = state;
  if (taxAmount > 0) {
    newState = updatePlayer(newState, playerIndex, (p) => ({
      ...p,
      cash: p.cash - taxAmount,
    }));
    const label = isAnnual ? '年度房产持有税' : '房产持有税';
    newState = addLog(newState, player.id, `${player.name} 缴纳${label} ${taxAmount} 元`, 'expense');
  } else {
    newState = addLog(
      newState,
      player.id,
      `${player.name} 完成${space.name}（所得税已在月现金流中扣减）`,
      'system'
    );
  }

  newState = checkAndHandleBankruptcy(newState);
  return { ...newState, phase: 'TURN_END', pendingSettlement: null };
}

function prepareSettlement(state: GameState, playerIndex: number, space: Space): GameState {
  const player = state.players[playerIndex];
  const propertyTax = getPropertyTax(player);
  const isAnnual = space.name === '年度结算';
  let taxAmount = propertyTax;

  if (isAnnual && propertyTax > 0) {
    taxAmount = propertyTax * 12;
  }

  return {
    ...state,
    phase: 'CARD_DECISION',
    currentCard: null,
    pendingSettlement: { amount: taxAmount, isAnnual },
  };
}

function handlePayday(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  const cashFlow = getMonthlyCashFlow(player, state.cashFlowMultiplier, state.sectorMultiplier);
  let newState = updatePlayer(state, playerIndex, (p) => {
    let cash = p.cash + cashFlow;
    // 【v3.8】产假补贴 & 0-3 岁儿童月度补贴
    const maternitySubsidy = p.maternitySubsidy ?? 0;
    if (maternitySubsidy > 0) {
      cash += maternitySubsidy;
    }
    const childCount = p.childAges.length;
    if (childCount > 0) {
      // 0-3岁儿童月度补贴（每位儿童200元/月、可叠加、按城市缩放）
      const childSubsidyPerChild = getChildMonthlySubsidy(p.cityId);
      const totalChildSubsidy = childCount * childSubsidyPerChild;
      cash += totalChildSubsidy;
    }
    return {
      ...p,
      cash,
      liabilities: p.liabilities.map((l) => ({
        ...l,
        paidPeriods: (l.paidPeriods ?? 0) + 1,
      })),
    };
  });

  // 【v3.8】产假期间女性工资 80%
  newState = updatePlayer(newState, playerIndex, (p) => {
    if (p.maternityLeaveRemaining > 0 && p.gender === 'female') {
      const fullSalary = p.baseSalary ?? p.salary;
      const leaveSalary = Math.round(fullSalary * 0.8);
      return { ...p, salary: leaveSalary };
    }
    return p;
  });

  newState = addLog(
    newState,
    player.id,
    `${player.name} 发工资，现金流 ${cashFlow >= 0 ? '+' : ''}${cashFlow} 元`,
    'income'
  );

  if (cashFlow < 0) {
    newState = { ...newState, pendingCashFlowSettlement: { cashFlow } };
  }

  return processMonthlyLifeEvents(newState, playerIndex);
}

function drawCardAndUpdateState(
  state: GameState,
  cardType: CardType,
  player?: Player
): { state: GameState; card: Card } | null {
  // doodad 卡前置过滤：抽到不匹配身份的卡自动跳过，最多重试10次
  let remainingTries = 10;
  while (remainingTries > 0) {
    const result = drawCard(state.decks[cardType], state.discardPiles[cardType]);
    if (!result) return null;
    const newState: GameState = {
      ...state,
      decks: { ...state.decks, [cardType]: result.deck },
      discardPiles: { ...state.discardPiles, [cardType]: result.discardPile },
      currentCard: result.card,
    };
    // doodad 卡做身份过滤，不匹配则继续抽
    if (cardType !== 'doodad' || !player || (result.card.type === 'doodad' && passesCardFilter(player, result.card as DoodadCard))) {
      return { state: newState, card: result.card };
    }
    // 跳过此卡（已放入 discardPile），继续抽下一张
    state = newState;
    remainingTries--;
  }
  // 超过重试次数，返回最后一张
  const lastResult = drawCard(state.decks[cardType], state.discardPiles[cardType]);
  if (!lastResult) return null;
  return {
    state: { ...state, decks: { ...state.decks, [cardType]: lastResult.deck }, discardPiles: { ...state.discardPiles, [cardType]: lastResult.discardPile }, currentCard: lastResult.card },
    card: lastResult.card,
  };
}

function executeBuyAsset(
  state: GameState,
  playerIndex: number,
  asset: Asset,
  isDiscounted: boolean,
  dueDiligenceCost = 0,
  shareHand?: number
): GameState {
  const player = state.players[playerIndex];
  let newState = state;

  let finalAsset = asset;
  if (isStockLotAsset(asset)) {
    const lots = Math.max(0, Math.floor(shareHand ?? asset.shareHand ?? 1));
    if (!Number.isInteger(lots) || lots < 1) {
      return addLog(state, player.id, `${player.name} 股票须按整手买入（1手=100股）`, 'system');
    }
    // 【v3.11】用当前内在价值增长后的价格作为买入价
    const grownIntrinsic = applyCardIntrinsicGrowth(asset.intrinsicPrice ?? 0, asset, state.round);
    const growthRatio = grownIntrinsic / Math.max(asset.intrinsicPrice ?? 1, 0.01);
    let assetWithGrowth = { ...asset, intrinsicPrice: grownIntrinsic };
    // 非 PE 估值类（REIT 等）同步缩放 singlePrice 以反映内在价值增长
    const isEquity = asset.type === 'stock' || asset.type === 'overseas' || asset.type === 'derivative';
    if (!isEquity && growthRatio !== 1) {
      const newSinglePrice = Math.round((asset.singlePrice ?? 0) * growthRatio * 100) / 100;
      assetWithGrowth = { ...assetWithGrowth, singlePrice: newSinglePrice };
    }
    // PE 估值类额外应用确定性 PE 漂移（卡牌模板 PE 从未漂移过）
    if (isEquity) {
      const driftedPe = simulateCardPeDrift(assetWithGrowth, state.round);
      assetWithGrowth = { ...assetWithGrowth, currentPe: driftedPe };
    }
    const effectivePrice = calcCurrentStockPrice(assetWithGrowth, state.marketMultiplier, state.sectorMultiplier);
    finalAsset = buildStockLotAsset({ ...assetWithGrowth, singlePrice: effectivePrice }, lots, state.round);
  }

  const buyCost = calculateBuyCost(finalAsset, isStockLotAsset(finalAsset) ? finalAsset.shareHand : undefined) + dueDiligenceCost;
  const principalCost = isStockLotAsset(finalAsset)
    ? (finalAsset.shareHand ?? 0) * 100 * (finalAsset.singlePrice ?? 0)
    : finalAsset.downPayment;
  const transactionFee = buyCost - principalCost - dueDiligenceCost;
  const shortfall = buyCost - player.cash;

  // 先生成资产 ID，使贷款可关联到此抵押资产
  const newAssetId = generateId();

  if (shortfall > 0 && finalAsset.type === 'stock') {
    return addLog({ ...state, phase: 'TURN_END', currentCard: null }, player.id, `${player.name} 现金不足，${finalAsset.name}（股票）不允许贷款购买`, 'system');
  }

  if (shortfall > 0) {
    newState = updatePlayer(newState, playerIndex, (p) => ({
      ...p,
      cash: p.cash + shortfall,
      liabilities: [
        ...p.liabilities,
        {
          id: generateId(),
          ...createLiability({
            name: `${asset.name} 贷款`,
            principal: shortfall,
            debtType: 'bankBusinessLoan',
            source: 'game',
          }),
          securedAssetId: newAssetId,
        },
      ],
    }));
    newState = addLog(newState, player.id, `${player.name} 为购买 ${finalAsset.name} 贷款 ${shortfall} 元`, 'liability');
  }

  newState = updatePlayer(newState, playerIndex, (p) => {
    let newAsset = { ...finalAsset, id: newAssetId };
    if (newAsset.type === 'realEstate') {
      const hasSelfHome = p.assets.some(a => a.type === 'realEstate' && a.isSelfLiving);
      if (!hasSelfHome) {
        newAsset = { ...newAsset, isSelfLiving: true };
      }
    }

    // 【v3.11】同只股票合并持仓，避免各自独立漂移PE导致不同价格
    if (isStockLotAsset(finalAsset)) {
      const existing = findExistingStockHolding(finalAsset, p.assets);
      if (existing) {
        const totalLots = (existing.shareHand ?? 0) + (finalAsset.shareHand ?? 0);
        const totalCost = existing.cost + buyCost;
        return {
          ...p,
          cash: p.cash - buyCost,
          assets: p.assets.map((a) =>
            a.id === existing.id
              ? { ...a, shareHand: totalLots, cost: totalCost, downPayment: totalCost, marketValue: Math.round(totalLots * STOCK_LOT_SIZE * (existing.singlePrice ?? 0)) }
              : a
          ),
        };
      }
    }

    return { ...p, cash: p.cash - buyCost, assets: [...p.assets, newAsset] };
  });

  if (dueDiligenceCost > 0) {
    newState = addLog(newState, player.id, `${player.name} 支付尽调费 ${dueDiligenceCost} 元`, 'expense');
  }
  if (transactionFee > 0) {
    newState = addLog(newState, player.id, `${player.name} 支付交易费 ${transactionFee} 元`, 'expense');
  }

  if (finalAsset.mortgage > 0) {
    // 如果玩家有足够现金，允许全款支付跳过强制贷款
    const currentPlayer = newState.players[playerIndex];
    if (currentPlayer.cash >= finalAsset.mortgage) {
      newState = updatePlayer(newState, playerIndex, (p) => ({
        ...p,
        cash: p.cash - finalAsset.mortgage,
      }));
    } else {
      const mortgageDebtType =
        finalAsset.type === 'realEstate'
          ? getRealEstateMortgageDebtType(player, finalAsset)
          : 'bankBusinessLoan';

      newState = updatePlayer(newState, playerIndex, (p) => ({
        ...p,
        liabilities: [
          ...p.liabilities,
          {
            id: generateId(),
            ...createLiability({
              name: `${finalAsset.name} 抵押贷款`,
              principal: finalAsset.mortgage,
              debtType: mortgageDebtType,
              source: 'game',
            }),
            securedAssetId: newAssetId,
          },
        ],
      }));
    }
  }

  const lotInfo = isStockLotAsset(finalAsset) ? `（${finalAsset.shareHand} 手）` : '';
  newState = addLog(
    newState,
    player.id,
    `${player.name} ${isDiscounted ? '打折购买' : '购买'} ${finalAsset.name}${lotInfo}，总支出 ${buyCost} 元，月现金流 +${finalAsset.cashFlow} 元`,
    'asset'
  );
  newState = checkAndHandleBankruptcy(newState);
  return { ...newState, currentCard: null, phase: 'TURN_END' };
}

function applyInterestRateChange(
  state: GameState,
  playerId: string,
  rateChange: number,
  cardTitle?: string
): GameState {
  const oldRate = state.interestRate;
  const newRate = Math.max(0.001, oldRate + rateChange);
  const { players, changeLogs } = recalcAllPlayersMortgagesOnRateChange(state.players, newRate);
  let newState: GameState = { ...state, interestRate: newRate, players };

  // 利率 ↔ 资产价格联动：升息 → 资产估值下降，降息 → 上升
  if (rateChange !== 0) {
    const impact = 1 + rateChange * (-15); // 每升息1% → 估值约-15%
    const mMult = { ...newState.marketMultiplier };
    const cMult = { ...newState.cashFlowMultiplier };
    // 利率敏感型资产：房产/REITs/债券受影响最大，实体/商品次之
    const rateSensitive: AssetType[] = ['realEstate', 'reit', 'bond'];
    for (const t of rateSensitive) {
      mMult[t] = Math.max(0.5, Math.min(2.5, mMult[t] * impact));
      cMult[t] = Math.max(0.5, Math.min(2.5, cMult[t] * impact));
    }
    // 股票/衍生品也受影响但力度减半
    const halfImpact = 1 + rateChange * (-8);
    const semiSensitive: AssetType[] = ['stock', 'derivative', 'overseas'];
    for (const t of semiSensitive) {
      mMult[t] = Math.max(0.5, Math.min(2.5, mMult[t] * halfImpact));
    }
    newState = { ...newState, marketMultiplier: mMult, cashFlowMultiplier: cMult };
    // 将 equity 类型的利率乘数变动折算到 currentPe 并重置
    newState = convertEquityMultiplierToPe(newState);
  }

  const prefix = cardTitle ? `【${cardTitle}】` : '';
  newState = addLog(
    newState,
    playerId,
    `${prefix}市场利率 ${(oldRate * 100).toFixed(1)}% → ${(newRate * 100).toFixed(1)}%，EPI 类负债月供已重算`,
    'market'
  );

  for (const log of changeLogs) {
    newState = addLog(newState, playerId, log, 'market');
  }

  return newState;
}

function applyAssetImpacts(state: GameState, playerId: string, cardTitle: string, effect: MarketEffect): GameState {
  if (!effect.assetImpacts && !effect.rateChange) return state;

  let newState = state;
  const impactLogs: string[] = [];

  if (effect.assetImpacts) {
    let marketMultiplier = { ...state.marketMultiplier };
    let cashFlowMultiplier = { ...state.cashFlowMultiplier };
    let sectorMultiplier = { ...state.sectorMultiplier };

    for (const [key, impact] of Object.entries(effect.assetImpacts)) {
      if (impact.priceChange) {
        if (isAssetTypeKey(key)) {
          marketMultiplier[key] *= impact.priceChange;
          impactLogs.push(`${getAssetTypeLabel(key)} 估值×${impact.priceChange}`);
        } else {
          sectorMultiplier[key] = (sectorMultiplier[key] ?? 1) * impact.priceChange;
          impactLogs.push(`${key}板块 估值×${impact.priceChange}`);
        }
      }
      if (impact.cashFlowChange) {
        if (isAssetTypeKey(key)) {
          cashFlowMultiplier[key] *= impact.cashFlowChange;
          impactLogs.push(`${getAssetTypeLabel(key)} 现金流×${impact.cashFlowChange}`);
        } else {
          sectorMultiplier[key] = (sectorMultiplier[key] ?? 1) * impact.cashFlowChange;
        }
      }
    }

    newState = { ...newState, marketMultiplier, cashFlowMultiplier, sectorMultiplier };
  }

  // 将 equity 类型的乘数变动折算到 currentPe 并重置
  newState = convertEquityMultiplierToPe(newState);

  if (effect.rateChange) {
    newState = applyInterestRateChange(newState, playerId, effect.rateChange);
  }

  if (impactLogs.length > 0) {
    const summary = impactLogs.slice(0, 4).join('；');
    newState = addLog(newState, playerId, `【${cardTitle}】${summary}`, 'market');
  } else if (effect.assetImpacts && !effect.rateChange) {
    newState = addLog(newState, playerId, `【${cardTitle}】市场格局发生变化`, 'market');
  }

  return newState;
}

function applyMarketEffect(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  const card = state.currentCard;
  if (!card || card.type !== 'market') return state;

  const effect = card.effect;
  let newState = state;

  switch (effect.type) {
    case 'macroEvent': {
      newState = applyAssetImpacts(newState, player.id, card.title, effect);
      // v3.6: macro events also affect PE
      newState = applyPeEffectToStockAssets(newState, playerIndex, effect);
      break;
    }
    case 'assetAppreciation': {
      if (effect.targetAssetType && effect.multiplier) {
        newState = {
          ...newState,
          marketMultiplier: {
            ...newState.marketMultiplier,
            [effect.targetAssetType]: newState.marketMultiplier[effect.targetAssetType] * effect.multiplier,
          },
        };
        newState = addLog(
          newState,
          player.id,
          `${getAssetTypeLabel(effect.targetAssetType)} 增值，乘数 ${newState.marketMultiplier[effect.targetAssetType].toFixed(2)}`,
          'market'
        );
      }
      break;
    }
    case 'assetDepreciation': {
      if (effect.multiplier) {
        const multiplier = { ...state.marketMultiplier };
        for (const type of Object.keys(multiplier) as AssetType[]) {
          multiplier[type] *= effect.multiplier;
        }
        newState = { ...newState, marketMultiplier: multiplier };
        // v3.6: also apply PE effect
        newState = applyPeEffectToStockAssets(newState, playerIndex, effect);
        if (effect.assetImpacts) {
          newState = applyAssetImpacts(newState, player.id, card.title, effect);
        } else {
          newState = addLog(newState, player.id, '所有资产贬值', 'market');
        }
      }
      break;
    }
    case 'interestRate': {
      if (effect.rateChange) {
        newState = applyInterestRateChange(newState, player.id, effect.rateChange, card.title);
      }
      break;
    }
    case 'sectorBoom': {
      if (effect.sector && effect.multiplier) {
        if (isAssetTypeKey(effect.sector)) {
          newState = {
            ...newState,
            marketMultiplier: {
              ...newState.marketMultiplier,
              [effect.sector]: state.marketMultiplier[effect.sector] * effect.multiplier,
            },
          };
        } else {
          newState = {
            ...newState,
            sectorMultiplier: {
              ...newState.sectorMultiplier,
              [effect.sector]: (state.sectorMultiplier[effect.sector] ?? 1) * effect.multiplier,
            },
          };
        }
        newState = addLog(newState, player.id, `${effect.sector} 板块暴涨`, 'market');
      }
      break;
    }
    case 'unemployment': {
      if (player.isRetired) {
        newState = addLog(newState, player.id, `${player.name} 已退休，不受裁员影响`, 'system');
        break;
      }
      if (!player.isUnemployed) {
        const tier = getProfessionTier(player);
        const ageMod = calcAgeUnemploymentRate(
          player.age,
          tier,
          player.professionId,
          player.retireStandardAge
        );
        const prob = Math.min(1, getUnemploymentProbability(tier) * ageMod);
        if (Math.random() < prob) {
          const turns = 3 + Math.floor(Math.random() * 4);
          newState = updatePlayer(newState, playerIndex, (p) => ({
            ...p,
            isUnemployed: true,
            unemploymentTurnsRemaining: turns,
            baseSalary: p.baseSalary ?? p.salary,
            marriageHappiness:
              p.marriageStatus === 'married' ? Math.max(0, p.marriageHappiness - 20) : p.marriageHappiness,
          }));
          newState = addLog(
            newState,
            player.id,
            `【${card.title}】${player.name} 失业 ${turns} 回合，月薪归零`,
            'market'
          );
        } else {
          newState = addLog(
            newState,
            player.id,
            `【${card.title}】${player.name} 险些失业，暂时保住工作`,
            'market'
          );
        }
      } else {
        newState = addLog(newState, player.id, `${player.name} 已在失业中`, 'system');
      }
      break;
    }
    case 'reemployment': {
      if (player.isUnemployed) {
        const base = player.baseSalary ?? player.salary;
        const restored = Math.round(base * (0.9 + Math.random() * 0.1));
        newState = updatePlayer(newState, playerIndex, (p) => ({
          ...p,
          isUnemployed: false,
          unemploymentTurnsRemaining: 0,
          salary: restored,
        }));
        newState = addLog(
          newState,
          player.id,
          `【${card.title}】${player.name} 再就业，月薪 ${restored} 元`,
          'market'
        );
      } else {
        newState = addLog(newState, player.id, `${player.name} 目前在职，机会留给他人`, 'system');
      }
      break;
    }
    // 【新增】v3.6 股票 PE 事件
    case 'stockPeEvent': {
      newState = applyPeEffectToStockAssets(newState, playerIndex, effect);
      const peLog = effect.stockPeDelta
        ? `持仓股票动态PE ${effect.stockPeDelta >= 0 ? '+' : ''}${(effect.stockPeDelta * 100).toFixed(0)}%`
        : effect.sectorBasePeDelta
          ? `持仓股票行业中枢PE ${effect.sectorBasePeDelta >= 0 ? '+' : ''}${(effect.sectorBasePeDelta * 100).toFixed(0)}%`
          : '';
      if (peLog) {
        newState = addLog(newState, player.id, `【${card.title}】${peLog}`, 'market');
      }
      break;
    }
    case 'childSubsidyUp': {
      // 【v3.8】育儿补贴上调：直接给当前玩家一笔现金
      const childCount = player.childAges.length;
      if (childCount > 0) {
        const bonus = childCount * 2000;
        newState = updatePlayer(newState, playerIndex, (p) => ({
          ...p,
          cash: p.cash + bonus,
        }));
        newState = addLog(
          newState,
          player.id,
          `【${card.title}】育儿补贴上调，获得 ${bonus} 元（${childCount}名儿童 × 2000元）`,
          'income'
        );
      } else {
        newState = addLog(
          newState,
          player.id,
          `【${card.title}】育儿补贴上调，当前无子女，不受影响`,
          'system'
        );
      }
      break;
    }
    case 'inflationEvent': {
      // 通胀/通缩事件：applyAssetImpacts 处理具体资产类型价格变化
      newState = applyAssetImpacts(newState, player.id, card.title, effect);
      // inflationDelta: 全局通胀/通缩幅度，调整所有资产类型乘数
      if (effect.inflationDelta != null && effect.inflationDelta !== 0) {
        const delta = 1 + effect.inflationDelta;
        const multiplier = { ...newState.marketMultiplier };
        const cashFlowM = { ...newState.cashFlowMultiplier };
        for (const type of Object.keys(multiplier) as AssetType[]) {
          multiplier[type] = Math.max(0.1, multiplier[type] * delta);
          cashFlowM[type] = Math.max(0.1, cashFlowM[type] * delta);
        }
        newState = { ...newState, marketMultiplier: multiplier, cashFlowMultiplier: cashFlowM };
        // 将 equity 类型的通胀乘数变动折算到 currentPe 并重置
        newState = convertEquityMultiplierToPe(newState);
        const dir = effect.inflationDelta > 0 ? '通胀' : '通缩';
        const pct = (Math.abs(effect.inflationDelta) * 100).toFixed(0);
        newState = addLog(newState, player.id, `【${card.title}】${dir} ${pct}%，现金购买力${effect.inflationDelta > 0 ? '下降' : '上升'}`, 'market');
      }
      // 对持仓股票应用 PE 效应
      newState = applyPeEffectToStockAssets(newState, playerIndex, effect);
      break;
    }
    default:
      break;
  }

  return checkAndHandleBankruptcy({ ...newState, currentCard: null, phase: 'TURN_END' });
}

/** 【新增】v3.6 对玩家持仓股票应用 PE 效应 */
function applyPeEffectToStockAssets(
  state: GameState,
  playerIndex: number,
  effect: MarketEffect
): GameState {
  const player = state.players[playerIndex];
  let affectedSectors = new Set<string>();
  let affectedCount = 0;

  const newAssets = player.assets.map((asset) => {
    if (!isStockLotAsset(asset) || asset.basePe == null || (effect.stockPeDelta && asset.type === 'reit')) return asset;

    let modified = { ...asset };

    // 个股 currentPe 百分比调整
    if (effect.stockPeDelta) {
      modified = updateStockPeByPercent(modified, effect.stockPeDelta);
      affectedCount++;
    }

    // 行业 basePe 调整（通过 sector 匹配）
    if (effect.sectorBasePeDelta && asset.metadata?.sector) {
      const targetPe = getStockBasePe(modified);
      const newBasePe = Math.max(1, Math.round(targetPe * (1 + effect.sectorBasePeDelta) * 10) / 10);
      modified = { ...modified, basePe: newBasePe };
      affectedSectors.add(asset.metadata.sector);
    }

    // 股息影响
    if (effect.assetImpacts?.stock?.cashFlowChange === 0) {
      modified = { ...modified, yearDivPerShare: 0 };
    }

    return modified;
  });

  if (affectedCount > 0 || affectedSectors.size > 0) {
    return updatePlayer(state, playerIndex, (p) => ({
      ...p,
      assets: newAssets,
    }));
  }

  return state;
}

function drawDiscountedOpportunity(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  const card = state.currentCard;
  const discountRate = (card?.type === 'market' && card.effect.discountRate) || 0.5;

  let deck = [...state.decks.opportunity];
  let discardPile = [...state.discardPiles.opportunity];
  let foundCard: OpportunityCard | null = null;

  // 优先寻找房地产类打折资产
  for (let i = 0; i < deck.length; i++) {
    const c = deck[i];
    if (c.type === 'opportunity' && c.asset.type === 'realEstate') {
      foundCard = c;
      deck = [...deck.slice(0, i), ...deck.slice(i + 1)];
      break;
    }
  }

  if (!foundCard && discardPile.length > 0) {
    deck = shuffle(discardPile);
    discardPile = [];
    for (let i = 0; i < deck.length; i++) {
      const c = deck[i];
      if (c.type === 'opportunity' && c.asset.type === 'realEstate') {
        foundCard = c;
        deck = [...deck.slice(0, i), ...deck.slice(i + 1)];
        break;
      }
    }
  }

  if (!foundCard) {
    return addLog(state, player.id, '市场没有打折房产可买', 'system');
  }

  const discountedAsset = applyCityTierDownPayment(
    scaleAssetByPlayerCity(
      {
        ...foundCard.asset,
        downPayment: Math.round(foundCard.asset.downPayment * discountRate),
        mortgage: foundCard.asset.cost - Math.round(foundCard.asset.downPayment * discountRate),
      },
      player.cityId
    ),
    player.cityId
  );

  const discountedCard: OpportunityCard = { ...foundCard, asset: discountedAsset };

  let newState: GameState = {
    ...state,
    decks: { ...state.decks, opportunity: deck },
    discardPiles: { ...state.discardPiles, opportunity: [...discardPile, foundCard] },
  };
  newState = addLog(
    newState,
    player.id,
    `市场出现打折房产 ${discountedAsset.name}，首付降至 ${discountedAsset.downPayment} 元`,
    'market'
  );
  return { ...newState, currentCard: discountedCard };
}

/**
 * 处理抵押资产卖出/变卖：从 proceeds 中扣除剩余贷款，多退少补
 * @returns 净现金收入、更新后负债列表、不足额（>0 表示还需补差）
 */
function settleAssetLoan(
  player: Player,
  assetId: string,
  grossProceeds: number,
  deficiencyLabel = '差额贷款'
): { netCash: number; updatedLiabilities: Liability[]; deficiency: number } {
  const securedLiabilities = player.liabilities.filter(l => l.securedAssetId === assetId);
  if (securedLiabilities.length === 0) {
    return { netCash: grossProceeds, updatedLiabilities: player.liabilities, deficiency: 0 };
  }

  // 累计所有抵押贷款余额
  const totalPrincipal = securedLiabilities.reduce((sum, l) => sum + l.principal, 0);
  const securedIds = new Set(securedLiabilities.map(l => l.id));

  if (grossProceeds >= totalPrincipal) {
    // 卖出价 ≥ 总剩余贷款 → 还清全部贷款，拿回剩余净值
    const netCash = grossProceeds - totalPrincipal;
    return {
      netCash,
      updatedLiabilities: player.liabilities.filter(l => !securedIds.has(l.id)),
      deficiency: 0,
    };
  }

  // 卖出价 < 总剩余贷款：全部还贷，差额转为无抵押负债
  const deficiency = totalPrincipal - grossProceeds;
  const otherLiabilities = player.liabilities.filter(l => !securedIds.has(l.id));
  const deficiencyLiability = normalizeLiability({
    id: generateId(),
    ...createLiability({
      name: deficiencyLabel,
      principal: deficiency,
      debtType: 'consumerLoan',
      source: 'game',
      paidPeriods: 0,
    }),
  });
  return {
    netCash: 0,
    updatedLiabilities: [...otherLiabilities, deficiencyLiability],
    deficiency,
  };
}

function createPlayer(config: GameConfig, isAI: boolean, index: number, aiName?: string): Player {
  const professionId = isAI ? PROFESSIONS[index % PROFESSIONS.length].id : config.humanProfessionId;
  const profession =
    !isAI && professionId === CUSTOM_PROFESSION_ID && config.customProfession
      ? buildCustomProfession(config.customProfession)
      : PROFESSIONS.find((p) => p.id === professionId)!;
  const city = getCityById(config.cityId ?? DEFAULT_CITY_ID);
  const name = isAI ? aiName || `${['智能 A', '智能 B', '智能 C', '智能 D'][index - 1] || 'AI'}` : config.humanPlayerName;

  const salaryBuff = profession.buff?.salary ?? 1;
  const expenseBuff = profession.buff?.expense ?? 1;
  const savingsBuff = profession.buff?.savings ?? 1;

  const salary = Math.round(profession.salary * city.salaryMultiplier * salaryBuff);
  const cash = Math.round(profession.cash * savingsBuff);
  const expenses = {
    ...profession.expenses,
    tax: Math.round(profession.expenses.tax * city.expenseMultiplier),
    other: Math.round(profession.expenses.other * city.expenseMultiplier * expenseBuff),
    perChild: Math.round(profession.expenses.perChild * city.expenseMultiplier),
    mortgage: 0,
    studentLoan: 0,
    carLoan: 0,
    creditCard: 0,
  };

  const ageConfig = getProfessionAgeConfig(profession.id);

  const gender: import('../types/game').PlayerGender =
    !isAI ? (config.humanGender ?? 'male') : (Math.random() < 0.5 ? 'female' : 'male');

  // 先为抵押资产生成 ID（房贷/车贷需与资产互相绑定）
  const houseAssetId = generateId();
  const carAssetId = generateId();

  // 构建初始资产列表（房贷/车贷对应的抵押资产）
  const initialAssets: Asset[] = [];
  const houseDebt = profession.liabilities.find(l => l.debtType === 'houseFirst' || inferProfessionDebtType(l.name) === 'houseFirst');
  if (houseDebt) {
    const downPaymentRatio = city.downPaymentFirst ?? 0.3;
    const totalCost = Math.round(houseDebt.principal / (1 - downPaymentRatio));
    initialAssets.push({
      id: houseAssetId,
      name: `${city.name}自住房`,
      type: 'realEstate',
      cost: totalCost,
      downPayment: totalCost - houseDebt.principal,
      cashFlow: 0,
      mortgage: houseDebt.principal,
      marketValue: totalCost,
      isSelfLiving: true,
      purchaseRound: 0,
      heldMonths: 0,
      metadata: { cityTier: city.tier as import('../types/game').PropertyTier },
    });
  }

  const carDebt = profession.liabilities.find(l => l.debtType === 'carLoan' || inferProfessionDebtType(l.name) === 'carLoan');
  if (carDebt) {
    const carDownRatio = 0.3;
    const totalCarCost = Math.round(carDebt.principal / (1 - carDownRatio));
    initialAssets.push({
      id: carAssetId,
      name: '家用汽车',
      type: 'entity',
      cost: totalCarCost,
      downPayment: totalCarCost - carDebt.principal,
      cashFlow: -Math.round(totalCarCost * 0.005),
      mortgage: carDebt.principal,
      marketValue: totalCarCost,
      purchaseRound: 0,
      heldMonths: 0,
      metadata: { sector: '汽车', liquidity: 'illiquid', incomeType: 'operating', riskLevel: 'low', subCategory: '家用车' },
    });
  }

  // 构建初始负债列表，房贷/车贷通过 securedAssetId 关联到对应资产
  const initialLiabilities = profession.liabilities.map((l) => {
    const debtType = inferProfessionDebtType(l.name);
    let securedAssetId: string | undefined;
    if (debtType === 'houseFirst') securedAssetId = houseAssetId;
    if (debtType === 'carLoan') securedAssetId = carAssetId;
    return normalizeLiability({
      ...l,
      id: generateId(),
      debtType,
      originalPrincipal: l.principal,
      paidPeriods: l.paidPeriods ?? 0,
      source: 'profession' as const,
      securedAssetId,
    });
  });

  return {
    id: generateId(),
    name,
    gender,
    professionId: profession.id,
    customProfessionName:
      !isAI && professionId === CUSTOM_PROFESSION_ID ? config.customProfession?.name.trim() : undefined,
    cityId: city.id,
    color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    position: 0,
    cash,
    salary,
    expenses,
    children: 0,
    childAges: [],
    assets: initialAssets,
    liabilities: initialLiabilities,
    isInFastTrack: false,
    fastTrackPosition: 0,
    charityTurns: 0,
    isAI,
    difficulty: isAI ? config.aiDifficulty : undefined,
    isBankrupt: false,
    marriageStatus: 'single',
    marriageHappiness: 0,
    partnerSalary: 0,
    hasPregnancy: false,
    pregnancyMonths: 0,
    dinkTurns: 0,
    isUnemployed: false,
    unemploymentTurnsRemaining: 0,
    baseSalary: salary,
    age: ageConfig.baseStartAge,
    ageMonths: 0,
    baseStartAge: ageConfig.baseStartAge,
    retireStandardAge: ageConfig.retireStandardAge,
    currentGameYear: 1,
    isRetired: false,
    pensionIncome: 0,
    promotionLevel: 0,
    promotionCount: 0,
    marriageCount: 0,
    divorceCount: 0,
    layoffRiskModifier: 1,
    layoffRiskBoostTurnsRemaining: 0,
    careerTransitionTurnsRemaining: 0,
    consecutiveUnemployedTurns: 0,
    postEmploymentScarTurnsRemaining: 0,
    monthlyMarriageHappinessBoost: 0,
    partnerUnemployedTurnsRemaining: 0,
    tempPerChildBoost: 0,
    tempExpenseTurnsRemaining: 0,
    marriageAgeMonths: 0,
    remarriageCount: 0,
    insurances: [],
    dinkElderlyCareExpense: 0,
    highDebtHappinessPenalty: 0,
    maternityLeaveRemaining: 0,
    maternitySubsidy: 0,
    hasMedicalInsuranceCard: false,
    rentTier: 'standard',
  };
}

function getInitialState(): GameState {
  return {
    phase: 'SETUP',
    players: [],
    currentPlayerIndex: 0,
    round: 1,
    spaces: SPACES,
    decks: {
      opportunity: shuffle([...OPPORTUNITY_CARDS]),
      market: shuffle([...MARKET_CARDS]),
      doodad: shuffle([...DOODAD_CARDS]),
    },
    discardPiles: { opportunity: [], market: [], doodad: [] },
    currentCard: null,
    marketMultiplier: createDefaultMultiplierRecord(),
    cashFlowMultiplier: createDefaultMultiplierRecord(),
    sectorMultiplier: {},
    interestRate: 0.01,
    winner: null,
    logs: [],
    pendingDice: null,
    pendingLifeEvent: null,
    promotionOffer: null,
    careerEvent: null,
    pendingSettlement: null,
    pendingLiquidation: false,
    pendingCashFlowSettlement: null,
  };
}

function gameReducerSwitch(state: GameState, action: GameAction): GameState {
  const playerIndex = state.currentPlayerIndex;
  const player = state.players[playerIndex];

  switch (action.type) {
    case 'SETUP_GAME': {
      const {
        humanPlayerName,
        humanProfessionId,
        customProfession,
        cityId,
        humanGender,
        aiCount,
        aiDifficulty,
        testMode,
        testMaxRounds,
      } = action.payload;
      const config: GameConfig = {
        humanPlayerName,
        humanProfessionId,
        customProfession,
        cityId: cityId ?? DEFAULT_CITY_ID,
        humanGender,
        aiCount,
        aiDifficulty,
        testMode,
        testMaxRounds,
      };
      const isTestMode = config.testMode ?? false;
      const maxRounds = config.testMaxRounds ?? 50;
      const newState: GameState = {
        ...getInitialState(),
        players: [
          createPlayer(config, false, 0),
          ...Array.from({ length: aiCount }, (_, i) =>
            createPlayer(config, true, i + 1, `AI ${i + 1}`)
          ),
        ],
        phase: 'ROLLING',
        testMode: isTestMode,
        testMaxRounds: maxRounds,
        testTimeoutRecord: isTestMode ? {} : undefined,
        bugLogs: isTestMode ? [] : undefined,
        testStopped: false,
      };
      const started = addLog(newState, newState.players[0].id, '游戏开始！', 'system');
      return isTestMode
        ? addLog(started, newState.players[0].id, `【自动测试】最多 ${maxRounds} 回合`, 'system')
        : started;
    }

    case 'RESTART_GAME': {
      return getInitialState();
    }

    case 'ROLL_DICE': {
      if (state.phase !== 'ROLLING' && state.phase !== 'FAST_TRACK') return state;

      const dice = action.payload.dice;
      return { ...state, phase: 'MOVING', pendingDice: dice };
    }

    case 'MOVE_PLAYER': {
      if (state.phase !== 'MOVING') return state;

      const steps = state.pendingDice ?? 1;
      const currentPos = player.position;
      const newPos = (currentPos + steps) % state.spaces.length;
      const crossedLap = newPos < currentPos;

      let newState = updatePlayer(state, playerIndex, (p) => ({
        ...p,
        position: newPos,
        charityTurns: Math.max(0, p.charityTurns - 1),
      }));
      newState = { ...newState, pendingDice: null, currentCard: null, promotionOffer: null, careerEvent: null, pendingSettlement: null };

      newState = advanceOneMonth(newState, playerIndex);
      newState = handlePayday(newState, playerIndex);
      newState = executeMonthlyDca(newState, playerIndex);

      if (crossedLap) {
        newState = onLapCrossed(newState, playerIndex);
      }

      newState = addLog(newState, player.id, `${player.name} 移动到 ${state.spaces[newPos].name}`, 'move');

      if (newState.pendingLifeEvent === 'retirement') {
        return { ...newState, phase: 'CARD_DECISION', currentCard: null };
      }

      // 离婚弹窗优先于格子处理
      if (newState.pendingDivorce) {
        return { ...newState, phase: 'CARD_DECISION', currentCard: null, pendingDivorce: newState.pendingDivorce };
      }
      newState = { ...newState, pendingDivorce: null };

      const space = state.spaces[newPos];
      const currentPlayer = newState.players[playerIndex];
      switch (space.type) {
        case 'opportunity':
        case 'market':
        case 'doodad': {
          const cardType: CardType =
            space.type === 'opportunity' ? 'opportunity' : space.type === 'market' ? 'market' : 'doodad';
          const result = drawCardAndUpdateState(newState, cardType, player);
          if (!result) return { ...newState, phase: 'TURN_END' };
          const cardState = result.state;
          const card = result.card;
          const logState = addLog(
            cardState,
            player.id,
            `${player.name} 抽到 ${card.title}`,
            cardType === 'market' ? 'market' : 'system'
          );
          return { ...logState, phase: 'CARD_DECISION' };
        }
        case 'charity': {
          return { ...newState, phase: 'CARD_DECISION' };
        }
        case 'family': {
          // 综合家庭格：根据婚姻状态分支
          if (currentPlayer.marriageStatus === 'ineligible') {
            newState = addLog(newState, currentPlayer.id, `${currentPlayer.name} 已永久失去再婚资格，家庭格跳过`, 'system');
            return { ...newState, phase: 'TURN_END', currentCard: null };
          }
          if (currentPlayer.marriageStatus === 'married') {
            // 已婚 → 生育/怀孕事件
            if (currentPlayer.children >= CHILDREN_LIMIT && !currentPlayer.hasPregnancy) {
              newState = addLog(
                newState,
                currentPlayer.id,
                `${currentPlayer.name} 已经有 ${CHILDREN_LIMIT} 个孩子了`,
                'system'
              );
              return { ...newState, phase: 'TURN_END', currentCard: null };
            }
            return { ...newState, phase: 'CARD_DECISION', currentCard: null, promotionOffer: null, careerEvent: null };
          }
          // 单身（single）→ 结婚事件；离异（divorced）→ 再婚事件
          return { ...newState, phase: 'CARD_DECISION', currentCard: null, promotionOffer: null, careerEvent: null };
        }
        case 'promotion': {
          const promoPlayer = newState.players[playerIndex];
          if (!canReceivePromotion(promoPlayer)) {
            const reason = promoPlayer.isRetired ? '已退休' : '自由职业无法触发职业事件';
            newState = addLog(newState, player.id, `${player.name} ${reason}，跳过职业格`, 'system');
            return { ...newState, phase: 'TURN_END' };
          }
          const careerEvent = rollCareerEvent(promoPlayer, newState);
          if (!careerEvent) {
            newState = addLog(newState, player.id, `${player.name} 本回合无职业事件`, 'system');
            return { ...newState, phase: 'TURN_END' };
          }
          return {
            ...newState,
            phase: 'CARD_DECISION',
            currentCard: null,
            careerEvent,
            promotionOffer: careerEventToLegacyOffer(careerEvent),
          };
        }
        case 'settlement': {
          return prepareSettlement(newState, playerIndex, space);
        }
      }
      return { ...newState, phase: 'TURN_END' };
    }

    case 'DRAW_CARD': {
      const cardType = action.payload.cardType;
      const result = drawCardAndUpdateState(state, cardType, player);
      if (!result) return state;

      let newState = result.state;
      const card = result.card;
      newState = addLog(newState, player.id, `${player.name} 抽到 ${card.title}`, cardType === 'market' ? 'market' : 'system');
      return { ...newState, phase: 'CARD_DECISION' };
    }

    case 'BUY_ASSET': {
      const card = state.currentCard;
      if (!card || card.type !== 'opportunity') return state;
      const gate = canPurchaseOpportunity(player, card, state.marketMultiplier, state.sectorMultiplier);
      if (!gate.allowed) {
        return addLog(state, player.id, `无法购买：${gate.reason}`, 'system');
      }
      return executeBuyAsset(
        state,
        playerIndex,
        getOpportunityAsset(card, player),
        false,
        card.dueDiligenceCost ?? 0,
        action.payload?.shareHand
      );
    }

    case 'BUY_DISCOUNTED_ASSET': {
      const card = state.currentCard;
      if (!card || card.type !== 'opportunity') return state;
      const gate = canPurchaseOpportunity(player, card, state.marketMultiplier, state.sectorMultiplier);
      if (!gate.allowed) {
        return addLog(state, player.id, `无法购买：${gate.reason}`, 'system');
      }
      return executeBuyAsset(
        state,
        playerIndex,
        getOpportunityAsset(card, player),
        true,
        card.dueDiligenceCost ?? 0,
        action.payload?.shareHand
      );
    }

    case 'DECLINE_CARD': {
      return { ...state, currentCard: null, promotionOffer: null, careerEvent: null, pendingSettlement: null, phase: 'TURN_END' };
    }

    case 'PAY_DOODAD': {
      const card = state.currentCard;
      if (!card || card.type !== 'doodad') return state;

      // 【v3.10】统一 filterConfig 身份前置过滤
      if (!passesCardFilter(player, card)) {
        return {
          ...addLog(state, player.id, `${player.name} 的身份不适用此事件（${card.title}），跳过`, 'system'),
          phase: 'TURN_END',
          currentCard: null,
        };
      }

      // 【v3.8】性别限制检查（向后兼容 genderRequired）
      if (card.genderRequired && card.genderRequired !== player.gender) {
        const skipState = addLog(
          state,
          player.id,
          `${player.name} 的性别不适用此事件（${card.title}），跳过`,
          'system'
        );
        return { ...skipState, phase: 'TURN_END', currentCard: null };
      }

      // 【新增】v3.7 家庭身份校验（向后兼容 ID 白名单）
      const isChildExpense = ['family_school_choice', 'doodad_tutor', 'doodad_study_abroad'].includes(card.id ?? '');
      if (isChildExpense && player.children === 0) {
        return { ...addLog(state, player.id, `${player.name} 无子女，跳过子女费用`, 'system'), phase: 'TURN_END', currentCard: null };
      }
      if (card.id === 'family_spouse_unemployed' && player.marriageStatus !== 'married') {
        return { ...addLog(state, player.id, `${player.name} 未婚，跳过配偶失业事件`, 'system'), phase: 'TURN_END', currentCard: null };
      }

      const cost = card.cost;
      let newState = state;

      // 【新增】v3.7 保险抵扣医疗支出
      const finalCost = card.isMedicalEvent && (player.insurances?.length ?? 0) > 0
        ? applyInsuranceDeductible(cost, player.insurances ?? [], card.coverageRatio ?? 0.7, card.deductible ?? 0)
        : cost;

      if (finalCost < cost) {
        newState = addLog(newState, player.id, `${player.name} 保险覆盖部分医疗支出，自付 ${finalCost} 元（原价 ${cost} 元）`, 'system');
      }

      const shortfall = Math.max(0, finalCost - player.cash);

      if (shortfall > 0) {
        newState = updatePlayer(newState, playerIndex, (p) => ({
          ...p,
          cash: p.cash + shortfall,
          liabilities: [
            ...p.liabilities,
            {
              id: generateId(),
              ...createLiability({
                name: `${card.title} 贷款`,
                principal: shortfall,
                debtType: 'creditCard',
                source: 'game',
              }),
            },
          ],
        }));
        newState = addLog(newState, player.id, `${player.name} 为支付 ${card.title} 贷款 ${shortfall} 元`, 'liability');
      }

      newState = updatePlayer(newState, playerIndex, (p) => {
        let next: Player = { ...p, cash: p.cash - finalCost };

        // 【v3.11】长期事件去重：同一张卡片的月费不重复叠加
        if (card.isRecurring && card.monthlyCost) {
          const applied = next.appliedRecurringDoodadIds ?? [];
          if (card.id && !applied.includes(card.id)) {
            next = {
              ...next,
              expenses: { ...next.expenses, other: next.expenses.other + card.monthlyCost! },
              recurringDoodadExpenses: (next.recurringDoodadExpenses ?? 0) + card.monthlyCost!,
              appliedRecurringDoodadIds: [...applied, card.id],
            };
          }
        }

        if (card.happinessDelta && next.marriageStatus === 'married') {
          next = {
            ...next,
            marriageHappiness: Math.min(100, Math.max(0, next.marriageHappiness + card.happinessDelta!)),
          };
        }

        if (card.partnerUnemploymentTurns && next.marriageStatus === 'married') {
          const turns = 2 + Math.floor(Math.random() * 4);
          next = {
            ...next,
            partnerUnemployedTurnsRemaining: turns,
            // 清除静态快照，让 getEffectiveSalary 回退到按字段实时计算
            familyIncome: undefined,
          };
        }

        if (card.tempPerChildBoost && card.tempExpenseTurns) {
          next = {
            ...next,
            tempPerChildBoost: card.tempPerChildBoost,
            tempExpenseTurnsRemaining: card.tempExpenseTurns,
          };
        }

        // 【新增】v3.7 保险购买
        if (card.insuranceType && card.insuranceMonthlyPremium) {
          const existingInsurances = next.insurances ?? [];
          if (!existingInsurances.includes(card.insuranceType)) {
            next = {
              ...next,
              insurances: [...existingInsurances, card.insuranceType],
              // 【v3.8】母婴险标记 hasMedicalInsuranceCard
              ...(card.insuranceType === 'maternal' ? { hasMedicalInsuranceCard: true } : {}),
            };
          }
        }

        return next;
      });

      newState = addLog(newState, player.id, `${player.name} 支付额外支出 ${card.title} ${finalCost} 元`, 'expense');
      newState = checkAndHandleBankruptcy(newState);
      return { ...newState, currentCard: null, phase: 'TURN_END' };
    }

    case 'APPLY_MARKET_EFFECT': {
      return applyMarketEffect(state, playerIndex);
    }

    case 'DRAW_DISCOUNTED_OPPORTUNITY': {
      const newState = drawDiscountedOpportunity(state, playerIndex);
      return { ...newState, phase: 'CARD_DECISION' };
    }

    case 'CHOOSE_BABY': {
      if (!action.payload.haveBaby) {
        const skipState = addLog(state, player.id, `${player.name} 选择暂不生育`, 'system');
        return { ...skipState, phase: 'TURN_END', currentCard: null };
      }
      if (player.children >= CHILDREN_LIMIT) {
        return addLog(state, player.id, `${player.name} 已有 ${CHILDREN_LIMIT} 个孩子`, 'system');
      }
      let newState = updatePlayer(state, playerIndex, (p) => ({
        ...p,
        children: p.children + 1,
      }));
      newState = addLog(
        newState,
        player.id,
        `${player.name} 决定生孩子，月支出 +${player.expenses.perChild} 元`,
        'expense'
      );
      newState = checkAndHandleBankruptcy(newState);
      return { ...newState, phase: 'TURN_END', currentCard: null };
    }

    case 'CHOOSE_MARRIAGE': {
      const isRemarriage = player.marriageStatus === 'divorced';
      if (player.marriageStatus !== 'single' && !isRemarriage) {
        return addLog(state, player.id, `${player.name} 无法重复结婚`, 'system');
      }
      if (!action.payload.marry) {
        const skipState = addLog(
          state,
          player.id,
          `${player.name} 选择${isRemarriage ? '暂不' : '保持'}${isRemarriage ? '再婚' : '单身'}`,
          'system'
        );
        return { ...skipState, phase: 'TURN_END', currentCard: null };
      }
      const cost = isRemarriage ? remarriageCost(player.cityId) : weddingCost(player.cityId);
      const partner = calcPartnerSalary(player.salary, player.cityId);
      const overhead = marriageOverhead(player.cityId);
      const happiness = isRemarriage ? 50 : 60;
      let newState = state;
      const shortfall = Math.max(0, cost - player.cash);
      if (shortfall > 0) {
        newState = updatePlayer(newState, playerIndex, (p) => ({
          ...p,
          cash: p.cash + shortfall,
          liabilities: [
            ...p.liabilities,
            {
              id: generateId(),
              ...createLiability({
                name: isRemarriage ? '再婚消费贷' : '婚礼消费贷',
                principal: shortfall,
                debtType: 'consumerLoan',
                source: 'game',
              }),
            },
          ],
        }));
      }
      newState = updatePlayer(newState, playerIndex, (p) => ({
        ...p,
        cash: p.cash - cost,
        marriageStatus: 'married',
        marriageHappiness: happiness,
        partnerSalary: partner,
        marriageCount: (p.marriageCount ?? 0) + 1,
        expenses: { ...p.expenses, other: p.expenses.other + overhead },
        // 【v3.8】记录结婚时的年龄月数
        marriageAgeMonths: ((p.age ?? 0) * 12 + (p.ageMonths ?? 0)),
        // 【v3.8】已婚家庭总收入
        familyIncome: p.salary + partner,
      }));
      newState = addLog(
        newState,
        player.id,
        `${player.name} ${isRemarriage ? '再婚' : '结婚'}！仪式 ${cost} 元，幸福度 ${happiness}，伴侣月薪 +${partner}，家庭开销 +${overhead}/月`,
        'expense'
      );
      newState = checkAndHandleBankruptcy(newState);
      return { ...newState, phase: 'TURN_END', currentCard: null };
    }

    case 'RESOLVE_MARRIAGE_GRID': {
      if (player.marriageStatus !== 'married') {
        return { ...state, phase: 'TURN_END', currentCard: null };
      }
      let newState = state;
      const h = player.marriageHappiness;
      if (h >= 70) {
        newState = updatePlayer(newState, playerIndex, (p) => ({
          ...p,
          marriageHappiness: Math.min(100, p.marriageHappiness + 5),
        }));
        newState = addLog(newState, player.id, `${player.name} 婚姻甜蜜，幸福度 +5`, 'system');
      } else if (h >= 40) {
        newState = addLog(
          newState,
          player.id,
          `${player.name} 婚姻平淡，幸福度 ${h}，继续经营`,
          'system'
        );
      } else {
        const counseling = action.payload.counseling === true;
        if (counseling) {
          const cost = Math.round(player.salary * 0.5);
          const shortfall = Math.max(0, cost - player.cash);
          if (shortfall > 0) {
            newState = updatePlayer(newState, playerIndex, (p) => ({
              ...p,
              cash: p.cash + shortfall,
              liabilities: [
                ...p.liabilities,
                {
                  id: generateId(),
                  ...createLiability({
                    name: '婚姻咨询费',
                    principal: shortfall,
                    debtType: 'consumerLoan',
                    source: 'game',
                  }),
                },
              ],
            }));
          }
          newState = updatePlayer(newState, playerIndex, (p) => ({
            ...p,
            cash: p.cash - cost,
            marriageHappiness: Math.min(100, p.marriageHappiness + 15),
          }));
          newState = addLog(newState, player.id, `${player.name} 投资婚姻咨询 ${cost} 元，幸福度 +15`, 'expense');
        } else {
          newState = updatePlayer(newState, playerIndex, (p) => ({
            ...p,
            marriageHappiness: Math.max(0, p.marriageHappiness - 5),
          }));
          newState = addLog(newState, player.id, `${player.name} 忽视婚姻危机，幸福度 -5`, 'system');
          if (Math.random() < 0.15) {
            newState = prepareDivorcePending(newState, playerIndex);
          }
        }
      }
      newState = checkAndHandleBankruptcy(newState);
      if (newState.pendingDivorce) {
        return { ...newState, phase: 'CARD_DECISION', currentCard: null };
      }
      return { ...newState, phase: 'TURN_END', currentCard: null };
    }

    case 'CHOOSE_PREGNANCY_PATH': {
      const path: PregnancyPath = action.payload.path;
      let newState = state;

      if (path === 'plan') {
        const medical = pregnancyMedicalCost(player.cityId);
        newState = updatePlayer(newState, playerIndex, (p) => ({
          ...p,
          hasPregnancy: true,
          pregnancyMonths: 0,
          dinkTurns: 0,
          expenses: { ...p.expenses, medicalPregnancy: medical },
        }));
        newState = addLog(
          newState,
          player.id,
          `${player.name} 计划怀孕，月医疗支出 +${medical} 元`,
          'expense'
        );
      } else {
        newState = updatePlayer(newState, playerIndex, (p) => ({
          ...p,
          hasPregnancy: false,
          pregnancyMonths: 0,
          expenses: { ...p.expenses, medicalPregnancy: 0 },
          marriageHappiness: Math.max(0, p.marriageHappiness - 5),
        }));
        newState = addLog(newState, player.id, `${player.name} 选择推迟生育，幸福度 -5`, 'system');
      }

      newState = checkAndHandleBankruptcy(newState);
      return { ...newState, phase: 'TURN_END', currentCard: null };
    }

    case 'DONATE_CHARITY': {
      if (!action.payload.donate) {
        return { ...state, phase: 'TURN_END' };
      }
      const donation = Math.round(player.salary * 0.1);
      let newState = updatePlayer(state, playerIndex, (p) => ({
        ...p,
        cash: p.cash - donation,
        charityTurns: CHARITY_TURNS,
      }));
      newState = addLog(newState, player.id, `${player.name} 捐款 ${donation} 元，未来 ${CHARITY_TURNS} 回合可掷双骰子`, 'expense');
      newState = checkAndHandleBankruptcy(newState);
      return { ...newState, phase: 'TURN_END' };
    }

    case 'CONFIRM_RETIREMENT': {
      let newState = executeRetirement(state, playerIndex);
      return {
        ...newState,
        pendingLifeEvent: null,
        phase: 'TURN_END',
        currentCard: null,
      };
    }

    case 'CONFIRM_SETTLEMENT': {
      const space = state.spaces[player.position];
      if (space.type !== 'settlement' || !state.pendingSettlement) {
        return { ...state, phase: 'TURN_END', pendingSettlement: null };
      }
      return handleSettlement(state, playerIndex, space);
    }

    case 'CHOOSE_PROMOTION': {
      const event = state.careerEvent;
      if (!event) {
        return { ...state, phase: 'TURN_END', promotionOffer: null, careerEvent: null };
      }

      const clearCareer = { phase: 'TURN_END' as const, promotionOffer: null, careerEvent: null, currentCard: null };

      if (!action.payload.accept && event.type !== 'layoff') {
        const skipState = addLog(state, player.id, `${player.name} 放弃：${event.title}`, 'system');
        return { ...skipState, ...clearCareer };
      }

      let newState = state;

      const payCareerCost = (cost: number, loanName: string) => {
        const shortfall = Math.max(0, cost - newState.players[playerIndex].cash);
        if (shortfall > 0) {
          newState = updatePlayer(newState, playerIndex, (p) => ({
            ...p,
            cash: p.cash + shortfall,
            liabilities: [
              ...p.liabilities,
              {
                id: generateId(),
                ...createLiability({
                  name: loanName,
                  principal: shortfall,
                  debtType: 'consumerLoan',
                  source: 'game',
                }),
              },
            ],
          }));
        }
        newState = updatePlayer(newState, playerIndex, (p) => ({
          ...p,
          cash: p.cash - cost,
        }));
      };

      switch (event.type) {
        case 'promotion': {
          const boostPct = event.salaryBoostPct ?? 0.2;
          const cost = event.cost ?? 0;
          const monthlyBoost = event.monthlyHappinessBoost ?? 3;
          payCareerCost(cost, '升迁培训/社交费');
          newState = updatePlayer(newState, playerIndex, (p) => {
            const newSalary = Math.round(p.salary * (1 + boostPct));
            const passiveIncome = getPassiveIncome(p, state.cashFlowMultiplier, state.sectorMultiplier);
            const city = getCityById(p.cityId);
            const happinessBoost = calcMarriageHappinessBySalary(newSalary, passiveIncome, city.expenseMultiplier);
            const promoCount = (p.promotionCount ?? p.promotionLevel ?? 0) + 1;
            return {
              ...p,
              salary: newSalary,
              baseSalary: newSalary,
              promotionLevel: promoCount,
              promotionCount: promoCount,
              layoffRiskModifier: Math.max(0.05, (p.layoffRiskModifier ?? 1) * 0.8),
              monthlyMarriageHappinessBoost: monthlyBoost,
              marriageHappiness:
                p.marriageStatus === 'married'
                  ? Math.min(100, p.marriageHappiness + happinessBoost)
                  : p.marriageHappiness,
            };
          });
          newState = addLog(
            newState,
            player.id,
            `${player.name} 内部晋升！月薪 +${Math.round(boostPct * 100)}%，培训费 ${cost} 元，裁员风险 -20%`,
            'income'
          );
          break;
        }
        case 'jobHop': {
          const choice = action.payload.jobHopChoice ?? 'highPay';
          if (choice === 'highPay') {
            const boostPct = event.highPayBoostPct ?? 0.4;
            const riskTurns = event.highPayLayoffRiskTurns ?? 3;
            newState = updatePlayer(newState, playerIndex, (p) => {
              const newSalary = Math.round(p.salary * (1 + boostPct));
              return {
                ...p,
                salary: newSalary,
                baseSalary: newSalary,
                layoffRiskBoostTurnsRemaining: riskTurns,
                layoffRiskModifier: (p.layoffRiskModifier ?? 1) * 1.5,
              };
            });
            newState = addLog(
              newState,
              player.id,
              `${player.name} 高薪跳槽！月薪 +${Math.round(boostPct * 100)}%，无缝入职（试用期 ${riskTurns} 回合裁员风险↑）`,
              'income'
            );
          } else {
            const cutPct = event.stableSalaryCutPct ?? 0.15;
            newState = updatePlayer(newState, playerIndex, (p) => {
              const newSalary = Math.round(p.salary * (1 - cutPct));
              return {
                ...p,
                salary: newSalary,
                baseSalary: newSalary,
                layoffRiskModifier: 0.05,
              };
            });
            newState = addLog(
              newState,
              player.id,
              `${player.name} 选择稳定岗位，月薪 -${Math.round(cutPct * 100)}%，裁员风险极低`,
              'system'
            );
          }
          break;
        }
        case 'layoff': {
          const severanceMonths = event.severanceMonths ?? 4;
          const turns = event.unemploymentTurns ?? 4;
          const happinessDelta = event.happinessDelta ?? -25;
          const severance = Math.round(player.salary * severanceMonths);
          newState = updatePlayer(newState, playerIndex, (p) => ({
            ...p,
            isUnemployed: true,
            unemploymentTurnsRemaining: turns,
            consecutiveUnemployedTurns: 0,
            baseSalary: p.baseSalary ?? p.salary,
            cash: p.cash + severance,
            marriageHappiness:
              p.marriageStatus === 'married'
                ? Math.max(0, p.marriageHappiness + happinessDelta)
                : p.marriageHappiness,
          }));
          newState = addLog(
            newState,
            player.id,
            `${player.name} 被裁员！N+1 补偿 ${severance} 元，失业 ${turns} 回合`,
            'expense'
          );
          if (player.marriageStatus === 'married' && Math.random() < 0.25) {
            newState = prepareDivorcePending(newState, playerIndex);
          }
          break;
        }
        case 'careerChange': {
          const ratio = event.transitionSalaryRatio ?? 0.5;
          const recoveryTurns = event.recoveryTurns ?? 5;
          const targetBoost = event.targetSalaryBoostPct ?? 0.15;
          const failureCost = event.failureCost ?? Math.round(player.salary * 0.5);
          const base = player.baseSalary ?? player.salary;
          if (Math.random() < 0.2) {
            payCareerCost(failureCost, '转型失败损失');
            newState = addLog(newState, player.id, `${player.name} 职业转型失败，额外损失 ${failureCost} 元`, 'expense');
          } else {
            newState = updatePlayer(newState, playerIndex, (p) => ({
              ...p,
              salary: Math.round(base * ratio),
              careerTransitionTurnsRemaining: recoveryTurns,
              careerTransitionBaseSalary: base,
              careerTransitionTargetBoostPct: targetBoost,
              layoffRiskModifier: (p.layoffRiskModifier ?? 1) * 1.2,
            }));
            newState = addLog(
              newState,
              player.id,
              `${player.name} 开始职业转型，月薪暂降至 ${Math.round(ratio * 100)}%，${recoveryTurns} 回合内恢复`,
              'system'
            );
          }
          break;
        }
        case 'reemployment': {
          const restoredPct = event.restoredSalaryPct ?? 0.9;
          const baseSalary = player.baseSalary ?? player.salary;
          const restored = Math.round(baseSalary * restoredPct);
          newState = updatePlayer(newState, playerIndex, (p) => ({
            ...p,
            isUnemployed: false,
            unemploymentTurnsRemaining: 0,
            consecutiveUnemployedTurns: 0,
            postEmploymentScarTurnsRemaining: 3,
            salary: restored,
            baseSalary: restored,
          }));
          newState = addLog(
            newState,
            player.id,
            `${player.name} 提前再就业！月薪 ${restored} 元（3 回合幸福度疤痕）`,
            'income'
          );
          break;
        }
      }

      newState = checkAndHandleBankruptcy(newState);
      if (newState.pendingDivorce) {
        return { ...newState, ...clearCareer, phase: 'CARD_DECISION', currentCard: null };
      }
      return { ...newState, ...clearCareer };
    }

    case 'MANUAL_RETIRE': {
      if (!isSelfEmployedProfession(player.professionId)) {
        return addLog(state, player.id, `${player.name} 非自由职业，无法主动退休`, 'system');
      }
      if (player.age < 50) {
        return addLog(state, player.id, `${player.name} 未满 50 岁，无法主动退休`, 'system');
      }
      if (player.isRetired) {
        return addLog(state, player.id, `${player.name} 已经退休`, 'system');
      }
      let newState = executeRetirement(state, playerIndex);
      return { ...newState, phase: 'TURN_END' };
    }

    case 'TAKE_LOAN': {
      const amount = action.payload.amount;
      if (amount <= 0) return state;

      let newState = updatePlayer(state, playerIndex, (p) => ({
        ...p,
        cash: p.cash + amount,
        liabilities: [
          ...p.liabilities,
          {
            id: generateId(),
            ...createLiability({
              name: '银行贷款',
              principal: amount,
              debtType: 'bankBusinessLoan',
              source: 'game',
            }),
          },
        ],
      }));
      newState = addLog(newState, player.id, `${player.name} 向银行贷款 ${amount} 元`, 'liability');
      return newState;
    }

    case 'REPAY_LIABILITY': {
      const { liabilityId, amount } = action.payload;
      const liability = player.liabilities.find((l) => l.id === liabilityId);
      if (!liability || amount <= 0) return state;

      const debtType = inferDebtTypeFromLiability(liability);
      const repayAmount = Math.min(amount, liability.principal);
      const penalty = calcPrepaymentPenalty(debtType, liability.principal, liability.paidPeriods ?? 0);
      const totalCost = repayAmount + penalty;

      if (player.cash < totalCost) {
        return addLog(state, player.id, `${player.name} 现金不足，无法偿还 ${liability.name}`, 'system');
      }

      const oldPayment = liability.monthlyPayment;
      const newPrincipal = liability.principal - repayAmount;
      const newPayment =
        newPrincipal > 0
          ? calcLiabilityMonthlyPayment(newPrincipal, debtType, liability.totalLoanMonth)
          : 0;

      let newState = updatePlayer(state, playerIndex, (p) => {
        const updatedLiabilities =
          newPrincipal <= 0
            ? p.liabilities.filter((l) => l.id !== liabilityId)
            : p.liabilities.map((l) =>
                l.id === liabilityId
                  ? { ...l, principal: newPrincipal, monthlyPayment: newPayment }
                  : l
              );

        const paymentReduction = oldPayment - newPayment;
        const expenses =
          liability.source === 'profession'
            ? syncExpenseOnRepay(p.expenses, debtType, paymentReduction)
            : p.expenses;

        return {
          ...p,
          cash: p.cash - totalCost,
          liabilities: updatedLiabilities,
          expenses,
        };
      });

      const penaltyText = penalty > 0 ? `，提前还款罚金 ${penalty} 元` : '';
      newState = addLog(
        newState,
        player.id,
        `${player.name} 偿还 ${liability.name} 本金 ${repayAmount} 元${penaltyText}，月供 ${oldPayment} → ${newPayment} 元`,
        'repay'
      );
      newState = checkAndHandleBankruptcy(newState);
      return newState;
    }

    case 'SELL_ASSET': {
      const { assetId, multiplier, shareHand: sellLots } = action.payload;
      const asset = player.assets.find((a) => a.id === assetId);
      if (!asset) return state;

      const effectiveMult = multiplier * getAssetPriceMultiplier(asset, state.marketMultiplier, state.sectorMultiplier);

      if (isStockLotAsset(asset)) {
        const totalLots = asset.shareHand ?? 0;
        const lotsToSell =
          sellLots !== undefined
            ? sellLots
            : totalLots < 1
              ? totalLots
              : totalLots;
        if (totalLots >= 1 && sellLots !== undefined && (!Number.isInteger(sellLots) || sellLots < 1)) {
          return addLog(state, player.id, '整手持仓须按整手卖出', 'system');
        }
        if (lotsToSell <= 0 || lotsToSell > totalLots) {
          return addLog(state, player.id, '卖出手数无效', 'system');
        }
        const sellPrice = stockLotSellProceeds(asset, lotsToSell, effectiveMult, state.sectorMultiplier);
        const remainingLots = totalLots - lotsToSell;

        let newState = updatePlayer(state, playerIndex, (p) => {
          if (remainingLots <= 0.001) {
            return {
              ...p,
              cash: p.cash + sellPrice,
              assets: p.assets.filter((a) => a.id !== assetId),
            };
          }
          const remaining = buildStockLotAsset(
            { ...asset, shareHand: remainingLots },
            remainingLots,
            asset.purchaseRound ?? state.round
          );
          remaining.id = asset.id;
          remaining.heldMonths = asset.heldMonths;
          remaining.purchaseRound = asset.purchaseRound;
          // 【v3.11】合并持仓后按比例保留成本
          remaining.cost = Math.round(asset.cost * (remainingLots / totalLots));
          remaining.downPayment = remaining.cost;
          return {
            ...p,
            cash: p.cash + sellPrice,
            assets: p.assets.map((a) => (a.id === assetId ? remaining : a)),
          };
        });
        newState = addLog(
          newState,
          player.id,
          `${player.name} 卖出 ${asset.name} ${lotsToSell} 手，获得 ${sellPrice} 元`,
          'asset'
        );
        return { ...newState, currentCard: null, phase: 'TURN_END' };
      }

      const sellPrice = calculateSellProceeds(asset, effectiveMult, {});
      // 【修正】v3.10 抵押资产卖出：先还贷再给净值
      const wasSelfLiving = asset.type === 'realEstate' && asset.isSelfLiving;
      let newState = updatePlayer(state, playerIndex, (p) => {
        const { netCash, updatedLiabilities } = settleAssetLoan(p, assetId, sellPrice, `${asset.name}不足额`);
        const remaining = p.assets.filter((a) => a.id !== assetId);
        if (wasSelfLiving) {
          const nextHome = remaining.find(a => a.type === 'realEstate' && !a.isSelfLiving);
          if (nextHome) {
            return {
              ...p,
              cash: p.cash + netCash,
              assets: remaining.map(a => a.id === nextHome.id ? { ...a, isSelfLiving: true } : a),
              liabilities: updatedLiabilities,
            };
          }
        }
        return {
          ...p,
          cash: p.cash + netCash,
          assets: remaining,
          liabilities: updatedLiabilities,
        };
      });
      const securedLoans = state.players[playerIndex].liabilities.filter(l => l.securedAssetId === assetId);
      const payOff = securedLoans.reduce((s, l) => s + l.principal, 0);
      newState = addLog(
        newState,
        player.id,
        `${player.name} 卖出 ${asset.name}，售价 ${sellPrice} 元，还贷 ${payOff} 元，净得 ${sellPrice - payOff} 元`,
        'asset'
      );
      return { ...newState, currentCard: null, phase: 'TURN_END' };
    }

    case 'LIQUIDATE_ASSET': {
      const { assetId } = action.payload;
      const asset = player.assets.find((a) => a.id === assetId);
      if (!asset || !isSellableAsset(asset)) return state;

      const liquidation = liquidateAsset(asset, state.marketMultiplier, state.sectorMultiplier);

      // 抵押资产变卖：先还贷再给净值
      const wasSelfLiving = asset.type === 'realEstate' && asset.isSelfLiving;
      let newState = updatePlayer(state, playerIndex, (p) => {
        const { netCash, updatedLiabilities } = settleAssetLoan(
          p, assetId, liquidation.proceeds, `${asset.name}变卖差额`
        );
        const remaining = p.assets.filter((a) => a.id !== assetId);
        let assets = remaining;
        if (wasSelfLiving) {
          const nextHome = remaining.find(a => a.type === 'realEstate' && !a.isSelfLiving);
          if (nextHome) {
            assets = remaining.map(a => a.id === nextHome.id ? { ...a, isSelfLiving: true } : a);
          }
        }
        return {
          ...p,
          cash: p.cash + netCash,
          assets,
          liabilities: updatedLiabilities,
          marriageHappiness:
            p.marriageStatus === 'married'
              ? Math.max(0, p.marriageHappiness + liquidation.happinessDelta)
              : p.marriageHappiness,
        };
      });

      const securedLoans = state.players[playerIndex].liabilities.filter(l => l.securedAssetId === assetId);
      const payOffAmt = securedLoans.reduce((s, l) => s + l.principal, 0);
      const netToPlayer = liquidation.proceeds - payOffAmt;
      newState = addLog(
        newState,
        player.id,
        `${player.name} 强制变卖 ${asset.name}，变卖价 ${liquidation.proceeds} 元，还贷 ${payOffAmt} 元，净得 ${netToPlayer} 元，幸福度 ${liquidation.happinessDelta}`,
        'asset'
      );

      newState = {
        ...newState,
        pendingLiquidation: false,
      };

      newState = checkAndHandleBankruptcy(newState);
      if (newState.phase === 'GAME_OVER') return newState;

      const updated = newState.players[playerIndex];
      if (needsLiquidation(updated, newState.cashFlowMultiplier, newState.sectorMultiplier)) {
        return { ...newState, phase: 'CARD_DECISION', pendingLiquidation: true };
      }

      return { ...newState, phase: 'TURN_END' };
    }

    case 'CONFIRM_CASH_FLOW_SETTLEMENT': {
      const hasPendingCard = state.currentCard || state.pendingLiquidation;
      return { ...state, pendingCashFlowSettlement: null, phase: hasPendingCard ? 'CARD_DECISION' : 'TURN_END' };
    }

    case 'CONFIRM_DIVORCE': {
      const keepHouse = action.payload.keepHouse;
      return executeDivorce(state, playerIndex, keepHouse);
    }

    case 'END_TURN': {
      if (player.isBankrupt) {
        return finishEndTurn(state, playerIndex);
      }

      const afterBankruptcy = checkAndHandleBankruptcy(state);
      if (afterBankruptcy.pendingLiquidation) {
        return afterBankruptcy;
      }
      if (afterBankruptcy.phase === 'GAME_OVER') {
        return afterBankruptcy;
      }

      return finishEndTurn(afterBankruptcy, playerIndex);
    }

    case 'DECLARE_BANKRUPTCY': {
      return updatePlayer(state, playerIndex, (p) => ({ ...p, isBankrupt: true, cash: 0 }));
    }

    case 'STOP_AUTO_TEST': {
      if (!state.testMode) return state;
      return { ...state, testStopped: true };
    }

    case 'MANUAL_SELL_STOCK': {
      const { assetId, sellHand } = action.payload;
      const stockAsset = player.assets.find((a) => a.id === assetId);
      if (!stockAsset || !isStockLotAsset(stockAsset)) return state;

      const totalLots = stockAsset.shareHand ?? 0;
      if (!Number.isInteger(sellHand) || sellHand < 1 || sellHand > totalLots) {
        return addLog(state, player.id, `${player.name} 卖出手数无效`, 'system');
      }

      // 使用 calcStockProfit（含佣金+印花税+市场乘数）
      const sellPrice = calcStockProfit(stockAsset, sellHand, state.marketMultiplier, state.sectorMultiplier);
      const remainingLots = totalLots - sellHand;

      let newState = updatePlayer(state, playerIndex, (p) => {
        if (remainingLots <= 0) {
          return {
            ...p,
            cash: p.cash + sellPrice,
            assets: p.assets.filter((a) => a.id !== assetId),
          };
        }
        const remaining = buildStockLotAsset(
          { ...stockAsset, shareHand: remainingLots },
          remainingLots,
          stockAsset.purchaseRound ?? state.round
        );
        remaining.id = stockAsset.id;
        remaining.heldMonths = stockAsset.heldMonths;
        remaining.purchaseRound = stockAsset.purchaseRound;
        // 保留 PE 字段
        remaining.basePe = stockAsset.basePe;
        remaining.currentPe = stockAsset.currentPe;
        remaining.intrinsicPrice = stockAsset.intrinsicPrice;
        // 【v3.11】合并持仓后，按比例保留成本（否则 buildStockLotAsset 会用模板价重算）
        remaining.cost = Math.round(stockAsset.cost * (remainingLots / totalLots));
        remaining.downPayment = remaining.cost;
        return {
          ...p,
          cash: p.cash + sellPrice,
          assets: p.assets.map((a) => (a.id === assetId ? remaining : a)),
        };
      });

      newState = addLog(
        newState,
        player.id,
        `${player.name} 自主卖出 ${stockAsset.name} ${sellHand} 手，获得 ${sellPrice} 元（市场价无折扣）`,
        'asset'
      );
      return { ...newState };
    }

    case 'SET_DCA_PLAN': {
      if (player.isRetired) {
        return addLog(state, player.id, '退休玩家无法创建新定投计划', 'system');
      }
      const { assetId, monthlyAmount, smartEnabled, endRound } = action.payload;
      const targetAsset = player.assets.find((a) => a.id === assetId);
      if (!targetAsset) {
        return addLog(state, player.id, '未找到目标资产，无法创建定投计划', 'system');
      }
      if (!isDcaSupported(targetAsset)) {
        return addLog(state, player.id, `${targetAsset.name} 不支持定投`, 'system');
      }
      const existingPlans = player.dcaPlans ?? [];
      if (existingPlans.length >= 5) {
        return addLog(state, player.id, '最多同时存在 5 条定投计划', 'system');
      }
      const newPlan: DcaPlan = {
        id: generateId(),
        assetId,
        assetName: targetAsset.name,
        assetType: targetAsset.type,
        monthlyAmount,
        smartEnabled,
        paused: false,
        startedRound: state.round,
        endRound,
      };
      return updatePlayer(state, playerIndex, (p) => ({
        ...p,
        dcaPlans: [...existingPlans, newPlan],
      }));
    }

    case 'TOGGLE_DCA_PLAN': {
      const { planId: togglePlanId } = action.payload;
      const existingPlans = player.dcaPlans ?? [];
      const planToToggle = existingPlans.find((p) => p.id === togglePlanId);
      if (!planToToggle) return state;
      return updatePlayer(state, playerIndex, (p) => ({
        ...p,
        dcaPlans: existingPlans.map((plan) =>
          plan.id === togglePlanId ? { ...plan, paused: !plan.paused } : plan
        ),
      }));
    }

    case 'UPDATE_DCA_PLAN': {
      const { planId: updatePlanId, monthlyAmount: newMonthlyAmount, smartEnabled: newSmartEnabled, endRound: newEndRound } = action.payload;
      const plansToUpdate = player.dcaPlans ?? [];
      return updatePlayer(state, playerIndex, (p) => ({
        ...p,
        dcaPlans: plansToUpdate.map((plan) => {
          if (plan.id !== updatePlanId) return plan;
          return {
            ...plan,
            ...(newMonthlyAmount !== undefined ? { monthlyAmount: newMonthlyAmount } : {}),
            ...(newSmartEnabled !== undefined ? { smartEnabled: newSmartEnabled } : {}),
            ...(newEndRound !== undefined ? { endRound: newEndRound } : {}),
          };
        }),
      }));
    }

    case 'DELETE_DCA_PLAN': {
      const { planId: deletePlanId } = action.payload;
      const plansForDelete = player.dcaPlans ?? [];
      const deletedPlan = plansForDelete.find((p) => p.id === deletePlanId);
      if (!deletedPlan) return state;
      let newState2 = updatePlayer(state, playerIndex, (p) => ({
        ...p,
        dcaPlans: plansForDelete.filter((plan) => plan.id !== deletePlanId),
      }));
      newState2 = addLog(
        newState2,
        player.id,
        `${player.name} 终止了 ${deletedPlan.assetName} 定投计划`,
        'dca'
      );
      return newState2;
    }

    case 'DCA_WARNING_DISMISS':
      return state;

    case 'SET_RENT_TIER': {
      const tier = action.payload.tier;
      return updatePlayer(state, playerIndex, (p) => ({
        ...p,
        rentTier: tier,
      }));
    }

    default:
      return state;
  }
}

/**
 * 月度定投执行：在发薪结算后执行所有未暂停的定投计划
 * 扣款优先级：刚性支出已在 handlePayday 中扣除，此处仅处理定投
 */
function executeMonthlyDca(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  const plans = player.dcaPlans ?? [];
  if (plans.length === 0) return state;

  let newState = state;
  const multiplier = state.marketMultiplier;
  const sectorMult = state.sectorMultiplier;

  for (const plan of plans) {
    // 跳过暂停或已终止的计划
    if (plan.paused) continue;
    if (plan.endRound != null && state.round > plan.endRound) {
      // 到期自动终止
      newState = updatePlayer(newState, playerIndex, (p) => ({
        ...p,
        dcaPlans: (p.dcaPlans ?? []).filter((dp) => dp.id !== plan.id),
      }));
      newState = addLog(
        newState,
        player.id,
        `${player.name} 的 ${plan.assetName} 定投计划已到期自动终止`,
        'dca'
      );
      continue;
    }

    // 查找目标资产
    const assetIndex = newState.players[playerIndex].assets.findIndex((a) => a.id === plan.assetId);
    if (assetIndex === -1) continue;

    const targetAsset = newState.players[playerIndex].assets[assetIndex];
    if (!isStockLotAsset(targetAsset)) continue;

    // 计算智能定投倍率
    let effectiveAmount = plan.monthlyAmount;
    if (plan.smartEnabled) {
      const smartMult = getDcaSmartMultiplier(targetAsset);
      effectiveAmount = Math.round(plan.monthlyAmount * smartMult);
    }

    // 检查现金是否足够
    const currentPrice = calcCurrentStockPrice(targetAsset, multiplier, sectorMult);
    if (currentPrice <= 0) continue;

    const lots = calcDcaBuyLots(effectiveAmount, currentPrice);
    if (lots <= 0) continue;

    const buyCost = calcDcaActualCost(lots, currentPrice);
    const currentCash = newState.players[playerIndex].cash;

    if (currentCash < buyCost) {
      // 现金不足，暂停本回合定投
      newState = updatePlayer(newState, playerIndex, (p) => ({
        ...p,
        dcaPlans: (p.dcaPlans ?? []).map((dp) =>
          dp.id === plan.id ? { ...dp, paused: true } : dp
        ),
      }));
      newState = addLog(
        newState,
        player.id,
        `${player.name} 现金不足（${currentCash}），${plan.assetName} 定投暂停`,
        'dca'
      );
      continue;
    }

    // 执行买入：增持份额
    const existingHands = targetAsset.shareHand ?? 0;
    const newTotalLots = existingHands + lots;
    const totalCost = targetAsset.cost + buyCost;

    // 更新资产
    const updatedAsset: Asset = {
      ...targetAsset,
      shareHand: newTotalLots,
      cost: totalCost,
      downPayment: totalCost,
      marketValue: newTotalLots * STOCK_LOT_SIZE * currentPrice,
      heldMonths: targetAsset.heldMonths,
    };

    // 更新玩家：扣现金 + 替换资产
    newState = updatePlayer(newState, playerIndex, (p) => {
      const newAssets = p.assets.map((a) => (a.id === plan.assetId ? updatedAsset : a));
      return {
        ...p,
        cash: p.cash - buyCost,
        assets: newAssets,
      };
    });

    const avgCost = getAssetAverageCost(updatedAsset);
    newState = addLog(
      newState,
      player.id,
      `${player.name} 定投 ${plan.assetName} ${lots} 手，花费 ${buyCost} 元，均价 ${avgCost} 元/股`,
      'dca'
    );
  }

  return newState;
}

/**
 * 全局字段钳位：所有数值字段锁定合法区间
 */
function clampPlayerFields(player: Player): Player {
  return {
    ...player,
    cash: Math.max(0, player.cash ?? 0),
    marriageHappiness: Math.min(100, Math.max(0, player.marriageHappiness ?? 0)),
    children: Math.min(10, Math.max(0, player.children ?? 0)),
    rentExpense: Math.max(0, player.rentExpense ?? 0),
  };
}

/**
 * 全局现金兜底 + 字段钳位：任何 Action 执行后确保数值合法
 */
function wrapCashGuard(state: GameState): GameState {
  if (state.phase === 'GAME_OVER' || state.phase === 'SETUP') return state;
  const playerIndex = state.currentPlayerIndex;
  const player = state.players[playerIndex];
  if (!player || player.isBankrupt) return state;

  // 先检查原始现金是否真的为负（钳位前）
  if (player.cash <= 0) {
    if (needsLiquidation(player, state.cashFlowMultiplier, state.sectorMultiplier)) {
      if (state.pendingLiquidation && state.phase === 'CARD_DECISION') return state;
      // 不钳位，让 LiquidateModal 看到真实负现金
      return { ...state, phase: 'CARD_DECISION', pendingLiquidation: true, currentCard: null };
    }

    // 无可变卖资产 → 自动贷款填平
    const gap = Math.abs(player.cash);
    const loanState = updatePlayer(state, playerIndex, (p) => ({
      ...p,
      cash: 0,
      liabilities: [
        ...p.liabilities,
        {
          id: generateId(),
          ...createLiability({
            name: '现金兜底贷款',
            principal: gap,
            debtType: 'bankBusinessLoan',
            source: 'game',
          }),
        },
      ],
    }));
    return addLog(loanState, player.id, `现金不足，自动贷款 ${gap} 元兜底`, 'system');
  }

  // 现金 >= 0：仅做字段钳位后返回
  let clampedState = state;
  if (state.pendingLiquidation) {
    clampedState = { ...state, pendingLiquidation: false };
  }
  clampedState = updatePlayer(clampedState, playerIndex, (p) => clampPlayerFields(p));
  return clampedState;
}

/** 检查玩家是否匹配 DoodadCard 的 filterConfig */
function passesCardFilter(player: Player, card: DoodadCard): boolean {
  const cfg = card.filterConfig;
  if (!cfg) return true;

  if (cfg.minAge !== undefined && player.age < cfg.minAge) return false;
  if (cfg.maxAge !== undefined && player.age > cfg.maxAge) return false;
  if (cfg.marriageStatus && player.marriageStatus !== cfg.marriageStatus) return false;
  if (cfg.minChildren !== undefined && (player.children ?? 0) < cfg.minChildren) return false;
  if (cfg.maxChildren !== undefined && (player.children ?? 0) > cfg.maxChildren) return false;
  if (cfg.gender && player.gender !== cfg.gender) return false;
  if (cfg.retired === true && !player.isRetired) return false;
  if (cfg.retired === false && player.isRetired) return false;
  if (cfg.unemployed === true && !player.isUnemployed) return false;
  if (cfg.unemployed === false && player.isUnemployed) return false;
  // 持有负债或资产检查（两者任一满足即可，OR 逻辑）
  if (cfg.requiresLiabilityType || cfg.requiresAssetSector) {
    const hasLiability = cfg.requiresLiabilityType
      ? player.liabilities.some((l) => l.debtType === cfg.requiresLiabilityType)
      : false;
    const hasAsset = cfg.requiresAssetSector
      ? player.assets.some((a) => a.metadata?.sector === cfg.requiresAssetSector)
      : false;
    if (!hasLiability && !hasAsset) return false;
  }
  // 【新增】v3.11 保险要求：玩家必须持有指定类型的保险
  if (cfg.requiresInsurance && cfg.requiresInsurance.length > 0) {
    const hasRequiredInsurance = cfg.requiresInsurance.some((insType) =>
      (player.insurances ?? []).includes(insType)
    );
    if (!hasRequiredInsurance) return false;
  }
  return true;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  const nextState = gameReducerSwitch(state, action);
  const guardedState = wrapCashGuard(nextState);
  return runTestValidators(guardedState, state, action);
}

export function getInitialGameState(): GameState {
  return getInitialState();
}
