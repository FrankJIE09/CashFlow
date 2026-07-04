import type { Asset, AssetType, City, DebtType, ExpenseBreakdown, IncomeType, Liability, OpportunityCard, Player } from '../types/game';
import { ALL_ASSET_TYPES } from '../types/game';
import { CITY_TIER_PRICE_MULTIPLIER, getCityById } from '../data/cities';

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

  return {
    liability: {
      ...liability,
      debtType,
      monthlyPayment: newPayment,
      interestRate: monthRate * 12,
    },
    delta: newPayment - oldPayment,
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
  return Math.round(asset.cashFlow * typeMult * sectorMult);
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

/** 总支出 = 全部负债月供 + 非负债固定支出（不含 expenses.mortgage 等遗留字段，避免重复） */
export function getFixedExpenses(player: Player): number {
  const liabilityPayments = player.liabilities.reduce((sum, l) => sum + l.monthlyPayment, 0);
  const nonDebtFixed =
    player.expenses.tax +
    player.expenses.other +
    player.children * player.expenses.perChild +
    getPropertyTax(player);
  return liabilityPayments + nonDebtFixed;
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
  return player.salary + getPassiveIncome(player, cashFlowMultiplier, sectorMultiplier) - getTotalExpenses(player);
}

export function getAssetMarketValue(
  asset: Asset,
  multiplier: number,
  sectorMultiplier: Record<string, number> = {}
): number {
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

export function checkBankruptcy(
  player: Player,
  cashFlowMultiplier?: Record<AssetType, number>,
  sectorMultiplier?: Record<string, number>
): boolean {
  return getMonthlyCashFlow(player, cashFlowMultiplier, sectorMultiplier) < 0;
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

export function calculateBuyCost(asset: Asset): number {
  const fee = Math.round(asset.downPayment * getTransactionCostRate(asset.type));
  return asset.downPayment + fee;
}

export function calculateSellProceeds(
  asset: Asset,
  priceMultiplier: number,
  sectorMultiplier: Record<string, number> = {}
): number {
  const gross = getSellPrice(asset, priceMultiplier, sectorMultiplier);
  const fee = Math.round(gross * getTransactionCostRate(asset.type));
  return gross - fee;
}

export function canPurchaseOpportunity(
  player: Player,
  card: OpportunityCard,
  marketMultiplier: Record<AssetType, number>,
  sectorMultiplier: Record<string, number> = {}
): { allowed: boolean; reason?: string } {
  if (card.minNetWorth && getNetWorth(player, marketMultiplier, sectorMultiplier) < card.minNetWorth) {
    return { allowed: false, reason: `需要净资产 ≥ ${card.minNetWorth.toLocaleString()} 元` };
  }
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

/** @deprecated 兼容旧引用 */
export const CITY_TIER_DOWN_PAYMENT_RATE = {
  tier1: 0.3,
  tier2: 0.25,
  tier3: 0.2,
  tier4: 0.15,
};
