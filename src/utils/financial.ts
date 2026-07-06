import type { Asset, AssetType, City, DebtType, ExpenseBreakdown, IncomeType, Liability, OpportunityCard, Player, ProfessionTier } from '../types/game';
import { ALL_ASSET_TYPES } from '../types/game';
import { CITY_TIER_PRICE_MULTIPLIER, getCityById } from '../data/cities';

/** 【新增】v3.1 A股/港股/ETF 每手股数 */
export const STOCK_LOT_SIZE = 100;

/** 【新增】v3.1 股票卖出印花税（持有不足1年） */
export const STOCK_STAMP_TAX_RATE = 0.001;

/** 【新增】v3.1 股票交易佣金率 */
export const STOCK_COMMISSION_RATE = 0.0003;

/** 证券类资产类型（可按手数买卖） */
const SECURITY_ASSET_TYPES: ReadonlySet<AssetType> = new Set(['stock', 'bond', 'reit', 'overseas', 'derivative', 'commodity']);

export function isStockLotAsset(asset: Asset): boolean {
  return (
    SECURITY_ASSET_TYPES.has(asset.type) &&
    asset.shareHand !== undefined &&
    asset.singlePrice !== undefined &&
    asset.singlePrice > 0
  );
}

/** 【新增】v3.1 股票市场市值 = 手数 × 100 × 单价
 *  v3.6: 如果有 PE 字段则基于 PE 定价 */
export function getStockLotMarketValue(asset: Asset, priceMultiplier = 1): number {
  if (!isStockLotAsset(asset)) return asset.marketValue;
  const peBasedPrice = asset.basePe != null ? calcCurrentStockPrice(asset) : (asset.singlePrice ?? 0);
  return Math.round((asset.shareHand ?? 0) * STOCK_LOT_SIZE * peBasedPrice * priceMultiplier);
}

/** 【新增】v3.1 股票月股息被动收入
 *  v3.6: 股息仍按 yearDivPerShare 计算 */
export function getStockLotMonthlyDividend(asset: Asset): number {
  if (!isStockLotAsset(asset)) return asset.cashFlow;
  const hands = asset.shareHand ?? 0;
  const div = asset.yearDivPerShare ?? 0;
  return Math.round((hands * STOCK_LOT_SIZE * div) / 12);
}

/** 【新增】v3.1 买入 N 手股票总成本（含佣金） */
export function stockLotBuyCost(lots: number, singlePrice: number): number {
  const gross = lots * STOCK_LOT_SIZE * singlePrice;
  const commission = Math.round(gross * STOCK_COMMISSION_RATE);
  return gross + commission;
}

/** 【新增】v3.1 卖出股票净收入（印花税：持有≥12月豁免） */
export function stockLotSellProceeds(
  asset: Asset,
  sellLots: number,
  priceMultiplier: number,
  sectorMultiplier: Record<string, number> = {}
): number {
  if (!isStockLotAsset(asset)) {
    return calculateSellProceeds(asset, priceMultiplier, sectorMultiplier);
  }
  const sectorMult = asset.metadata?.sector ? (sectorMultiplier[asset.metadata.sector] ?? 1) : 1;
  // v3.6: 如果有 PE 字段则使用 PE 定价
  const price = asset.basePe != null ? calcCurrentStockPrice(asset) : (asset.singlePrice ?? 0);
  const gross = Math.round(sellLots * STOCK_LOT_SIZE * price * priceMultiplier * sectorMult);
  const heldMonths = asset.heldMonths ?? 0;
  const stampTax = heldMonths >= 12 ? 0 : Math.round(gross * STOCK_STAMP_TAX_RATE);
  const commission = Math.round(gross * STOCK_COMMISSION_RATE);
  return gross - stampTax - commission;
}

/** 【新增】v3.1 构建股票持仓资产
 *  v3.6: 同时初始化 PE 字段 */
export function buildStockLotAsset(
  template: Asset,
  lots: number,
  purchaseRound: number
): Asset {
  const singlePrice = template.singlePrice ?? 0;       // 购买时的现价（成交价）
  const yearDiv = template.yearDivPerShare ?? 0;        // 年化每股股息（基于合理价值）
  const marketValue = lots * STOCK_LOT_SIZE * singlePrice;
  const monthlyDiv = Math.round((lots * STOCK_LOT_SIZE * yearDiv) / 12);
  const basePe = template.basePe ?? SECTOR_BASE_PE[template.metadata?.sector ?? ''] ?? 15;
  const currentPe = template.currentPe ?? basePe;
  const intrinsicPrice = template.intrinsicPrice ?? 0;  // 合理价值来自模板，买入后不变
  return {
    ...template,
    shareHand: lots,
    singlePrice,              // 购买时的现价（用于计算成本基础）
    yearDivPerShare: yearDiv,
    basePe,
    currentPe,
    intrinsicPrice,           // 合理价值（模板继承，买入后固定）
    cost: marketValue,
    downPayment: marketValue,
    marketValue,
    cashFlow: monthlyDiv,
    shares: lots * STOCK_LOT_SIZE,
    purchaseRound,
    heldMonths: 0,
    mortgage: 0,
  };
}

/** 【新增】v3.1 婚礼一次性费用（按城市缩放） */
export function weddingCost(cityId?: string): number {
  const mult = getCityById(cityId).expenseMultiplier;
  return Math.round(30000 * mult);
}

/** 【新增】v3.4 再婚费用 = 初婚 60–80% */
export function remarriageCost(cityId?: string): number {
  const base = weddingCost(cityId);
  const ratio = 0.6 + Math.random() * 0.2;
  return Math.round(base * ratio);
}

/** 【新增】v3.1 伴侣月薪加成（约为玩家基准薪资 15%） */
export function calcPartnerSalary(baseSalary: number, cityId?: string): number {
  const mult = getCityById(cityId).salaryMultiplier;
  return Math.round(baseSalary * 0.15 * mult);
}

/** 【新增】v3.1 已婚每月家庭开销（计入 other） */
export function marriageOverhead(cityId?: string): number {
  const mult = getCityById(cityId).expenseMultiplier;
  return Math.round(800 * mult);
}

/** 【新增】v3.1 孕期月医疗支出 */
export function pregnancyMedicalCost(cityId?: string): number {
  const mult = getCityById(cityId).expenseMultiplier;
  return Math.round(1200 * mult);
}

/** 【新增】v3.1 流产一次性费用 */
export function miscarriageCost(cityId?: string): number {
  const mult = getCityById(cityId).expenseMultiplier;
  return Math.round(5000 * mult);
}

/** 【新增】v3.1 离婚律师费；再婚后再离费用更高 */
export function divorceLegalFees(cityId?: string, isPostRemarriage = false): number {
  const mult = getCityById(cityId).expenseMultiplier;
  const base = Math.round(15000 * mult);
  return isPostRemarriage ? Math.round(base * 1.5) : base;
}

/** 【新增】v3.1 有效月薪（失业/婚恋加成） */
export function getEffectiveSalary(player: Player): number {
  if (player.isRetired) {
    return player.pensionIncome ?? 0;
  }
  if (player.isUnemployed) return 0;
  let salary = player.salary;
  if (player.marriageStatus === 'married') {
    // 【v3.8】优先使用 familyIncome（合并家庭收入），否则回退到旧逻辑
    if (player.familyIncome != null && player.familyIncome > 0) {
      salary = player.familyIncome;
    } else {
      const partnerIncome =
        (player.partnerUnemployedTurnsRemaining ?? 0) > 0 ? 0 : player.partnerSalary;
      salary += partnerIncome;
    }
    if (player.marriageHappiness >= 50) {
      salary = Math.round(salary * 1.1);
    }
  }
  return salary;
}

/** 【新增】v3.2 年龄关联失业概率乘数 */
export function calcAgeUnemploymentRate(
  age: number,
  _professionTier: ProfessionTier,
  _professionId: string,
  retireStandardAge: number | null
): number {
  const retire = retireStandardAge ?? 999;
  const yearsToRetire = retire - age;
  if (age < 30) return 0.7;
  if (age < 40) return 0.85;
  if (yearsToRetire <= 5 && yearsToRetire > 0) return 2.0;
  if (age >= 50) return 1.5;
  return 1.0;
}

/** 【新增】v3.2 失业风险等级标签 */
export type UnemploymentRiskLevel = '低' | '中' | '高';

export function getUnemploymentRiskLevel(
  age: number,
  professionTier: ProfessionTier,
  professionId: string,
  retireStandardAge: number | null
): UnemploymentRiskLevel {
  const rate = calcAgeUnemploymentRate(age, professionTier, professionId, retireStandardAge);
  if (rate >= 1.5) return '高';
  if (rate >= 1.0) return '中';
  return '低';
}

/** 【新增】v3.2 退休金（基于退休前最后月薪 × 系数） */
export function calcPensionIncome(lastSalary: number, _cityId?: string): number {
  return Math.round(lastSalary * 0.4);
}

/** 【新增】v3.2 退休后老年医疗月支出 */
export function calcElderlyMedicalExpense(cityId?: string): number {
  const mult = getCityById(cityId).expenseMultiplier;
  return Math.round(1500 * mult);
}

/** 【新增】v3.2 婚姻幸福度与薪资联动（月薪越高，家庭越稳） */
export function calcMarriageHappinessBySalary(salary: number): number {
  return Math.min(8, Math.floor(salary / 1000));
}

/** 【新增】v3.2 距离退休年数（无强制退休返回 null） */
export function getYearsToRetirement(player: Player): number | null {
  if (player.retireStandardAge == null) return null;
  return Math.max(0, player.retireStandardAge - player.age);
}

/** 【新增】v3.1 失业触发概率（职业层级越高越低） */
export function getUnemploymentProbability(tier: ProfessionTier): number {
  switch (tier) {
    case 'basic':
      return 0.85;
    case 'service':
      return 0.65;
    case 'professional':
      return 0.4;
    case 'elite':
      return 0.2;
    default:
      return 0.5;
  }
}

/** 【新增】v3.1 离婚概率 */
export function getDivorceProbability(player: Player): number {
  if (player.marriageStatus !== 'married') return 0;
  let prob = 0;
  if (player.marriageHappiness < 40) prob = 0.15;
  if ((player.dinkTurns ?? 0) >= 12) {
    // 【v3.8】女性 DINK 超过 12 回合额外离婚风险
    prob = Math.max(prob, player.gender === 'female' ? 0.18 : 0.1);
  }
  if ((player.consecutiveUnemployedTurns ?? 0) >= 4 && (player.dinkTurns ?? 0) > 0) {
    prob = Math.max(prob, 0.1) * 2;
  }
  if (player.hasSecretLiquidation) prob = Math.max(prob, 0.25);
  return prob;
}

/** 【新增】v3.1 随机幸福度波动 */
export function rollMarriageHappinessDelta(): number {
  const roll = Math.random();
  if (roll < 0.15) return 8;
  if (roll < 0.3) return -8;
  if (roll < 0.5) return 5;
  if (roll < 0.7) return -5;
  return 0;
}

export interface DivorceSettlementResult {
  cashToSpouse: number;
  legalFees: number;
  forcedAssetDiscount: number;
  isPostRemarriage?: boolean;
}

/** 【新增】v3.1 离婚财产分割估算；再婚后再离分割比例更高；私自变卖后再离 40% */
export function divorceSettlement(player: Player): DivorceSettlementResult {
  const isPostRemarriage = (player.marriageCount ?? 0) >= 2;
  const cashSplitRatio = player.hasSecretLiquidation ? 0.4 : isPostRemarriage ? 0.6 : 0.5;
  return {
    cashToSpouse: Math.round(player.cash * cashSplitRatio),
    legalFees: divorceLegalFees(player.cityId, isPostRemarriage),
    forcedAssetDiscount: player.hasSecretLiquidation ? 0.6 : isPostRemarriage ? 0.65 : 0.7,
    isPostRemarriage,
  };
}

/** 【新增】v3.1 失业期间月现金流（工资为0，支出继续） */
export function unemployedMonthlyCashFlow(
  player: Player,
  cashFlowMultiplier?: Record<AssetType, number>,
  sectorMultiplier?: Record<string, number>
): number {
  return getPassiveIncome(player, cashFlowMultiplier, sectorMultiplier) - getTotalExpenses(player);
}

export interface DebtTypeConfig {
  monthlyRate: number;
  label: string;
  /** 等额本息总期数；bankBusinessLoan 为随借随还仅付息 */
  totalLoanMonth?: number;
  /** 仅付息（不摊还本金） */
  interestOnly?: boolean;
  /** 还款满 N 期后免罚金 */
  freePrepayAfterPeriods?: number;
  /** 未达免罚期时，按剩余本金比例收取 */
  penaltyRate?: number;
  /** 无论期数，始终按剩余本金比例收取 */
  alwaysPenaltyRate?: number;
  /** 未达指定期数时，按剩余本金比例收取 */
  penaltyIfBeforePeriods?: number;
  penaltyBeforePeriods?: number;
}

export const DEBT_TYPE_CONFIG: Record<DebtType, DebtTypeConfig> = {
  creditCard: {
    monthlyRate: 0.015,
    label: '信用卡',
    totalLoanMonth: 24,
  },
  consumerLoan: {
    monthlyRate: 0.008,
    label: '消费贷',
    totalLoanMonth: 36,
    penaltyIfBeforePeriods: 0.03,
    penaltyBeforePeriods: 12,
  },
  carLoan: {
    monthlyRate: 0.0035,
    label: '车贷',
    totalLoanMonth: 60,
    freePrepayAfterPeriods: 12,
    penaltyRate: 0.02,
  },
  houseFirst: {
    monthlyRate: 0.0025,
    label: '首套房贷',
    totalLoanMonth: 360,
    freePrepayAfterPeriods: 12,
    penaltyRate: 0.01,
  },
  houseSecond: {
    monthlyRate: 0.0033,
    label: '二套房贷',
    totalLoanMonth: 360,
    alwaysPenaltyRate: 0.01,
  },
  shopMortgage: {
    monthlyRate: 0.0042,
    label: '商铺抵押贷',
    totalLoanMonth: 240,
    alwaysPenaltyRate: 0.02,
  },
  bankBusinessLoan: {
    monthlyRate: 0.01,
    label: '银行贷款',
    interestOnly: true,
  },
};

export const DEBT_REPAY_PRIORITY: DebtType[] = [
  'creditCard',
  'consumerLoan',
  'bankBusinessLoan',
  'carLoan',
  'shopMortgage',
  'houseSecond',
  'houseFirst',
];

/** 【v3.0】等额本息月供公式 */
export function calcEqualPrincipalInterestPayment(
  principal: number,
  monthRate: number,
  totalMonth: number
): number {
  if (principal <= 0) return 0;
  if (totalMonth <= 0) return Math.round(principal * monthRate);
  if (monthRate === 0) return Math.round(principal / totalMonth);
  const factor = Math.pow(1 + monthRate, totalMonth);
  const payment = (principal * monthRate * factor) / (factor - 1);
  return Math.round(payment);
}

/** 开局基准市场利率（与 GameReducer 初始 interestRate 一致） */
export const BASE_MARKET_INTEREST_RATE = 0.01;

/** 宏观利率变动时需重算月供的 EPI 债务类型 */
export const RATE_AFFECTED_DEBT_TYPES: DebtType[] = [
  'houseFirst',
  'houseSecond',
  'shopMortgage',
  'carLoan',
  'consumerLoan',
];

/** 按市场利率偏移量计算某类债务的有效月利率 */
export function getEffectiveMonthRate(debtType: DebtType, marketInterestRate: number): number {
  const config = getDebtTypeConfig(debtType);
  const delta = marketInterestRate - BASE_MARKET_INTEREST_RATE;
  return Math.max(0.001, config.monthlyRate + delta);
}

/** 宏观降息/加息后，按剩余期数重算单笔 EPI 负债月供 */
export function recalcLiabilityPaymentOnRateChange(
  liability: Liability,
  marketInterestRate: number
): { liability: Liability; delta: number } {
  const debtType = inferDebtTypeFromLiability(liability);
  if (!RATE_AFFECTED_DEBT_TYPES.includes(debtType)) {
    return { liability, delta: 0 };
  }

  const config = getDebtTypeConfig(debtType);
  if (config.interestOnly) {
    return { liability, delta: 0 };
  }

  const totalLoanMonth = liability.totalLoanMonth ?? config.totalLoanMonth ?? 360;
  const paidPeriods = liability.paidPeriods ?? 0;
  const remainingPeriods = Math.max(1, totalLoanMonth - paidPeriods);
  const monthRate = getEffectiveMonthRate(debtType, marketInterestRate);
  const oldPayment = liability.monthlyPayment;
  const newPayment = calcEqualPrincipalInterestPayment(
    liability.principal,
    monthRate,
    remainingPeriods
  );

  // 限制月供变动幅度：最高 3 倍旧月供，最低 0.5 倍
  const cappedPayment = Math.max(oldPayment * 0.5, Math.min(oldPayment * 3, newPayment));

  return {
    liability: {
      ...liability,
      debtType,
      monthlyPayment: cappedPayment,
      interestRate: monthRate * 12,
    },
    delta: cappedPayment - oldPayment,
  };
}

/** 宏观利率变动：重算所有玩家 EPI 类负债月供 */
export function recalcAllPlayersMortgagesOnRateChange(
  players: Player[],
  marketInterestRate: number
): { players: Player[]; changeLogs: string[] } {
  const changeLogs: string[] = [];

  const newPlayers = players.map((player) => {
    let playerDelta = 0;
    let affectedCount = 0;
    const liabilities = player.liabilities.map((l) => {
      const { liability, delta } = recalcLiabilityPaymentOnRateChange(l, marketInterestRate);
      if (delta !== 0) affectedCount += 1;
      playerDelta += delta;
      return liability;
    });

    if (playerDelta !== 0) {
      const direction = playerDelta < 0 ? '减少' : '增加';
      changeLogs.push(
        `${player.name} EPI 月供${direction} ${Math.abs(playerDelta)} 元（${affectedCount} 笔）`
      );
    }

    return { ...player, liabilities };
  });

  return { players: newPlayers, changeLogs };
}

export function calcInterestOnlyPayment(principal: number, monthRate: number): number {
  return Math.round(principal * monthRate);
}

export function getDebtTypeConfig(debtType: DebtType): DebtTypeConfig {
  return DEBT_TYPE_CONFIG[debtType];
}

export function getDebtTypeLabel(debtType: DebtType): string {
  return DEBT_TYPE_CONFIG[debtType].label;
}

/** 根据债务类型计算月供（EPI 或仅付息） */
export function calcLiabilityMonthlyPayment(
  principal: number,
  debtType: DebtType,
  totalLoanMonth?: number
): number {
  const config = getDebtTypeConfig(debtType);
  if (config.interestOnly) {
    return calcInterestOnlyPayment(principal, config.monthlyRate);
  }
  const months = totalLoanMonth ?? config.totalLoanMonth ?? 360;
  return calcEqualPrincipalInterestPayment(principal, config.monthlyRate, months);
}

export function calcPrepaymentPenalty(
  debtType: DebtType,
  remainingPrincipal: number,
  paidPeriods: number
): number {
  const config = getDebtTypeConfig(debtType);

  if (config.alwaysPenaltyRate) {
    return Math.round(remainingPrincipal * config.alwaysPenaltyRate);
  }

  if (config.penaltyIfBeforePeriods !== undefined && config.penaltyBeforePeriods !== undefined) {
    if (paidPeriods < config.penaltyBeforePeriods) {
      return Math.round(remainingPrincipal * config.penaltyIfBeforePeriods);
    }
    return 0;
  }

  if (config.freePrepayAfterPeriods !== undefined && config.penaltyRate !== undefined) {
    if (paidPeriods >= config.freePrepayAfterPeriods) return 0;
    return Math.round(remainingPrincipal * config.penaltyRate);
  }

  return 0;
}

export function inferDebtTypeFromLiability(liability: Liability): DebtType {
  if (liability.debtType) return liability.debtType;

  const name = liability.name;
  if (name === '银行贷款') return 'bankBusinessLoan';
  if (name.includes('信用卡')) return 'creditCard';
  if (name.includes('助学')) return 'consumerLoan';
  if (name.includes('消费')) return 'consumerLoan';
  if (name.includes('汽车') || name.includes('车贷')) return 'carLoan';
  if (name.includes('购物') || name.includes('商业') || name.includes('商铺')) return 'shopMortgage';
  if (name.includes('二套')) return 'houseSecond';
  if (name.includes('抵押') || name.includes('房屋')) return 'houseFirst';
  if (name.includes(' 贷款')) return 'bankBusinessLoan';
  return 'bankBusinessLoan';
}

export function inferProfessionDebtType(name: string): DebtType {
  if (name.includes('二套')) return 'houseSecond';
  if (name.includes('商铺') || name.includes('商业')) return 'shopMortgage';
  if (name.includes('房屋')) return 'houseFirst';
  if (name.includes('汽车') || name.includes('车贷')) return 'carLoan';
  if (name.includes('信用卡')) return 'creditCard';
  if (name.includes('消费') || name.includes('助学')) return 'consumerLoan';
  return 'consumerLoan';
}

export function normalizeLiability(liability: Liability): Liability {
  const debtType = inferDebtTypeFromLiability(liability);
  const config = getDebtTypeConfig(debtType);
  const totalLoanMonth = liability.totalLoanMonth ?? config.totalLoanMonth;
  const monthlyPayment =
    liability.monthlyPayment > 0
      ? liability.monthlyPayment
      : calcLiabilityMonthlyPayment(liability.principal, debtType, totalLoanMonth);

  return {
    ...liability,
    debtType,
    originalPrincipal: liability.originalPrincipal ?? liability.principal,
    paidPeriods: liability.paidPeriods ?? 0,
    totalLoanMonth,
    prepaymentPenaltyRate:
      liability.prepaymentPenaltyRate ??
      config.alwaysPenaltyRate ??
      config.penaltyRate ??
      config.penaltyIfBeforePeriods ??
      0,
    monthlyPayment,
    interestRate: liability.interestRate || config.monthlyRate * 12,
    source: liability.source ?? (isGameAcquiredLiability(liability) ? 'game' : 'profession'),
  };
}

export function createLiability(params: {
  name: string;
  principal: number;
  debtType: DebtType;
  source: 'profession' | 'game';
  paidPeriods?: number;
  totalLoanMonth?: number;
}): Omit<Liability, 'id'> {
  const config = getDebtTypeConfig(params.debtType);
  const totalLoanMonth = params.totalLoanMonth ?? config.totalLoanMonth;
  return {
    name: params.name,
    principal: params.principal,
    monthlyPayment: calcLiabilityMonthlyPayment(params.principal, params.debtType, totalLoanMonth),
    interestRate: config.monthlyRate * 12,
    debtType: params.debtType,
    originalPrincipal: params.principal,
    paidPeriods: params.paidPeriods ?? 0,
    totalLoanMonth,
    prepaymentPenaltyRate: config.alwaysPenaltyRate ?? config.penaltyRate ?? config.penaltyIfBeforePeriods ?? 0,
    source: params.source,
  };
}

export function getRealEstateMortgageDebtType(player: Player, asset: Asset): DebtType {
  if (asset.metadata?.sector === '商业地产' || asset.metadata?.cityTier === 'commercial') {
    return 'shopMortgage';
  }
  const houseLoans = player.liabilities.filter(
    (l) => l.debtType === 'houseFirst' || l.debtType === 'houseSecond'
  ).length;
  return houseLoans === 0 ? 'houseFirst' : 'houseSecond';
}

/** 【v3.0】城市生活成本乘数 */
export function getCityExpenseMultiplier(cityId?: string): number {
  return getCityById(cityId).expenseMultiplier;
}

/** 【v3.0】城市房产持有税率（年化小数） */
export function getCityPropertyTaxRate(cityId?: string): number {
  return getCityById(cityId).propertyTaxRate;
}

/** 【v3.0】根据城市与套数计算首付比例 */
export function getDownPaymentRate(city: City, isSecondHome: boolean, isCommercial = false): number {
  if (isCommercial) return 0.5;
  return isSecondHome ? city.downPaymentSecond : city.downPaymentFirst;
}

export function getPropertyTax(player: Player): number {
  const realEstateCount = player.assets.filter((a) => a.type === 'realEstate').length;
  if (realEstateCount < 2) return 0;
  const rate = getCityPropertyTaxRate(player.cityId);
  const extraProperties = player.assets.filter((a) => a.type === 'realEstate').slice(1);
  return extraProperties.reduce((sum, a) => sum + Math.round((a.marketValue * rate) / 12), 0);
}

export function syncExpenseOnRepay(
  expenses: ExpenseBreakdown,
  debtType: DebtType,
  paymentReduction: number
): ExpenseBreakdown {
  if (paymentReduction <= 0) return expenses;

  const next = { ...expenses };
  switch (debtType) {
    case 'houseFirst':
    case 'houseSecond':
    case 'shopMortgage':
      next.mortgage = Math.max(0, next.mortgage - paymentReduction);
      break;
    case 'carLoan':
      next.carLoan = Math.max(0, next.carLoan - paymentReduction);
      break;
    case 'creditCard':
      next.creditCard = Math.max(0, next.creditCard - paymentReduction);
      break;
    case 'consumerLoan':
      next.studentLoan = Math.max(0, next.studentLoan - paymentReduction);
      break;
    default:
      break;
  }
  return next;
}

export function previewRepayment(
  liability: Liability,
  amount: number
): {
  repayAmount: number;
  penalty: number;
  totalCost: number;
  newPrincipal: number;
  newMonthlyPayment: number;
  paymentReduction: number;
} {
  const debtType = inferDebtTypeFromLiability(liability);
  const repayAmount = Math.min(Math.max(0, amount), liability.principal);
  const penalty = calcPrepaymentPenalty(debtType, liability.principal, liability.paidPeriods ?? 0);
  const newPrincipal = liability.principal - repayAmount;
  const newMonthlyPayment =
    newPrincipal > 0
      ? calcLiabilityMonthlyPayment(newPrincipal, debtType, liability.totalLoanMonth)
      : 0;

  return {
    repayAmount,
    penalty,
    totalCost: repayAmount + penalty,
    newPrincipal,
    newMonthlyPayment,
    paymentReduction: liability.monthlyPayment - newMonthlyPayment,
  };
}

export function getHighestPriorityDebt(player: Player): Liability | null {
  if (player.liabilities.length === 0) return null;

  return [...player.liabilities].sort((a, b) => {
    const priorityA = DEBT_REPAY_PRIORITY.indexOf(inferDebtTypeFromLiability(a));
    const priorityB = DEBT_REPAY_PRIORITY.indexOf(inferDebtTypeFromLiability(b));
    const rateA = getDebtTypeConfig(inferDebtTypeFromLiability(a)).monthlyRate;
    const rateB = getDebtTypeConfig(inferDebtTypeFromLiability(b)).monthlyRate;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return rateB - rateA;
  })[0];
}

export function applyCityTierDownPayment(asset: Asset, cityId?: string): Asset {
  const city = getCityById(cityId);
  const tier = asset.metadata?.cityTier;
  if (!tier || asset.type !== 'realEstate') return asset;

  const isCommercial = tier === 'commercial';
  const isSecondHome = false;
  const rate = isCommercial ? 0.5 : getDownPaymentRate(city, isSecondHome, isCommercial);
  const downPayment = Math.round(asset.cost * rate);
  return {
    ...asset,
    downPayment,
    mortgage: asset.cost - downPayment,
  };
}

/** 【v3.0】按玩家城市缩放房产/车辆价格 */
export function scaleAssetByPlayerCity(asset: Asset, cityId: string): Asset {
  if (asset.type !== 'realEstate' && asset.metadata?.sector !== '汽车') return asset;

  const city = getCityById(cityId);
  const cardTier = asset.metadata?.cityTier;
  if (!cardTier || cardTier === 'commercial') {
    if (asset.type === 'realEstate' && cardTier === 'commercial') {
      const mult = city.expenseMultiplier;
      return {
        ...asset,
        cost: Math.round(asset.cost * mult),
        marketValue: Math.round(asset.marketValue * mult),
        cashFlow: Math.round(asset.cashFlow * mult),
      };
    }
    return asset;
  }

  const tierKey = cardTier === 'tier1' || cardTier === 'tier2' || cardTier === 'tier3' || cardTier === 'tier4'
    ? cardTier
    : 'tier2';
  const cardBaseMult = CITY_TIER_PRICE_MULTIPLIER[tierKey] ?? 1;
  const playerMult = CITY_TIER_PRICE_MULTIPLIER[city.tier] ?? 1;
  const scale = playerMult / cardBaseMult;

  const scaled = {
    ...asset,
    cost: Math.round(asset.cost * scale),
    marketValue: Math.round(asset.marketValue * scale),
    cashFlow: Math.round(asset.cashFlow * scale),
  };
  return applyCityTierDownPayment(scaled, cityId);
}

export function createDefaultMultiplierRecord(): Record<AssetType, number> {
  return Object.fromEntries(ALL_ASSET_TYPES.map((t) => [t, 1])) as Record<AssetType, number>;
}

const INCOME_TYPE_BY_ASSET: Record<AssetType, IncomeType> = {
  stock: 'dividend',
  bond: 'interest',
  reit: 'rent',
  commodity: 'capitalGain',
  derivative: 'capitalGain',
  overseas: 'dividend',
  entity: 'operating',
  realEstate: 'rent',
  business: 'operating',
  intellectual: 'operating',
};

export function getAssetIncomeType(asset: Asset): IncomeType {
  return asset.metadata?.incomeType ?? INCOME_TYPE_BY_ASSET[asset.type];
}

export function getPassiveIncomeByType(
  player: Player,
  cashFlowMultiplier: Record<AssetType, number> = createDefaultMultiplierRecord(),
  sectorMultiplier: Record<string, number> = {}
): Record<IncomeType, number> {
  const breakdown: Record<IncomeType, number> = {
    capitalGain: 0,
    dividend: 0,
    interest: 0,
    rent: 0,
    operating: 0,
  };

  for (const asset of player.assets) {
    const incomeType = getAssetIncomeType(asset);
    breakdown[incomeType] += getAssetCashFlow(asset, cashFlowMultiplier, sectorMultiplier);
  }

  return breakdown;
}

export function getAssetCashFlow(
  asset: Asset,
  cashFlowMultiplier: Record<AssetType, number>,
  sectorMultiplier: Record<string, number>
): number {
  const typeMult = cashFlowMultiplier[asset.type] ?? 1;
  const sectorMult = asset.metadata?.sector ? (sectorMultiplier[asset.metadata.sector] ?? 1) : 1;
  const baseFlow = isStockLotAsset(asset) ? getStockLotMonthlyDividend(asset) : asset.cashFlow;
  return Math.round(baseFlow * typeMult * sectorMult);
}

export function getPassiveIncome(
  player: Player,
  cashFlowMultiplier: Record<AssetType, number> = createDefaultMultiplierRecord(),
  sectorMultiplier: Record<string, number> = {}
): number {
  return player.assets.reduce(
    (sum, asset) => sum + getAssetCashFlow(asset, cashFlowMultiplier, sectorMultiplier),
    0
  );
}

export function isGameAcquiredLiability(liability: Liability): boolean {
  if (liability.source === 'game') return true;
  if (liability.source === 'profession') return false;
  return (
    liability.name === '银行贷款' ||
    liability.name.includes(' 贷款') ||
    liability.name.includes(' 抵押贷款')
  );
}

/** 【新增】v3.10 计算玩家月租金支出 */
export function getRentExpense(player: Player, cityId: string): number {
  const city = getCityById(cityId);
  const hasSelfLiving = player.assets.some(a => a.type === 'realEstate' && a.isSelfLiving);
  if (hasSelfLiving) return 0;

  const tier = player.rentTier ?? 'standard';
  const tierMultipliers: Record<string, number> = { economy: 0.7, standard: 1.0, luxury: 1.5 };
  const tierMult = tierMultipliers[tier] ?? 1.0;

  const marryFactor = player.marriageStatus === 'married' ? 0.9 : 1.3;
  const baseRent = city.rentBase ?? 3000;
  let rent = Math.round(baseRent * marryFactor * tierMult);

  if (player.children > 0) rent = Math.round(rent * (1 + player.children * 0.1));

  return rent;
}

/** 总支出 = 全部负债月供 + 非负债固定支出（不含 expenses.mortgage 等遗留字段，避免重复） */
export function getFixedExpenses(player: Player): number {
  const liabilityPayments = player.liabilities.reduce((sum, l) => sum + l.monthlyPayment, 0);
  const pregnancyMedical = player.hasPregnancy ? (player.expenses.medicalPregnancy ?? pregnancyMedicalCost(player.cityId)) : 0;
  const elderlyMedical = player.isRetired
    ? (player.expenses.medicalElderly ?? calcElderlyMedicalExpense(player.cityId))
    : 0;
  const tempChildBoost =
    (player.tempExpenseTurnsRemaining ?? 0) > 0 ? (player.tempPerChildBoost ?? 0) : 0;
  const nonDebtFixed =
    player.expenses.tax +
    player.expenses.other +
    player.children * (player.expenses.perChild + tempChildBoost) +
    pregnancyMedical +
    elderlyMedical;
  return liabilityPayments + nonDebtFixed + getRentExpense(player, player.cityId);
}

export function getGameAcquiredLoanPayments(player: Player): number {
  return player.liabilities
    .filter(isGameAcquiredLiability)
    .reduce((sum, l) => sum + l.monthlyPayment, 0);
}

export function getTotalExpenses(player: Player): number {
  return getFixedExpenses(player);
}

export function getMonthlyCashFlow(
  player: Player,
  cashFlowMultiplier?: Record<AssetType, number>,
  sectorMultiplier?: Record<string, number>
): number {
  let salary: number;
  if (player.isRetired) {
    salary = player.pensionIncome ?? 0;
  } else if (player.isUnemployed) {
    salary = 0;
  } else {
    salary = getEffectiveSalary(player);
  }
  return salary + getPassiveIncome(player, cashFlowMultiplier, sectorMultiplier) - getTotalExpenses(player);
}

export function getAssetMarketValue(
  asset: Asset,
  multiplier: number,
  sectorMultiplier: Record<string, number> = {}
): number {
  if (isStockLotAsset(asset)) {
    const sectorMult = asset.metadata?.sector ? (sectorMultiplier[asset.metadata.sector] ?? 1) : 1;
    return getStockLotMarketValue(asset, multiplier * sectorMult);
  }
  const sectorMult = asset.metadata?.sector ? (sectorMultiplier[asset.metadata.sector] ?? 1) : 1;
  return Math.round(asset.marketValue * multiplier * sectorMult);
}

export function getAssetPriceMultiplier(
  asset: Asset,
  marketMultiplier: Record<AssetType, number>,
  sectorMultiplier: Record<string, number> = {}
): number {
  const typeMult = marketMultiplier[asset.type] ?? 1;
  const sectorMult = asset.metadata?.sector ? (sectorMultiplier[asset.metadata.sector] ?? 1) : 1;
  return typeMult * sectorMult;
}

export function getTotalAssetsValue(
  player: Player,
  marketMultiplier: Record<AssetType, number>,
  sectorMultiplier: Record<string, number> = {}
): number {
  return player.assets.reduce(
    (sum, a) => sum + getAssetMarketValue(a, marketMultiplier[a.type], sectorMultiplier),
    0
  );
}

export function getNetWorth(
  player: Player,
  marketMultiplier: Record<AssetType, number>,
  sectorMultiplier: Record<string, number> = {}
): number {
  return player.cash + getTotalAssetsValue(player, marketMultiplier, sectorMultiplier) - getCurrentDebt(player);
}

export function canAffordDownPayment(player: Player, asset: Asset): boolean {
  return player.cash >= asset.downPayment;
}

export function getMaxLoanAmount(_player: Player): number {
  return Infinity;
}

export function getCurrentDebt(player: Player): number {
  return player.liabilities.reduce((sum, l) => sum + l.principal, 0);
}

export function canTakeLoan(_player: Player, amount: number): boolean {
  return amount > 0;
}

export function checkFinancialFreedom(
  player: Player,
  cashFlowMultiplier?: Record<AssetType, number>,
  sectorMultiplier?: Record<string, number>
): boolean {
  return getPassiveIncome(player, cashFlowMultiplier, sectorMultiplier) > getTotalExpenses(player);
}

/** 【新增】v3.5 可紧急变卖资产（股票/房产/企业/车辆） */
export function isSellableAsset(asset: Asset): boolean {
  if (asset.type === 'stock' || asset.type === 'realEstate' || asset.type === 'business') return true;
  if (asset.metadata?.sector === '汽车') return true;
  return false;
}

export function hasSellableAssets(player: Player): boolean {
  return player.assets.some(isSellableAsset);
}

export function getSellableAssets(player: Player): Asset[] {
  return player.assets.filter(isSellableAsset);
}

/** 【新增】v3.5 应急储备月数（现金可支撑负现金流的月数，或正现金流时现金/总支出） */
export function calcEmergencyReserveMonths(
  player: Player,
  cashFlowMultiplier?: Record<AssetType, number>,
  sectorMultiplier?: Record<string, number>
): number {
  const cf = getMonthlyCashFlow(player, cashFlowMultiplier, sectorMultiplier);
  if (cf >= 0) {
    const expenses = getTotalExpenses(player);
    return expenses > 0 ? player.cash / expenses : 99;
  }
  const burn = Math.abs(cf);
  return burn > 0 ? player.cash / burn : 0;
}

/** 【新增】v3.5 失业婚姻幸福度惩罚是否减半（应急储备≥3月或被动收入>0） */
export function shouldHalveUnemploymentPenalty(
  player: Player,
  cashFlowMultiplier?: Record<AssetType, number>,
  sectorMultiplier?: Record<string, number>
): boolean {
  const reserve = calcEmergencyReserveMonths(player, cashFlowMultiplier, sectorMultiplier);
  const passive = getPassiveIncome(player, cashFlowMultiplier, sectorMultiplier);
  return reserve >= 3 || passive > 0;
}

export interface LiquidationResult {
  proceeds: number;
  happinessDelta: number;
  isSecret: boolean;
}

/** 【新增】v3.5 协商变卖：70% 市价，幸福度 -10 */
export function liquidateAssetConsent(
  asset: Asset,
  marketMultiplier: Record<AssetType, number>,
  sectorMultiplier: Record<string, number> = {}
): LiquidationResult {
  const marketValue = getAssetMarketValue(asset, marketMultiplier[asset.type], sectorMultiplier);
  return { proceeds: Math.round(marketValue * 0.7), happinessDelta: -10, isSecret: false };
}

/** 【新增】v3.5 私自变卖：50% 市价，幸福度 -30，高离婚风险 */
export function liquidateAssetSecret(
  asset: Asset,
  marketMultiplier: Record<AssetType, number>,
  sectorMultiplier: Record<string, number> = {}
): LiquidationResult {
  const marketValue = getAssetMarketValue(asset, marketMultiplier[asset.type], sectorMultiplier);
  return { proceeds: Math.round(marketValue * 0.5), happinessDelta: -30, isSecret: true };
}

/** 【新增】v3.5 计算失业幸福度惩罚 */
export function calcUnemploymentHappinessPenalty(
  player: Player,
  cashFlowMultiplier?: Record<AssetType, number>,
  sectorMultiplier?: Record<string, number>
): number {
  let penalty = 0;
  const halve = shouldHalveUnemploymentPenalty(player, cashFlowMultiplier, sectorMultiplier);

  if (player.isUnemployed) {
    const turns = player.consecutiveUnemployedTurns ?? 1;
    penalty += 15 + 5 * Math.max(0, turns - 1);
    if (turns >= 4 && player.children > 0) penalty += 8;
  }

  if ((player.partnerUnemployedTurnsRemaining ?? 0) > 0) {
    penalty += 10;
  }

  if ((player.postEmploymentScarTurnsRemaining ?? 0) > 0) {
    penalty += 5;
  }

  return halve ? Math.round(penalty / 2) : penalty;
}

/** 【新增】v3.5 破产判定：月现金流<0 且 现金≤0 且 无可变卖资产 */
export function checkBankruptcy(
  player: Player,
  cashFlowMultiplier?: Record<AssetType, number>,
  sectorMultiplier?: Record<string, number>
): boolean {
  const cf = getMonthlyCashFlow(player, cashFlowMultiplier, sectorMultiplier);
  if (cf >= 0) return false;
  if (player.cash > 0) return false;
  return !hasSellableAssets(player);
}

/** 【新增】v3.5 是否需要强制变卖弹窗 */
export function needsLiquidation(
  player: Player,
  cashFlowMultiplier?: Record<AssetType, number>,
  sectorMultiplier?: Record<string, number>
): boolean {
  const cf = getMonthlyCashFlow(player, cashFlowMultiplier, sectorMultiplier);
  return cf < 0 && player.cash <= 0 && hasSellableAssets(player);
}

export function getAssetTypeLabel(type: AssetType): string {
  const labels: Record<AssetType, string> = {
    stock: '股票',
    bond: '债券',
    reit: 'REITs',
    commodity: '大宗商品',
    derivative: '衍生品',
    overseas: '海外资产',
    entity: '实体经营',
    realEstate: '房地产',
    business: '企业',
    intellectual: '知识产权',
  };
  return labels[type];
}

export function getIncomeTypeLabel(type: IncomeType): string {
  const labels: Record<IncomeType, string> = {
    capitalGain: '资本利得',
    dividend: '股息分红',
    interest: '利息收入',
    rent: '租金收入',
    operating: '经营收入',
  };
  return labels[type];
}

export function getSellPrice(
  asset: Asset,
  multiplier: number,
  sectorMultiplier: Record<string, number> = {}
): number {
  return getAssetMarketValue(asset, multiplier, sectorMultiplier);
}

const TRANSACTION_COST_RATES: Partial<Record<AssetType, number>> = {
  stock: 0.001,
  bond: 0.0001,
  reit: 0.0005,
  commodity: 0.0003,
  derivative: 0.0002,
  overseas: 0.0015,
  entity: 0.005,
  realEstate: 0.03,
  business: 0.01,
  intellectual: 0.005,
};

export function getTransactionCostRate(assetType: AssetType): number {
  return TRANSACTION_COST_RATES[assetType] ?? 0.001;
}

export function calculateBuyCost(asset: Asset, lots?: number): number {
  if (isStockLotAsset(asset) && lots !== undefined) {
    return stockLotBuyCost(lots, asset.singlePrice ?? 0);
  }
  if (isStockLotAsset(asset)) {
    return stockLotBuyCost(asset.shareHand ?? 1, asset.singlePrice ?? 0);
  }
  const fee = Math.round(asset.downPayment * getTransactionCostRate(asset.type));
  return asset.downPayment + fee;
}

export function calculateSellProceeds(
  asset: Asset,
  priceMultiplier: number,
  sectorMultiplier: Record<string, number> = {},
  sellLots?: number
): number {
  if (isStockLotAsset(asset)) {
    const lots = sellLots ?? asset.shareHand ?? 0;
    return stockLotSellProceeds(asset, lots, priceMultiplier, sectorMultiplier);
  }
  const gross = getSellPrice(asset, priceMultiplier, sectorMultiplier);
  const fee = Math.round(gross * getTransactionCostRate(asset.type));
  return gross - fee;
}

export function canAffordStockLots(player: Player, asset: Asset, lots: number): boolean {
  if (!isStockLotAsset(asset)) return player.cash >= calculateBuyCost(asset);
  return player.cash >= stockLotBuyCost(lots, asset.singlePrice ?? 0);
}

export function canPurchaseOpportunity(
  player: Player,
  card: OpportunityCard,
  _marketMultiplier: Record<AssetType, number>,
  _sectorMultiplier: Record<string, number> = {}
): { allowed: boolean; reason?: string } {
  if (card.minCashRequired && player.cash < card.minCashRequired) {
    return { allowed: false, reason: `需要现金 ≥ ${card.minCashRequired.toLocaleString()} 元` };
  }
  return { allowed: true };
}

export function getOpportunityAsset(card: OpportunityCard, player?: Player): Asset {
  let asset = card.asset;
  if (player?.cityId) {
    asset = scaleAssetByPlayerCity(asset, player.cityId);
  }
  return applyCityTierDownPayment(asset, player?.cityId);
}

export function getPassiveIncomeByAssetType(
  player: Player,
  cashFlowMultiplier: Record<AssetType, number> = createDefaultMultiplierRecord(),
  sectorMultiplier: Record<string, number> = {}
): Partial<Record<AssetType, number>> {
  const result: Partial<Record<AssetType, number>> = {};
  for (const asset of player.assets) {
    result[asset.type] = (result[asset.type] ?? 0) + getAssetCashFlow(asset, cashFlowMultiplier, sectorMultiplier);
  }
  return result;
}

export function calculateLoanMonthlyInterest(principal: number, annualRate: number): number {
  return Math.round(principal * (annualRate / 12));
}

export function isAssetTypeKey(key: string): key is AssetType {
  return (ALL_ASSET_TYPES as string[]).includes(key);
}

/** ──────────────────────────────────────────────
 * 【新增】v3.6 PE 估值系统
 * ────────────────────────────────────────────── */

/** 行业中枢 PE 对照表（标准值） */
export const SECTOR_BASE_PE: Record<string, number> = {
  '金融': 6,
  '公用事业': 12,
  '消费': 18,
  '科技': 45,
  '新能源': 40,
  '先进制造': 30,
  '有色金属': 20,
  '能源': 12,
  '农产品': 15,
  '贵金属': 25,
  '利率债': 8,
  '信用债': 10,
  'REITs': 15,
  '物流地产': 18,
  '商业地产': 14,
  '酒店': 20,
  '文化': 22,
  '零售': 16,
  '餐饮': 18,
  '汽车': 10,
  '住宅': 12,
  '宽基': 15,
};

/** 估值带（基于 现价 vs 合理价值） */
export type ValuationBand = 'deepUndervalue' | 'undervalue' | 'fair' | 'overvalue';

/**
 * 判断股票估值状态（基于 现价/合理价值 比率）
 */
export function judgeStockValuation(currentPrice: number, fairValue: number): ValuationBand {
  if (fairValue <= 0) return 'fair';
  const ratio = currentPrice / fairValue;
  if (ratio < 0.7) return 'deepUndervalue';
  if (ratio < 0.9) return 'undervalue';
  if (ratio <= 1.1) return 'fair';
  return 'overvalue';
}

export function getValuationLabel(band: ValuationBand): string {
  switch (band) {
    case 'deepUndervalue': return '深度低估';
    case 'undervalue': return '明显低估';
    case 'fair': return '估值合理';
    case 'overvalue': return '估值偏高';
    default: return 'unknown';
  }
}

export function getValuationLabelShort(band: ValuationBand): string {
  switch (band) {
    case 'deepUndervalue': return '深度低估';
    case 'undervalue': return '明显低估';
    case 'fair': return '合理';
    case 'overvalue': return '偏高';
    default: return '-';
  }
}

/**
 * 获取某股票行业中枢 PE
 */
export function getStockBasePe(asset: Asset): number {
  if (asset.basePe != null && asset.basePe > 0) return asset.basePe;
  const sector = asset.metadata?.sector;
  if (sector && SECTOR_BASE_PE[sector]) return SECTOR_BASE_PE[sector];
  return 15;
}

/**
 * 计算合理价值 = EPS × basePe
 */
export function calcFairValue(eps: number, basePe: number): number {
  return Math.round(eps * basePe * 100) / 100;
}

/**
 * 计算股票当前实时价格 = intrinsicPrice × (currentPe / basePe)
 * 再乘上市场乘数 × 行业乘数，然后四舍五入
 * 回退到 singlePrice
 */
export function calcCurrentStockPrice(
  asset: Asset,
  marketMultiplier: Record<AssetType, number> = {} as Record<AssetType, number>,
  sectorMultiplier: Record<string, number> = {}
): number {
  const singlePrice = asset.singlePrice ?? 0;
  if (singlePrice <= 0) return 0;

  // 仅股票/海外/衍生品走 PE 估值（彻底移除 marketMultiplier × sectorMultiplier）
  // REIT/债券/商品等非权益类：PE 不适用，只用 basePrice × 乘数
  const isEquity = asset.type === 'stock' || asset.type === 'overseas' || asset.type === 'derivative';
  if (isEquity) {
    const basePe = getStockBasePe(asset);
    const currentPe = asset.currentPe ?? basePe;
    const intrinsicPrice = asset.intrinsicPrice ?? 0;
    if (intrinsicPrice > 0 && basePe > 0) {
      const pePrice = (intrinsicPrice * currentPe) / basePe;
      return Math.round(pePrice * 100) / 100;
    }
  }
  // 非权益类：basePrice × 乘数，保留2位小数
  const marketMult = marketMultiplier[asset.type] ?? 1;
  const sectorMult = asset.metadata?.sector ? (sectorMultiplier[asset.metadata.sector] ?? 1) : 1;
  return Math.round(singlePrice * marketMult * sectorMult * 100) / 100;
}

/** 获取证券当前PB（市净率），取自 metadata.pb */
export function getStockCurrentPb(asset: Asset): number | undefined {
  return asset.metadata?.pb;
}

/** 获取证券买入时的每份单价（从 cost/shares 反算） */
export function getStockBuyPrice(asset: Asset): number {
  const totalShares = (asset.shareHand ?? 0) * STOCK_LOT_SIZE;
  if (totalShares > 0) return (asset.cost ?? 0) / totalShares;
  return asset.singlePrice ?? 0;
}

/** 计算证券价格涨跌百分比（现价 vs 持仓成本） */
export function getStockPriceChange(
  asset: Asset,
  marketMultiplier: Record<AssetType, number> = {} as Record<AssetType, number>,
  sectorMultiplier: Record<string, number> = {}
): number {
  const curPrice = calcCurrentStockPrice(asset, marketMultiplier, sectorMultiplier);
  const totalShares = (asset.shareHand ?? 0) * STOCK_LOT_SIZE;
  const buyPrice = totalShares > 0 ? (asset.cost ?? 0) / totalShares : 0;
  if (buyPrice <= 0) return 0;
  return Math.round(((curPrice - buyPrice) / buyPrice) * 10000) / 100;
}

/** 获取证券当前每份实时价格（带额外乘数） */
export function getStockCurrentPriceWithMultiplier(
  asset: Asset,
  priceMultiplier = 1,
  marketMultiplier: Record<AssetType, number> = {} as Record<AssetType, number>,
  sectorMultiplier: Record<string, number> = {}
): number {
  const basePrice = calcCurrentStockPrice(asset, marketMultiplier, sectorMultiplier);
  return Math.round(basePrice * priceMultiplier);
}

/**
 * 计算股票当前实时市值（基于 PE 定价，含市场/行业乘数）
 */
export function calcCurrentStockMarketValue(
  asset: Asset,
  marketMultiplier: Record<AssetType, number> = {} as Record<AssetType, number>,
  sectorMultiplier: Record<string, number> = {}
): number {
  if (!isStockLotAsset(asset)) return asset.marketValue;
  const price = calcCurrentStockPrice(asset, marketMultiplier, sectorMultiplier);
  return Math.round((asset.shareHand ?? 0) * STOCK_LOT_SIZE * price);
}

/**
 * 计算股票当前月股息（基于 PE 定价的 intrinsicPrice)
 * 股息仍按 yearDivPerShare 计算，不受 PE 波动影响
 */
export function calcCurrentStockMonthlyDividend(asset: Asset): number {
  if (!isStockLotAsset(asset)) return asset.cashFlow;
  const hands = asset.shareHand ?? 0;
  const div = asset.yearDivPerShare ?? 0;
  return Math.round((hands * STOCK_LOT_SIZE * div) / 12);
}

/**
 * PE 变动后同步更新 PB 和 dividendYield
 * PB 与现价同比例浮动：newPb = currentPb × (newPrice / oldPrice)
 * 股息率 = yearDivPerShare / newPrice（年分红固定，价格涨则股息率降）
 */
export function syncPbAndDivYieldOnPeChange(asset: Asset, newPe: number): Asset {
  const basePe = getStockBasePe(asset);
  const oldPe = asset.currentPe ?? basePe;
  if (oldPe === newPe) return { ...asset, currentPe: newPe };

  const intrinsicPrice = asset.intrinsicPrice ?? 0;
  if (intrinsicPrice <= 0) return { ...asset, currentPe: newPe };

  const newPrice = (intrinsicPrice * newPe) / basePe;
  const oldPrice = (intrinsicPrice * oldPe) / basePe;

  let modified: Asset = { ...asset, currentPe: newPe };

  // PB 同步
  const currentPb = asset.metadata?.pb;
  if (currentPb != null && oldPrice > 0) {
    const newPb = Math.round((currentPb * newPrice / oldPrice) * 100) / 100;
    modified = { ...modified, metadata: { ...(modified.metadata ?? {}), pb: newPb } };
  }

  // dividendYield 同步
  const yearDiv = asset.yearDivPerShare ?? 0;
  if (yearDiv > 0 && newPrice > 0) {
    const newDivYield = Math.round((yearDiv / newPrice) * 10000) / 10000;
    modified = { ...modified, metadata: { ...(modified.metadata ?? {}), dividendYield: newDivYield } };
  }

  return modified;
}

/**
 * 对股票 currentPe 做调整（市场事件用），同步刷新 PB / dividendYield
 */
export function updateStockPeByEvent(asset: Asset, peDelta: number): Asset {
  const basePe = getStockBasePe(asset);
  const oldCurrentPe = asset.currentPe ?? basePe;
  const newCurrentPe = Math.max(0.5, Math.round((oldCurrentPe + peDelta) * 100) / 100);
  return syncPbAndDivYieldOnPeChange(asset, newCurrentPe);
}

/**
 * 对股票 currentPe 做百分比调整，同步刷新 PB / dividendYield
 */
export function updateStockPeByPercent(asset: Asset, pct: number): Asset {
  const basePe = getStockBasePe(asset);
  const oldCurrentPe = asset.currentPe ?? basePe;
  const newCurrentPe = Math.max(0.5, Math.round(oldCurrentPe * (1 + pct) * 100) / 100);
  return syncPbAndDivYieldOnPeChange(asset, newCurrentPe);
}

/**
 * 计算手动卖出股票净收入
 * 佣金 0.03% + 印花税 0.1%（持有≥12月豁免）
 * 含市场/行业乘数
 */
export function calcStockProfit(
  asset: Asset,
  sellHand: number,
  marketMultiplier: Record<AssetType, number> = {} as Record<AssetType, number>,
  sectorMultiplier: Record<string, number> = {}
): number {
  const price = calcCurrentStockPrice(asset, marketMultiplier, sectorMultiplier);
  const gross = Math.round(sellHand * STOCK_LOT_SIZE * price);
  const heldMonths = asset.heldMonths ?? 0;
  const stampTax = heldMonths >= 12 ? 0 : Math.round(gross * STOCK_STAMP_TAX_RATE);
  const commission = Math.round(gross * STOCK_COMMISSION_RATE);
  return gross - stampTax - commission;
}

/** @deprecated 兼容旧引用 */
export const CITY_TIER_DOWN_PAYMENT_RATE = {
  tier1: 0.3,
  tier2: 0.25,
  tier3: 0.2,
  tier4: 0.15,
};

/* ──────────────────────────────────────────────
 * 【新增】v3.7 功能函数
 * ────────────────────────────────────────────── */

/** 计算再婚费用（梯度惩罚） */
export function calcRemarriageCost(cityId?: string, remarriageIndex: number = 0): number {
  const base = weddingCost(cityId);
  const ratios = [0.6, 0.7];
  const ratio = remarriageIndex < ratios.length ? ratios[remarriageIndex] : 0.8;
  return Math.round(base * ratio);
}

/** 再婚幸福度（梯度递减） */
export function calcRemarriageHappiness(remarriageIndex: number): number {
  return remarriageIndex === 0 ? 50 : 40;
}

/** 资产变卖折价（按资产类型差异化） */
export function getLiquidationRate(asset: Asset, isSecret: boolean): number {
  const isCommercial = asset.metadata?.cityTier === 'commercial' || asset.metadata?.sector === '商业地产';
  if (isSecret) {
    return isCommercial ? 0.4 : 0.5;
  }
  return isCommercial ? 0.6 : 0.7;
}

/** 通胀/通缩对资产的影响 */
export function applyInflationEffect(
  cash: number,
  multiplier: number,
  playerAssets: Asset[]
): { cash: number; assets: Asset[] } {
  const newAssets = playerAssets.map((a) => {
    if (a.type === 'stock' || a.type === 'realEstate' || a.type === 'reit') {
      return { ...a, marketValue: Math.round(a.marketValue * (1 + multiplier)) };
    }
    if (a.type === 'bond') {
      return { ...a, marketValue: Math.round(a.marketValue * (1 - multiplier)) };
    }
    return a;
  });
  const newCash = Math.max(0, Math.round(cash * (1 - multiplier)));
  return { cash: newCash, assets: newAssets };
}

/** 保险抵扣后的医疗支出 */
export function applyInsuranceDeductible(
  rawCost: number,
  playerInsurances: string[],
  coverageRatio: number,
  deductible: number
): number {
  if (playerInsurances.length === 0) return rawCost;
  const afterDeductible = Math.max(0, rawCost - deductible);
  const covered = Math.round(afterDeductible * coverageRatio);
  return rawCost - covered;
}

/** 计算总负债本金额 */
export function getTotalLiabilities(player: Player): number {
  return player.liabilities.reduce((sum, l) => sum + l.principal, 0);
}

/** 高负债幸福惩罚 */
export function calcHighDebtHappinessPenalty(player: Player): number {
  const totalLiab = getTotalLiabilities(player);
  const annualIncome = (player.baseSalary ?? player.salary) * 12;
  if (annualIncome <= 0) return 0;
  if (totalLiab > annualIncome * 3) return 8;
  return 0;
}

/** 丁克养老支出 */
export function calcDinkElderlyCareExpense(cityId?: string): number {
  const mult = getCityById(cityId).expenseMultiplier;
  return Math.round(2000 * mult);
}

/** 购房限购 */
export function canBuyResidentialProperty(player: Player, currentHouseCount: number): boolean {
  if (player.marriageStatus === 'married') return true;
  return currentHouseCount < 2;
}
