# CashFlow 富爸爸现金流游戏 — 设计文档

> 基于罗伯特·清崎《富爸爸穷爸爸》改编的桌面棋盘游戏。  
> 本文档是 React + TypeScript + Vite 技术方案下的完整设计、数据结构与开发指南。

**【调整】文档版本：v3.7 · 最后更新：2026-07-04**（v3.1 及以前内容保持不变；v3.2/v3.3/v3.4 仅追加【新增】标记段落；v3.5 见第十七章；v3.7 见第十八章）

---

## 目录

1. [项目概述](#一项目概述)
2. [技术方案](#二技术方案)
3. [核心数据模型](#三核心数据模型)
4. [职业系统](#四职业系统)
5. [棋盘设计](#五棋盘设计)
6. [卡片系统](#六卡片系统)
7. [财务系统](#七财务系统)
8. [游戏流程与状态机](#八游戏流程与状态机)
9. [AI 系统设计](#九ai-系统设计)
10. [UI 与交互设计](#十ui-与交互设计)
11. [项目结构](#十一项目结构)
12. [开发路线图](#十二开发路线图)
13. [游戏平衡与参数表](#十三游戏平衡与参数表)
14. [扩展方向](#十四扩展方向)
15. [附录：快速参考](#十五附录快速参考)
16. [【新增】自动化测试 Agent 系统](#十六新增自动化测试-agent-系统)
17. [【新增】v3.5 破产缓冲 · 失业婚姻 · 资产变卖](#十七新增v35-破产缓冲--失业婚姻--资产变卖)
18. [【新增】v3.7 身份校验 · 再婚梯度 · 资产折价 · 通胀对冲 · 保险联动 · 十五项修复](#十八新增v37-身份校验--再婚梯度--资产折价--通胀对冲--保险联动--十五项修复)

---

## 一、项目概述

### 1.1 游戏简介

《CashFlow》是一款模拟现实财务决策的桌面棋盘游戏。玩家在"老鼠赛跑"（Rat Race）内圈中通过买卖资产、管理负债、应对市场波动，最终达成 **月被动收入 > 月总支出** 的财务自由条件，从而跳出内圈进入"快车道"（Fast Track），并最终实现个人梦想。

**【调整】v3.0 核心升级**（在 v2.0 基础上）：

| 模块 | v3.0 变更 | 标签 |
|------|-----------|------|
| 城市定位 | 20 城四线分级，影响薪资/支出/首付/房产税 | 【新增】 |
| 职业系统 | 16 职业 × 四层级（elite/professional/service/basic）+ Buff | 【调整】 |
| 信贷体系 | 7 类债务统一 **等额本息（EPI）** 月供，提前还款重算 | 【替换】 |
| 资产定价 | 房产/车辆按玩家城市 `scaleAssetByPlayerCity` 缩放 | 【调整】 |
| 生育选择 | Baby 格子玩家主动选择，拒绝无惩罚 | 【调整】 |
| 开局流程 | StartScreen 先选城市再选职业 | 【新增】 |

**【新增】v3.1 扩展机制**（在 v3.0 基础上，仅追加）：

| 模块 | v3.1 变更 | 标签 |
|------|-----------|------|
| 股票按手交易 | A股/港股/ETF 整手买卖、印花税、月股息 | 【新增】 |
| 婚恋人生 | 婚恋格、幸福度、DINK/怀孕、离婚分割 | 【新增】 |
| 失业系统 | 裁员市场卡、职业层级影响概率、再就业 | 【新增】 |

**【新增】v3.2 人生阶段扩展**（在 v3.1 基础上，仅追加）：

| 模块 | v3.2 变更 | 标签 |
|------|-----------|------|
| 年龄/退休 | 每次掷骰 +1 月、精确到月显示年龄、职业差异化退休年龄、养老金 | 【新增】 |
| 升迁系统 | 升迁格、薪资 +15~40%、培训费 | 【新增】 |

**【新增】v3.3 自动化测试 Agent**（在 v3.2 基础上，仅追加）：

| 模块 | v3.3 变更 | 标签 |
|------|-----------|------|
| 自动测试模式 | StartScreen 开关 + 回合上限，隔离于正常游玩 | 【新增】 |
| Bug 检测器 | reducer 后置 `runTestValidators`，7 类规则 | 【新增】 |
| AutoTestPanel | 实时 Bug 列表、导出报告、停止测试 | 【新增】 |
| 年龄失业 | 年龄段失业概率乘数、风险等级 UI | 【新增】 |
| 家庭事件 | 10 张家庭紧急 doodad 卡 | 【新增】 |
| 婚恋扩展 | 薪资联动幸福度 monthly delta | 【新增】 |

**【新增】v3.5 财务缓冲与人生压力**（在 v3.4 基础上）：

| 模块 | v3.5 变更 | 标签 |
|------|-----------|------|
| 破产规则 | 仅当「月现金流<0 **且** 现金≤0 **且** 无可变卖资产」才失败 | 【新增】 |
| 资产变卖 | 协商 70% / 私自 50%，`LIQUIDATE_ASSET` | 【新增】 |
| 应急储备 | `calcEmergencyReserveMonths`，UI 展示 | 【新增】 |
| 失业婚姻 | 递增幸福度惩罚、再就业疤痕、DINK 长期失业 ×2 离婚 | 【新增】 |
| 猎头跳槽 | 两种选择均无缝入职，**删除空窗期** | 【修正】 |
| 自由职业升迁 | promotion 格触发门店/生意扩张事件 | 【新增】 |

v2.0 已具备的能力（本文档仍保留说明）：7 类精细化债务、2026 年中国真实资产分类（7 大类 26 子类）、差异化宏观事件卡、房产税（2 套及以上）。

### 1.2 核心目标

| 阶段 | 目标 | 关键判定 |
|------|------|----------|
| **老鼠赛跑** | 积累资产，让被动收入超过总支出 | 月被动收入 > 月总支出 |
| **快车道** | 积累目标财富 | 现金达到 ¥500,000 |
| **失败** | 现金耗尽且无可变卖资产，同时月现金流为负 | 见 §7.7 / §17.2 |

### 1.3 一局游戏的体验

- 玩家从 **所选城市 + 职业** 出发，初始现金流因城市差异显著不同
- 每回合掷骰子移动，触发机会、市场、额外支出、发工资、生育选择、慈善等事件
- 通过投资和交易提高被动收入
- **现金不足时可无限贷款周转，但贷款无法改善月现金流**
- **月现金流为负时不会立即失败；现金耗尽后须变卖资产或贷款，无可变卖资产时才游戏失败**（【新增】v3.5）
- **可主动提前还款，EPI 月供随本金减少而下降**
- 当被动收入超过总支出时，跳出老鼠赛跑，进入快车道
- 快车道现金达到 ¥500,000 即获胜

---

## 二、技术方案

| 项目 | 选择 | 说明 |
|------|------|------|
| 语言 | **TypeScript 5.x** | 强类型，便于维护复杂状态 |
| 框架 | **React 19 + Vite 8** | 轻量、热更新快、可部署静态页面 |
| 样式 | **CSS Modules + CSS 变量** | 组件级样式隔离，全局马卡龙主题 |
| 动画 | **framer-motion** | 骰子滚动、棋子弹跳、弹窗、进度条 |
| 音效 | **Web Audio API** | 程序化合成音效，无需外部音频文件 |
| 状态管理 | **React Context + useReducer** | 游戏状态集中管理，无需额外依赖 |
| 路由 | 暂无（单页游戏） | 后续扩展可引入 react-router |
| 部署 | **GitHub Pages** | 纯前端静态站点，推送即自动部署 |
| 扩展 | **Electron** | 未来可打包为桌面应用 |

### 2.1 在线地址

| 环境 | 地址 |
|------|------|
| 线上游玩 | https://FrankJIE09.github.io/CashFlow/ |
| 源码仓库 | https://github.com/FrankJIE09/CashFlow |
| 本地开发 | `npm run dev` → http://localhost:5173/ |

部署方式：GitHub Actions 在 push 到 `master` 时自动 `npm run build` 并发布到 GitHub Pages。`vite.config.ts` 中 `base: '/CashFlow/'` 适配 Pages 子路径。

### 2.2 依赖说明

除 React 生态外，引入 **framer-motion** 负责 UI 动画；音效通过 **Web Audio API** 在 `useSound` Hook 中合成，不引入额外音频库。

---

## 三、核心数据模型

### 3.1 类型定义总览

**【调整】** 以下类型为 v3.0 完整定义，开发以 `src/types/game.ts` 为准。

```typescript
// src/types/game.ts

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
  | 'stock' | 'bond' | 'reit' | 'commodity' | 'derivative'
  | 'overseas' | 'entity' | 'realEstate' | 'business' | 'intellectual';

export type IncomeType = 'capitalGain' | 'dividend' | 'interest' | 'rent' | 'operating';
export type LiquidityType = 'T+0' | 'T+1' | 'T+2' | 'illiquid';
export type RiskLevel = 'low' | 'medium' | 'high' | 'veryHigh';
export type InfoTier = 'basic' | 'standard' | 'premium';

export type CardType = 'opportunity' | 'market' | 'doodad';
export type OpportunityKind = 'smallDeal' | 'bigDeal';

export type SpaceType =
  | 'opportunity' | 'market' | 'doodad'
  | 'charity' | 'baby' | 'marriage' | 'settlement'  // 【新增】v3.1 marriage
  | 'promotion';  // 【新增】v3.2 升迁格

/** 【新增】v3.1 婚恋状态 */
export type MarriageStatus = 'single' | 'married' | 'divorced';

/** 【新增】v3.1 生育路径 */
export type PregnancyPath = 'plan' | 'dink' | 'postpone';

export type Difficulty = 'easy' | 'medium' | 'hard';

/** 7 类债务类型 */
export type DebtType =
  | 'creditCard'       // 信用卡：18% 年化，24 期 EPI
  | 'consumerLoan'     // 消费贷：9.6% 年化，36 期 EPI
  | 'carLoan'          // 车贷：4.2% 年化，60 期 EPI
  | 'houseFirst'       // 首套房贷：3% 年化，360 期 EPI
  | 'houseSecond'      // 二套房贷：4% 年化，360 期 EPI
  | 'shopMortgage'     // 商铺抵押：5.04% 年化，240 期 EPI
  | 'bankBusinessLoan'; // 银行贷款：12% 年化，仅付息

/** 【调整】v3.0 城市线级：四线分级 */
export type CityTier = 'tier1' | 'tier2' | 'tier3' | 'tier4';

/** 房产/商铺等级（含 commercial 商铺，用于机会卡 metadata） */
export type PropertyTier = CityTier | 'commercial';

/** 【新增】v3.0 城市实体 */
export interface City {
  id: string;
  name: string;
  tier: CityTier;
  salaryMultiplier: number;    // 相对 tier2 基准的薪资乘数
  expenseMultiplier: number;   // 生活成本乘数
  propertyTaxRate: number;     // 持有房产年税率（小数）
  downPaymentFirst: number;    // 首套房首付比例
  downPaymentSecond: number;   // 二套房首付比例
}

/** 【新增】v3.0 职业层级 */
export type ProfessionTier = 'elite' | 'professional' | 'service' | 'basic';

export interface ExpenseBreakdown {
  tax: number;
  mortgage: number;      // 遗留字段，v3.0 实际月供来自 liabilities
  studentLoan: number;
  carLoan: number;
  creditCard: number;
  other: number;
  perChild: number;
  taxHouse?: number;     // 多套房产持有税（动态计算）
  medicalPregnancy?: number;  // 【新增】v3.1 孕期医疗月支出
  medicalElderly?: number;    // 【新增】v3.2 退休后老年医疗月支出
}

export interface AssetMetadata {
  sector?: string;
  subCategory?: string;
  cityTier?: PropertyTier;   // 【调整】机会卡基准城市线级
  ticker?: string;
  exchange?: string;
  liquidity?: LiquidityType;
  incomeType?: IncomeType;
  riskLevel?: RiskLevel;
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
  shareHand?: number;        // 【新增】v3.1 手数（1手=100股）
  singlePrice?: number;      // 【新增】v3.1 每股单价
  yearDivPerShare?: number;  // 【新增】v3.1 每股年化股息
  purchaseRound?: number;    // 【新增】v3.1 买入回合
  heldMonths?: number;       // 【新增】v3.1 持有月数（≥12 卖免印花税）
  metadata?: AssetMetadata;
}

/** 【调整】v3.0 负债 — 含 totalLoanMonth 与 EPI 月供 */
export interface Liability {
  id: string;
  name: string;
  principal: number;
  monthlyPayment: number;
  interestRate: number;
  debtType?: DebtType;
  originalPrincipal?: number;
  paidPeriods?: number;
  totalLoanMonth?: number;       // 【v3.0】等额本息总期数
  prepaymentPenaltyRate?: number;
  source?: 'profession' | 'game';
}

export interface Player {
  id: string;
  name: string;
  professionId: string;
  cityId: string;                // 【新增】v3.0 玩家所在城市
  color: string;
  position: number;
  cash: number;
  salary: number;
  baseSalary?: number;           // 【新增】v3.1 失业前基准月薪
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
  // 【新增】v3.1 婚恋
  marriageStatus: MarriageStatus;
  marriageHappiness: number;
  partnerSalary: number;
  hasPregnancy: boolean;
  pregnancyMonths?: number;
  dinkTurns?: number;
  // 【新增】v3.1 失业
  isUnemployed?: boolean;
  unemploymentTurnsRemaining?: number;
  // 【新增】v3.2 年龄与退休
  age: number;
  baseStartAge: number;
  retireStandardAge: number | null;  // null = 自由职业无强制退休
  currentGameYear: number;
  isRetired: boolean;
  pensionIncome: number;
  promotionLevel?: number;
  partnerUnemployedTurnsRemaining?: number;
  tempPerChildBoost?: number;
  tempExpenseTurnsRemaining?: number;
}

export interface GameConfig {
  humanPlayerName: string;
  humanProfessionId: string;
  cityId: string;                // 【新增】v3.0 开局所选城市
  aiCount: number;
  aiDifficulty: Difficulty;
}

export interface Profession {
  id: string;
  name: string;
  tier: ProfessionTier;          // 【新增】v3.0
  salary: number;                // tier2 基准月薪
  cash: number;
  expenses: ExpenseBreakdown;
  liabilities: Omit<Liability, 'id'>[];
  description: string;
  buff?: { salary?: number; expense?: number; savings?: number }; // 【新增】
}

/** 【调整】v3.1 GameAction — 含 CHOOSE_BABY / 婚恋 / 股票手数 */
export type GameAction =
  | { type: 'SETUP_GAME'; payload: GameConfig }
  | { type: 'RESTART_GAME' }
  | { type: 'ROLL_DICE'; payload: { dice: number } }
  | { type: 'MOVE_PLAYER' }
  | { type: 'RESOLVE_SPACE' }
  | { type: 'DRAW_CARD'; payload: { cardType: CardType } }
  | { type: 'BUY_ASSET'; payload?: { shareHand?: number } }           // 【新增】v3.1 股票手数
  | { type: 'BUY_DISCOUNTED_ASSET'; payload?: { shareHand?: number } }
  | { type: 'DECLINE_CARD' }
  | { type: 'PAY_DOODAD' }
  | { type: 'DONATE_CHARITY'; payload: { donate: boolean } }
  | { type: 'CHOOSE_BABY'; payload: { haveBaby: boolean } }            // 【v3.0 新增】
  | { type: 'CHOOSE_MARRIAGE'; payload: { marry: boolean } }          // 【新增】v3.1
  | { type: 'CHOOSE_PREGNANCY_PATH'; payload: { path: PregnancyPath } } // 【新增】v3.1
  | { type: 'CONFIRM_RETIREMENT' }                                     // 【新增】v3.2
  | { type: 'CHOOSE_PROMOTION'; payload: { accept: boolean } }         // 【新增】v3.2
  | { type: 'MANUAL_RETIRE' }                                          // 【新增】v3.2
  | { type: 'APPLY_MARKET_EFFECT' }
  | { type: 'DRAW_DISCOUNTED_OPPORTUNITY' }
  | { type: 'END_TURN' }
  | { type: 'TAKE_LOAN'; payload: { amount: number } }
  | { type: 'REPAY_LIABILITY'; payload: { liabilityId: string; amount: number } }
  | { type: 'SELL_ASSET'; payload: { assetId: string; multiplier: number; shareHand?: number } }
  | { type: 'DECLARE_BANKRUPTCY' };
```

### 3.2 【调整】v3.0 债务类型与 EPI 参数

债务配置统一在 `src/utils/financial.ts` 的 `DEBT_TYPE_CONFIG`（不再单独维护 `debtConfig.ts`）。

| debtType | 中文名 | 月利率 | 年化 | EPI 期数 | 提前还款规则 |
|----------|--------|--------|------|----------|--------------|
| `creditCard` | 信用卡 | 1.5% | 18% | 24 | 无违约金 |
| `consumerLoan` | 消费贷 | 0.8% | 9.6% | 36 | paidPeriods < 12 → 罚剩余本金 3% |
| `carLoan` | 车贷 | 0.35% | 4.2% | 60 | paidPeriods < 12 → 罚 2%；≥12 免罚 |
| `houseFirst` | 首套房贷 | 0.25% | 3% | 360 | paidPeriods < 12 → 罚 1%；≥12 免罚 |
| `houseSecond` | 二套房贷 | 0.33% | 4% | 360 | 始终罚剩余本金 1% |
| `shopMortgage` | 商铺抵押 | 0.42% | 5.04% | 240 | 始终罚剩余本金 2% |
| `bankBusinessLoan` | 银行贷款 | 1.0% | 12% | — | 仅付息，无违约金 |

```typescript
// src/utils/financial.ts — DEBT_TYPE_CONFIG 摘要
export const DEBT_TYPE_CONFIG: Record<DebtType, DebtTypeConfig> = {
  creditCard:       { monthlyRate: 0.015,  label: '信用卡',     totalLoanMonth: 24 },
  consumerLoan:     { monthlyRate: 0.008,  label: '消费贷',     totalLoanMonth: 36,
                      penaltyIfBeforePeriods: 0.03, penaltyBeforePeriods: 12 },
  carLoan:          { monthlyRate: 0.0035, label: '车贷',       totalLoanMonth: 60,
                      freePrepayAfterPeriods: 12, penaltyRate: 0.02 },
  houseFirst:       { monthlyRate: 0.0025, label: '首套房贷',   totalLoanMonth: 360,
                      freePrepayAfterPeriods: 12, penaltyRate: 0.01 },
  houseSecond:      { monthlyRate: 0.0033, label: '二套房贷',   totalLoanMonth: 360,
                      alwaysPenaltyRate: 0.01 },
  shopMortgage:     { monthlyRate: 0.0042, label: '商铺抵押贷', totalLoanMonth: 240,
                      alwaysPenaltyRate: 0.02 },
  bankBusinessLoan: { monthlyRate: 0.01,   label: '银行贷款',   interestOnly: true },
};
```

### 3.3 资产分类体系（7 大类 · 26 子类）

| 大类 AssetType | 子类 subCategory | 2026 代表标的 | 流动性 | 收入类型 |
|----------------|------------------|---------------|--------|----------|
| **stock 权益类** | `blueChip` 蓝筹 | 工商银行 601398、长江电力 600900 | T+1 | dividend |
| | `growth` 成长 | 宁德时代 300750、中芯国际 688981 | T+1 | dividend |
| | `dividend` 高股息 | 中国神华 601088 | T+1 | dividend |
| | `tech` 科技 | 科大讯飞 002230、海康威视 002415 | T+1 | dividend |
| **bond 固收类** | `govBond` 国债 | 24 国债 09、国开债 ETF 159650 | T+0/T+1 | interest |
| | `corpBond` 企业债 | 22 万科 MTN001 | T+1 | interest |
| | `convertible` 可转债 | 南银转债 113050 | T+1 | interest |
| **commodity 大宗商品** | `precious` 贵金属 | 黄金 ETF 518880 | T+1 | capitalGain |
| | `energy` 能源 | 原油 LOF 161129 | T+1 | capitalGain |
| | `agriculture` 农产品 | 豆粕 ETF 159985 | T+1 | capitalGain |
| **reit REITs** | `logistics` 物流仓储 | 中金普洛斯 REIT 508056 | T+1 | rent |
| | `infrastructure` 基础设施 | 华夏中国交建 REIT 508018 | T+1 | rent |
| | `residential` 住宅 | 红土创新深圳安居 REIT 180501 | T+1 | rent |
| **derivative 衍生品** | `option` 期权 | 50ETF 购 3 月 2800 | T+0 | capitalGain |
| | `future` 期货 | 沪深 300 股指期货 IF | T+0 | capitalGain |
| **overseas 海外** | `usEquity` 美股 | 纳指 100 ETF 159509 | T+1 | dividend |
| | `hkEquity` 港股 | 恒生 ETF 159920 | T+1 | dividend |
| | `globalBond` 海外债 | 中概互联 ETF 513050 | T+1 | interest |
| **entity 实体经营** | `franchise` 加盟 | 社区便利店、奶茶加盟 | illiquid | operating |
| | `selfEmployed` 个体 | 自媒体工作室 | illiquid | operating |
| | `sme` 小微企业 | 自动化洗车房 | illiquid | operating |
| **realEstate 房地产** | `tier4`/`tier3`/`tier2`/`tier1` | 按 cityTier 分级 | illiquid | rent |
| | `commercial` 商铺 | 社区底商 | illiquid | rent |

### 3.4 状态不可变性原则

所有 reducer 中的状态更新必须遵循不可变数据原则。复杂对象的更新使用浅拷贝。

---

## 四、职业系统

### 4.1 职业设计原则

**【调整】** v3.0 职业体系扩展为 **16 职业 × 四层级**：

| 层级 ProfessionTier | 代表职业 | 特征 |
|---------------------|----------|------|
| `elite` 精英层 | 医生、律师、飞行员 | 高薪高负债，Buff 偏薪资/储蓄 |
| `professional` 专业层 | 工程师、教师、护士、会计、设计师 | 收入稳定，适合主流玩家 |
| `service` 服务层 | 司机、秘书、销售 | 中等收入，部分有业绩 Buff |
| `basic` 基础层 | 保安、外卖员、工厂工人、自由职业者、收银员 | 低门槛，支出 Buff 或极低负债 |

**薪资与城市联动**（`GameReducer.createPlayer`）：

```
实际月薪 = profession.salary × city.salaryMultiplier × buff.salary
实际 tax  = profession.expenses.tax × city.expenseMultiplier
实际 other = profession.expenses.other × city.expenseMultiplier × buff.expense
实际 perChild = profession.expenses.perChild × city.expenseMultiplier
初始现金   = profession.cash × buff.savings
```

- `profession.salary` 以 **tier2（杭州基准）** 定价
- 职业初始 `expenses.mortgage/carLoan/creditCard` 置 0，**实际月供来自 `liabilities` EPI 计算**
- 每个职业初始负债带 `debtType` 与 `paidPeriods`，由 `normalizeLiability` 统一规范化

### 4.2 【调整】16 职业总览

| 职业 | 层级 | 基准工资 | 初始现金 | Buff | 主要负债 |
|------|------|----------|----------|------|----------|
| 医生 | elite | 22,000 | 15,000 | 薪资+8%, 支出+10% | 房贷 120 万 + 消费贷 + 车贷 + 信用卡 |
| 律师 | elite | 18,000 | 12,000 | 薪资+6% | 房贷 90 万 + 消费贷 + 车贷 + 信用卡 |
| 飞行员 | elite | 15,000 | 10,000 | 薪资+4%, 储蓄+10% | 房贷 70 万 + 车贷 + 信用卡 |
| 工程师 | professional | 12,000 | 8,000 | 薪资+5% | 房贷 60 万 + 车贷 + 信用卡 |
| 教师 | professional | 6,500 | 5,000 | 支出-8% | 房贷 28 万 + 消费贷 |
| 护士 | professional | 7,500 | 4,500 | — | 房贷 32 万 + 车贷 + 信用卡 |
| 会计 | professional | 9,000 | 6,000 | 储蓄+8% | 房贷 45 万 + 车贷 |
| 设计师 | professional | 8,500 | 5,500 | — | 房贷 38 万 + 消费贷 + 信用卡 |
| 司机 | service | 5,500 | 3,000 | — | 房贷 15 万 + 车贷 + 信用卡 |
| 秘书 | service | 6,000 | 4,000 | — | 房贷 18 万 + 车贷 + 信用卡 |
| 销售 | service | 7,000 | 3,500 | 薪资+10% | 房贷 22 万 + 车贷 + 信用卡 |
| 保安 | basic | 4,500 | 2,500 | 支出-12% | 房贷 12 万 + 车贷 + 信用卡 |
| 外卖员 | basic | 5,000 | 2,000 | — | 房贷 10 万 + 消费贷 + 信用卡 |
| 工厂工人 | basic | 4,800 | 2,800 | — | 房贷 13 万 + 车贷 |
| 自由职业者 | basic | 6,500 | 4,000 | 薪资-5%, 支出-10% | 房贷 20 万 + 信用卡 |
| 收银员 | basic | 4,200 | 2,200 | — | 房贷 9 万 + 信用卡 |

### 4.3 职业数据样本

```typescript
// src/data/professions.ts
export const PROFESSIONS: Profession[] = [
  {
    id: 'engineer',
    name: '工程师',
    tier: 'professional',
    salary: 12000,          // tier2 基准
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
  // ... 共 16 职业，见 src/data/professions.ts
];

export const PROFESSION_TIER_LABELS: Record<ProfessionTier, string> = {
  elite: '精英层',
  professional: '专业层',
  service: '服务层',
  basic: '基础层',
};
```

### 4.4 职业选择建议

| 城市 × 职业组合 | 适合玩家 |
|-----------------|----------|
| 四线 + 保安/收银员 | 新手，极低生活成本，快速体验财务自由 |
| 二线 + 教师/会计 | 平衡型，Buff 友好 |
| 一线 + 工程师/销售 | 中级挑战，高薪资也高支出 |
| 一线 + 医生/律师 | 高级玩家，高负债高回报 |

### 4.5 【新增】城市定位系统

v3.0 引入 **20 个城市 · 四线分级**，作为开局第一选项，影响全局财务参数。

#### 4.5.1 CityTier 与 City 接口

```typescript
export type CityTier = 'tier1' | 'tier2' | 'tier3' | 'tier4';

export interface City {
  id: string;
  name: string;
  tier: CityTier;
  salaryMultiplier: number;    // 薪资乘数（相对 tier2 基准）
  expenseMultiplier: number;   // 生活成本乘数
  propertyTaxRate: number;     // 持有房产年税率（小数，如 0.004 = 0.4%）
  downPaymentFirst: number;    // 首套房首付比例
  downPaymentSecond: number;   // 二套房首付比例
}
```

#### 4.5.2 20 城市列表

| 线级 | 城市 | id | 薪资× | 生活× | 房产税率 | 首套首付 | 二套首付 |
|------|------|-----|-------|-------|----------|----------|----------|
| **一线 tier1** | 上海 | shanghai | 1.15 | 1.35 | 0.6% | 30% | 40% |
| | 北京 | beijing | 1.12 | 1.32 | 0.6% | 30% | 40% |
| | 深圳 | shenzhen | 1.10 | 1.30 | 0.5% | 30% | 40% |
| | 广州 | guangzhou | 1.05 | 1.22 | 0.5% | 30% | 38% |
| **二线 tier2** | 杭州 | hangzhou | 1.00 | 1.08 | 0.4% | 25% | 35% |
| | 成都 | chengdu | 0.92 | 0.95 | 0.4% | 25% | 35% |
| | 武汉 | wuhan | 0.90 | 0.92 | 0.4% | 25% | 35% |
| | 南京 | nanjing | 0.95 | 1.00 | 0.4% | 25% | 35% |
| | 苏州 | suzhou | 0.98 | 1.02 | 0.4% | 25% | 35% |
| | 西安 | xian | 0.85 | 0.88 | 0.35% | 25% | 32% |
| | 重庆 | chongqing | 0.88 | 0.90 | 0.35% | 25% | 32% |
| | 天津 | tianjin | 0.87 | 0.90 | 0.4% | 25% | 35% |
| **三线 tier3** | 长沙 | changsha | 0.78 | 0.78 | 0.3% | 20% | 30% |
| | 郑州 | zhengzhou | 0.75 | 0.75 | 0.3% | 20% | 30% |
| | 合肥 | hefei | 0.80 | 0.80 | 0.3% | 20% | 30% |
| | 昆明 | kunming | 0.72 | 0.72 | 0.25% | 20% | 28% |
| | 南宁 | nanning | 0.70 | 0.70 | 0.25% | 20% | 28% |
| **四线 tier4** | 常德 | changde | 0.58 | 0.58 | 0.2% | 15% | 25% |
| | 绵阳 | mianyang | 0.60 | 0.60 | 0.2% | 15% | 25% |
| | 遵义 | zunyi | 0.55 | 0.55 | 0.2% | 15% | 25% |

默认城市：`hangzhou`（杭州）。

#### 4.5.3 代码映射（src/data/cities.ts）

```typescript
import type { City, CityTier } from '../types/game';

export const CITIES: City[] = [
  { id: 'shanghai', name: '上海', tier: 'tier1', salaryMultiplier: 1.15, expenseMultiplier: 1.35, propertyTaxRate: 0.006, downPaymentFirst: 0.3, downPaymentSecond: 0.4 },
  { id: 'beijing', name: '北京', tier: 'tier1', salaryMultiplier: 1.12, expenseMultiplier: 1.32, propertyTaxRate: 0.006, downPaymentFirst: 0.3, downPaymentSecond: 0.4 },
  // ... 共 20 城
];

export const DEFAULT_CITY_ID = 'hangzhou';

export const CITY_TIER_PRICE_MULTIPLIER: Record<CityTier, number> = {
  tier1: 2.8,   // 相对 tier2 的房产基准价乘数
  tier2: 1.0,
  tier3: 0.45,
  tier4: 0.28,
};

export function getCityById(cityId?: string): City {
  return CITIES.find((c) => c.id === cityId) ?? CITIES.find((c) => c.id === DEFAULT_CITY_ID)!;
}
```

#### 4.5.4 玩家与配置字段

```typescript
// Player
cityId: string;   // 玩家所在城市 ID

// GameConfig
cityId: string;   // 开局所选城市，传入 SETUP_GAME
```

#### 4.5.5 financial.ts 城市工具函数

```typescript
/** 城市生活成本乘数 */
export function getCityExpenseMultiplier(cityId?: string): number {
  return getCityById(cityId).expenseMultiplier;
}

/** 城市房产持有税率（年化小数） */
export function getCityPropertyTaxRate(cityId?: string): number {
  return getCityById(cityId).propertyTaxRate;
}

/** 根据城市与套数计算首付比例 */
export function getDownPaymentRate(city: City, isSecondHome: boolean, isCommercial = false): number {
  if (isCommercial) return 0.5;
  return isSecondHome ? city.downPaymentSecond : city.downPaymentFirst;
}

/** 多套房产持有税（第 2 套起，按玩家城市税率） */
export function getPropertyTax(player: Player): number {
  const realEstateCount = player.assets.filter((a) => a.type === 'realEstate').length;
  if (realEstateCount < 2) return 0;
  const rate = getCityPropertyTaxRate(player.cityId);
  const extraProperties = player.assets.filter((a) => a.type === 'realEstate').slice(1);
  return extraProperties.reduce((sum, a) => sum + Math.round((a.marketValue * rate) / 12), 0);
}
```

---

## 五、棋盘设计

### 5.1 棋盘结构

棋盘为方形循环路径，共 **24 格**（7×7 网格的外圈）。**每次掷骰移动后相当于过 1 个月**：在职玩家发放月工资，年龄 +1 月；跑完一圈仅记录日志，不再单独长一岁。

### 5.2 格子类型与数量

| 格子类型 | 数量 | 标识色 | 说明 |
|----------|------|--------|------|
| **Opportunity** 机会 | 9 | 蓝色 | 抽取机会卡 |
| **Market** 市场 | 5 | 黄色 | 抽取市场卡 |
| **Doodad** 额外支出 | 4 | 红色 | 意外消费 |
| **Charity** 慈善 | 1 | 紫色 | 可选捐款，获双骰子权利 |
| **Baby** 生孩子 | 1 | 粉色 | **【调整】** 玩家选择是否生育 |
| **Marriage** 婚恋 | 1 | 粉色 | 结婚或保持单身 |
| **Promotion** 升迁 | 1 | 橙色 | 职场晋升机会 |
| **Settlement** 结算 | 2 | 灰色 | 交税；持有 ≥2 套房产扣持有税（每圈 1 次月度 + 1 次年度） |

合计：9 + 5 + 4 + 1 + 1 + 1 + 1 + 2 = **24 格**

**【v3.5】** 已移除「发工资日」格子：工资在每次掷骰移动时自动结算（`handlePayday`），棋盘不再设 payday 格。

### 5.3 24 格平面顺序

| 格号 (id) | 类型 | 名称 | 备注 |
|------|------|------|------|
| 0 | Opportunity | 小生意机会 | 原发工资日 → 机会 |
| 1 | Opportunity | 小生意机会 | |
| 2 | Doodad | 额外支出 | |
| 3 | Market | 市场波动 | |
| 4 | Doodad | 额外支出 | 原发工资日 → 额外支出 |
| 5 | Opportunity | 大买卖机会 | |
| 6 | Promotion | 升迁机会 | |
| 7 | Charity | 慈善捐款 | |
| 8 | Settlement | 税务结算 | |
| 9 | Opportunity | 小生意机会 | |
| 10 | Marriage | 婚恋格 | |
| 11 | Opportunity | 大买卖机会 | 原发工资日 → 机会 |
| 12 | Market | 市场波动 | |
| 13 | Opportunity | 大买卖机会 | |
| 14 | Baby | 生育选择 | |
| 15 | Doodad | 额外支出 | |
| 16 | Doodad | 额外支出 | |
| 17 | Market | 市场波动 | |
| 18 | Market | 市场波动 | 原发工资日 → 市场 |
| 19 | Opportunity | 小生意机会 | |
| 20 | Opportunity | 小生意机会 | |
| 21 | Market | 市场波动 | |
| 22 | Opportunity | 大买卖机会 | |
| 23 | Settlement | 年度结算 | |

### 5.4 7×7 棋盘 UI 布局

```
  ┌────┬────┬────┬────┬────┬────┬────┐
  │ 24 │ 23 │ 22 │ 21 │ 20 │ 19 │ 18 │
  ├────┼────┼────┼────┼────┼────┼────┤
  │ 01 │    │    │    │    │    │ 17 │
  ├────┼────┼────┼────┼────┼────┼────┤
  │ 02 │    │    │ 内 │    │    │ 16 │
  ├────┼────┼────┼────┼────┼────┼────┤
  │ 03 │    │    │ 圈 │    │    │ 15 │
  ├────┼────┼────┼────┼────┼────┼────┤
  │ 04 │    │    │ 空 │    │    │ 14 │
  ├────┼────┼────┼────┼────┼────┼────┤
  │ 05 │    │    │ 白 │    │    │ 13 │
  ├────┼────┼────┼────┼────┼────┼────┤
  │ 06 │ 07 │ 08 │ 09 │ 10 │ 11 │ 12 │
  └────┴────┴────┴────┴────┴────┴────┘
```

### 5.5 棋盘数据结构

```typescript
// src/data/boardLayout.ts
export const SPACES: Space[] = [
  { id: 0, type: 'opportunity', name: '小生意机会', description: '抽取一张机会卡。' },
  // ... 共 24 格（无 payday 格，工资在每次移动时结算）
];
```

### 5.6 特殊格子处理

#### 5.6.1 月度工资结算（无棋盘格）

触发时机：**每次掷骰移动后**（`MOVE_PLAYER`）自动执行 `handlePayday`；失业/退休无工资但仍扣固定支出。

```
月现金流 = 工资 + 被动收入 - 总支出
发工资获得 = 月现金流
```

每次月度结算后，该玩家所有 `liabilities` 的 `paidPeriods += 1`。若月现金流为负，立即触发游戏失败判定。棋盘已无「发工资日」格，无需弹窗确认。

#### 5.6.2 Settlement（结算）

玩家停留时缴纳当月税款；持有 ≥2 套房产时，按 **玩家城市** `propertyTaxRate` 计算持有税（`getPropertyTax`）。每圈仅 **1 格税务结算**（月度）+ **1 格年度结算**（扣 12 个月持有税）。

**【v3.3】** 落在结算格时进入 `CARD_DECISION`，CardModal 展示应缴持有税（或「无需缴纳」），确认后 `CONFIRM_SETTLEMENT` 扣款 → `TURN_END`。

#### 5.6.3 【调整】Baby（生育选择）

v3.0 不再强制生育，改为玩家主动决策：

1. 移动到 Baby 格 → 进入 `CARD_DECISION` 阶段
2. CardModal 展示「👶 生育计划」弹窗
3. 玩家选择：
   - **生孩子** → `dispatch CHOOSE_BABY { haveBaby: true }` → `children +1`，月支出 + `perChild`
   - **暂不生育** → `dispatch CHOOSE_BABY { haveBaby: false }` → **无任何惩罚**
4. 孩子上限 3；已达上限时「生孩子」按钮禁用
5. 选择后检查月现金流（生孩子可能导致失败）

```typescript
// src/context/GameReducer.ts
case 'CHOOSE_BABY': {
  if (!action.payload.haveBaby) {
    return addLog(state, player.id, `${player.name} 选择暂不生育`, 'system');
  }
  if (player.children >= CHILDREN_LIMIT) { /* 日志提示 */ }
  // children +1, checkBankruptcy
}

// src/components/CardModal/CardModal.tsx — Baby 弹窗
<button onClick={() => actions.chooseBaby(true)}>生孩子</button>
<button onClick={() => actions.chooseBaby(false)}>暂不生育</button>
<p>选择「暂不生育」无任何惩罚。</p>
```

#### 5.6.4 Charity（慈善）

捐款月收入的 10%，获得 3 回合双骰子权利。

#### 5.6.5 【新增】v3.1 婚恋格（marriage）— v3.4 再婚扩展

棋盘格 10 为「婚恋格」（`type: 'marriage'`）。

**单身（single）**：首次结婚
1. 移动到婚恋格 → `CARD_DECISION`
2. 选择结婚 → `CHOOSE_MARRIAGE { marry: true }` → `weddingCost(cityId)`，幸福度 60，伴侣月薪，家庭开销 +`marriageOverhead`

**离异（divorced）**：允许一次再婚
1. 再婚费用 = 初婚 60–80%（`remarriageCost`）
2. 幸福度初始 **50**（非 60），同样恢复 10% 工资加成
3. 追踪 `marriageCount` / `divorceCount`

**再婚后再离约束（防刷 Buff）**
- 财产分割 50% → **60%**，律师费 ×1.5
- 第二次离婚后 `marriageStatus: 'ineligible'`，永久不可再婚
- DINK 离婚风险逻辑对再婚家庭不变

**已婚（married）**：幸福度三分支
- ≥70 甜蜜：幸福度 +5
- 40–69 平淡：无变化
- <40 危机：婚姻咨询（50% 月薪，+15 幸福）或忽视（-5，15% 即时离婚）→ `RESOLVE_MARRIAGE_GRID`

**ineligible**：经过时跳过，日志提示

#### 5.6.6 【新增】v3.1 Baby 格（已婚生育三选一）

在 v3.0 Baby 机制基础上扩展（**保留 v3.0 文档说明**）：

- **未婚**玩家落在 Baby 格：自动跳过，日志提示「尚未结婚」
- **已婚**玩家：CardModal 三选一 → `CHOOSE_PREGNANCY_PATH`
  1. **计划怀孕（plan）** → `hasPregnancy=true`，月医疗支出，9 月后分娩或 5% 流产
  2. **DINK（dink）** → 幸福度 -12/月，`dinkTurns` 累积，离婚风险上升
  3. **推迟（postpone）** → 无变化

#### 5.6.7 【新增】v3.2 升迁格（promotion）— v3.4 职业事件池

棋盘 **#6** 为 `promotion` 职业格，随机 4 类事件（`rollCareerEvent`）：

| 事件 | 概率倾向 | 效果 |
|------|----------|------|
| **内部晋升** | 体制内 40%，互联网/蓝领 20% | 薪资 +15~30%，培训费 1~2 月薪，裁员风险 -20% 永久，幸福 +2~4/月；上限 3 次 |
| **猎头跳槽** | 互联网/私企 35%，体制内 15% | 【修正】高薪（+35~50%，**无缝入职**，试用期 3 回合裁员风险↑）或稳定岗（-10~20%，**无缝入职**，极低裁员） |
| **裁员优化** | 蓝领/互联网/地产 30%，白领 15%，体制内 5% | N+1（3~6 月薪），失业 3~6 回合，幸福 -20~30，25% 离婚 |
| **职业转型** | 全职业 10% | 月薪暂降 50%，5 回合恢复至原薪资 +10~20%；20% 失败额外损失 |

**裁员概率公式**（`calcFinalLayoffProb`）：
```
finalLayoffProb = baseCareerRisk × ageCoeff × marriageHappinessCoeff × macroCoeff × layoffRiskModifier
```

**失业玩家**落点 → 再就业事件，可提前结束失业。

CardModal 先展示事件标题（猎头 Offer / 裁员通知等），`CHOOSE_PROMOTION { accept, jobHopChoice? }` 处理各分支。

### 5.7 【新增】v3.1 婚恋人生系统

| 机制 | 规则 |
|------|------|
| 幸福度 | 0–100，结婚初始 60；每月随机 ±5~8 波动 |
| 工资加成 | 幸福度 ≥50：有效工资 ×1.10（含伴侣月薪） |
| 离婚触发 | 幸福度 <40：15%/月；DINK ≥12 月：10%/月 |
| 离婚后果 | 现金分割 50%（再婚后再离 60%）、强制折价出售资产、律师费（再婚后再离 ×1.5） |
| 再婚 | 离异玩家可在婚恋格再婚一次；二次离婚后 `ineligible` |
| 月度处理 | 每次发工资后 `processMonthlyLifeEvents` |

```typescript
// src/utils/financial.ts — 【新增】v3.1
export function getEffectiveSalary(player: Player): number { /* 失业/婚恋加成 */ }
export function weddingCost(cityId?: string): number { /* 婚礼一次性 */ }
export function divorceSettlement(player: Player): DivorceSettlementResult { /* 分割 */ }
```

---

## 六、卡片系统

### 6.1 卡片设计原则

- 小生意卡：首付 ¥500–¥50,000，覆盖 26 子类中的入门级标的
- 大买卖卡：首付 ¥50,000+，需满足 `minNetWorth` 门槛
- 市场卡：**差异化宏观事件**，优先 `assetImpacts` 按类型/板块影响
- 额外支出卡：**2026 真实消费场景**
- **【调整】** 房产/车辆机会卡带 `metadata.cityTier`，展示时按玩家城市缩放

### 6.2 【调整】房产/车辆按城市缩放

机会卡中资产价格为 **卡片基准城市（cityTier）** 下的数值。玩家查看/购买时，经 `scaleAssetByPlayerCity` 换算为玩家所在城市价格：

```typescript
// src/utils/financial.ts
export function scaleAssetByPlayerCity(asset: Asset, cityId: string): Asset {
  if (asset.type !== 'realEstate' && asset.metadata?.sector !== '汽车') return asset;

  const city = getCityById(cityId);
  const cardTier = asset.metadata?.cityTier;

  // 商业地产：按城市生活成本缩放
  if (cardTier === 'commercial') {
    const mult = city.expenseMultiplier;
    return applyCityTierDownPayment({
      ...asset,
      cost: Math.round(asset.cost * mult),
      marketValue: Math.round(asset.marketValue * mult),
      cashFlow: Math.round(asset.cashFlow * mult),
    }, cityId);
  }

  // 住宅/车辆：playerMult / cardBaseMult
  const tierKey = cardTier ?? 'tier2';
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

// 购买入口
export function getOpportunityAsset(card: OpportunityCard, player?: Player): Asset {
  let asset = card.asset;
  if (player?.cityId) {
    asset = scaleAssetByPlayerCity(asset, player.cityId);
  }
  return applyCityTierDownPayment(asset, player?.cityId);
}
```

**缩放示例**：卡片 `cityTier: 'tier2'` 标价 ¥280 万，玩家在 **上海（tier1）** 购买：

```
scale = 2.8 / 1.0 = 2.8
实际 cost = 280万 × 2.8 = 784万
首付 = cost × city.downPaymentFirst（上海 30%）
```

### 6.3 房地产机会卡参数（基准 tier2）

| cityTier | 代表标的 | 基准总价 | 基准首付 | 基准月租 | debtType |
|----------|----------|----------|----------|----------|----------|
| tier4 | 县城两居室 | ¥126,000 | 15% | ¥504 | houseFirst |
| tier3 | 三线刚需 | ¥450,000 | 20% | ¥1,800 | houseFirst |
| tier2 | 杭州刚需 100㎡ | ¥2,800,000 | 25% | ¥6,500 | houseFirst |
| tier1 | 上海内环 80㎡ | ¥6,500,000 | 30% | ¥15,000 | houseSecond* |
| commercial | 社区底商 60㎡ | ¥1,200,000 | 50% | ¥8,000 | shopMortgage |

\* 玩家已有 1 套住宅时再购，自动切换 `houseSecond`

购买房产时自动创建 EPI 按揭负债（`createLiability` + `getRealEstateMortgageDebtType`）。

### 6.4 机会卡样本

```typescript
// src/data/opportunityCards.ts
{
  id: 're_tier3_apt',
  title: '三线刚需房',
  type: 'opportunity', kind: 'smallDeal',
  asset: {
    id: 're_tier3_1', name: '三线刚需 89㎡', type: 'realEstate',
    cost: 450000, downPayment: 90000, cashFlow: -2025, mortgage: 360000, marketValue: 450000,
    metadata: { cityTier: 'tier3', subCategory: 'tier3', liquidity: 'illiquid', incomeType: 'rent' },
  },
},
{
  id: 're_tier1_core',
  title: '一线核心资产',
  type: 'opportunity', kind: 'bigDeal',
  minNetWorth: 3000000,
  asset: {
    id: 're_tier1_1', name: '一线内环公寓', type: 'realEstate',
    cost: 6500000, downPayment: 1950000, cashFlow: -23500, mortgage: 4550000, marketValue: 6500000,
    metadata: { cityTier: 'tier1', riskLevel: 'high' },
  },
},
```

### 6.5 市场卡机制

| 效果类型 | 触发 | 实现 |
|----------|------|------|
| `macroEvent` | `APPLY_MARKET_EFFECT` | 遍历 `assetImpacts`，更新乘数 |
| `interestRate` | 同上 | 更新 `interestRate`；重算房贷类 EPI 月供 |
| `buyout` | 选资产 → `SELL_ASSET` | 溢价收购 |
| `discount` | `DRAW_DISCOUNTED_OPPORTUNITY` | 抽房产，首付 × discountRate，**仍经城市缩放** |

### 6.6 宏观事件卡样本

```typescript
// src/data/marketCards.ts
{
  id: 'macro_2008_subprime',
  title: '2008 次贷危机',
  effect: {
    type: 'macroEvent', eventCategory: 'economicCycle',
    assetImpacts: {
      realEstate: { priceChange: -0.35, cashFlowChange: -0.20 },
      stock:      { priceChange: -0.40, cashFlowChange: -0.30 },
      bond:       { priceChange:  0.05, cashFlowChange:  0.00 },
    },
    rateChange: 0.02,
  },
},
{
  id: 'macro_property_recovery',
  title: '楼市复苏',
  effect: {
    type: 'macroEvent',
    assetImpacts: {
      realEstate: { priceChange: 0.25 },
      'tier1':    { priceChange: 0.35 },
      'tier3':    { priceChange: 0.10 },
    },
  },
},
```

### 6.7 额外支出卡样本

```typescript
// src/data/doodadCards.ts
export const DOODAD_CARDS: DoodadCard[] = [
  { id: 'doodad_iphone', title: 'iPhone 17 Pro', cost: 9999, isRecurring: false },
  { id: 'doodad_pet_surgery', title: '宠物手术', cost: 6800, isRecurring: false },
  { id: 'doodad_streaming', title: '视频会员全家桶', cost: 1200, isRecurring: true, monthlyCost: 100 },
  { id: 'doodad_child_tutor', title: '孩子补习班', cost: 15000, isRecurring: true, monthlyCost: 2500 },
];
```

### 6.8 卡组管理

- 游戏开始时洗牌；抽完重洗
- 机会卡展示/购买前调用 `getOpportunityAsset(card, player)` 做城市缩放
- 额外支出：现金不足自动贷款；支付后检查月现金流

### 6.9 【新增】v3.1 失业生活事件卡

市场卡组新增：

| 卡片 ID | 标题 | effect.type | 说明 |
|---------|------|-------------|------|
| `life_unemployment` | 公司裁员/行业下行失业 | `unemployment` | 按职业 tier 概率失业 3–6 回合 |
| `life_reemployment` | 再就业机遇 | `reemployment` | 失业中可提前恢复，薪资 85–100% |

失业概率（`getUnemploymentProbability`）：basic 85% · service 65% · professional 40% · elite 20%

失业期间：`isUnemployed=true`，月薪归零，支出继续，幸福度下降，离婚风险上升。倒计时结束后自动再就业（可能降薪）。

### 6.10 【新增】v3.2 家庭紧急事件卡（doodad）

`src/data/doodadCards.ts` 追加 10 张家庭类 doodad，通过 `PAY_DOODAD` 结算。扩展字段：`happinessDelta`、`partnerUnemploymentTurns`、`tempPerChildBoost`、`tempExpenseTurns`、`isFamilyEvent`。

| 卡片 ID | 标题 | 一次性 |  recurring | 幸福度 | 特殊效果 |
|---------|------|--------|------------|--------|----------|
| `family_parent_illness` | 父母重病 | ¥50,000 | +¥2,000/月 | -15 | — |
| `family_spouse_unemployed` | 配偶失业 | — | — | -20 | 伴侣月薪归零 2–5 回合 |
| `family_elder_care` | 赡养支出 | ¥5,000 | +¥1,500/月 | -5 | — |
| `family_house_repair` | 房屋大修 | ¥35,000 | — | -8 | — |
| `family_ceremony` | 红白喜事 | ¥8,000 | — | -3 | — |
| `family_chronic_illness` | 慢性疾病 | ¥3,000 | +¥800/月 | -10 | — |
| `family_school_choice` | 子女择校 | ¥25,000 | — | -5 | 每孩临时 +¥500/月 ×6 回合 |
| `family_pet_illness` | 宠物重病 | ¥12,000 | — | -6 | — |
| `family_friend_loan` | 亲友借钱 | ¥15,000 | — | -4 | — |
| `family_traffic_accident` | 交通事故 | ¥28,000 | — | -12 | — |

现金不足时自动信用卡贷款；支付后 `checkAndHandleBankruptcy` 判定（【调整】v3.5 见 §17.2）。

---

## 七、财务系统

### 7.1 财务报表计算

**【调整】** v3.0 总支出公式：**负债月供 + 非负债固定支出**，避免与 `expenses.mortgage` 等遗留字段重复计算。

```typescript
// src/utils/financial.ts

/** 非负债固定支出 + 全部负债月供 */
export function getFixedExpenses(player: Player): number {
  const liabilityPayments = player.liabilities.reduce((sum, l) => sum + l.monthlyPayment, 0);
  const nonDebtFixed =
    player.expenses.tax +
    player.expenses.other +
    player.children * player.expenses.perChild +
    getPropertyTax(player);
  return liabilityPayments + nonDebtFixed;
}

export function getTotalExpenses(player: Player): number {
  return getFixedExpenses(player);
}

export function getMonthlyCashFlow(player: Player, cashFlowMultiplier?, sectorMultiplier?): number {
  // 【新增】v3.1：失业时工资为 0，已婚用 getEffectiveSalary
  const salary = player.isUnemployed ? 0 : getEffectiveSalary(player);
  return salary + getPassiveIncome(...) - getTotalExpenses(player);
}
```

> **注意**：`expenses.mortgage / carLoan / creditCard / studentLoan` 在 v3.0 开局时置 0；职业初始负债月供仅通过 `liabilities[].monthlyPayment` 计入。`REPAY_LIABILITY` 对 `source === 'profession'` 的负债仍会同步减少对应 expenses 字段（兼容旧存档展示）。

### 7.1.1 【新增】v3.1 股票按手交易（A股/港股/ETF）

| 规则 | 说明 |
|------|------|
| 资产字段 | `shareHand`（手）、`singlePrice`（单价）、`yearDivPerShare`（每股年股息） |
| 买入 | 仅整数手（1手=100股）；`BUY_ASSET { shareHand }` |
| 卖出 | 不足1手可一次卖完；≥1手按整手卖；持有≥12月免 0.1% 印花税 |
| 市值 | `shareHand × 100 × singlePrice × 市场乘数` |
| 买入成本 | `stockLotBuyCost` = 本金 + 佣金 0.03% |
| 月股息 | `shareHand × 100 × yearDivPerShare / 12` |

```typescript
// src/utils/financial.ts — 【新增】v3.1
export const STOCK_LOT_SIZE = 100;
export function isStockLotAsset(asset: Asset): boolean { /* ... */ }
export function stockLotBuyCost(lots: number, singlePrice: number): number { /* ... */ }
export function stockLotSellProceeds(asset, sellLots, priceMultiplier): number { /* 印花税 */ }
export function getStockLotMonthlyDividend(asset: Asset): number { /* ... */ }
```

CardModal 对股票类机会卡展示 **整数手数输入** 与含佣金总支出。

### 7.9 【新增】v3.2 年龄、升迁与退休系统

#### 7.9.1 年龄与回合

- 玩家 **每次掷骰移动**（`MOVE_PLAYER`）后：`ageMonths += 1`；满 12 月则 `age += 1`、`ageMonths = 0`、`currentGameYear += 1`
- UI 显示格式：`formatPlayerAge` → 如 `28岁3月`
- 跑完一圈（`newPos < currentPos`）仅记录日志，不再额外长一岁
- 实现位置：`GameReducer` → `advanceOneMonth`（在 `MOVE_PLAYER` 中调用）

#### 7.9.2 职业年龄/退休映射（`professions.ts` → `getProfessionAgeConfig`）

| 职业类别 | 代表职业 | 起始年龄 | 退休年龄 |
|----------|----------|----------|----------|
| 蓝领 | 外卖员、保安、工厂工人、司机、收银员 | 22 | 55 |
| 白领 | 秘书、会计、设计师、护士、销售 | 24 | 60 |
| 科技 | 工程师 | 25 | 60 |
| 高薪 | 医生、律师、飞行员 | 28 | 65 |
| 公职 | 教师 | 25 | 65 |
| 自由职业 | 自由职业者 | 30 | 无强制（`null`） |

开局 `createPlayer` 写入 `age`、`baseStartAge`、`retireStandardAge`。

#### 7.9.3 年龄关联失业

```typescript
// src/utils/financial.ts — 【新增】v3.2
export function calcAgeUnemploymentRate(age, tier, professionId, retireStandardAge): number;
export function getUnemploymentRiskLevel(...): '低' | '中' | '高';
```

| 年龄段 | 概率乘数 |
|--------|----------|
| &lt;30 | ×0.7 |
| 30–39 | ×0.85 |
| 40–49 | ×1.0 |
| ≥50 | ×1.5 |
| 距退休 ≤5 年 | ×2.0 |

与 v3.1 `getUnemploymentProbability(tier)` 相乘后判定裁员市场卡。已退休玩家免疫失业。

#### 7.9.4 职业格（board space #6 `promotion`）

- 落点 `rollCareerEvent` 随机：内部晋升 / 猎头跳槽 / 裁员 / 职业转型；失业玩家触发再就业
- `CHOOSE_PROMOTION { accept, jobHopChoice? }` 处理各事件分支
- `src/utils/career.ts`：`calcFinalLayoffProb`、`getCareerTrack`、`rollCareerEvent`
- 自由职业、已退休不可触发；失业玩家可触发再就业

#### 7.9.5 退休

达到 `retireStandardAge` 时自动弹出退休 Modal → `CONFIRM_RETIREMENT`：

| 效果 | 说明 |
|------|------|
| `isRetired = true` | 全职工资归零 |
| `pensionIncome` | `calcPensionIncome(最后月薪)` ≈ 月薪 ×40% |
| `medicalElderly` | 城市缩放老年医疗月支出 |
| 事件屏蔽 | 不再升迁/失业 |
| 保留 | 家庭 doodad、被动收入、破产规则不变 |

自由职业者满 **50 岁** 可在 ActionBar 点击 `MANUAL_RETIRE` 主动退休。

#### 7.9.6 【新增】v3.2 婚姻幸福度与薪资联动

```typescript
// 每月发工资结算时（processMonthlyLifeEvents）
export function calcMarriageHappinessBySalary(salary: number): number {
  return Math.min(8, Math.floor(salary / 1000));  // 月薪越高，家庭越稳
}
```

失业触发时一次性幸福度 **-20**（原 v3.1 为 -10，v3.2 加大惩罚）。

### 7.2 债务体系设计目标

| 目标 | 说明 |
|------|------|
| 真实感 | 7 类信贷产品，EPI 月供贴近现实 |
| 策略深度 | 高息先还；提前还款降低 EPI 月供 |
| 与资产联动 | 购房自动绑定 `debtType` |
| 教育意义 | 贷款周转 ≠ 改善月现金流 |

### 7.3 负债来源

| 来源 | source | 计入 liabilities 月供？ |
|------|--------|--------------------------|
| 职业初始 | `profession` | 是 |
| 购买资产按揭 | `game` | 是 |
| TAKE_LOAN 银行贷款 | `game` | 是（仅付息） |

### 7.4 REPAY_LIABILITY 完整逻辑

```typescript
// src/context/GameReducer.ts
case 'REPAY_LIABILITY': {
  const { liabilityId, amount } = action.payload;
  const liability = player.liabilities.find((l) => l.id === liabilityId);
  const debtType = inferDebtTypeFromLiability(liability);

  const repayAmount = Math.min(amount, liability.principal);
  const penalty = calcPrepaymentPenalty(debtType, liability.principal, liability.paidPeriods ?? 0);
  const totalCost = repayAmount + penalty;

  const oldPayment = liability.monthlyPayment;
  const newPrincipal = liability.principal - repayAmount;

  // 【v3.0 核心】部分还款后重算 EPI 月供
  const newPayment = newPrincipal > 0
    ? calcLiabilityMonthlyPayment(newPrincipal, debtType, liability.totalLoanMonth)
    : 0;

  // 更新 liabilities；同步 profession 负债的 expenses 展示字段
  const paymentReduction = oldPayment - newPayment;
  // ...
  return checkAndHandleBankruptcy(newState);
}
```

**流程**：

```
打开 RepayModal → 选择负债 → 输入金额
  → previewRepayment 预览：违约金、新月供、新月现金流
  → 确认 REPAY_LIABILITY
  → principal -= repayAmount
  → 若 principal > 0：monthlyPayment = calcLiabilityMonthlyPayment(新本金)
  → 若 principal = 0：移除负债
  → checkBankruptcy
```

### 7.5 TAKE_LOAN

```typescript
case 'TAKE_LOAN': {
  liabilities.push({
    ...createLiability({
      name: '银行贷款',
      principal: amount,
      debtType: 'bankBusinessLoan',
      source: 'game',
    }),
  });
  // monthlyPayment = principal × 1%（仅付息）
}
```

### 7.6 资产购买 / 卖出

**购买**：
1. `getOpportunityAsset(card, player)` 城市缩放 + 首付计算
2. 现金 ≥ 首付（含交易费）→ 购买
3. `mortgage > 0` → `createLiability`（EPI 月供）
4. 已有 1 套住宅 → `houseSecond`
5. 现金不足 → 自动 `TAKE_LOAN`

**卖出**：卖出价 − 交易费；若有按揭，剩余本金从 proceeds 扣除。

### 7.7 游戏失败与财务自由

| 判定 | 条件 | 触发时机 |
|------|------|----------|
| **失败（【新增】v3.5）** | 月现金流 < 0 **且** 现金 ≤ 0 **且** 无可变卖资产 | `checkAndHandleBankruptcy` |
| **强制变卖** | 月现金流 < 0 **且** 现金 ≤ 0 **且** 有可变卖资产 | `pendingLiquidation` → `LIQUIDATE_ASSET` |
| 负现金流提示 | 月现金流 < 0（发工资后） | `pendingCashFlowSettlement` 弹窗 |
| 财务自由 | 被动收入 > 总支出 | Payday 检查 |

**【新增】v3.5 可变卖资产类型**：`stock` · `realEstate` · `business` · `metadata.sector === '汽车'`

```typescript
// src/utils/financial.ts — 【新增】v3.5
export function checkBankruptcy(player, mult?, sector?): boolean {
  if (getMonthlyCashFlow(player, mult, sector) >= 0) return false;
  if (player.cash > 0) return false;
  return !hasSellableAssets(player);
}

export function needsLiquidation(player, mult?, sector?): boolean {
  const cf = getMonthlyCashFlow(player, mult, sector);
  return cf < 0 && player.cash <= 0 && hasSellableAssets(player);
}
```

**变卖分支**（`LIQUIDATE_ASSET { assetId, isSecretSell }`）：

| 方式 | 成交价 | 幸福度 | 其他 |
|------|--------|--------|------|
| 协商变卖 | 市价 × 70% | -10 | 短期家庭矛盾 |
| 私自变卖 | 市价 × 50% | -30 | 高离婚风险；若后续离婚，现金分割 40% |

兜底：可申请 `bankBusinessLoan`（12% 仅付息）周转。

### 7.8 【替换】分层信贷负债与等额本息还款系统

v3.0 **替换** v2.0 的简化利息模型，全部分期类债务采用 **等额本息（EPI）** 计算月供。

#### 7.8.1 EPI 月供公式

```typescript
/** 【v3.0】等额本息月供 */
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

/** 根据债务类型计算月供（EPI 或仅付息） */
export function calcLiabilityMonthlyPayment(
  principal: number,
  debtType: DebtType,
  totalLoanMonth?: number
): number {
  const config = getDebtTypeConfig(debtType);
  if (config.interestOnly) {
    return Math.round(principal * config.monthlyRate);  // bankBusinessLoan
  }
  const months = totalLoanMonth ?? config.totalLoanMonth ?? 360;
  return calcEqualPrincipalInterestPayment(principal, config.monthlyRate, months);
}
```

**公式说明**：

```
月供 PMT = P × r × (1+r)^n / ((1+r)^n - 1)

P  = 剩余本金 (principal)
r  = 月利率 (monthRate)
n  = 剩余期数 (totalLoanMonth，简化模型中部分还款不缩期)
```

#### 7.8.2 七类债务 EPI 条款

| debtType | 年化 | 月利率 | EPI 期数 | 提前还款违约金 |
|----------|------|--------|----------|----------------|
| creditCard | 18% | 1.5% | **24** | 无 |
| consumerLoan | 9.6% | 0.8% | **36** | paidPeriods < 12 → 剩余本金 × 3% |
| carLoan | 4.2% | 0.35% | **60** | paidPeriods < 12 → 2%；≥12 免罚 |
| houseFirst | 3% | 0.25% | **360** | paidPeriods < 12 → 1%；≥12 免罚 |
| houseSecond | 4% | 0.33% | **360** | 始终 1% |
| shopMortgage | 5.04% | 0.42% | **240** | 始终 2% |
| bankBusinessLoan | 12% | 1.0% | — | 仅付息，无违约金 |

> **【调整】** v3.0 修正 v2.0 错误：houseFirst 免罚期为 **12 期（1 年）**，非 60 期（5 年）。

#### 7.8.3 提前还款违约金计算

```typescript
export function calcPrepaymentPenalty(
  debtType: DebtType,
  remainingPrincipal: number,
  paidPeriods: number
): number {
  const config = getDebtTypeConfig(debtType);

  if (config.alwaysPenaltyRate) {
    return Math.round(remainingPrincipal * config.alwaysPenaltyRate);
  }
  if (config.penaltyIfBeforePeriods && paidPeriods < config.penaltyBeforePeriods!) {
    return Math.round(remainingPrincipal * config.penaltyIfBeforePeriods);
  }
  if (config.freePrepayAfterPeriods && paidPeriods < config.freePrepayAfterPeriods) {
    return Math.round(remainingPrincipal * (config.penaltyRate ?? 0));
  }
  return 0;
}
```

#### 7.8.4 REPAY_LIABILITY 重算月供

部分还款后，**保持原 totalLoanMonth 不变**，以新本金重新计算 EPI 月供：

```typescript
const newPayment = newPrincipal > 0
  ? calcLiabilityMonthlyPayment(newPrincipal, debtType, liability.totalLoanMonth)
  : 0;
```

示例：首套房贷剩余本金 ¥500,000，月利率 0.25%，360 期 → 月供约 ¥2,108；提前还 ¥100,000 后，以 ¥400,000 重算 → 月供约 ¥1,686。

#### 7.8.5 getTotalExpenses 不重复计算

```typescript
// ✅ v3.0 正确：负债月供 + 固定支出（不含 expenses.mortgage）
export function getFixedExpenses(player: Player): number {
  const liabilityPayments = player.liabilities.reduce((sum, l) => sum + l.monthlyPayment, 0);
  const nonDebtFixed =
    player.expenses.tax +
    player.expenses.other +
    player.children * player.expenses.perChild +
    getPropertyTax(player);
  return liabilityPayments + nonDebtFixed;
}

// ❌ v2.0 错误模式（已废弃）：getFixedExpenses 含 expenses.mortgage + getLiabilityPayments → 双重计算
```

#### 7.8.6 债务优先级（AI / 玩家策略）

| 优先级 | debtType | 年化 | 理由 |
|--------|----------|------|------|
| 1 | creditCard | 18% | 最高息，无违约金 |
| 2 | bankBusinessLoan | 12% | 纯利息 |
| 3 | consumerLoan | 9.6% | 注意 12 期内 3% 违约金 |
| 4 | shopMortgage | 5.04% | 始终 2% 违约金 |
| 5 | carLoan | 4.2% | 12 期后免罚 |
| 6 | houseSecond | 4% | 1% 违约金 |
| 7 | houseFirst | 3% | 12 期后免罚，最低优先还 |

### 7.9 房产税规则

| 条件 | 月持有税 |
|------|----------|
| 持有 0–1 套 realEstate | ¥0 |
| 第 2 套起 | 每套 `marketValue × city.propertyTaxRate / 12` |
| 计入 | `getPropertyTax(player)`，合入 `getTotalExpenses` |

---

## 八、游戏流程与状态机

### 8.1 游戏主循环

```
SETUP（选城市 → 选职业 → 创建玩家）
  → ROLLING → MOVING → EVENT_RESOLVING
  → CARD_DECISION（机会/市场/支出/生育/慈善）
  → TURN_END
  → [可选 REPAY_LIABILITY / TAKE_LOAN]
  → 检查财务自由 → FAST_TRACK → GAME_OVER
```

### 8.2 回合详细流程

```
1. 确认当前玩家未破产
2. 掷骰（charityTurns > 0 则双骰选一）
3. 移动棋子
4. 触发格子事件
   - Payday：发工资 + paidPeriods++
   - Baby：CardModal 生育选择 → CHOOSE_BABY
   - Opportunity：抽卡 → getOpportunityAsset 城市缩放展示
5. 事件结算 → checkBankruptcy
6. 人类玩家可：贷款 / 提前还款 / 结束回合
7. 检查财务自由 → 快车道
8. AI 自动决策
```

### 8.3 SETUP_GAME 流程（v3.0）

```typescript
case 'SETUP_GAME': {
  const { humanPlayerName, humanProfessionId, cityId, aiCount, aiDifficulty } = action.payload;
  // createPlayer 对每个玩家：
  //   city = getCityById(cityId)
  //   salary = profession.salary × city.salaryMultiplier × buff
  //   expenses.tax/other/perChild 按 city 缩放
  //   liabilities = normalizeLiability(profession.liabilities)
}
```

StartScreen 顺序：**姓名 → 城市 → 职业 → AI 设置 → 预览 → 开始**。

### 8.4 老鼠赛跑 → 快车道切换

1. 被动收入 > 总支出时在 Payday 触发
2. 清除所有老鼠赛跑负债
3. 资产市值 + 现金 − 负债 → 快车道起始现金
4. `isInFastTrack = true`

### 8.5 快车道流程

掷双骰移动；梦想格购买梦想；现金 ≥ ¥500,000 获胜。

### 8.6 胜利条件

| 模式 | 条件 |
|------|------|
| 老鼠赛跑 | 被动收入 > 总支出 → 快车道 |
| 快车道 | 现金 ≥ ¥500,000 |
| 失败 | 月现金流 < 0 |
| 多人 | 首个达标或最后存活者胜 |

---

## 九、AI 系统设计

### 9.1 AI 难度分级

| 难度 | 行为特征 |
|------|----------|
| **简单** | 随机决策；不会主动还款 |
| **中等** | 购买 ROI > 3% 的正现金流资产；现金 > ¥10,000 时还信用卡 |
| **困难** | ROI > 5% 即买；优先还高息债务；买方市场抽打折房产 |

### 9.2 AI 决策核心算法

```typescript
// src/hooks/useAIPlayer.ts

/** 高息债务优先还款 — 使用 DEBT_REPAY_PRIORITY */
function aiRepayHighInterestDebt(player: Player, actions: GameActions): void {
  if (player.difficulty === 'easy') return;

  const sorted = [...player.liabilities].sort((a, b) => {
    const priorityA = DEBT_REPAY_PRIORITY.indexOf(inferDebtTypeFromLiability(a));
    const priorityB = DEBT_REPAY_PRIORITY.indexOf(inferDebtTypeFromLiability(b));
    return priorityA - priorityB;
  });

  for (const liability of sorted) {
    const penalty = calcPrepaymentPenalty(
      inferDebtTypeFromLiability(liability),
      liability.principal,
      liability.paidPeriods ?? 0
    );
    const totalCost = liability.principal + penalty;
    const reserve = player.difficulty === 'hard' ? 2000 : 10000;

    if (player.cash - totalCost >= reserve) {
      actions.repayLiability(liability.id, liability.principal);
      return;
    }
  }
}

/** Baby 格：AI 根据月现金流决定 */
function aiChooseBaby(player: Player): boolean {
  if (player.children >= 3) return false;
  const projectedCF = getMonthlyCashFlow(player) - player.expenses.perChild;
  return projectedCF > 0;  // 仅在有正现金流时生育
}
```

### 9.3 AI 快车道行为

优先最近梦想格；现金接近目标时购买梦想。

---

## 十、UI 与交互设计

### 10.1 设计规范

| 项目 | 规范 |
|------|------|
| 视觉风格 | 卡通 Q 版、马卡龙色系、emoji 图标 |
| 主题色 | 浅粉 `#FF8FA3`、浅蓝 `#8FD3FF`、鹅黄 `#FFE66D`、成功绿 `#77DD77` |
| 字体 | **Nunito** + 系统无衬线 |
| 动画 | framer-motion |
| 音效 | Web Audio API |

### 10.2 【新增】StartScreen 城市选择器

v3.0 开局流程：**先选城市，再选职业**。

```
┌─ 选择城市（先于职业）─────────────────────┐
│ 【一线】 上海  北京  深圳  广州              │
│ 【二线】 杭州  成都  武汉  南京  苏州 ...    │
│ 【三线】 长沙  郑州  合肥  昆明  南宁        │
│ 【四线】 常德  绵阳  遵义                    │
└────────────────────────────────────────────┘
```

- 按 `CityTier` 分组展示（`CITY_TIER_LABELS`）
- 每个城市按钮显示：生活成本乘数、首套首付比例
- 选中城市后，职业列表下方 **实时预览** 调整后工资/现金流

```typescript
// src/components/StartScreen/StartScreen.tsx
const [cityId, setCityId] = useState(DEFAULT_CITY_ID);
const previewStats = useMemo(() => {
  const salary = Math.round(profession.salary * city.salaryMultiplier * salaryBuff);
  const liabilityPay = profession.liabilities.reduce(
    (sum, l) => sum + calcLiabilityMonthlyPayment(l.principal, l.debtType), 0
  );
  return { salary, liabilityPay, cashFlow: salary - tax - other - liabilityPay };
}, [profession, city]);
```

### 10.3 【调整】PlayerPanel 城市信息

角色面板显示玩家所在城市：

```
📍 杭州 · 二线 · 生活×1.08
```

```typescript
// src/components/PlayerPanel/PlayerPanel.tsx
const city = getCityById(selectedPlayer.cityId);
<div className={styles.cityLine}>
  📍 {city.name} · {CITY_TIER_LABELS[city.tier]} · 生活×{expenseMult.toFixed(2)}
</div>
```

### 10.4 【调整】CardModal 生育弹窗

Baby 格触发专用 UI（非卡片类型）：

| 元素 | 说明 |
|------|------|
| 标题 | 👶 生育计划 |
| 说明 | 生孩子后月支出 + perChild；当前孩子数/上限 3 |
| 主按钮 | 「生孩子」→ `chooseBaby(true)` |
| 次按钮 | 「暂不生育」→ `chooseBaby(false)`，无惩罚 |
| 禁用 | 已达 3 个孩子时主按钮禁用 |

### 10.5 负债面板与 RepayModal

```
┌─ 负债明细 ─────────────────────────────┐
│ 💳 信用卡（18%）    ¥15,000   月供 ¥725  [还款] │
│ 🏠 首套房贷（3%）   ¥600,000  月供 ¥2,108 [还款] │
│ 🏦 银行贷款（12%）  ¥30,000   月供 ¥300   [还款] │
│ 负债合计：¥645,000   月供合计：¥3,133    │
└────────────────────────────────────────┘
```

RepayModal 预览字段：
- 剩余本金、还款金额、预计违约金（`calcPrepaymentPenalty`）
- **新月供**（EPI 重算）、新月现金流
- 确认 → `REPAY_LIABILITY`

### 10.6 CardModal 机会卡展示

- metadata 基本面（PE、股息率、cityTier、租售比）
- 房产卡标注：缩放后总价、城市首付比例、debtType、EPI 月供
- 宏观市场卡：分类型影响列表

### 10.7 ActionBar

TURN_END 阶段可见：
- 「💰 还款」→ 打开 RepayModal
- 「🏦 贷款」→ 输入金额 → TAKE_LOAN
- 「结束回合」

### 10.8 整体布局

左棋盘、右 PlayerPanel、下 ActionBar、底 LogPanel。FinancialStatement 弹窗含完整收支与负债明细。

### 10.9 响应式策略

桌面 / 平板 / 手机；StartScreen 城市列表在手机上纵向滚动；RepayModal 手机全屏。

### 10.10 【新增】v3.2 PlayerPanel 年龄与人生阶段

角色面板追加展示：

```
🎂 32 岁 · 距退休 28 年 · 失业风险 中
💑 薪资幸福加成约 +8/月（floor(月薪/1000)，上限8）
🏖️ 已退休 / 🎖️ 升迁 Lv.2
```

```typescript
// src/components/PlayerPanel/PlayerPanel.tsx — 【新增】v3.2
getUnemploymentRiskLevel(age, tier, professionId, retireStandardAge)
getYearsToRetirement(player)
calcMarriageHappinessBySalary(salary)
```

### 10.11 【新增】v3.2 退休/升迁弹窗（CardModal）

| 事件 | 触发 | Action |
|------|------|--------|
| 退休 | `age >= retireStandardAge` 跑完一圈 | `CONFIRM_RETIREMENT` |
| 升迁 | 落点 `promotion` 格 | `CHOOSE_PROMOTION { accept }` |

ActionBar 追加 **🏖️ 主动退休**（自由职业 ≥50 岁，`MANUAL_RETIRE`）。

---

## 十一、项目结构

```
CashFlow/
├── CASHFLOW_GAME.md
├── src/
│   ├── types/
│   │   └── game.ts                 # City, CityTier, Player.cityId, CHOOSE_BABY, ProfessionTier
│   ├── data/
│   │   ├── cities.ts               # 【新增】v3.0 20 城市数据
│   │   ├── professions.ts          # 【调整】16 职业 × 四层级
│   │   ├── opportunityCards.ts     # 【调整】cityTier metadata
│   │   ├── marketCards.ts
│   │   ├── doodadCards.ts
│   │   └── boardLayout.ts
│   ├── context/
│   │   ├── GameContext.tsx
│   │   └── GameReducer.ts          # CHOOSE_BABY, REPAY_LIABILITY EPI 重算, createPlayer 城市缩放
│   ├── utils/
│   │   ├── financial.ts            # 【替换】EPI, scaleAssetByPlayerCity, getTotalExpenses
│   │   ├── repayEligibility.ts
│   │   ├── storage.ts              # 【调整】cityId 存档兼容
│   │   ├── format.ts
│   │   └── random.ts
│   ├── hooks/
│   │   ├── useGameActions.ts       # chooseBaby, repayLiability, setupGame(cityId)
│   │   ├── useAIPlayer.ts          # 【调整】Baby 决策、高息先还
│   │   ├── useBankruptcy.ts
│   │   ├── useDice.ts
│   │   └── useSound.ts
│   ├── components/
│   │   ├── StartScreen/            # 【调整】城市选择器先于职业
│   │   ├── PlayerPanel/            # 【调整】显示 cityId 城市信息
│   │   ├── CardModal/              # 【调整】Baby 生育弹窗；【修正】v3.5 jobHop
│   │   ├── LiquidateModal/         # 【新增】v3.5 强制资产变卖
│   │   ├── CashFlowSettlementModal/ # 【新增】v3.5 负现金流结算提示
│   │   ├── FinancialStatement/     # 【调整】v3.5 应急储备 + 变卖按钮
│   │   ├── RepayModal/             # EPI 还款预览
│   │   ├── ActionBar/
│   │   ├── Board/
│   │   ├── GameScreen/
│   │   ├── WinScreen/
│   │   ├── LogPanel/
│   │   ├── Dice/
│   │   └── Icons/
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts
```

### 11.1 【调整】v3.0 开发者文件变更清单

| 文件 | 变更类型 | 要点 |
|------|----------|------|
| `src/types/game.ts` | 【调整】 | `City`, `CityTier`, `PropertyTier`, `Player.cityId`, `GameConfig.cityId`, `ProfessionTier`, `CHOOSE_BABY`, `totalLoanMonth` |
| `src/data/cities.ts` | 【新增】 | 20 城、`CITY_TIER_PRICE_MULTIPLIER`、`getCityById` |
| `src/data/professions.ts` | 【调整】 | 16 职业、四层级、Buff |
| `src/utils/financial.ts` | 【替换】 | `calcEqualPrincipalInterestPayment`, `DEBT_TYPE_CONFIG`, `scaleAssetByPlayerCity`, `getCityExpenseMultiplier`, `getDownPaymentRate`, `getTotalExpenses` 不重复 |
| `src/context/GameReducer.ts` | 【调整】 | `createPlayer` 城市缩放, `CHOOSE_BABY`, `REPAY_LIABILITY` EPI 重算 |
| `src/components/StartScreen/*` | 【调整】 | 城市选择器、预览面板 |
| `src/components/PlayerPanel/*` | 【调整】 | 城市行展示 |
| `src/components/CardModal/*` | 【调整】 | Baby 生育弹窗 |
| `src/data/opportunityCards.ts` | 【调整】 | `metadata.cityTier` |
| `src/hooks/useGameActions.ts` | 【调整】 | `chooseBaby`, `setupGame` 含 cityId |
| `src/hooks/useAIPlayer.ts` | 【调整】 | Baby 决策、EPI 还款 |
| `src/utils/storage.ts` | 【调整】 | 旧存档 `cityId ?? DEFAULT_CITY_ID` |

### 11.2 v3.0 数据文件 Checklist

- [x] `cities.ts` — 20 城四线分级
- [x] `game.ts` — City / cityId / CHOOSE_BABY / ProfessionTier
- [x] `financial.ts` — EPI 公式、城市工具函数、getTotalExpenses
- [x] `GameReducer.ts` — createPlayer 城市、CHOOSE_BABY、REPAY_LIABILITY
- [x] `professions.ts` — 16 职业
- [x] `StartScreen` — 城市选择器
- [x] `PlayerPanel` — 城市展示
- [x] `CardModal` — Baby 弹窗
- [x] `storage.ts` — cityId 迁移

---

## 十二、开发路线图

| 阶段 | 内容 | 状态 |
|------|------|------|
| **Phase 1** | 基础框架：React + Vite + Context/Reducer | ✅ 已完成 |
| **Phase 2** | 棋盘 24 格、掷骰子、格子事件、回合流转 | ✅ 已完成 |
| **Phase 3** | 机会/市场/支出卡、资产买卖、贷款机制 | ✅ 已完成 |
| **Phase 4** | 卡通 UI、FinancialStatement、AI 对手、快车道 | ✅ 已完成 |
| **Phase 5** | 【v3.0】城市系统、16 职业、EPI 信贷、城市缩放 | ✅ 大部分完成 |
| **Phase 6** | 【v3.0】StartScreen 城市选择、Baby 选择、RepayModal | 🔶 部分完成 |
| Phase 7 | 本地存档完善、旧存档全量迁移 | 🔲 待做 |
| Phase 8 | 多语言、响应式优化、成就系统 | 🔲 待做 |
| Phase 9 | 网络多人、PWA、Electron 打包 | 🔲 远期 |

### 12.1 Phase 5 已完成项

- [x] `src/data/cities.ts` — 20 城四线分级
- [x] `Player.cityId` / `GameConfig.cityId`
- [x] `createPlayer` 城市薪资/支出缩放
- [x] `calcEqualPrincipalInterestPayment` + 7 类 EPI 配置
- [x] `REPAY_LIABILITY` 部分还款 EPI 重算
- [x] `getTotalExpenses` 不重复计算 expenses.mortgage
- [x] `scaleAssetByPlayerCity` 房产/车辆城市缩放
- [x] 16 职业 × 四层级 + Buff
- [x] houseFirst 免罚期修正为 12 期

### 12.2 Phase 6 部分完成 / 进行中

- [x] StartScreen 城市选择器（先于职业）
- [x] PlayerPanel 城市信息行
- [x] CardModal Baby 生育弹窗 + CHOOSE_BABY
- [x] RepayModal 基础还款预览
- [ ] RepayModal EPI 新月供动画优化
- [ ] FinancialStatement 城市税率/首付说明
- [ ] AI Baby 决策策略调优

### 12.3 延期项（Deferred）

| 项目 | 原因 |
|------|------|
| 部分还款缩期 | 保持 totalLoanMonth 不变，仅降月供 |
| 城市专属机会卡池 | 当前统一卡池 + 城市缩放 |
| 职业 × 城市禁配 | 暂不限制组合 |
| 存档云同步 | 纯前端，无后端 |
| 多语言 i18n | Phase 8 |

### 12.4 §12 延后功能已完成（2026-07）

- [x] **宏观降息重算月供** — `recalcAllPlayersMortgagesOnRateChange`；`interestRate` / `macroEvent.rateChange` 触发 EPI 重算（剩余期数 = totalLoanMonth − paidPeriods）
- [x] **机会卡 28+** — `opportunityCards.ts` 现 34 张（小 25 + 大 9），覆盖股权/固收/商品/REITs/海外/实体/房产/车辆全品类
- [x] **宏观市场卡 18+** — `marketCards.ts` 现 23 张（含 17 张 `macroEvent`），差异化 `assetImpacts` + 利率/交互型效果

**在线可玩版本：** https://FrankJIE09.github.io/CashFlow/（v3.0）

---

## 十三、游戏平衡与参数表

### 13.1 核心参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| 银行贷款利率 | 月 1% / 年 12% | `bankBusinessLoan` 仅付息 |
| 贷款额度 | **无上限** | |
| 失败条件 | 月现金流 < 0 | |
| 慈善捐款比例 | 10% | |
| 慈善双骰子回合 | 3 | |
| 孩子上限 | 3 | |
| 快车道目标 | ¥500,000 | |
| 默认城市 | 杭州 (hangzhou) | `DEFAULT_CITY_ID` |

### 13.2 【调整】v3.0 债务参数完整表

| debtType | 月利率 | 年化 | EPI 期数 | 违约金条件 | 违约金率 |
|----------|--------|------|----------|------------|----------|
| creditCard | 1.5% | 18% | 24 | 无 | 0 |
| consumerLoan | 0.8% | 9.6% | 36 | paidPeriods < 12 | 3% |
| carLoan | 0.35% | 4.2% | 60 | paidPeriods < 12 | 2% |
| houseFirst | 0.25% | 3% | 360 | paidPeriods < 12 | 1% |
| houseSecond | 0.33% | 4% | 360 | 始终 | 1% |
| shopMortgage | 0.42% | 5.04% | 240 | 始终 | 2% |
| bankBusinessLoan | 1.0% | 12% | — | 无 | 0 |

> **【调整】** houseFirst 免罚期：**12 期**（v2.0 误写为 60 期/5 年，v3.0 已修正）。

### 13.3 【调整】v3.0 城市参数表

| 线级 | 城市数 | 薪资乘数范围 | 生活乘数范围 | 房产税率 | 首套首付 | 二套首付 |
|------|--------|--------------|--------------|----------|----------|----------|
| tier1 一线 | 4 | 1.05–1.15 | 1.22–1.35 | 0.5%–0.6% | 30% | 38%–40% |
| tier2 二线 | 8 | 0.85–1.00 | 0.88–1.08 | 0.35%–0.4% | 25% | 32%–35% |
| tier3 三线 | 5 | 0.70–0.80 | 0.70–0.80 | 0.25%–0.3% | 20% | 28%–30% |
| tier4 四线 | 3 | 0.55–0.60 | 0.55–0.60 | 0.2% | 15% | 25% |

**房产基准价乘数**（相对 tier2）：

| tier1 | tier2 | tier3 | tier4 |
|-------|-------|-------|-------|
| 2.8 | 1.0 | 0.45 | 0.28 |

### 13.4 房产参数（基准 tier2，购买时按城市缩放）

| cityTier | 基准总价 | 基准首付 | 基准月租 | debtType |
|----------|----------|----------|----------|----------|
| tier4 | ¥126,000 | 15% | ¥504 | houseFirst |
| tier3 | ¥450,000 | 20% | ¥1,800 | houseFirst |
| tier2 | ¥2,800,000 | 25% | ¥6,500 | houseFirst |
| tier1 | ¥6,500,000 | 30% | ¥15,000 | houseSecond* |
| commercial | ¥1,200,000 | 50% | ¥8,000 | shopMortgage |

### 13.5 卡牌数量配置

| 卡组 | 数量 |
|------|------|
| 机会卡 | 34（小 25 + 大 9） |
| 市场卡 | 23（含 17 macroEvent） |
| 额外支出 | 8+ |

### 13.6 【调整】16 职业参数表（tier2 基准）

| 职业 | 层级 | 基准工资 | 初始现金 | 主要负债 principal |
|------|------|----------|----------|-------------------|
| 医生 | elite | 22,000 | 15,000 | 房贷 120 万 |
| 律师 | elite | 18,000 | 12,000 | 房贷 90 万 |
| 飞行员 | elite | 15,000 | 10,000 | 房贷 70 万 |
| 工程师 | professional | 12,000 | 8,000 | 房贷 60 万 |
| 教师 | professional | 6,500 | 5,000 | 房贷 28 万 |
| 护士 | professional | 7,500 | 4,500 | 房贷 32 万 |
| 会计 | professional | 9,000 | 6,000 | 房贷 45 万 |
| 设计师 | professional | 8,500 | 5,500 | 房贷 38 万 |
| 司机 | service | 5,500 | 3,000 | 房贷 15 万 |
| 秘书 | service | 6,000 | 4,000 | 房贷 18 万 |
| 销售 | service | 7,000 | 3,500 | 房贷 22 万 |
| 保安 | basic | 4,500 | 2,500 | 房贷 12 万 |
| 外卖员 | basic | 5,000 | 2,000 | 房贷 10 万 |
| 工厂工人 | basic | 4,800 | 2,800 | 房贷 13 万 |
| 自由职业者 | basic | 6,500 | 4,000 | 房贷 20 万 |
| 收银员 | basic | 4,200 | 2,200 | 房贷 9 万 |

### 13.7 平衡性设计目标

| 目标 | 实现 |
|------|------|
| 城市差异 | 一线高薪资高支出，四线低门槛 |
| 债务管理 | EPI 月供 + 提前还款策略 |
| 房产策略 | 商铺正现金流 vs 一线负现金流赌升值 |
| 生育选择 | 玩家自主，拒绝无惩罚 |
| 宏观事件 | 2008 危机 / 楼市复苏 / AI 周期差异化 |
| 游戏时长 | 30–90 分钟 |

### 13.8 【调整】v3.0 常见测试场景

| 场景 | 验证点 |
|------|--------|
| 上海 + 工程师开局 | 薪资 ×1.15，支出 ×1.35，预览现金流正确 |
| 遵义 + 保安开局 | 低生活成本，月现金流可能为正 |
| 购买 tier2 房产（上海玩家） | cost ×2.8，首付 30% |
| 提前还房贷（paidPeriods < 12） | 扣 1% 违约金，EPI 新月供下降 |
| 提前还房贷（paidPeriods ≥ 12） | 无违约金 |
| Baby 格选「暂不生育」 | 无支出变化，无惩罚 |
| Baby 格选「生孩子」 | children+1，月支出 +perChild |
| REPAY_LIABILITY 部分还款 | monthlyPayment 重算，getTotalExpenses 不重复 |
| 买第 2 套房 | debtType=houseSecond；getPropertyTax > 0 |
| 2008 危机卡 | 房产 −35%、债券 +5% 差异化 |
| AI 困难模式 | 优先还 creditCard |

---

## 十四、扩展方向

### 14.1 短期（v3.x）

- RepayModal EPI 交互完善
- 旧存档 cityId / totalLoanMonth 自动迁移
- 本地存档持久化

### 14.2 中期

- 多语言（中/英）
- 自定义职业 / 卡牌编辑器
- 成就系统
- 城市专属事件卡

### 14.3 已实现

- ✅ v1.x：卡通 UI、市场卡、贷款无上限、月现金流失败
- ✅ v2.0：7 类债务、26 子类资产、宏观差异化、房产税
- ✅ v3.0：20 城四线、16 职业、EPI 信贷、城市缩放、生育选择

### 14.4 长期

- 网络多人对战
- PWA 离线游玩
- AI 对局回放与分析
- Electron 桌面版
- 赛季平衡更新

---

## 十五、附录：快速参考

### 15.1 【调整】v3.0 关键公式

```
月现金流 = 工资 + 被动收入 - 总支出

被动收入 = Σ(资产现金流 × 类型乘数 × 板块乘数)

总支出 = Σ(负债.monthlyPayment) + tax + other + 孩子×perChild + getPropertyTax(player)
       （不含 expenses.mortgage / carLoan / creditCard，避免重复）

EPI 月供 = P × r × (1+r)^n / ((1+r)^n - 1)

实际月薪 = profession.salary × city.salaryMultiplier × buff.salary

房产缩放 = asset.cost × (CITY_TIER_PRICE_MULTIPLIER[playerCity.tier] / CITY_TIER_PRICE_MULTIPLIER[cardCityTier])

首付 = cost × getDownPaymentRate(city, isSecondHome, isCommercial)

持有税 = 第2套起：每套 marketValue × city.propertyTaxRate / 12

财务自由 = 被动收入 > 总支出
游戏失败 = 月现金流 < 0
净资产 = 现金 + 资产市值 - 负债本金
提前还款实付 = 还款本金 + calcPrepaymentPenalty(debtType, remainingPrincipal, paidPeriods)
```

### 15.2 【调整】v3.0 关键枚举速查

```typescript
// 城市
CityTier: 'tier1' | 'tier2' | 'tier3' | 'tier4'
PropertyTier: CityTier | 'commercial'

// 职业
ProfessionTier: 'elite' | 'professional' | 'service' | 'basic'

// 债务
DebtType: 'creditCard' | 'consumerLoan' | 'carLoan' | 'houseFirst'
        | 'houseSecond' | 'shopMortgage' | 'bankBusinessLoan'

// 资产
AssetType: 'stock' | 'bond' | 'commodity' | 'reit' | 'derivative'
         | 'overseas' | 'entity' | 'realEstate' | 'business' | 'intellectual'

// 棋盘
SpaceType: 'opportunity' | 'market' | 'doodad' | 'charity' | 'baby' | 'marriage' | 'settlement'  // 【新增】v3.1 marriage
         | 'promotion'  // 【新增】v3.2 升迁格

// 【新增】v3.1 婚恋
MarriageStatus: 'single' | 'married' | 'divorced'
PregnancyPath: 'plan' | 'dink' | 'postpone'
MarketEffectType: ... | 'unemployment' | 'reemployment'

// 状态机
GamePhase: 'SETUP' | 'ROLLING' | 'MOVING' | 'EVENT_RESOLVING' | 'CARD_DECISION'
         | 'TURN_END' | 'FAST_TRACK' | 'GAME_OVER'
```

### 15.3 【新增】City 接口速查

```typescript
interface City {
  id: string;                  // 如 'shanghai', 'hangzhou', 'changde'
  name: string;                // 如 '上海', '杭州', '常德'
  tier: CityTier;              // 'tier1' | 'tier2' | 'tier3' | 'tier4'
  salaryMultiplier: number;    // 相对 tier2 基准
  expenseMultiplier: number;   // 生活成本
  propertyTaxRate: number;     // 年税率小数
  downPaymentFirst: number;    // 首套房首付比例
  downPaymentSecond: number;   // 二套房首付比例
}
```

### 15.4 【调整】GameAction 完整列表

```typescript
type GameAction =
  | { type: 'SETUP_GAME'; payload: GameConfig }
  | { type: 'RESTART_GAME' }
  | { type: 'ROLL_DICE'; payload: { dice: number } }
  | { type: 'MOVE_PLAYER' }
  | { type: 'RESOLVE_SPACE' }
  | { type: 'DRAW_CARD'; payload: { cardType: CardType } }
  | { type: 'BUY_ASSET'; payload?: { shareHand?: number } }     // 【新增】v3.1 股票手数
  | { type: 'BUY_DISCOUNTED_ASSET'; payload?: { shareHand?: number } }
  | { type: 'DECLINE_CARD' }
  | { type: 'PAY_DOODAD' }
  | { type: 'DONATE_CHARITY'; payload: { donate: boolean } }
  | { type: 'CHOOSE_BABY'; payload: { haveBaby: boolean } }     // 【v3.0 新增】
  | { type: 'CHOOSE_MARRIAGE'; payload: { marry: boolean } }   // 【新增】v3.1
  | { type: 'CHOOSE_PREGNANCY_PATH'; payload: { path: PregnancyPath } } // 【新增】v3.1
  | { type: 'CONFIRM_RETIREMENT' }                                     // 【新增】v3.2
  | { type: 'CHOOSE_PROMOTION'; payload: { accept: boolean } }         // 【新增】v3.2
  | { type: 'MANUAL_RETIRE' }                                          // 【新增】v3.2
  | { type: 'APPLY_MARKET_EFFECT' }
  | { type: 'DRAW_DISCOUNTED_OPPORTUNITY' }
  | { type: 'END_TURN' }
  | { type: 'TAKE_LOAN'; payload: { amount: number } }
  | { type: 'REPAY_LIABILITY'; payload: { liabilityId: string; amount: number } }
  | { type: 'SELL_ASSET'; payload: { assetId: string; multiplier: number; shareHand?: number } }
  | { type: 'LIQUIDATE_ASSET'; payload: { assetId: string; isSecretSell: boolean } }  // 【新增】v3.5
  | { type: 'CONFIRM_CASH_FLOW_SETTLEMENT' }                                           // 【新增】v3.5
  | { type: 'DECLARE_BANKRUPTCY' };
```

> 完整定义见 §3.1 与 §17；上表为速查，含 v3.0 ~ v3.5 全部 Action。

### 15.5 【调整】financial.ts 核心函数索引

| 函数 | 用途 |
|------|------|
| `calcEqualPrincipalInterestPayment` | EPI 月供计算 |
| `calcLiabilityMonthlyPayment` | 按 debtType 计算月供 |
| `calcPrepaymentPenalty` | 提前还款违约金 |
| `previewRepayment` | 还款预览（本金/违约金/新月供） |
| `getCityExpenseMultiplier` | 城市生活成本乘数 |
| `getCityPropertyTaxRate` | 城市房产持有税率 |
| `getDownPaymentRate` | 城市首付比例 |
| `getPropertyTax` | 多套房产月持有税 |
| `scaleAssetByPlayerCity` | 房产/车辆按玩家城市缩放 |
| `getOpportunityAsset` | 机会卡资产（含缩放） |
| `getFixedExpenses` / `getTotalExpenses` | 总支出（不重复） |
| `getMonthlyCashFlow` | 月现金流 |
| `checkFinancialFreedom` | 财务自由判定 |
| `checkBankruptcy` | 【调整】v3.5：月 CF<0 且现金≤0 且无可变卖资产 |
| `needsLiquidation` | 【新增】v3.5：强制变卖弹窗判定 |
| `calcEmergencyReserveMonths` | 【新增】v3.5：应急储备月数 |
| `liquidateAssetConsent/Secret` | 【新增】v3.5：协商/私自变卖 |
| `calcUnemploymentHappinessPenalty` | 【新增】v3.5：失业婚姻惩罚 |
| `isStockLotAsset` / `stockLotBuyCost` / `stockLotSellProceeds` | 【新增】v3.1 股票按手交易 |
| `getEffectiveSalary` / `weddingCost` / `divorceSettlement` | 【新增】v3.1 婚恋财务 |
| `getUnemploymentProbability` / `unemployedMonthlyCashFlow` | 【新增】v3.1 失业 |
| `calcAgeUnemploymentRate` / `getUnemploymentRiskLevel` | 【新增】v3.2 年龄失业 |
| `calcPensionIncome` / `calcElderlyMedicalExpense` | 【新增】v3.2 退休财务 |
| `calcMarriageHappinessBySalary` / `getYearsToRetirement` | 【新增】v3.2 婚恋/年龄 UI |
| `getProfessionAgeConfig` / `isSelfEmployedProfession` | 【新增】v3.2 职业年龄映射 |

### 15.6 v3.0 MVP 检查清单

- [x] 棋盘 24 格、掷骰子、格子事件
- [x] 7 类 debtType + DEBT_TYPE_CONFIG
- [x] calcEqualPrincipalInterestPayment / calcLiabilityMonthlyPayment
- [x] REPAY_LIABILITY EPI 重算
- [x] getTotalExpenses 不重复计算
- [x] 20 城四线 + cities.ts
- [x] Player.cityId / GameConfig.cityId
- [x] 16 职业 × 四层级
- [x] scaleAssetByPlayerCity
- [x] CHOOSE_BABY 生育选择
- [x] StartScreen 城市选择器
- [x] PlayerPanel 城市展示
- [x] CardModal Baby 弹窗
- [x] houseFirst 免罚期 12 期
- [x] 【新增】v3.1 股票按手交易（CardModal 手数输入）
- [x] 【新增】v3.1 婚恋格 + 已婚生育三选一
- [x] 【新增】v3.1 失业/再就业市场卡
- [x] PlayerPanel 婚恋/失业/孕期状态展示
- [x] 【新增】v3.2 年龄/退休/升迁系统
- [x] 【新增】v3.2 10 张家庭紧急 doodad 卡
- [x] 【新增】v3.2 PlayerPanel 年龄/距退休/失业风险/薪资幸福加成
- [x] 【新增】v3.2 CardModal 退休/升迁弹窗
- [x] 【新增】v3.2 ActionBar 自由职业主动退休
- [x] 【新增】v3.2 AI 临近退休优先被动收入
- [ ] RepayModal 交互 polish
- [ ] 旧存档 EPI 字段全量迁移

### 15.7 EPI 月供速查表（万元本金）

| 本金(万) | creditCard 24期 | consumerLoan 36期 | carLoan 60期 | houseFirst 360期 |
|----------|-----------------|-------------------|--------------|------------------|
| 1 | ¥502 | ¥318 | ¥184 | ¥42 |
| 5 | ¥2,508 | ¥1,590 | ¥922 | ¥211 |
| 10 | ¥5,016 | ¥3,180 | ¥1,844 | ¥422 |
| 50 | ¥25,080 | ¥15,900 | ¥9,220 | ¥2,108 |
| 100 | ¥50,160 | ¥31,800 | ¥18,440 | ¥4,216 |

*均为 EPI 初始月供近似值，四舍五入至整数元。*

---

## 十六、【新增】自动化测试 Agent 系统

> **【新增】v3.3** 本模块与正常游玩完全隔离：`testMode === false` 时 validators 为 no-op，UI 不挂载 AutoTestPanel，玩家手动流程不变。

### 16.1 设计目标

| 目标 | 说明 |
|------|------|
| 回归检测 | 自动掷骰、购卡、婚恋/生育/还款，覆盖状态机主干 |
| Bug 归档 | 每次 reducer 转换后运行 validators，写入 `bugLogs` |
| 可观测 | AutoTestPanel 实时展示；一键复制 Markdown 报告 |
| 隔离性 | 仅 `testMode` 开启时生效，不影响正式对局 |

### 16.2 【新增】类型扩展（`src/types/game.ts`）

```typescript
/** 【新增】v3.3 自动测试 Bug 日志 */
interface BugLogEntry {
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

// GameState（testMode 时启用）
testMode?: boolean;
testMaxRounds?: number;
testTimeoutRecord?: Record<string, number>; // phase -> 连续停留次数
bugLogs?: BugLogEntry[];
testStopped?: boolean;

// GameConfig
testMode?: boolean;
testMaxRounds?: number;

// GameAction
| { type: 'STOP_AUTO_TEST' }
```

### 16.3 【新增】`runTestValidators`（`src/utils/testValidators.ts`）

在 `gameReducer` 外层包装：每次 action 后若 `state.testMode`，调用 `runTestValidators(state, prevState, action)`。

| 检测项 | 规则 | category | 默认阈值 |
|--------|------|----------|----------|
| 卡死 | `CARD_DECISION` 且 `currentCard === null`（非 baby/marriage/charity/promotion/退休） | `card_stuck` | > 3 次 |
| 死锁 | 同一 `phase` 连续 reducer 未切换 | `deadlock` | > 5 次 |
| 骰子残留 | `MOVE_PLAYER` 后 `pendingDice !== null` | `state_machine` | 立即 |
| 财务异常 | 现金越界、单次变动过大、子女/幸福度非法 | `financial` / `data_invalid` | 立即 |
| 分支缺失 | 已婚落 baby 格未进 `CARD_DECISION`；单身落婚恋格；结算格未 `TURN_END` | `branch_missing` | 立即 |
| 破产漏检 | `checkBankruptcy` 为 true 且未 `isBankrupt` | `bankruptcy` | 立即 |
| 变卖漏检 | `needsLiquidation` 为 true 且未 `pendingLiquidation` | `bankruptcy` | 立即 |
| 回合上限 | `round > testMaxRounds` | `state_machine` | warning |

`testTimeoutRecord` 按 phase 键计数；phase 切换时重置其他 phase 计数。

### 16.4 【新增】`useAutoTestAgent` Hook

路径：`src/hooks/useAutoTestAgent.ts`

- 条件：`testMode && !testStopped && phase !== GAME_OVER`
- 逻辑：复用困难 AI 决策（`shouldBuyOpportunity` 高 ROI 门槛、优先被动收入等）
- 主循环：`SETUP → ROLLING → MOVE_PLAYER → CARD_DECISION / TURN_END → END_TURN`，直到 `testMaxRounds` 或 `GAME_OVER`
- 与 `useAIPlayer` 互斥：`testMode` 时 `useAIPlayer` 直接 return

### 16.5 【新增】StartScreen 入口

- 复选框 **「自动测试模式」**
- 回合数下拉：**10 / 50 / 200**（写入 `testMaxRounds`）
- 开启后按钮文案为「开始自动测试」；进入 GameScreen 后挂载 `AutoTestPanel`，由 Agent 代操作全部玩家（含人类位）

### 16.6 【新增】AutoTestPanel 组件

路径：`src/components/AutoTestPanel/AutoTestPanel.tsx`

| 功能 | 行为 |
|------|------|
| Bug 列表 | 倒序展示 `bugLogs`，critical / warning 分色 |
| 导出报告 | 复制「回合 / Bug 数 / 明细」到剪贴板 |
| 停止测试 | `dispatch STOP_AUTO_TEST`，Agent 停止 dispatch |

### 16.7 【新增】GameReducer 集成

```typescript
export function gameReducer(state: GameState, action: GameAction): GameState {
  const nextState = gameReducerSwitch(state, action);
  return runTestValidators(nextState, state, action);
}
```

`!testMode` 时 `runTestValidators` 原样返回，零开销路径。

`END_TURN` 在测试模式下若 `round > testMaxRounds`，设置 `testStopped: true` 并进入 `GAME_OVER`。

### 16.8 【新增】v3.3 Bug 修复摘要（正常游玩）

| 问题 | 修复 |
|------|------|
| 月度工资 | 每次移动触发一次 `handlePayday`，无棋盘 payday 格、无重复发薪；退休当月仍先结算再弹窗 |
| 税务结算 | 不再重复扣 `expenses.tax`；改扣 `getPropertyTax`（≥2 套房产），年度格扣 12 个月持有税；结算前弹窗确认 |
| 生孩子 | 移动时清除 stale `currentCard`；已婚落点稳定进入 `CARD_DECISION` + CardModal 三选一 |
| 股票按手买 | CardModal 手数整数化、现金流/ROI 随手数缩放；`executeBuyAsset` 强制整手 |

### 16.9 【新增】文件清单

| 文件 | 变更 |
|------|------|
| `src/types/game.ts` | BugLogEntry、testMode 字段、STOP_AUTO_TEST |
| `src/utils/testValidators.ts` | 【新增】validators |
| `src/hooks/useAutoTestAgent.ts` | 【新增】自动测试 Agent |
| `src/components/AutoTestPanel/*` | 【新增】测试面板 UI |
| `src/context/GameReducer.ts` | validator 包装、结算/发薪/生育修复 |
| `src/components/StartScreen/StartScreen.tsx` | 测试模式开关 |
| `src/components/GameScreen/GameScreen.tsx` | 挂载 Agent + Panel |

---

## 十七、【新增】v3.5 破产缓冲 · 失业婚姻 · 资产变卖

> 本章整合 v3.5 核心机制：破产不再「月现金流一负即死」；失业对婚姻的压力更真实；猎头跳槽无缝入职（【修正】）。

### 17.1 【修正】猎头跳槽 — 删除空窗期

**仅适用于 `jobHop` 事件**；晋升、裁员、职业转型逻辑不变（职业转型仍保留 50% 过渡薪资）。

| 选项 | 薪资 | 收入中断 | 其他 |
|------|------|----------|------|
| 高薪 Offer | +35~50%（永久） | **无** | 试用期 3 回合 `layoffRiskModifier ×1.5` |
| 稳定岗位 | -10~20%（永久） | **无** | `layoffRiskModifier = 0.05`（极低裁员） |

**已删除**（代码/UI/文档均移除）：
- `salaryGapTurnsRemaining` 空窗期字段与倒计时
- `highPayGapTurns` 事件参数
- CardModal「N 回合空窗」文案
- `getEffectiveSalary` 中空窗期返回 0 的逻辑

**保留**：
- 跳槽培训/社交费可通过 `bankBusinessLoan` 贷款（与其他 career cost 一致）
- 婚姻/年龄/城市缩放逻辑不变

```typescript
// GameReducer — CHOOSE_PROMOTION jobHop 分支（【修正】）
case 'jobHop': {
  if (choice === 'highPay') {
    updatePlayer({ salary: newSalary, layoffRiskBoostTurnsRemaining: 3, layoffRiskModifier: ×1.5 });
    // 不再设置 salaryGapTurnsRemaining
  } else {
    updatePlayer({ salary: reduced, layoffRiskModifier: 0.05 });
  }
}
```

### 17.2 【新增】破产规则 overhaul

#### 17.2.1 失败条件（AND 逻辑）

```
游戏失败 ⇔ 月净现金流 < 0
         AND 现金 ≤ 0
         AND 无可变卖资产（stock / realEstate / business / 汽车）
```

月现金流为负但仍有现金 → **不失败**，继续游玩（现金逐月消耗）。
现金耗尽但有可变卖资产 → **强制变卖弹窗**（`pendingLiquidation`），而非立即失败。

#### 17.2.2 变卖 Modal 两分支

玩家自选变卖顺序（先卖哪项资产）：

| 分支 | 函数 | 成交价 | 幸福度 | 婚恋后果 |
|------|------|--------|--------|----------|
| 协商变卖 | `liquidateAssetConsent` | 市价 × 70% | -10 | 短期家庭矛盾 |
| 私自变卖 | `liquidateAssetSecret` | 市价 × 50% | -30 | 高离婚概率；标记 `hasSecretLiquidation`，后续离婚现金分割 **40%** |

兜底：`TAKE_LOAN` 银行经营贷（12% 年化，仅付息）。

#### 17.2.3 Reducer 流程

```
handlePayday / 任意扣款后
  → processMonthlyLifeEvents
  → checkAndHandleBankruptcy
      ├─ needsLiquidation → phase=CARD_DECISION, pendingLiquidation=true
      ├─ checkBankruptcy  → isBankrupt, phase=TURN_END 或 GAME_OVER
      └─ 否则不变

LIQUIDATE_ASSET → 移除资产、加现金、扣幸福度
  → 再次 checkAndHandleBankruptcy
  → 仍 needsLiquidation 则保持弹窗
```

#### 17.2.4 GameState 新字段

```typescript
pendingLiquidation?: boolean;
pendingCashFlowSettlement?: { cashFlow: number } | null;
```

#### 17.2.5 GameAction

```typescript
| { type: 'LIQUIDATE_ASSET'; payload: { assetId: string; isSecretSell: boolean } }
| { type: 'CONFIRM_CASH_FLOW_SETTLEMENT' }
```

### 17.3 【新增】失业婚姻惩罚

在 `processMonthlyLifeEvents` 每月发工资后结算（替代原固定 -3/月）。

| 情形 | 幸福度惩罚/月 | 备注 |
|------|---------------|------|
| 本人失业 | -15，每多失业 1 月再 -5 | 即第 n 月：-(15+5×(n-1)) |
| 配偶失业 | -10 | `partnerUnemployedTurnsRemaining > 0` |
| 长期失业 ≥4 月 + DINK | 离婚概率 ×2 | 叠加 `getDivorceProbability` |
| 长期失业 ≥4 月 + 有子女 | 额外 -8/月 | 与本人失业惩罚叠加 |
| 再就业后 | -5/月 × 3 回合 | `postEmploymentScarTurnsRemaining` |

**减半条件**（应急储备或被动收入缓冲）：
- `calcEmergencyReserveMonths ≥ 3`，或
- `getPassiveIncome > 0`

→ 上述惩罚合计 ×0.5（`shouldHalveUnemploymentPenalty`）。

#### Player 新字段

```typescript
consecutiveUnemployedTurns?: number;      // 连续失业月数
postEmploymentScarTurnsRemaining?: number; // 再就业疤痕 3 回合
hasSecretLiquidation?: boolean;            // 私自变卖标记
```

裁员（`layoff`）与再就业（`reemployment`）事件仍走 `CHOOSE_PROMOTION`；裁员后先走 N+1 补偿，再进入失业倒计时；再就业时重置 `consecutiveUnemployedTurns` 并设置 3 回合疤痕。

### 17.4 【新增】财务工具函数

路径：`src/utils/financial.ts`

```typescript
/** 应急储备月数：正 CF 时 cash/总支出；负 CF 时 cash/|CF| */
export function calcEmergencyReserveMonths(player, cashFlowMultiplier?, sectorMultiplier?): number;

export function isSellableAsset(asset: Asset): boolean;
export function hasSellableAssets(player: Player): boolean;
export function getSellableAssets(player: Player): Asset[];

export function liquidateAssetConsent(asset, marketMultiplier, sectorMultiplier): LiquidationResult;
export function liquidateAssetSecret(asset, marketMultiplier, sectorMultiplier): LiquidationResult;

export function calcUnemploymentHappinessPenalty(player, mult?, sector?): number;
export function shouldHalveUnemploymentPenalty(player, mult?, sector?): boolean;
```

### 17.5 【新增】职业事件池同步

- **裁员（layoff）**：触发后仍给 N+1；失业期间走 §17.3 惩罚；现金耗尽时走 §17.2 变卖缓冲而非旧版「负 CF 即死」
- **自由职业 promotion 格**：`rollCareerEvent` 对 `selfEmployed` 返回「门店扩张」类 `promotion` 事件（薪资 boost 代表经营收入上升），不再跳过升迁格
- **其他事件**（内部晋升、职业转型、市场卡失业）逻辑不变，仅破产判定改用新 buffer

### 17.6 【新增】UI 变更

| 组件 | 变更 |
|------|------|
| `PlayerPanel` | 应急储备月数；失业红色 Banner（失业月数、幸福度惩罚） |
| `FinancialStatement` | 应急储备行；负 CF 时高亮「资产变卖」按钮（协商/私自） |
| `LiquidateModal` | 【新增】强制变卖：对比协商 vs 私自 |
| `CashFlowSettlementModal` | 【新增】发工资后负 CF 提示变卖/贷款 |
| `CardModal` | 【修正】jobHop 按钮文案去掉空窗期 |

挂载位置：`GameScreen` 内与 `CardModal` 并列。

```tsx
<CardModal />
<LiquidateModal />
<CashFlowSettlementModal />
```

### 17.7 【新增】AI / 自动测试适配

- `useAIPlayer` / `useAutoTestAgent` / `scripts/runAutoTest.ts`：
  - `pendingLiquidation` → 协商变卖最高 proceeds 资产
  - `pendingCashFlowSettlement` → `CONFIRM_CASH_FLOW_SETTLEMENT`
  - `TURN_END` 现金<0 → 优先变卖，其次贷款
  - `isBankrupt` 在 `CARD_DECISION` → `DECLINE_CARD` 推进回合
- `testValidators`：新增 `needsLiquidation` 漏检；`checkBankruptcy` 改用 v3.5 定义

### 17.8 【新增】v3.5 文件清单

| 文件 | 变更 |
|------|------|
| `src/types/game.ts` | 移除 `salaryGapTurnsRemaining`；新增失业/变卖字段与 Action |
| `src/utils/financial.ts` | 破产/变卖/应急储备/失业惩罚函数 |
| `src/utils/career.ts` | 【修正】jobHop 无空窗；自由职业 business promotion |
| `src/context/GameReducer.ts` | 破产/变卖/失业/reducer 分支 |
| `src/components/LiquidateModal/*` | 【新增】 |
| `src/components/CashFlowSettlementModal/*` | 【新增】 |
| `src/components/FinancialStatement/*` | 应急储备 + 变卖按钮 |
| `src/components/PlayerPanel/*` | 失业 Banner + 应急储备 |
| `src/components/CardModal/CardModal.tsx` | 【修正】jobHop UI |
| `src/hooks/useGameActions.ts` | `liquidateAsset`, `confirmCashFlowSettlement` |
| `scripts/runAutoTest.ts` | 新流程 headless 适配 |

### 17.9 参数速查（v3.5）

| 参数 | 值 |
|------|-----|
| 协商变卖比例 | 70% 市价 |
| 私自变卖比例 | 50% 市价 |
| 协商幸福度 | -10 |
| 私自幸福度 | -30 |
| 私自变卖后离婚分割 | 40% 现金 |
| 本人失业基础惩罚 | -15/月 |
| 失业递增 | +5/月 |
| 配偶失业 | -10/月 |
| 长期失业+子女 | -8/月（≥4 月） |
| 再就业疤痕 | -5/月 × 3 回合 |
| 惩罚减半 | 应急储备 ≥3 月 或 被动收入>0 |
| 高薪跳槽 probation | 3 回合裁员风险 ×1.5 |
| 银行贷款兜底 | 12% 仅付息 |

---

*文档版本：v3.5*  
*最后更新：2026-07-04*
