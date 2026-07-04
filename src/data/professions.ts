import type { CustomProfessionConfig, Player, Profession } from '../types/game';
import { calcLiabilityMonthlyPayment } from '../utils/financial';

export const CUSTOM_PROFESSION_ID = 'custom';

export const DEFAULT_CUSTOM_PROFESSION: CustomProfessionConfig = {
  name: '我的职业',
  salary: 8000,
  cash: 5000,
  tax: 800,
  other: 2000,
  mortgagePrincipal: 0,
  carLoanPrincipal: 0,
  studentLoanPrincipal: 0,
  creditCardDebt: 0,
};

function makeLiability(
  name: string,
  principal: number,
  debtType: 'houseFirst' | 'houseSecond' | 'carLoan' | 'creditCard' | 'consumerLoan',
  paidPeriods = 0
) {
  return {
    name,
    principal,
    monthlyPayment: calcLiabilityMonthlyPayment(principal, debtType),
    interestRate: 0,
    debtType,
    originalPrincipal: principal,
    paidPeriods,
    source: 'profession' as const,
  };
}

/** v3.0：16 职业 × 四层级，salary 为 tier2 基准，开局按城市乘数调整 */
export const PROFESSIONS: Profession[] = [
  {
    id: 'engineer',
    name: '工程师',
    tier: 'professional',
    salary: 12000,
    cash: 8000,
    buff: { salary: 1.05 },
    expenses: { tax: 1800, mortgage: 0, studentLoan: 0, carLoan: 0, creditCard: 0, other: 3000, perChild: 800 },
    liabilities: [
      makeLiability('房屋贷款', 600000, 'houseFirst', 24),
      makeLiability('汽车贷款', 80000, 'carLoan', 18),
      makeLiability('信用卡欠款', 15000, 'creditCard'),
    ],
    description: '互联网工程师，收入稳定，Tech Buff +5% 薪资。',
  },
  {
    id: 'doctor',
    name: '医生',
    tier: 'elite',
    salary: 22000,
    cash: 15000,
    buff: { salary: 1.08, expense: 1.1 },
    expenses: { tax: 3500, mortgage: 0, studentLoan: 0, carLoan: 0, creditCard: 0, other: 4500, perChild: 1200 },
    liabilities: [
      makeLiability('房屋贷款', 1200000, 'houseFirst', 36),
      makeLiability('消费贷', 80000, 'consumerLoan', 12),
      makeLiability('汽车贷款', 150000, 'carLoan', 24),
      makeLiability('信用卡欠款', 25000, 'creditCard'),
    ],
    description: '三甲医院主治，高薪高支出，精英阶层代表。',
  },
  {
    id: 'lawyer',
    name: '律师',
    tier: 'elite',
    salary: 18000,
    cash: 12000,
    buff: { salary: 1.06 },
    expenses: { tax: 2800, mortgage: 0, studentLoan: 0, carLoan: 0, creditCard: 0, other: 3800, perChild: 1000 },
    liabilities: [
      makeLiability('房屋贷款', 900000, 'houseFirst', 30),
      makeLiability('消费贷', 60000, 'consumerLoan', 8),
      makeLiability('汽车贷款', 120000, 'carLoan', 20),
      makeLiability('信用卡欠款', 20000, 'creditCard'),
    ],
    description: '红圈所律师，案源稳定，擅长大额资产交易。',
  },
  {
    id: 'pilot',
    name: '飞行员',
    tier: 'elite',
    salary: 15000,
    cash: 10000,
    buff: { salary: 1.04, savings: 1.1 },
    expenses: { tax: 2200, mortgage: 0, studentLoan: 0, carLoan: 0, creditCard: 0, other: 3200, perChild: 900 },
    liabilities: [
      makeLiability('房屋贷款', 700000, 'houseFirst', 28),
      makeLiability('汽车贷款', 100000, 'carLoan', 15),
      makeLiability('信用卡欠款', 10000, 'creditCard'),
    ],
    description: '民航机长，储蓄 Buff +10%，适合稳健投资路线。',
  },
  {
    id: 'teacher',
    name: '教师',
    tier: 'professional',
    salary: 6500,
    cash: 5000,
    buff: { expense: 0.92 },
    expenses: { tax: 650, mortgage: 0, studentLoan: 0, carLoan: 0, creditCard: 0, other: 1750, perChild: 500 },
    liabilities: [
      makeLiability('房屋贷款', 280000, 'houseFirst', 36),
      makeLiability('消费贷', 40000, 'consumerLoan', 8),
    ],
    description: '公立学校教师，生活成本 Buff -8%，新手友好。',
  },
  {
    id: 'nurse',
    name: '护士',
    tier: 'professional',
    salary: 7500,
    cash: 4500,
    expenses: { tax: 750, mortgage: 0, studentLoan: 0, carLoan: 0, creditCard: 0, other: 1900, perChild: 550 },
    liabilities: [
      makeLiability('房屋贷款', 320000, 'houseFirst', 24),
      makeLiability('汽车贷款', 50000, 'carLoan', 10),
      makeLiability('信用卡欠款', 8000, 'creditCard'),
    ],
    description: '三甲医院护士，三班倒但收入稳定。',
  },
  {
    id: 'accountant',
    name: '会计',
    tier: 'professional',
    salary: 9000,
    cash: 6000,
    buff: { savings: 1.08 },
    expenses: { tax: 900, mortgage: 0, studentLoan: 0, carLoan: 0, creditCard: 0, other: 2100, perChild: 600 },
    liabilities: [
      makeLiability('房屋贷款', 450000, 'houseFirst', 20),
      makeLiability('汽车贷款', 60000, 'carLoan', 12),
    ],
    description: 'CPA 持证会计，储蓄 Buff +8%，精打细算型玩家首选。',
  },
  {
    id: 'designer',
    name: '设计师',
    tier: 'professional',
    salary: 8500,
    cash: 5500,
    expenses: { tax: 850, mortgage: 0, studentLoan: 0, carLoan: 0, creditCard: 0, other: 2400, perChild: 650 },
    liabilities: [
      makeLiability('房屋贷款', 380000, 'houseFirst', 18),
      makeLiability('消费贷', 30000, 'consumerLoan', 6),
      makeLiability('信用卡欠款', 12000, 'creditCard'),
    ],
    description: 'UI/UX 设计师，自由职业倾向，消费略高。',
  },
  {
    id: 'driver',
    name: '司机',
    tier: 'service',
    salary: 5500,
    cash: 3000,
    expenses: { tax: 550, mortgage: 0, studentLoan: 0, carLoan: 0, creditCard: 0, other: 1200, perChild: 400 },
    liabilities: [
      makeLiability('房屋贷款', 150000, 'houseFirst', 30),
      makeLiability('汽车贷款', 80000, 'carLoan', 24),
      makeLiability('信用卡欠款', 3000, 'creditCard'),
    ],
    description: '网约车司机，车辆是生产工具也是主要负债。',
  },
  {
    id: 'secretary',
    name: '秘书',
    tier: 'service',
    salary: 6000,
    cash: 4000,
    expenses: { tax: 600, mortgage: 0, studentLoan: 0, carLoan: 0, creditCard: 0, other: 1300, perChild: 420 },
    liabilities: [
      makeLiability('房屋贷款', 180000, 'houseFirst', 24),
      makeLiability('汽车贷款', 50000, 'carLoan', 12),
      makeLiability('信用卡欠款', 5000, 'creditCard'),
    ],
    description: '行政秘书，收支平衡，适合小生意积累。',
  },
  {
    id: 'sales',
    name: '销售',
    tier: 'service',
    salary: 7000,
    cash: 3500,
    buff: { salary: 1.1 },
    expenses: { tax: 700, mortgage: 0, studentLoan: 0, carLoan: 0, creditCard: 0, other: 1600, perChild: 450 },
    liabilities: [
      makeLiability('房屋贷款', 220000, 'houseFirst', 18),
      makeLiability('汽车贷款', 70000, 'carLoan', 15),
      makeLiability('信用卡欠款', 15000, 'creditCard'),
    ],
    description: '房产销售，业绩 Buff 使薪资波动上限 +10%。',
  },
  {
    id: 'security',
    name: '保安',
    tier: 'basic',
    salary: 4500,
    cash: 2500,
    buff: { expense: 0.88 },
    expenses: { tax: 450, mortgage: 0, studentLoan: 0, carLoan: 0, creditCard: 0, other: 900, perChild: 350 },
    liabilities: [
      makeLiability('房屋贷款', 120000, 'houseFirst', 40),
      makeLiability('汽车贷款', 30000, 'carLoan', 20),
      makeLiability('信用卡欠款', 2000, 'creditCard'),
    ],
    description: '物业保安，低支出 Buff -12%，现金流最紧张也最易翻盘。',
  },
  {
    id: 'delivery',
    name: '外卖员',
    tier: 'basic',
    salary: 5000,
    cash: 2000,
    expenses: { tax: 500, mortgage: 0, studentLoan: 0, carLoan: 0, creditCard: 0, other: 800, perChild: 300 },
    liabilities: [
      makeLiability('房屋贷款', 100000, 'houseFirst', 36),
      makeLiability('消费贷', 15000, 'consumerLoan', 4),
      makeLiability('信用卡欠款', 5000, 'creditCard'),
    ],
    description: '全职外卖骑手，几乎无固定资产，纯靠现金流突围。',
  },
  {
    id: 'factory',
    name: '工厂工人',
    tier: 'basic',
    salary: 4800,
    cash: 2800,
    expenses: { tax: 480, mortgage: 0, studentLoan: 0, carLoan: 0, creditCard: 0, other: 950, perChild: 320 },
    liabilities: [
      makeLiability('房屋贷款', 130000, 'houseFirst', 48),
      makeLiability('汽车贷款', 25000, 'carLoan', 18),
    ],
    description: '制造业产线工人，负债较低，适合长线积累。',
  },
  {
    id: 'freelancer',
    name: '自由职业者',
    tier: 'basic',
    salary: 6500,
    cash: 4000,
    buff: { salary: 0.95, expense: 0.9 },
    expenses: { tax: 650, mortgage: 0, studentLoan: 0, carLoan: 0, creditCard: 0, other: 1500, perChild: 400 },
    liabilities: [
      makeLiability('房屋贷款', 200000, 'houseFirst', 12),
      makeLiability('信用卡欠款', 18000, 'creditCard'),
    ],
    description: '自媒体/接单型自由人，收入波动大，支出灵活。',
  },
  {
    id: 'cashier',
    name: '收银员',
    tier: 'basic',
    salary: 4200,
    cash: 2200,
    expenses: { tax: 420, mortgage: 0, studentLoan: 0, carLoan: 0, creditCard: 0, other: 850, perChild: 280 },
    liabilities: [
      makeLiability('房屋贷款', 90000, 'houseFirst', 24),
      makeLiability('信用卡欠款', 3000, 'creditCard'),
    ],
    description: '超市收银员，最低门槛职业，每一分钱都要精打细算。',
  },
];

export const PLAYER_COLORS = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#f39c12',
  '#9b59b6',
  '#1abc9c',
];

export const PROFESSION_TIER_LABELS: Record<Profession['tier'], string> = {
  elite: '精英层',
  professional: '专业层',
  service: '服务层',
  basic: '基础层',
};

export function buildCustomProfession(config: CustomProfessionConfig): Profession {
  const liabilities: Profession['liabilities'] = [];
  if ((config.mortgagePrincipal ?? 0) > 0) {
    liabilities.push(makeLiability('房屋贷款', config.mortgagePrincipal!, 'houseFirst'));
  }
  if ((config.carLoanPrincipal ?? 0) > 0) {
    liabilities.push(makeLiability('汽车贷款', config.carLoanPrincipal!, 'carLoan'));
  }
  if ((config.studentLoanPrincipal ?? 0) > 0) {
    liabilities.push(makeLiability('学贷', config.studentLoanPrincipal!, 'consumerLoan'));
  }
  if ((config.creditCardDebt ?? 0) > 0) {
    liabilities.push(makeLiability('信用卡欠款', config.creditCardDebt!, 'creditCard'));
  }

  return {
    id: CUSTOM_PROFESSION_ID,
    name: config.name.trim() || '自定义职业',
    tier: 'professional',
    salary: config.salary,
    cash: config.cash ?? DEFAULT_CUSTOM_PROFESSION.cash!,
    expenses: {
      tax: config.tax,
      mortgage: 0,
      studentLoan: 0,
      carLoan: 0,
      creditCard: 0,
      other: config.other,
      perChild: 500,
    },
    liabilities,
    description: '玩家自定义职业配置。',
  };
}

export function getPlayerProfessionName(
  player: Pick<Player, 'professionId' | 'customProfessionName'>
): string {
  if (player.professionId === CUSTOM_PROFESSION_ID && player.customProfessionName) {
    return player.customProfessionName;
  }
  return PROFESSIONS.find((p) => p.id === player.professionId)?.name ?? '未知';
}

export interface CustomProfessionValidation {
  valid: boolean;
  errors: string[];
}

export function validateCustomProfession(config: CustomProfessionConfig): CustomProfessionValidation {
  const errors: string[] = [];
  if (!config.name.trim()) errors.push('请填写职业名称');
  if (config.salary <= 0) errors.push('月薪必须大于 0');
  if (config.tax < 0) errors.push('税金不能为负');
  if (config.other < 0) errors.push('其它支出不能为负');
  if ((config.cash ?? 0) < 0) errors.push('初始现金不能为负');
  if ((config.mortgagePrincipal ?? 0) < 0) errors.push('房贷本金不能为负');
  if ((config.carLoanPrincipal ?? 0) < 0) errors.push('车贷本金不能为负');
  if ((config.studentLoanPrincipal ?? 0) < 0) errors.push('学贷本金不能为负');
  if ((config.creditCardDebt ?? 0) < 0) errors.push('信用卡欠款不能为负');
  return { valid: errors.length === 0, errors };
}
