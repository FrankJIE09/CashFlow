export type GamePhase =
  | 'SETUP'
  | 'ROLLING'
  | 'MOVING'
  | 'EVENT_RESOLVING'
  | 'CARD_DECISION'
  | 'TURN_END'
  | 'FAST_TRACK'
  | 'GAME_OVER';

export type AssetType =
  | 'stock'
  | 'bond'
  | 'reit'
  | 'commodity'
  | 'derivative'
  | 'overseas'
  | 'entity'
  | 'realEstate'
  | 'business'
  | 'intellectual';

export const ALL_ASSET_TYPES: AssetType[] = [
  'stock',
  'bond',
  'reit',
  'commodity',
  'derivative',
  'overseas',
  'entity',
  'realEstate',
  'business',
  'intellectual',
];

export type IncomeType = 'capitalGain' | 'dividend' | 'interest' | 'rent' | 'operating';
export type LiquidityType = 'T+0' | 'T+1' | 'T+2' | 'illiquid';
export type RiskLevel = 'low' | 'medium' | 'high' | 'veryHigh';
export type InfoTier = 'basic' | 'standard' | 'premium';

export type CardType = 'opportunity' | 'market' | 'doodad';
export type OpportunityKind = 'smallDeal' | 'bigDeal';

export type SpaceType =
  | 'payday'
  | 'opportunity'
  | 'market'
  | 'doodad'
  | 'charity'
  | 'baby'
  | 'marriage'
  | 'settlement'
  | 'promotion'; // 【新增】v3.2 升迁格

/** 【新增】v3.1 婚恋状态；ineligible = 二次离婚后永久不可再婚 */
export type MarriageStatus = 'single' | 'married' | 'divorced' | 'ineligible';

/** 【新增】v3.4 职业事件类型 */
export type CareerEventType =
  | 'promotion'
  | 'jobHop'
  | 'layoff'
  | 'careerChange'
  | 'reemployment';

export interface CareerEvent {
  type: CareerEventType;
  title: string;
  description: string;
  salaryBoostPct?: number;
  cost?: number;
  monthlyHappinessBoost?: number;
  severanceMonths?: number;
  unemploymentTurns?: number;
  happinessDelta?: number;
  highPayBoostPct?: number;
  highPayGapTurns?: number;
  highPayLayoffRiskTurns?: number;
  stableSalaryCutPct?: number;
  transitionSalaryRatio?: number;
  recoveryTurns?: number;
  targetSalaryBoostPct?: number;
  failureCost?: number;
  restoredSalaryPct?: number;
}

/** 【新增】v3.1 生育路径选择 */
export type PregnancyPath = 'plan' | 'dink' | 'postpone';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type MarketEffectType =
  | 'assetAppreciation'
  | 'assetDepreciation'
  | 'buyout'
  | 'interestRate'
  | 'discount'
  | 'sectorBoom'
  | 'macroEvent'
  | 'unemployment'
  | 'reemployment';

export type EventCategory =
  | 'economicCycle'
  | 'industryTrend'
  | 'globalLiquidity'
  | 'policyRegulation';

export type DebtType =
  | 'creditCard'
  | 'consumerLoan'
  | 'carLoan'
  | 'houseFirst'
  | 'houseSecond'
  | 'shopMortgage'
  | 'bankBusinessLoan';

export type CityTier = 'tier1' | 'tier2' | 'tier3' | 'tier4';

/** 房产/商铺等级（含 commercial 商铺） */
export type PropertyTier = CityTier | 'commercial';

/** 【v3.0 新增】城市实体 — 影响薪资、生活成本、房产首付与税率 */
export interface City {
  id: string;
  name: string;
  tier: CityTier;
  salaryMultiplier: number;
  expenseMultiplier: number;
  /** 持有房产年税率（小数，如 0.004 = 0.4%） */
  propertyTaxRate: number;
  downPaymentFirst: number;
  downPaymentSecond: number;
}

export type ProfessionTier = 'elite' | 'professional' | 'service' | 'basic';

export interface AssetMetadata {
  sector?: string;
  cityTier?: PropertyTier;
  ticker?: string;
  exchange?: string;
  liquidity?: LiquidityType;
  incomeType?: IncomeType;
  riskLevel?: RiskLevel;
  subCategory?: string;
  peTTM?: number;
  pb?: number;
  dividendYield?: number;
  creditRating?: string;
  couponRate?: number;
  ytm?: number;
  trackingIndex?: string;
  managementFee?: number;
  minInvestment?: number;
  accountRequirement?: string;
}

export interface ExpenseBreakdown {
  tax: number;
  mortgage: number;
  studentLoan: number;
  carLoan: number;
  creditCard: number;
  other: number;
  perChild: number;
  /** 多套房产持有时的额外房产税（动态计算，初始为 0） */
  taxHouse?: number;
  /** 【新增】v3.1 孕期医疗月支出 */
  medicalPregnancy?: number;
  /** 【新增】v3.2 退休后老年医疗月支出 */
  medicalElderly?: number;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  cost: number;
  downPayment: number;
  cashFlow: number;
  mortgage: number;
  marketValue: number;
  shares?: number;
  /** 【新增】v3.1 股票手数（1手=100股） */
  shareHand?: number;
  /** 【新增】v3.1 每股单价 */
  singlePrice?: number;
  /** 【新增】v3.1 每股年化股息（元） */
  yearDivPerShare?: number;
  /** 【新增】v3.1 买入时的游戏回合（用于持有期判定） */
  purchaseRound?: number;
  /** 【新增】v3.1 已持有月数（每经过一次发工资 +1） */
  heldMonths?: number;
  metadata?: AssetMetadata;
}

export interface Liability {
  id: string;
  name: string;
  principal: number;
  monthlyPayment: number;
  interestRate: number;
  debtType?: DebtType;
  originalPrincipal?: number;
  paidPeriods?: number;
  /** 【v3.0】贷款总期数（等额本息） */
  totalLoanMonth?: number;
  prepaymentPenaltyRate?: number;
  /** profession = 职业初始负债；game = 游戏中新增贷款 */
  source?: 'profession' | 'game';
}

/** 开局自定义职业配置（tier2 基准数值，按城市乘数调整） */
export interface CustomProfessionConfig {
  name: string;
  salary: number;
  cash?: number;
  tax: number;
  other: number;
  mortgagePrincipal?: number;
  carLoanPrincipal?: number;
  studentLoanPrincipal?: number;
  creditCardDebt?: number;
}

export interface Player {
  id: string;
  name: string;
  professionId: string;
  /** 自定义职业名称（professionId === 'custom' 时使用） */
  customProfessionName?: string;
  /** 【v3.0】玩家所在城市 ID */
  cityId: string;
  color: string;
  position: number;
  cash: number;
  salary: number;
  /** 【新增】v3.1 失业前基准月薪（再就业可能降薪） */
  baseSalary?: number;
  expenses: ExpenseBreakdown;
  children: number;
  assets: Asset[];
  liabilities: Liability[];
  isInFastTrack: boolean;
  fastTrackPosition: number;
  dream?: string;
  dreamCost?: number;
  charityTurns: number;
  isAI: boolean;
  difficulty?: Difficulty;
  isBankrupt: boolean;
  /** 【新增】v3.1 婚恋 */
  marriageStatus: MarriageStatus;
  marriageHappiness: number;
  partnerSalary: number;
  hasPregnancy: boolean;
  /** 孕期进度（月），满 9 分娩 */
  pregnancyMonths?: number;
  /** DINK 持续月数 */
  dinkTurns?: number;
  /** 【新增】v3.1 失业 */
  isUnemployed?: boolean;
  unemploymentTurnsRemaining?: number;
  /** 【新增】v3.2 年龄与退休 */
  age: number;
  baseStartAge: number;
  /** null 或 999 表示无强制退休（自由职业） */
  retireStandardAge: number | null;
  currentGameYear: number;
  isRetired: boolean;
  pensionIncome: number;
  promotionLevel?: number;
  /** 【新增】v3.4 内部晋升次数（上限 3） */
  promotionCount?: number;
  /** 【新增】v3.4 结婚次数（含再婚） */
  marriageCount?: number;
  /** 【新增】v3.4 离婚次数 */
  divorceCount?: number;
  /** 【新增】v3.4 裁员概率乘数（<1 降低风险） */
  layoffRiskModifier?: number;
  /** 【新增】v3.4 临时裁员风险上升剩余回合 */
  layoffRiskBoostTurnsRemaining?: number;
  /** 【新增】v3.4 跳槽空窗期（无工资但非失业） */
  salaryGapTurnsRemaining?: number;
  /** 【新增】v3.4 职业转型进度 */
  careerTransitionTurnsRemaining?: number;
  careerTransitionBaseSalary?: number;
  careerTransitionTargetBoostPct?: number;
  /** 【新增】v3.4 晋升带来的每月幸福度加成 */
  monthlyMarriageHappinessBoost?: number;
  /** 【新增】v3.2 家庭事件临时状态 */
  partnerUnemployedTurnsRemaining?: number;
  tempPerChildBoost?: number;
  tempExpenseTurnsRemaining?: number;
}

export interface Space {
  id: number;
  type: SpaceType;
  name: string;
  description: string;
}

export interface BaseCard {
  id: string;
  title: string;
  description: string;
  type: CardType;
}

export interface OpportunityCard extends BaseCard {
  type: 'opportunity';
  kind: OpportunityKind;
  asset: Asset;
  minCashRequired?: number;
  minProfessionLevel?: number;
  minNetWorth?: number;
  dueDiligenceCost?: number;
  infoTier?: InfoTier;
}

export interface AssetImpact {
  priceChange?: number;
  cashFlowChange?: number;
  liquidityChange?: 'improved' | 'worsened' | 'frozen';
}

export interface MarketEffect {
  type: MarketEffectType;
  eventCategory?: EventCategory;
  targetAssetType?: AssetType;
  multiplier?: number;
  rateChange?: number;
  discountRate?: number;
  sector?: string;
  assetImpacts?: Record<string, AssetImpact>;
}

export interface MarketCard extends BaseCard {
  type: 'market';
  effect: MarketEffect;
}

export interface DoodadCard extends BaseCard {
  type: 'doodad';
  cost: number;
  isRecurring: boolean;
  monthlyCost?: number;
  /** 【新增】v3.2 家庭紧急事件扩展 */
  happinessDelta?: number;
  partnerUnemploymentTurns?: number;
  tempPerChildBoost?: number;
  tempExpenseTurns?: number;
  isFamilyEvent?: boolean;
}

export type Card = OpportunityCard | MarketCard | DoodadCard;

export interface Decks {
  opportunity: Card[];
  market: Card[];
  doodad: Card[];
}

export interface LogEntry {
  id: string;
  timestamp: number;
  playerId: string;
  message: string;
  type: 'move' | 'income' | 'expense' | 'asset' | 'liability' | 'market' | 'system' | 'win' | 'repay';
}

/** 【新增】v3.3 自动测试 Bug 日志条目 */
export interface BugLogEntry {
  id: string;
  category:
    | 'card_stuck'
    | 'deadlock'
    | 'financial'
    | 'data_invalid'
    | 'branch_missing'
    | 'bankruptcy'
    | 'state_machine';
  severity: 'critical' | 'warning';
  message: string;
  round: number;
  playerId: string;
  action?: string;
  snapshot?: Partial<GameState>;
  timestamp: number;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  round: number;
  spaces: Space[];
  decks: Decks;
  discardPiles: Decks;
  currentCard: Card | null;
  marketMultiplier: Record<AssetType, number>;
  cashFlowMultiplier: Record<AssetType, number>;
  sectorMultiplier: Record<string, number>;
  interestRate: number;
  winner: Player | null;
  logs: LogEntry[];
  pendingDice: number | null;
  /** 【新增】v3.2 待处理人生事件（退休弹窗等） */
  pendingLifeEvent?: 'retirement' | null;
  /** 【新增】v3.2 升迁机会报价（兼容旧逻辑） */
  promotionOffer?: { salaryBoostPct: number; cost: number } | null;
  /** 【新增】v3.4 职业事件（升迁格随机池） */
  careerEvent?: CareerEvent | null;
  /** 待发工资弹窗：落点 payday 时展示月现金流，确认后再结算 */
  pendingPaydayAmount?: number | null;
  /** 待税务结算弹窗：确认后再扣款 */
  pendingSettlement?: { amount: number; isAnnual: boolean } | null;
  /** 【新增】v3.3 自动测试模式 */
  testMode?: boolean;
  testMaxRounds?: number;
  testTimeoutRecord?: Record<string, number>;
  bugLogs?: BugLogEntry[];
  testStopped?: boolean;
}

export interface GameConfig {
  humanPlayerName: string;
  humanProfessionId: string;
  /** 自定义职业数据（humanProfessionId === 'custom' 时必填） */
  customProfession?: CustomProfessionConfig;
  /** 【v3.0】开局所选城市 */
  cityId: string;
  aiCount: number;
  aiDifficulty: Difficulty;
  /** 【新增】v3.3 自动测试模式 */
  testMode?: boolean;
  testMaxRounds?: number;
}

export interface Profession {
  id: string;
  name: string;
  /** 【v3.0】职业层级 */
  tier: ProfessionTier;
  /** 【v3.0】基准月薪（tier2 城市），实际 = salary × city.salaryMultiplier × buff */
  salary: number;
  cash: number;
  expenses: ExpenseBreakdown;
  liabilities: Omit<Liability, 'id'>[];
  description: string;
  /** 【v3.0】职业加成：salary / expense / savings */
  buff?: { salary?: number; expense?: number; savings?: number };
}

export type GameAction =
  | { type: 'SETUP_GAME'; payload: GameConfig }
  | { type: 'RESTART_GAME' }
  | { type: 'ROLL_DICE'; payload: { dice: number } }
  | { type: 'MOVE_PLAYER' }
  | { type: 'RESOLVE_SPACE' }
  | { type: 'DRAW_CARD'; payload: { cardType: CardType } }
  | { type: 'BUY_ASSET'; payload?: { shareHand?: number } }
  | { type: 'BUY_DISCOUNTED_ASSET'; payload?: { shareHand?: number } }
  | { type: 'DECLINE_CARD' }
  | { type: 'PAY_DOODAD' }
  | { type: 'DONATE_CHARITY'; payload: { donate: boolean } }
  | { type: 'CHOOSE_BABY'; payload: { haveBaby: boolean } }
  | { type: 'CHOOSE_MARRIAGE'; payload: { marry: boolean } }
  | { type: 'CHOOSE_PREGNANCY_PATH'; payload: { path: PregnancyPath } }
  | { type: 'CONFIRM_RETIREMENT' }
  | { type: 'CONFIRM_PAYDAY' }
  | { type: 'CONFIRM_SETTLEMENT' }
  | { type: 'CHOOSE_PROMOTION'; payload: { accept: boolean; jobHopChoice?: 'highPay' | 'stable' } }
  | { type: 'RESOLVE_MARRIAGE_GRID'; payload: { counseling?: boolean } }
  | { type: 'MANUAL_RETIRE' }
  | { type: 'APPLY_MARKET_EFFECT' }
  | { type: 'DRAW_DISCOUNTED_OPPORTUNITY' }
  | { type: 'END_TURN' }
  | { type: 'TAKE_LOAN'; payload: { amount: number } }
  | { type: 'REPAY_LIABILITY'; payload: { liabilityId: string; amount: number } }
  | { type: 'SELL_ASSET'; payload: { assetId: string; multiplier: number; shareHand?: number } }
  | { type: 'DECLARE_BANKRUPTCY' }
  | { type: 'STOP_AUTO_TEST' };
