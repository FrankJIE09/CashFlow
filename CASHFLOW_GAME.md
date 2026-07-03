# CashFlow 富爸爸现金流游戏 — 设计文档

> 基于罗伯特·清崎《富爸爸穷爸爸》改编的桌面棋盘游戏。  
> 本文档是 React + TypeScript + Vite 技术方案下的完整设计、数据结构与开发指南。

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

---

## 一、项目概述

### 1.1 游戏简介

《CashFlow》是一款模拟现实财务决策的桌面棋盘游戏。玩家在"老鼠赛跑"（Rat Race）内圈中通过买卖资产、管理负债、应对市场波动，最终达成 **月被动收入 > 月总支出** 的财务自由条件，从而跳出内圈进入"快车道"（Fast Track），并最终实现个人梦想。

### 1.2 核心目标

| 阶段 | 目标 | 关键判定 |
|------|------|----------|
| **老鼠赛跑** | 积累资产，让被动收入超过总支出 | 月被动收入 > 月总支出 |
| **快车道** | 实现个人梦想或达到目标财富 | 购买梦想格 / 现金达到目标值 |

### 1.3 一局游戏的体验

- 玩家从各自职业出发，初始现金流紧张
- 每回合掷骰子移动，触发机会、市场、额外支出、发工资、生孩子、慈善等事件
- 通过投资和交易提高被动收入
- 当被动收入超过总支出时，跳出老鼠赛跑，进入快车道
- 在快车道通过掷两个骰子快速移动，积累财富实现梦想

---

## 二、技术方案

| 项目 | 选择 | 说明 |
|------|------|------|
| 语言 | **TypeScript 5.x** | 强类型，便于维护复杂状态 |
| 框架 | **React 18 + Vite 5** | 轻量、热更新快、可部署静态页面 |
| 样式 | **CSS Modules** | 组件级样式隔离，避免命名冲突 |
| 状态管理 | **React Context + useReducer** | 游戏状态集中管理，无需额外依赖 |
| 路由 | 暂无（单页游戏） | 后续扩展可引入 react-router |
| 部署 | 静态网页（Netlify / Vercel / GitHub Pages） | 纯前端，无需后端 |
| 扩展 | **Electron** | 未来可打包为桌面应用 |

### 2.1 不依赖第三方库的原因

- 游戏状态天然适合不可变数据 + reducer
- 卡牌和棋盘数据可用普通数组/对象管理
- 减少依赖，降低打包体积和长期维护成本

---

## 三、核心数据模型

### 3.1 类型定义总览

```typescript
// src/types/game.ts

export type GamePhase =
  | 'SETUP'            // 选择职业、玩家数量
  | 'ROLLING'          // 等待掷骰子
  | 'MOVING'           // 棋子移动动画中
  | 'EVENT_RESOLVING'  // 正在处理格子事件
  | 'CARD_DECISION'    // 玩家正在做卡片决策
  | 'TURN_END'         // 等待结束回合
  | 'FAST_TRACK'       // 进入快车道
  | 'GAME_OVER';       // 游戏结束

export type AssetType = 'stock' | 'realEstate' | 'business' | 'intellectual';

export type CardType = 'opportunity' | 'market' | 'doodad';
export type OpportunityKind = 'smallDeal' | 'bigDeal';

export type SpaceType =
  | 'payday'
  | 'opportunity'
  | 'market'
  | 'doodad'
  | 'charity'
  | 'baby'
  | 'settlement';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface ExpenseBreakdown {
  tax: number;
  mortgage: number;
  studentLoan: number;
  carLoan: number;
  creditCard: number;
  other: number;
  perChild: number;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  cost: number;           // 资产总价
  downPayment: number;    // 首付
  cashFlow: number;       // 每月现金流
  mortgage: number;       // 贷款金额（cost - downPayment）
  marketValue: number;    // 当前市场价值
  shares?: number;        // 股票股数
}

export interface Liability {
  id: string;
  name: string;
  principal: number;      // 剩余本金
  monthlyPayment: number; // 月供
  interestRate: number;   // 年利率
}

export interface Player {
  id: string;
  name: string;
  professionId: string;
  color: string;
  position: number;       // 棋盘位置 0-23
  cash: number;
  salary: number;
  expenses: ExpenseBreakdown;
  children: number;
  assets: Asset[];
  liabilities: Liability[];
  isInFastTrack: boolean;
  fastTrackPosition: number; // 快车道位置
  dream?: string;
  dreamCost?: number;
  charityTurns: number;      // 剩余可使用双骰子回合数
  isAI: boolean;
  difficulty?: Difficulty;
  isBankrupt: boolean;
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
}

export type Card = OpportunityCard | MarketCard | DoodadCard;

export interface MarketEffect {
  type: 'assetAppreciation' | 'assetDepreciation' | 'buyout' | 'interestRate' | 'discount' | 'sectorBoom';
  targetAssetType?: AssetType;
  multiplier?: number;
  rateChange?: number;
  discountRate?: number;
  sector?: string;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  round: number;
  spaces: Space[];
  decks: {
    opportunity: Card[];
    market: Card[];
    doodad: Card[];
  };
  discardPiles: {
    opportunity: Card[];
    market: Card[];
    doodad: Card[];
  };
  currentCard: Card | null;
  marketMultiplier: Record<AssetType, number>; // 当前市场乘数
  interestRate: number;
  winner: Player | null;
  logs: LogEntry[];
}

export interface LogEntry {
  id: string;
  timestamp: number;
  playerId: string;
  message: string;
  type: 'move' | 'income' | 'expense' | 'asset' | 'liability' | 'market' | 'system' | 'win';
}
```

### 3.2 状态不可变性原则

所有 reducer 中的状态更新必须遵循不可变数据原则。复杂对象的更新使用浅拷贝或 immer（如后续引入）。

---

## 四、职业系统

### 4.1 职业设计原则

- 高收入职业往往伴随着高支出，跳出老鼠赛跑所需的投资额也更高
- 低收入职业起点低，但目标门槛低，适合新手体验"质变"
- 每个职业都有明确的教育意义：比如医生现金流高但支出也高，教师现金流低但容易突破

### 4.2 职业列表

| 职业 | 工资 | 月支出 | 月现金流 | 初始现金 | 总负债 |
|------|------|--------|----------|----------|--------|
| 工程师 | ¥7,500 | ¥5,200 | ¥2,300 | ¥1,000 | ¥47,000 |
| 教师 | ¥3,500 | ¥2,100 | ¥1,400 | ¥550 | ¥18,000 |
| 医生 | ¥13,000 | ¥9,700 | ¥3,300 | ¥1,500 | ¥94,000 |
| 司机 | ¥2,500 | ¥1,600 | ¥900 | ¥400 | ¥12,000 |
| 秘书 | ¥2,800 | ¥1,800 | ¥1,000 | ¥500 | ¥14,500 |
| 保安 | ¥2,000 | ¥1,300 | ¥700 | ¥350 | ¥10,000 |
| 律师 | ¥10,000 | ¥7,600 | ¥2,400 | ¥1,200 | ¥72,000 |
| 飞行员 | ¥6,000 | ¥4,100 | ¥1,900 | ¥800 | ¥36,000 |

### 4.3 职业详细财务报表

```typescript
// src/data/professions.ts
export interface Profession {
  id: string;
  name: string;
  salary: number;
  cash: number;
  expenses: ExpenseBreakdown;
  liabilities: Omit<Liability, 'id'>[];
  description: string;
}

export const PROFESSIONS: Profession[] = [
  {
    id: 'engineer',
    name: '工程师',
    salary: 7500,
    cash: 1000,
    expenses: {
      tax: 1500,
      mortgage: 2000,
      studentLoan: 0,
      carLoan: 400,
      creditCard: 300,
      other: 1000,
      perChild: 300,
    },
    liabilities: [
      { name: '房屋贷款', principal: 40000, monthlyPayment: 2000, interestRate: 0.06 },
      { name: '汽车贷款', principal: 5000, monthlyPayment: 400, interestRate: 0.07 },
      { name: '信用卡欠款', principal: 2000, monthlyPayment: 300, interestRate: 0.18 },
    ],
    description: '收入稳定，支出适中，是新手入门的理想职业。',
  },
  {
    id: 'teacher',
    name: '教师',
    salary: 3500,
    cash: 550,
    expenses: {
      tax: 800,
      mortgage: 1000,
      studentLoan: 0,
      carLoan: 0,
      creditCard: 100,
      other: 200,
      perChild: 150,
    },
    liabilities: [
      { name: '房屋贷款', principal: 15000, monthlyPayment: 1000, interestRate: 0.06 },
      { name: '信用卡欠款', principal: 500, monthlyPayment: 100, interestRate: 0.18 },
    ],
    description: '收入较低但支出也低，容易实现财务自由。',
  },
  {
    id: 'doctor',
    name: '医生',
    salary: 13000,
    cash: 1500,
    expenses: {
      tax: 3000,
      mortgage: 5000,
      studentLoan: 800,
      carLoan: 800,
      creditCard: 500,
      other: 1600,
      perChild: 600,
    },
    liabilities: [
      { name: '房屋贷款', principal: 75000, monthlyPayment: 5000, interestRate: 0.06 },
      { name: '助学贷款', principal: 12000, monthlyPayment: 800, interestRate: 0.05 },
      { name: '汽车贷款', principal: 15000, monthlyPayment: 800, interestRate: 0.07 },
      { name: '信用卡欠款', principal: 5000, monthlyPayment: 500, interestRate: 0.18 },
    ],
    description: '高收入高支出，虽然现金流充裕，但要突破需要更大规模的资产。',
  },
  {
    id: 'driver',
    name: '司机',
    salary: 2500,
    cash: 400,
    expenses: {
      tax: 500,
      mortgage: 600,
      studentLoan: 0,
      carLoan: 300,
      creditCard: 100,
      other: 100,
      perChild: 100,
    },
    liabilities: [
      { name: '房屋贷款', principal: 9000, monthlyPayment: 600, interestRate: 0.06 },
      { name: '汽车贷款', principal: 3000, monthlyPayment: 300, interestRate: 0.07 },
      { name: '信用卡欠款', principal: 500, monthlyPayment: 100, interestRate: 0.18 },
    ],
    description: '起点最低，但压力也最小，每一笔小生意都可能改变命运。',
  },
  {
    id: 'secretary',
    name: '秘书',
    salary: 2800,
    cash: 500,
    expenses: {
      tax: 600,
      mortgage: 700,
      studentLoan: 0,
      carLoan: 300,
      creditCard: 100,
      other: 100,
      perChild: 120,
    },
    liabilities: [
      { name: '房屋贷款', principal: 10000, monthlyPayment: 700, interestRate: 0.06 },
      { name: '汽车贷款', principal: 3000, monthlyPayment: 300, interestRate: 0.07 },
      { name: '信用卡欠款', principal: 500, monthlyPayment: 100, interestRate: 0.18 },
    ],
    description: '收支平衡，需要通过精明的小投资来逐步突破。',
  },
  {
    id: 'security',
    name: '保安',
    salary: 2000,
    cash: 350,
    expenses: {
      tax: 400,
      mortgage: 500,
      studentLoan: 0,
      carLoan: 200,
      creditCard: 50,
      other: 150,
      perChild: 80,
    },
    liabilities: [
      { name: '房屋贷款', principal: 7000, monthlyPayment: 500, interestRate: 0.06 },
      { name: '汽车贷款', principal: 2000, monthlyPayment: 200, interestRate: 0.07 },
      { name: '信用卡欠款', principal: 300, monthlyPayment: 50, interestRate: 0.18 },
    ],
    description: '现金流微薄，每一次额外支出都可能是致命的。',
  },
  {
    id: 'lawyer',
    name: '律师',
    salary: 10000,
    cash: 1200,
    expenses: {
      tax: 2500,
      mortgage: 3000,
      studentLoan: 500,
      carLoan: 600,
      creditCard: 400,
      other: 1000,
      perChild: 450,
    },
    liabilities: [
      { name: '房屋贷款', principal: 55000, monthlyPayment: 3000, interestRate: 0.06 },
      { name: '助学贷款', principal: 10000, monthlyPayment: 500, interestRate: 0.05 },
      { name: '汽车贷款', principal: 10000, monthlyPayment: 600, interestRate: 0.07 },
      { name: '信用卡欠款', principal: 4000, monthlyPayment: 400, interestRate: 0.18 },
    ],
    description: '高收入群体，但高支出也使其财务自由门槛较高。',
  },
  {
    id: 'pilot',
    name: '飞行员',
    salary: 6000,
    cash: 800,
    expenses: {
      tax: 1500,
      mortgage: 1500,
      studentLoan: 0,
      carLoan: 500,
      creditCard: 300,
      other: 300,
      perChild: 250,
    },
    liabilities: [
      { name: '房屋贷款', principal: 30000, monthlyPayment: 1500, interestRate: 0.06 },
      { name: '汽车贷款', principal: 7000, monthlyPayment: 500, interestRate: 0.07 },
      { name: '信用卡欠款', principal: 2000, monthlyPayment: 300, interestRate: 0.18 },
    ],
    description: '收入不错，支出可控，是比较均衡的职业。',
  },
];
```

### 4.4 职业选择建议文案

| 职业 | 适合玩家 |
|------|----------|
| 教师 / 司机 / 保安 | 新手，希望快速体验财务自由 |
| 工程师 / 飞行员 | 中级玩家，追求平衡体验 |
| 医生 / 律师 | 高级玩家，喜欢挑战高支出职业 |

---

## 五、棋盘设计

### 5.1 棋盘结构

棋盘为方形循环路径，共 **24 格**（7×7 网格的外圈）。每格代表一个月中的一天，经过起点时视为完成一个月的循环，触发"发工资"。

### 5.2 格子类型与数量

| 格子类型 | 数量 | 标识色 | 说明 |
|----------|------|--------|------|
| **Payday** 发工资 | 4 | 绿色 | 经过时获得月工资 = 工资 + 月现金流 |
| **Opportunity** 机会 | 6 | 蓝色 | 抽取机会卡（小生意或大买卖） |
| **Market** 市场 | 4 | 黄色 | 抽取市场卡，影响所有玩家或当前玩家 |
| **Doodad** 额外支出 | 4 | 红色 | 意外消费，直接减少现金或增加支出 |
| **Charity** 慈善 | 1 | 紫色 | 可选择捐款，获得未来掷双骰子权利 |
| **Baby** 生孩子 | 1 | 粉色 | 增加一个孩子，每月支出增加 |
| **Settlement** 结算 | 4 | 灰色 | 交税或银行结算，通常直接扣税 |

合计：4 + 6 + 4 + 4 + 1 + 1 + 4 = **24 格**

### 5.3 24 格平面顺序

| 格号 | 类型 | 名称 |
|------|------|------|
| 1 | Payday | 发工资日 |
| 2 | Opportunity | 小生意机会 |
| 3 | Doodad | 额外支出 |
| 4 | Market | 市场波动 |
| 5 | Payday | 发工资日 |
| 6 | Opportunity | 大买卖机会 |
| 7 | Doodad | 额外支出 |
| 8 | Charity | 慈善捐款 |
| 9 | Settlement | 税务结算 |
| 10 | Opportunity | 小生意机会 |
| 11 | Doodad | 额外支出 |
| 12 | Payday | 发工资日 |
| 13 | Market | 市场波动 |
| 14 | Opportunity | 大买卖机会 |
| 15 | Baby | 生孩子 |
| 16 | Settlement | 税务结算 |
| 17 | Doodad | 额外支出 |
| 18 | Market | 市场波动 |
| 19 | Payday | 发工资日 |
| 20 | Opportunity | 小生意机会 |
| 21 | Settlement | 税务结算 |
| 22 | Market | 市场波动 |
| 23 | Opportunity | 大买卖机会 |
| 24 | Settlement | 年度结算 |

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
  { id: 0, type: 'payday', name: '发工资日', description: '领取本月工资与现金流。' },
  { id: 1, type: 'opportunity', name: '小生意机会', description: '抽取一张机会卡。' },
  { id: 2, type: 'doodad', name: '额外支出', description: '生活总有意外开销。' },
  { id: 3, type: 'market', name: '市场波动', description: '市场发生变化。' },
  { id: 4, type: 'payday', name: '发工资日', description: '领取本月工资与现金流。' },
  { id: 5, type: 'opportunity', name: '大买卖机会', description: '抽取一张机会卡。' },
  { id: 6, type: 'doodad', name: '额外支出', description: '生活总有意外开销。' },
  { id: 7, type: 'charity', name: '慈善捐款', description: '捐款可换取未来掷双骰子的机会。' },
  { id: 8, type: 'settlement', name: '税务结算', description: '缴纳本月税款。' },
  { id: 9, type: 'opportunity', name: '小生意机会', description: '抽取一张机会卡。' },
  { id: 10, type: 'doodad', name: '额外支出', description: '生活总有意外开销。' },
  { id: 11, type: 'payday', name: '发工资日', description: '领取本月工资与现金流。' },
  { id: 12, type: 'market', name: '市场波动', description: '市场发生变化。' },
  { id: 13, type: 'opportunity', name: '大买卖机会', description: '抽取一张机会卡。' },
  { id: 14, type: 'baby', name: '生孩子', description: '家里添丁，支出增加。' },
  { id: 15, type: 'settlement', name: '税务结算', description: '缴纳本月税款。' },
  { id: 16, type: 'doodad', name: '额外支出', description: '生活总有意外开销。' },
  { id: 17, type: 'market', name: '市场波动', description: '市场发生变化。' },
  { id: 18, type: 'payday', name: '发工资日', description: '领取本月工资与现金流。' },
  { id: 19, type: 'opportunity', name: '小生意机会', description: '抽取一张机会卡。' },
  { id: 20, type: 'settlement', name: '税务结算', description: '缴纳本月税款。' },
  { id: 21, type: 'market', name: '市场波动', description: '市场发生变化。' },
  { id: 22, type: 'opportunity', name: '大买卖机会', description: '抽取一张机会卡。' },
  { id: 23, type: 'settlement', name: '年度结算', description: '年度财务结算。' },
];
```

### 5.6 特殊格子处理

#### 5.6.1 Payday（发工资）

触发时机：
- 玩家移动到 Payday 格
- 玩家经过起点（格 0）时

获得金额：
```
月现金流 = 工资 + 被动收入 - 总支出
发工资获得 = 月现金流
```

如果现金流为负，则现金减少，可能触发破产检查。

#### 5.6.2 Settlement（结算）

玩家停留时缴纳当月税款。税款已在 `expenses.tax` 中定义，缴纳时从现金中扣除，不产生额外支出（仅在 Payday 之外再次扣税一次，象征税务检查）。

#### 5.6.3 Baby（生孩子）

玩家停留时增加 1 个孩子。每月支出增加 `expenses.perChild` 金额。 children 上限为 3 个。

#### 5.6.4 Charity（慈善）

玩家选择是否捐款月收入的 10%。如果捐款，获得 3 回合的"双骰子"权利（每次掷两个骰子，任选其一）。

---

## 六、卡片系统

### 6.1 卡片设计原则

- 小生意卡：首付低（¥100 - ¥10,000），现金流小，适合早期积累
- 大买卖卡：首付高（¥20,000+），现金流大，适合后期质变
- 市场卡：制造买卖时机，让资产可以高价卖出或低价买入
- 额外支出卡：制造现金压力，防止玩家无脑投资

### 6.2 机会卡数据结构

```typescript
// src/data/opportunityCards.ts
export const OPPORTUNITY_CARDS: OpportunityCard[] = [
  // 小生意
  {
    id: 'stock_myt4u',
    title: 'MYT4U 股票',
    description: '一家科技公司的股票，每股 ¥10。',
    type: 'opportunity',
    kind: 'smallDeal',
    asset: {
      id: 'stock_myt4u_1',
      name: 'MYT4U 股票',
      type: 'stock',
      cost: 10,
      downPayment: 10,
      cashFlow: 0,
      mortgage: 0,
      marketValue: 10,
      shares: 1,
    },
  },
  {
    id: 'apt_small_1',
    title: '小型公寓',
    description: '一套可以出租的小型公寓。',
    type: 'opportunity',
    kind: 'smallDeal',
    asset: {
      id: 'apt_small_1',
      name: '小型公寓',
      type: 'realEstate',
      cost: 45000,
      downPayment: 5000,
      cashFlow: 400,
      mortgage: 40000,
      marketValue: 45000,
    },
  },
  {
    id: 'land_invest',
    title: '城市边缘土地',
    description: '一块等待开发的土地，当前无现金流，但升值潜力大。',
    type: 'opportunity',
    kind: 'smallDeal',
    asset: {
      id: 'land_invest',
      name: '城市边缘土地',
      type: 'realEstate',
      cost: 18000,
      downPayment: 3000,
      cashFlow: 0,
      mortgage: 15000,
      marketValue: 18000,
    },
  },
  {
    id: 'shop_secondhand',
    title: '二手商铺',
    description: '一家位置不错的二手商铺，租金稳定。',
    type: 'opportunity',
    kind: 'smallDeal',
    asset: {
      id: 'shop_secondhand',
      name: '二手商铺',
      type: 'realEstate',
      cost: 60000,
      downPayment: 8000,
      cashFlow: 600,
      mortgage: 52000,
      marketValue: 60000,
    },
  },
  {
    id: 'royalty_book',
    title: '畅销书版权',
    description: '购买一本潜力畅销书的版权，持续获得版税。',
    type: 'opportunity',
    kind: 'smallDeal',
    asset: {
      id: 'royalty_book',
      name: '畅销书版权',
      type: 'intellectual',
      cost: 10000,
      downPayment: 2000,
      cashFlow: 150,
      mortgage: 8000,
      marketValue: 10000,
    },
  },
  {
    id: 'franchise_small',
    title: '小型连锁加盟',
    description: '加盟一家知名小吃品牌。',
    type: 'opportunity',
    kind: 'smallDeal',
    asset: {
      id: 'franchise_small',
      name: '小型连锁加盟',
      type: 'business',
      cost: 30000,
      downPayment: 7000,
      cashFlow: 500,
      mortgage: 23000,
      marketValue: 30000,
    },
  },
  // 大买卖
  {
    id: 'apt_building_8',
    title: '8 套公寓楼',
    description: '一栋拥有 8 套公寓的住宅楼，现金流可观。',
    type: 'opportunity',
    kind: 'bigDeal',
    asset: {
      id: 'apt_building_8',
      name: '8 套公寓楼',
      type: 'realEstate',
      cost: 200000,
      downPayment: 40000,
      cashFlow: 3600,
      mortgage: 160000,
      marketValue: 200000,
    },
  },
  {
    id: 'mall_shopping',
    title: '社区购物中心',
    description: '一个稳定的社区购物中心。',
    type: 'opportunity',
    kind: 'bigDeal',
    asset: {
      id: 'mall_shopping',
      name: '社区购物中心',
      type: 'realEstate',
      cost: 400000,
      downPayment: 65000,
      cashFlow: 8000,
      mortgage: 335000,
      marketValue: 400000,
    },
  },
  {
    id: 'car_wash_auto',
    title: '自动化洗车房',
    description: '一家全自动运营的洗车房。',
    type: 'opportunity',
    kind: 'bigDeal',
    asset: {
      id: 'car_wash_auto',
      name: '自动化洗车房',
      type: 'business',
      cost: 150000,
      downPayment: 50000,
      cashFlow: 5000,
      mortgage: 100000,
      marketValue: 150000,
    },
  },
  {
    id: 'hotel_chain',
    title: '连锁酒店加盟',
    description: '加盟一家知名连锁酒店，收益高但需大资金。',
    type: 'opportunity',
    kind: 'bigDeal',
    asset: {
      id: 'hotel_chain',
      name: '连锁酒店加盟',
      type: 'business',
      cost: 500000,
      downPayment: 80000,
      cashFlow: 10000,
      mortgage: 420000,
      marketValue: 500000,
    },
  },
  {
    id: 'vc_fund',
    title: '初创企业风投',
    description: '投资一支初创企业基金，风险较高但回报可观。',
    type: 'opportunity',
    kind: 'bigDeal',
    asset: {
      id: 'vc_fund',
      name: '初创企业风投',
      type: 'business',
      cost: 100000,
      downPayment: 30000,
      cashFlow: 1500,
      mortgage: 70000,
      marketValue: 100000,
    },
  },
];
```

### 6.3 市场卡数据结构

```typescript
// src/data/marketCards.ts
export const MARKET_CARDS: MarketCard[] = [
  {
    id: 'market_boom',
    title: '经济繁荣',
    description: '房地产市场火热，所有房产增值 50%，买家求购。',
    type: 'market',
    effect: { type: 'assetAppreciation', targetAssetType: 'realEstate', multiplier: 1.5 },
  },
  {
    id: 'market_rate_cut',
    title: '央行降息',
    description: '贷款利率下调，所有月供减少 20%（持续 3 回合）。',
    type: 'market',
    effect: { type: 'interestRate', rateChange: -0.02 },
  },
  {
    id: 'market_recession',
    title: '经济衰退',
    description: '资产贬值 30%，现金流减少 20%。',
    type: 'market',
    effect: { type: 'assetDepreciation', multiplier: 0.7 },
  },
  {
    id: 'market_tech_boom',
    title: '科技行业利好',
    description: '科技股翻倍，手中股票价值 ×2。',
    type: 'market',
    effect: { type: 'sectorBoom', sector: 'stock', multiplier: 2 },
  },
  {
    id: 'market_buyout',
    title: '资产收购要约',
    description: '有买家以 2 倍价格收购你的房产类资产。',
    type: 'market',
    effect: { type: 'buyout', targetAssetType: 'realEstate', multiplier: 2 },
  },
  {
    id: 'market_buyers_market',
    title: '买方市场',
    description: '房东急于出售，房产首付降至 5 折。',
    type: 'market',
    effect: { type: 'discount', targetAssetType: 'realEstate', discountRate: 0.5 },
  },
];
```

### 6.4 额外支出卡数据结构

```typescript
// src/data/doodadCards.ts
export const DOODAD_CARDS: DoodadCard[] = [
  {
    id: 'doodad_tv',
    title: '买新电视',
    description: '你冲动消费买了一台大屏幕电视。',
    type: 'doodad',
    cost: 1000,
    isRecurring: false,
  },
  {
    id: 'doodad_vacation',
    title: '海边度假',
    description: '全家去海边度了个短假。',
    type: 'doodad',
    cost: 2500,
    isRecurring: false,
  },
  {
    id: 'doodad_dinner',
    title: '请客吃饭',
    description: '请朋友吃了一顿大餐。',
    type: 'doodad',
    cost: 400,
    isRecurring: false,
  },
  {
    id: 'doodad_phone',
    title: '换新手机',
    description: '最新款手机上市，你忍不住剁手。',
    type: 'doodad',
    cost: 1500,
    isRecurring: false,
  },
  {
    id: 'doodad_pet',
    title: '宠物医疗',
    description: '宠物生病，支付了医疗费用。',
    type: 'doodad',
    cost: 2000,
    isRecurring: false,
  },
  {
    id: 'doodad_gym',
    title: '健身房会员',
    description: '你办了健身年卡，每月多一笔支出。',
    type: 'doodad',
    cost: 600,
    isRecurring: true,
    monthlyCost: 100,
  },
  {
    id: 'doodad_course',
    title: '付费课程',
    description: '报名了一个在线提升课程。',
    type: 'doodad',
    cost: 800,
    isRecurring: false,
  },
  {
    id: 'doodad_car_repair',
    title: '汽车维修',
    description: '车坏了，维修费用不菲。',
    type: 'doodad',
    cost: 3000,
    isRecurring: false,
  },
];
```

### 6.5 卡组管理

- 游戏开始时，将每种卡片分别洗牌
- 抽卡后放到底部，直到整副牌抽完后再重新洗牌
- 市场卡抽到后立即执行，部分效果需要玩家确认
- 机会卡抽到后玩家可以选择是否投资
- 额外支出卡抽到后必须支付（现金不足则贷款，否则破产）

---

## 七、财务系统

### 7.1 财务报表计算

```typescript
// src/utils/financial.ts

export function getPassiveIncome(player: Player): number {
  return player.assets.reduce((sum, asset) => sum + asset.cashFlow, 0);
}

export function getTotalExpenses(player: Player): number {
  const base = player.expenses.tax +
    player.expenses.mortgage +
    player.expenses.studentLoan +
    player.expenses.carLoan +
    player.expenses.creditCard +
    player.expenses.other;
  const childExpenses = player.children * player.expenses.perChild;
  return base + childExpenses;
}

export function getMonthlyCashFlow(player: Player): number {
  return player.salary + getPassiveIncome(player) - getTotalExpenses(player);
}

export function getNetWorth(player: Player): number {
  const assetsValue = player.assets.reduce((sum, a) => sum + a.marketValue, 0) + player.cash;
  const liabilitiesValue = player.liabilities.reduce((sum, l) => sum + l.principal, 0);
  return assetsValue - liabilitiesValue;
}

export function canAffordDownPayment(player: Player, asset: Asset): boolean {
  return player.cash >= asset.downPayment;
}

export function checkBankruptcy(player: Player): boolean {
  return player.cash < 0 && getMonthlyCashFlow(player) <= 0;
}
```

### 7.2 资产购买流程

```
1. 玩家抽到机会卡，显示资产信息
2. 如果现金 >= 首付，可以选择购买
3. 购买后：
   - 现金 -= 首付
   - 资产加入 assets 列表
   - 如果资产 mortgage > 0，增加一笔负债（月供 = mortgage × 月利率）
4. 如果现金不足，可以选择向银行贷款（额度见 7.4）
5. 玩家也可以选择放弃该机会
```

### 7.3 资产卖出流程

```
1. 市场卡触发卖出机会，或玩家主动选择卖出
2. 卖出价格 = asset.marketValue × marketMultiplier
3. 卖出后：
   - 现金 += 卖出价格 - 剩余贷款（如有）
   - 从 assets 中移除该资产
   - 如有对应 mortgage 的负债，一并清除
4. 如果市场卡要求强制卖出，玩家可选择卖出哪一项
```

### 7.4 银行贷款机制

| 项目 | 规则 |
|------|------|
| 贷款额度 | 月现金流 × 10（最低 ¥5,000） |
| 利率 | 月利率 1%（年利率 12%） |
| 还款方式 | 每月自动从现金流中扣利息，玩家可随时还款本金 |
| 贷款用途 | 投资首付、支付额外支出、度过现金危机 |
| 上限 | 当前贷款余额不得超过月现金流 × 10 |

贷款数据结构：
```typescript
export interface BankLoan {
  principal: number;
  monthlyInterest: number;
}
```

### 7.5 破产处理

当玩家现金为负且月现金流 ≤ 0 时，判定为破产：

1. 系统强制卖出可流动资产（股票优先，其次房产）
2. 如果卖出后仍无法弥补赤字，玩家宣布破产
3. 破产玩家退出游戏，其余玩家继续

### 7.6 财务自由判定

```typescript
export function checkFinancialFreedom(player: Player): boolean {
  return getPassiveIncome(player) > getTotalExpenses(player);
}
```

一旦满足条件，玩家在 Payday 后跳出老鼠赛跑，进入快车道。

---

## 八、游戏流程与状态机

### 8.1 游戏主循环

```
SETUP
  ↓ 玩家选择职业和 AI 配置
ROLLING
  ↓ 掷骰子
MOVING
  ↓ 移动棋子
EVENT_RESOLVING
  ↓ 根据格子类型触发事件
CARD_DECISION / TURN_END
  ↓ 玩家做出决策或结束回合
检查财务自由 → 进入 FAST_TRACK
  ↓ 快车道回合
检查胜利条件 → GAME_OVER
```

### 8.2 回合详细流程

```
每个玩家回合：
1. 确认当前玩家未破产
2. 如果是人类玩家，等待点击"掷骰子"
   - 如果有 charityTurns > 0，掷两个骰子，玩家选择其一
   - 否则掷一个骰子
3. 移动棋子（播放移动动画）
4. 触发目标格子事件：
   - Payday: 现金 += 月现金流
   - Opportunity: 抽机会卡，玩家决策
   - Market: 抽市场卡，执行效果
   - Doodad: 抽额外支出卡，扣现金
   - Charity: 选择是否捐款
   - Baby: 增加 1 个孩子
   - Settlement: 扣税一次
5. 检查现金是否足够支付，不足则尝试贷款或破产
6. 检查是否满足财务自由条件
   - 是 → 进入快车道，本回合结束
7. 玩家点击"结束回合"，轮到下一位玩家
8. 如果当前玩家是 AI，自动执行决策
```

### 8.3 老鼠赛跑 → 快车道切换

切换条件：
- 月被动收入 > 月总支出

切换时：
1. 清除所有老鼠赛跑负债（房贷、学贷、车贷等）
2. 保留资产，但只保留其市场价值作为初始快车道现金
3. 快车道现金 = 老鼠赛跑资产总值 + 现金
4. 快车道收入 = 快车道资产带来的现金流
5. 快车道支出 = 梦想目标对应的月维护成本（简化）

### 8.4 快车道流程

```
1. 掷两个骰子，移动棋子
2. 落到梦想格时，可以购买梦想
3. 如果现金 >= 梦想成本，购买即获胜
4. 落到资产格时，可获得高额被动收入
5. 落到风险格时，可能损失现金
```

### 8.5 胜利条件

| 模式 | 胜利条件 |
|------|----------|
| 老鼠赛跑阶段 | 被动收入 > 总支出 → 进入快车道 |
| 快车道阶段 | 购买梦想格 / 现金达到 ¥500,000 |
| 多人模式 | 第一个完成梦想或达到目标的玩家 |

---

## 九、AI 系统设计

### 9.1 AI 难度分级

| 难度 | 行为特征 |
|------|----------|
| **简单** | 随机决策， mostly 放弃投资机会，偶尔购买现金流最高的资产 |
| **中等** | 优先购买首付可负担、现金流为正的机会；会选择性贷款投资；不购买无现金流资产 |
| **困难** | 计算 ROI，优先购买现金流/首付比最高的资产；主动管理负债；在买方市场时大胆贷款；会卖出资产获利 |

### 9.2 AI 决策核心算法

```typescript
// src/hooks/useAIPlayer.ts 中的决策函数

function shouldBuyOpportunity(player: Player, card: OpportunityCard): boolean {
  const asset = card.asset;
  const roi = asset.cashFlow / asset.downPayment;

  // 困难 AI：ROI > 0.05 就买
  if (player.difficulty === 'hard') {
    return roi > 0.05 && canAffordDownPayment(player, asset) || canTakeLoan(player, asset.downPayment - player.cash);
  }

  // 中等 AI：现金流为正且负担得起
  if (player.difficulty === 'medium') {
    return asset.cashFlow > 0 && canAffordDownPayment(player, asset);
  }

  // 简单 AI：随机
  return Math.random() > 0.7;
}

function shouldTakeLoan(player: Player, amount: number): boolean {
  const currentDebt = player.liabilities.reduce((s, l) => s + l.principal, 0);
  const maxDebt = Math.max(getMonthlyCashFlow(player), 0) * 10;
  return amount <= maxDebt - currentDebt && player.difficulty !== 'easy';
}
```

### 9.3 AI 在快车道的行为

- 优先选择离自己最近的梦想格
- 计算掷两个骰子到达梦想的概率
- 只有在现金接近梦想成本时才会购买梦想
- 继续积累快车道资产以缩短目标距离

---

## 十、UI 与交互设计

### 10.1 设计规范

| 项目 | 规范 |
|------|------|
| 主题色 | 深绿（财富）、金色（胜利）、深蓝（棋盘） |
| 字体 | 中文：系统默认无衬线；英文：Inter / Roboto |
| 间距 | 8px 网格基准 |
| 圆角 | 卡片 12px，按钮 8px，棋子 50% |
| 动画 | 移动 0.5s ease，弹窗 0.3s ease-out |

### 10.2 整体布局

```
┌──────────────────────────────────────────────────────────────────┐
│  CashFlow — 富爸爸现金流游戏                              [菜单]  │
├────────────────────────────────┬─────────────────────────────────┤
│                                │                                 │
│      棋盘区域 (7×7)            │        玩家信息面板            │
│    ┌────┬────┬────┬───┬───┬───┐│  ┌──────────────────────────┐  │
│    │ 24 │ 23 │ 22 │...│...│ 18││  │ 玩家：工程师              │  │
│    ├────┼────┼────┼───┼───┼───┤│  │ 现金：¥1,000              │  │
│    │ 01 │    │    │   │   │ 17││  │ 月收入：¥7,500            │  │
│    │ ...│ 内 │ 圈 │   │   │...││  │ 被动收入：¥0              │  │
│    │ 06 │ 07 │ 08 │ 09│ 10│ 11││  │ 月支出：¥5,200            │  │
│    └────┴────┴────┴───┴───┴───┘│  │ 月现金流：¥2,300          │  │
│                                │  │ 资产：0 | 负债：3          │  │
│    [图例：格子类型颜色说明]      │  │ 孩子：0                    │  │
│                                │  └──────────────────────────┘  │
├────────────────────────────────┴─────────────────────────────────┤
│                                                                  │
│              操作区 / 卡片展示区                                  │
│    ┌────────────────────────────────────────────────────────┐   │
│    │  [卡片标题]                                              │   │
│    │  [卡片描述]                                              │   │
│    │  [资产信息]                                              │   │
│    │  [买入] [放弃] [贷款买入]                                │   │
│    └────────────────────────────────────────────────────────┘   │
│                                                                  │
│    [掷骰子] [查看详细报表] [结束回合] [保存游戏]                 │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                        日志 / 消息区                              │
│  · 工程师 掷出 4，移动到 机会格                                  │
│  · 工程师 抽到 "小型公寓"，决定购买                              │
│  · 工程师 现金减少 ¥5,000，被动收入增加 ¥400                       │
└──────────────────────────────────────────────────────────────────┘
```

### 10.3 核心页面

| 页面 | 说明 |
|------|------|
| **StartScreen** | 选择职业、玩家人数、AI 难度、开始游戏 |
| **GameScreen** | 主游戏界面，包含棋盘、面板、操作区、日志 |
| **CardModal** | 抽到卡片时的决策弹窗 |
| **FinancialStatement** | 详细财务报表弹窗/页面 |
| **WinScreen** | 胜利结算页面，展示玩家数据和用时 |

### 10.4 响应式策略

- 桌面端：左侧棋盘，右侧面板，下方操作区
- 平板端：棋盘在上，面板在下，操作区浮动
- 手机端：棋盘可缩放，面板以折叠抽屉形式呈现

---

## 十一、项目结构

```
cashflow-game/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── CASHFLOW_GAME.md          # 本设计文档
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.module.css
│   ├── index.css
│   ├── types/
│   │   ├── game.ts           # 游戏状态、枚举、类型
│   │   ├── player.ts         # 玩家相关类型
│   │   ├── board.ts          # 棋盘类型
│   │   └── cards.ts          # 卡片类型
│   ├── data/
│   │   ├── professions.ts    # 职业数据
│   │   ├── boardLayout.ts    # 棋盘布局
│   │   ├── opportunityCards.ts
│   │   ├── marketCards.ts
│   │   └── doodadCards.ts
│   ├── context/
│   │   ├── GameContext.tsx   # Context Provider
│   │   └── GameReducer.ts    # 纯函数 reducer
│   ├── components/
│   │   ├── StartScreen/
│   │   │   ├── StartScreen.tsx
│   │   │   └── StartScreen.module.css
│   │   ├── GameScreen/
│   │   │   ├── GameScreen.tsx
│   │   │   └── GameScreen.module.css
│   │   ├── Board/
│   │   │   ├── Board.tsx
│   │   │   ├── Space.tsx
│   │   │   └── Board.module.css
│   │   ├── PlayerPanel/
│   │   │   ├── PlayerPanel.tsx
│   │   │   └── PlayerPanel.module.css
│   │   ├── FinancialStatement/
│   │   │   ├── FinancialStatement.tsx
│   │   │   └── FinancialStatement.module.css
│   │   ├── CardModal/
│   │   │   ├── CardModal.tsx
│   │   │   └── CardModal.module.css
│   │   ├── ActionBar/
│   │   │   ├── ActionBar.tsx
│   │   │   └── ActionBar.module.css
│   │   ├── LogPanel/
│   │   │   ├── LogPanel.tsx
│   │   │   └── LogPanel.module.css
│   │   └── WinScreen/
│   │       ├── WinScreen.tsx
│   │       └── WinScreen.module.css
│   ├── hooks/
│   │   ├── useGameActions.ts # 封装 dispatch 动作
│   │   ├── useDice.ts
│   │   ├── useAIPlayer.ts
│   │   └── useBankruptcy.ts
│   └── utils/
│       ├── financial.ts      # 财务计算
│       ├── random.ts         # 洗牌、抽卡
│       ├── storage.ts        # localStorage
│       └── format.ts         # 货币格式化
└── tests/                    # 可选：单元测试
    └── utils.financial.test.ts
```

### 11.1 依赖清单

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.3.0"
  }
}
```

---

## 十二、开发路线图

| 阶段 | 内容 | 里程碑 | 预估工时 |
|------|------|--------|----------|
| **Phase 1** | 初始化 Vite + React 项目；配置 TypeScript；搭建基础目录 | 项目可运行 | 0.5 天 |
| **Phase 2** | 实现类型定义、数据文件、棋盘渲染 | 棋盘可见 | 1 天 |
| **Phase 3** | 玩家移动、骰子系统、格子事件触发 | 基础回合可运行 | 1 天 |
| **Phase 4** | 卡片系统（抽卡、决策、购买、放弃） | 可进行投资 | 2 天 |
| **Phase 5** | 财务报表系统、资产/负债计算、银行贷款 | 财务循环完整 | 2 天 |
| **Phase 6** | 财务自由判定、快车道、胜利条件 | 游戏可通关 | 1.5 天 |
| **Phase 7** | AI 玩家逻辑（简单/中等/困难） | 单人可玩 | 2 天 |
| **Phase 8** | UI 美化、动画、音效、游戏平衡 | Alpha 版 | 2 天 |
| **Phase 9** | 存档系统、多语言、响应式适配 | Beta 版 | 2 天 |

合计约 **14 天** 完成可玩的 Beta 版本。

---

## 十三、游戏平衡与参数表

### 13.1 核心参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| 月贷款利率 | 1% | 银行贷款月利率 |
| 贷款额度倍数 | 10 × 月现金流 | 最大贷款余额 |
| 慈善捐款比例 | 10% | 捐款额 = 月收入 × 10% |
| 慈善双骰子回合 | 3 | 捐款后享受的双骰子回合数 |
| 孩子数量上限 | 3 | 每位玩家最多孩子数 |
| 快车道目标现金 | ¥500,000 | 达到该金额也可获胜 |
| 游戏最大回合 | 200 | 防止无限循环 |

### 13.2 卡牌数量配置

| 卡组 | 初始数量 | 建议最小 |
|------|----------|----------|
| 机会卡 | 11 张（6 小 + 5 大） | 10 张 |
| 市场卡 | 6 张 | 6 张 |
| 额外支出卡 | 8 张 | 8 张 |

### 13.3 平衡性设计目标

| 目标 | 实现方式 |
|------|----------|
| 前期拮据 | 初始现金低，额外支出卡频繁出现 |
| 投资回报感 | 小生意 3-5 回合回本，大买卖 6-10 回合回本 |
| 质变时刻 | 当被动收入超过支出时，玩家明显感到"解脱" |
| 随机性 | 骰子和市场卡制造不确定性 |
| 策略性 | 贷款、卖出时机、资产配置选择 |
| 游戏时长 | 单人游戏 30-60 分钟，多人游戏 45-90 分钟 |

### 13.4 常见测试场景

| 场景 | 验证点 |
|------|--------|
| 工程师买小公寓 | 现金减少、资产增加、现金流增加 |
| 市场繁荣后卖出房产 | 卖出价格正确、负债清除 |
| 医生玩家 | 高收入高支出，突破门槛高 |
| 司机玩家 | 低起点但目标门槛低 |
| 破产边缘 | 贷款不足时正确处理破产 |
| 财务自由 | 被动收入 > 支出时正确进入快车道 |

---

## 十四、扩展方向

### 14.1 短期扩展

- 音效与背景音乐
- 棋子动画和移动轨迹
- 本地自动存档与手动存档
- 悔棋功能（仅人类玩家）
- 游戏数据统计（胜率、平均回合数）

### 14.2 中期扩展

- 多语言（中文简体、中文繁体、英文）
- 自定义职业编辑器
- 自定义卡牌编辑器
- 成就系统与徽章
- 排行榜（本地）

### 14.3 长期扩展

- 网络多人对战（WebSocket 后端）
- 移动端 App（React Native / PWA）
- AI 对局回放与分析
- 赛季制与卡牌平衡更新
- 在线匹配与好友对战

---

## 十五、附录：快速参考

### 15.1 关键公式

```
月现金流 = 工资 + 被动收入 - 总支出
被动收入 = Σ(所有资产现金流)
总支出 = 税 + 房贷 + 学贷 + 车贷 + 信用卡 + 其他 + 孩子数 × 每个孩子支出
财务自由 = 被动收入 > 总支出
净资产 = 现金 + 资产市值 - 负债本金
```

### 15.2 关键枚举速查

```typescript
SpaceType:  'payday' | 'opportunity' | 'market' | 'doodad' | 'charity' | 'baby' | 'settlement'
CardType:   'opportunity' | 'market' | 'doodad'
AssetType:  'stock' | 'realEstate' | 'business' | 'intellectual'
GamePhase:  'SETUP' | 'ROLLING' | 'MOVING' | 'EVENT_RESOLVING' | 'CARD_DECISION' | 'TURN_END' | 'FAST_TRACK' | 'GAME_OVER'
Difficulty: 'easy' | 'medium' | 'hard'
```

### 15.3 最小可玩版本（MVP）检查清单

- [ ] 棋盘渲染，24 格正确显示
- [ ] 1 个人类玩家 + 1 个 AI 玩家可开始游戏
- [ ] 掷骰子移动，棋子位置正确
- [ ] 4 种格子事件可触发（Payday、Opportunity、Doodad、Market）
- [ ] 可购买机会卡中的资产
- [ ] 财务报表实时更新
- [ ] 财务自由判定正确
- [ ] 进入快车道后可继续移动
- [ ] 达到胜利条件后显示胜利画面

---

*文档版本：v1.1*  
*最后更新：2026-07-03*
