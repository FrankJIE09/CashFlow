import type { City, CityTier } from '../types/game';

/** 20 个城市 · 四线分级 · v3.0 */
export const CITIES: City[] = [
  // 一线（4）
  { id: 'shanghai', name: '上海', tier: 'tier1', salaryMultiplier: 1.15, expenseMultiplier: 1.35, propertyTaxRate: 0.006, downPaymentFirst: 0.3, downPaymentSecond: 0.4 },
  { id: 'beijing', name: '北京', tier: 'tier1', salaryMultiplier: 1.12, expenseMultiplier: 1.32, propertyTaxRate: 0.006, downPaymentFirst: 0.3, downPaymentSecond: 0.4 },
  { id: 'shenzhen', name: '深圳', tier: 'tier1', salaryMultiplier: 1.1, expenseMultiplier: 1.3, propertyTaxRate: 0.005, downPaymentFirst: 0.3, downPaymentSecond: 0.4 },
  { id: 'guangzhou', name: '广州', tier: 'tier1', salaryMultiplier: 1.05, expenseMultiplier: 1.22, propertyTaxRate: 0.005, downPaymentFirst: 0.3, downPaymentSecond: 0.38 },
  // 二线（8）
  { id: 'hangzhou', name: '杭州', tier: 'tier2', salaryMultiplier: 1.0, expenseMultiplier: 1.08, propertyTaxRate: 0.004, downPaymentFirst: 0.25, downPaymentSecond: 0.35 },
  { id: 'chengdu', name: '成都', tier: 'tier2', salaryMultiplier: 0.92, expenseMultiplier: 0.95, propertyTaxRate: 0.004, downPaymentFirst: 0.25, downPaymentSecond: 0.35 },
  { id: 'wuhan', name: '武汉', tier: 'tier2', salaryMultiplier: 0.9, expenseMultiplier: 0.92, propertyTaxRate: 0.004, downPaymentFirst: 0.25, downPaymentSecond: 0.35 },
  { id: 'nanjing', name: '南京', tier: 'tier2', salaryMultiplier: 0.95, expenseMultiplier: 1.0, propertyTaxRate: 0.004, downPaymentFirst: 0.25, downPaymentSecond: 0.35 },
  { id: 'suzhou', name: '苏州', tier: 'tier2', salaryMultiplier: 0.98, expenseMultiplier: 1.02, propertyTaxRate: 0.004, downPaymentFirst: 0.25, downPaymentSecond: 0.35 },
  { id: 'xian', name: '西安', tier: 'tier2', salaryMultiplier: 0.85, expenseMultiplier: 0.88, propertyTaxRate: 0.0035, downPaymentFirst: 0.25, downPaymentSecond: 0.32 },
  { id: 'chongqing', name: '重庆', tier: 'tier2', salaryMultiplier: 0.88, expenseMultiplier: 0.9, propertyTaxRate: 0.0035, downPaymentFirst: 0.25, downPaymentSecond: 0.32 },
  { id: 'tianjin', name: '天津', tier: 'tier2', salaryMultiplier: 0.87, expenseMultiplier: 0.9, propertyTaxRate: 0.004, downPaymentFirst: 0.25, downPaymentSecond: 0.35 },
  // 三线（5）
  { id: 'changsha', name: '长沙', tier: 'tier3', salaryMultiplier: 0.78, expenseMultiplier: 0.78, propertyTaxRate: 0.003, downPaymentFirst: 0.2, downPaymentSecond: 0.3 },
  { id: 'zhengzhou', name: '郑州', tier: 'tier3', salaryMultiplier: 0.75, expenseMultiplier: 0.75, propertyTaxRate: 0.003, downPaymentFirst: 0.2, downPaymentSecond: 0.3 },
  { id: 'hefei', name: '合肥', tier: 'tier3', salaryMultiplier: 0.8, expenseMultiplier: 0.8, propertyTaxRate: 0.003, downPaymentFirst: 0.2, downPaymentSecond: 0.3 },
  { id: 'kunming', name: '昆明', tier: 'tier3', salaryMultiplier: 0.72, expenseMultiplier: 0.72, propertyTaxRate: 0.0025, downPaymentFirst: 0.2, downPaymentSecond: 0.28 },
  { id: 'nanning', name: '南宁', tier: 'tier3', salaryMultiplier: 0.7, expenseMultiplier: 0.7, propertyTaxRate: 0.0025, downPaymentFirst: 0.2, downPaymentSecond: 0.28 },
  // 四线（3）
  { id: 'changde', name: '常德', tier: 'tier4', salaryMultiplier: 0.58, expenseMultiplier: 0.58, propertyTaxRate: 0.002, downPaymentFirst: 0.15, downPaymentSecond: 0.25 },
  { id: 'mianyang', name: '绵阳', tier: 'tier4', salaryMultiplier: 0.6, expenseMultiplier: 0.6, propertyTaxRate: 0.002, downPaymentFirst: 0.15, downPaymentSecond: 0.25 },
  { id: 'zunyi', name: '遵义', tier: 'tier4', salaryMultiplier: 0.55, expenseMultiplier: 0.55, propertyTaxRate: 0.002, downPaymentFirst: 0.15, downPaymentSecond: 0.25 },
];

export const DEFAULT_CITY_ID = 'hangzhou';

export const CITY_TIER_LABELS: Record<CityTier, string> = {
  tier1: '一线',
  tier2: '二线',
  tier3: '三线',
  tier4: '四线',
};

/** 各线级相对 tier2 的房产基准价乘数 */
export const CITY_TIER_PRICE_MULTIPLIER: Record<CityTier, number> = {
  tier1: 2.8,
  tier2: 1.0,
  tier3: 0.45,
  tier4: 0.28,
};

export function getCityById(cityId?: string): City {
  return CITIES.find((c) => c.id === cityId) ?? CITIES.find((c) => c.id === DEFAULT_CITY_ID)!;
}

export function getCitiesByTier(tier: CityTier): City[] {
  return CITIES.filter((c) => c.tier === tier);
}
