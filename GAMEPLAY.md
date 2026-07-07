# CashFlow 富爸爸现金流游戏 — 玩法指南

> 基于罗伯特·清崎《富爸爸穷爸爸》改编的桌面棋盘游戏。  
> 目标：**逃离"老鼠赛跑"，进入"快车道"，实现财务自由！**

---

## 目录

- [游戏目标](#游戏目标)
- [快速开始](#快速开始)
- [回合流程](#回合流程)
- [棋盘与格子](#棋盘与格子)
- [卡牌系统](#卡牌系统)
- [经济系统](#经济系统)
- [职业系统](#职业系统)
- [婚姻与家庭](#婚姻与家庭)
- [投资与股市](#投资与股市)
- [城市系统](#城市系统)
- [快车道与胜利](#快车道与胜利)
- [破产处理](#破产处理)
- [资产完整逻辑明细](#资产完整逻辑明细)
- [全卡牌完整逻辑明细](#全卡牌完整逻辑明细)
- [资产卡牌联动校验清单](#资产卡牌联动校验清单)

---

## 游戏目标

### 核心目标
通过投资积累**被动收入**，当被动收入超过每月总支出时，你就实现了**财务自由**，可以逃离老鼠赛跑进入**快车道**。

### 胜利条件
1. **阶段一（老鼠赛跑）**：被动收入 > 月总支出
2. **阶段二（快车道）**：持有现金 ≥ **50万元**

### 失败条件
- 月现金流为负、现金为负、且无资产可变卖 → **破产**
- 所有玩家破产则游戏结束

---

## 快速开始

1. 选择你的**城市**（影响薪资、房价、生活成本）
2. 选择**角色/职业**（医生、律师、工程师、教师等 16 种）
3. 游戏开始，从起点出发
4. 每回合掷骰子前进，处理对应格子的事件
5. 努力积累被动收入，逃离老鼠赛跑！

---

## 回合流程

每回合按以下顺序执行：

### 1. 掷骰子阶段
- 掷一枚骰子（点数 1~6）
- 如果你曾在**慈善格捐款**，之后 3 回合可掷双骰子并选较大的点数前进

### 2. 移动阶段
- 按点数前进 N 格
- **年龄增长 1 个月**（12 个月 = 1 岁）
- **发工资**：计算本月现金流
- **处理月度事件**：
  - 资产月度刷新（车辆折旧、商品价格波动）
  - 失业倒计时
  - 职业转型恢复
  - 配偶失业倒计时
  - 婚姻幸福度变化
  - 孕期进度
  - 离婚判定

### 3. 事件处理阶段
- 根据停下的格子类型触发不同事件

### 4. 回合结束
- 检查是否达成财务自由（被动收入 > 总支出）
- 切换到下一位玩家

---

## 棋盘与格子

棋盘共 **24 格**，7 种格子类型：

| 格子类型 | 数量 | 说明 |
|---------|:----:|------|
| 🟦 **机会格**（小生意） | 5 | 抽取小生意/大买卖机会卡 |
| 🟦 **机会格**（大买卖） | 4 | 只出大买卖机会卡 |
| 🟥 **额外支出格** | 5 | 意外支出，需立即支付 |
| 🟨 **市场波动格** | 4 | 市场行情变化 |
| 🟧 **升迁格** | 1 | 晋升/跳槽/裁员/转型/再就业 |
| 🟪 **慈善格** | 1 | 捐款获得双骰子特权 |
| 🩷 **家庭格** | 1 | 结婚/生育决策 |
| ⬜ **结算格** | 2 | 缴房产税/年度结算 |

### 起点机制
- 每经过或停在起点（格 0）记为完成一圈
- 游戏会记录你的圈数

---

## 卡牌系统

### 机会卡（小生意 & 大买卖）

**小生意资产**（低门槛）：
- **股票**：工商银行、长江电力、贵州茅台、腾讯、阿里、宁德时代等
- **ETF/REITs**：黄金ETF、国债ETF、红利ETF、REITs
- **房产**：县城两居室、三线刚需房、二线改善房、社区底商
- **实体经营**：奶茶店、咖啡厅、社区超市、便利店
- **其他**：债券、可转债、畅销书版权、大宗商品ETF

**大买卖资产**（高门槛、高回报）：
- 中国平安、纳指100ETF、标普500ETF
- 购物中心、8套公寓楼、一线公寓
- 连锁酒店加盟、奔驰E300L等

**购买规则**：
- 股票以 **1手（100股）** 为单位买入
- 现金不足时可**贷款**补足差价（房产/实体经营类）
- 股票**不支持**贷款买入

### 市场卡
市场事件会影响你的资产价值：
- 📈 **资产增值**：特定资产升值 50%
- 📉 **资产贬值**：经济衰退，资产价值 ×0.7
- 🏢 **溢价收购**：市场溢价收购你的资产
- 💰 **利率调整**：央行加息/降息影响房贷月供
- 🔥 **行业爆发**：科技股翻倍
- 🌪️ **宏观事件**：金融危机、AI繁荣、地产政策等
- 🏢 **裁员潮**：可能导致失业
- 💹 **PE 事件**：个股业绩暴增/财务暴雷

### 额外支出卡
一次性或持续性的意外支出：
- 日常消费：新电视、度假、请客、换手机
- 家庭紧急事件（较高金额）：
  - 父母重病（5万元 + 月支出2000）
  - 房屋大修（3.5万元）
  - 配偶失业（无直接支出，但数月无配偶工资）
  - 赡养支出、红白喜事、慢性疾病、子女择校、交通事故等
- 保险购买：医疗保险、牙科保险、人寿保险、母婴保险

---

## 经济系统

### 收入结构

```
月总收入 = 有效月薪 + 被动收入
```

**有效月薪**：
- 正常：按职业月薪
- 已婚：月薪 + 伴侣工资（月薪的 15%），幸福度 ≥ 50 时总额 ×1.1
- 失业：0
- 退休：养老金收入

**被动收入** = 所有投资资产的月现金流之和

**附加收入**：
- 产假月补贴（女性，6个月）
- 0~3岁儿童月度补贴（100~300元/孩）
- 一次性生育补贴（2000~5000元）

### 支出结构

```
月总支出 = 负债月供 + 固定支出
```

**固定支出包含**：
- 税金（房产税等）
- 其他固定开销
- 子女支出（每个孩子有固定开销）
- 孕期医疗支出（如果怀孕）
- 老年医疗支出（退休后）
- 租金（租房时，有自住房则免租金）

**负债月供**：所有贷款每月需偿还的本息

### 月现金流

```
月现金流 = 有效月薪 + 被动收入 - 总支出
```

- **正现金流** → 发工资时现金增加 💰
- **负现金流** → 发工资时现金减少，弹出结算窗口 ⚠️

### 贷款系统

| 贷款类型 | 利率 | 期限 | 说明 |
|---------|:---:|:----:|------|
| 信用卡贷 | 1.5%/月 | 24期 | 高利率 |
| 消费贷 | 0.8%/月 | 36期 | 提前还款有罚金 |
| 车贷 | 0.35%/月 | 60期 | 12期后免罚金 |
| 首套房贷 | 0.25%/月 | 360期 | 利率最低 |
| 二套房贷 | 0.33%/月 | 360期 | 始终有罚金 |
| 商铺抵押贷 | 0.42%/月 | 240期 | 始终有罚金 |
| 商业贷款 | 1.0%/月 | 仅付息 | 随借随还 |

---

## 职业系统

### 16 种职业，4 个层级

| 层级 | 职业 | 月薪（一线） | 特点 |
|------|------|:----------:|------|
| 👑 **精英层** | 医生 | 22,000 | 高薪高支出 |
| | 律师 | 18,000 | 擅长资产交易 |
| | 飞行员 | 15,000 | 储蓄 +10% |
| 🎓 **专业层** | 工程师 | 12,000 | Tech Buff 薪资 +5% |
| | 会计 | 9,000 | 储蓄 +8% |
| | 设计师 | 8,500 | — |
| | 教师 | 6,500 | 支出 -8% |
| | 护士 | 7,500 | — |
| 🛠️ **服务层** | 销售 | 7,000 | 业绩 buff 薪资 +10% |
| | 司机 | 5,500 | 车辆是生产工具 |
| | 秘书 | 6,000 | — |
| 🧱 **基础层** | 保安 | 4,500 | 支出 -12% |
| | 外卖员 | 5,000 | 无固定资产 |
| | 工厂工人 | 4,800 | 低负债 |
| | 自由职业者 | 6,500 | 灵活支出 |
| | 收银员 | 4,200 | 最低门槛 |

### 职业事件（升迁格触发）

**晋升**：月薪 +15%~30%，需投入培训费，裁员风险永久降低
**跳槽**：可选择高薪跳槽（+35%~50%）或稳定岗位（-10%~-20%）
**裁员**：获得 N+1 补偿（3~6 个月薪资），失业 3~6 回合
**职业转型**：月薪降至 50%，逐步恢复至比原薪资高 10%~20%
**再就业**：提前结束失业，薪资恢复至 85%~95%

### 失业系统

触发方式：市场卡裁员事件、升迁格裁员、确定性失业

失业期间：
- 月薪 = 0
- 连续失业幸福度逐月下降
- 达到一定年龄后失业风险更高

### 退休系统

- **强制退休**：到达职业对应的退休年龄
  - 蓝领：55 岁
  - 白领/技术：60 岁
  - 精英：65 岁
  - 自由职业：无强制退休
- **退休后**：转为养老金收入（最后月薪 ×40%），增加老年医疗支出

---

## 婚姻与家庭

### 婚姻状态

`单身 → 已婚 → 离异 → 永久不可再婚（两次离婚后）`

### 结婚（家庭格触发）
- 单身玩家可以在家庭格选择结婚
- 结婚费用：30,000 × 城市生活成本
- 伴侣月薪 ≈ 你的月薪 × 15%
- 家庭月开销增加

### 婚姻幸福度
- 范围：0~100
- 每月自动变化（随机波动 + 薪资加成 + 晋升加成）
- 高负债、失业、0~3岁子女（女性）会降低幸福度
- 幸福度 ≥ 50 时家庭工资 ×1.1 加成
- 幸福度 < 40 时有离婚风险（15% 概率/月）

### 离婚
- 触发后弹出离婚确认弹窗
- 分割婚姻共有资产（房产 + 股票）
- 可选择保留自住房或出售
- 律师费：15,000 × 城市生活成本
- 两次离婚后永久不可再婚

### 生育系统
- 已婚玩家在家庭格可选择**计划怀孕**或**推迟**
- 孕期 9 个月，每月有医疗支出
- 分娩后：孩子 +1，获得生育补贴
- 女性享受 6 个月产假（产假工资 80% + 月补贴）
- 0~3 岁子女享受月度补贴（100~300 元/月）
- 最多 3 个孩子

---

## 投资与股市

### 资产类型

| 类型 | 说明 | 收益来源 |
|------|------|---------|
| 股票 | A股/港股/美股 | 股息 + 资本利得 |
| 债券 | 国债/央企债/可转债 | 利息 |
| REITs | 房地产信托基金 | 租金分红 |
| 商品 | 黄金/有色/能源/农产品ETF | 资本利得 |
| 房产 | 住宅/商铺/公寓/写字楼 | 租金 + 增值 |
| 实体经营 | 奶茶店/咖啡厅/超市/酒店 | 经营收入 |
| 知识产权 | 畅销书版权 | 版税收入 |

### PE 估值系统

股票价格由 PE（市盈率）模型决定：

```
当前股价 = 合理价值 × (当前PE / 基准PE)
```

- **基准PE**：行业中枢（金融6、消费18、科技45 等）
- **当前PE**：每月随机波动（±6%），可受市场事件影响
- **估值带**：低于合理价值 70% 为深度低估，高于 110% 为估值偏高

### 股票交易
- 最小交易单位：**1手 = 100股**
- 交易费用：佣金 0.03% + 印花税 0.1%（持有 ≥12 月免印花税）
- **不支持**贷款买股票

### 市场波动
- 每月自然波动（±2.5%）
- 市场事件可导致大幅涨跌
- 利率变动联动资产估值（加息 → 估值下降）
- PE 范围限制：基准PE × 0.4 ~ 基准PE × 2.0

---

## 城市系统

### 20 个城市，4 个线级

| 线级 | 城市 |
|:----:|------|
| 🏙️ **一线** | 上海、北京、深圳、广州 |
| 🏘️ **二线** | 杭州、成都、武汉、南京、苏州、西安、重庆、天津 |
| 🏡 **三线** | 长沙、郑州、合肥、昆明、南宁 |
| 🌾 **四线** | 常德、绵阳、遵义 |

### 城市影响
- **薪资**：一线最高，四线最低
- **生活成本**：一线约为四线的 2.5 倍
- **房价**：一线约为四线的 7 倍
- **首付比例**：一线 30%，四线 15%
- **租金**：一线最高
- **房产税率**：因城市而异

---

## 快车道与胜利

### 逃离老鼠赛跑
当**被动收入 > 月总支出**时，你实现了财务自由：

1. 所有资产变卖为现金
2. 所有负债清零
3. 进入**快车道**

### 快车道
- 每次掷**双骰子**前进
- 目标是积累现金至 **50万元**
- 第一个达到的玩家获胜！

### 多玩家
- 最后存活的玩家获胜（其他玩家破产）
- 人类玩家破产 → AI 获胜

---

## 破产处理

### 破产条件
同时满足以下三者：
1. 月现金流 < 0
2. 现金 ≤ 0
3. 无可变卖资产

### 强制变卖
如果还有资产可卖（但不满足破产条件）：
1. 弹出**资产变卖窗口**
2. 可选择**协商变卖**（70% 市价，幸福度 -10）
3. 或**私自变卖**（50% 市价，幸福度 -30，有离婚风险）

### 自动兜底
- 现金为负且无资产可卖时，自动生成商业贷款
- 避免游戏卡死

---

## 小贴士

1. **尽早投资**：被动收入是获胜关键，不要只靠工资
2. **控制负债**：高利率贷款会吞噬你的现金流
3. **关注市场**：市场波动时是低买高卖的好机会
4. **善用慈善**：捐款后 3 回合双骰子，效率更高
5. **经营婚姻**：幸福度 ≥ 50 有工资加成
6. **管理风险**：预留现金应对意外支出
7. **合理配置**：股票、房产、实体经营分散投资
8. **留意年龄**：年龄越大失业风险越高，退休后收入锐减

---

*祝你早日实现财务自由！* 🚀

---

## 资产完整逻辑明细

### 1. 股票/ETF（StockLotAsset）

#### ① 数据结构与核心公式

```typescript
// 股票资产类型定义
interface StockLotAsset {
  id: string;
  type: 'stock' | 'etf' | 'overseas';
  subtype: string;          // 股票代码或ETF名称
  name: string;

  // 买入时记录的固定值
  singlePrice: number;        // 买入时单价
  totalCost: number;          // 买入时总成本（单价×数量+佣金）
  lotSize: number;            // 持仓股数
  quantity: number;           // 同 lotSize

  // PE 估值系统核心字段
  basePe: number;             // 行业基准PE（买入时确定，不随市场变）
  currentPe: number;          // 实时动态PE（每月漂移±6%，受市场事件影响）
  intrinsicPrice: number;     // 买入时的合理价值（单股）

  // 分红
  yearDivPerShare: number;    // 每股年分红（固定）
  dividendYield?: number;     // 当前股息率 = yearDivPerShare / 现价

  // PB 联动
  currentPb?: number;         // 当前市净率，随PE联动

  // 持有期
  heldMonths: number;         // 持有时长（决定卖房印花税豁免）

  // 元数据
  metadata: {
    sector: string;           // 行业分类（金融、科技、消费等）
    industry?: string;        // 细分行业
  };
}
```

**核心定价公式：**

```
当前股价(单股) = intrinsicPrice × (currentPe / basePe)
当前总市值 = 当前股价 × lotSize
```

- `basePe`：买入时的行业中枢PE（金融6、公用12、消费18、科技45、新能源40 等）
- `currentPe`：每月随机 ±6%，钳位范围 [basePe×0.4, basePe×2.0]
- `intrinsicPrice`：买入时由卡牌数据决定的合理价值

**月现金流计算（股息）：**

```
月股息收入 = yearDivPerShare / 12 × lotSize
```

- 股息不随 currentPe 变动，仅股息率（dividendYield = yearDivPerShare / 股价）随现价反向变动
- 分红现金流直接累加到被动收入

**PE/PB/股息率联动公式：**

```
newPrice = intrinsicPrice × newPe / basePe
newPb = currentPb × (newPrice / oldPrice)
dividendYield = yearDivPerShare / newPrice
```

#### ② 全局联动机制

**月度 PE 漂移（applyMonthlyStockPeDrift）：**
- 每个玩家的每个股票持仓，每月 currentPe 随机 ±6%
- 钳位：[basePe × 0.4, basePe × 2.0]
- 漂移后同步调用 syncPbAndDivYieldOnPeChange 更新 PB 和股息率

**市场乘数→PE 传导（convertEquityMultiplierToPe）：**
- 每月市场自然漂移时，所有权益类（stock/overseas/derivative）的乘数变动不直接改股价
- 而是折算到 currentPe：newPe = oldPe × (1 + Δmultiplier)
- 折算后将对应乘数重置为 1.0
- 然后调用 syncPbAndDivYieldOnPeChange 联动

**市场事件触发 PE 变动：**
- stockPeDelta（全局）：所有股票 currentPe 增加固定百分比
- sectorBasePeDelta（行业）：特定行业的所有股票 currentPe 增加固定百分比
- 利率变动：每升息 1% → 资产估值约 -15%（通过乘数传导到 PE）
- 通胀/通缩：直接影响乘数后再折算到 PE

**买入时记录 basePe：**
- 买入时 basePe 从 asset.sectorBasePe 或 asset.metadata.sector 查 SECTOR_BASE_PE 映射表
- 默认回退值 15

#### ③ UI 展示字段

| 字段 | 来源 | 格式 |
|------|------|------|
| 股票名称 | card.title | "贵州茅台" |
| 股票代码 | asset.subtype | "600519" |
| 当前单价 | calcCurrentStockPrice | "¥1,650" |
| 现价/合理价值 | 当前价 / intrinsicPrice | "×0.85 (明显低估)" |
| PE | asset.currentPe | "18.5" |
| 行业基准 PE | asset.basePe | "15.0" |
| PB | asset.currentPb | "3.2" |
| 每股年分红 | asset.yearDivPerShare | "¥45.00" |
| 股息率 | yearDivPerShare / 现价 | "2.7%" |
| 投资回报率（月ROI） | 年股息/12 / 现价 | "0.23%" |
| 1手（100股）买入成本 | 单价×100+佣金 | "¥165,030" |
| 1手月现金流 | yearDivPerShare/12×100 | "¥375" |

#### ④ 交互行为

- **买入**：1手 = 100股，倍数递增；现金全款支付，不支持贷款；佣金 0.03%；买入后记录 currentPe、basePe、intrinsicPrice；若当前股价已包含市场乘数，买入后乘数被折算进 PE
- **卖出**：最小 1手，可部分卖出；佣金 0.03% + 印花税 0.1%（持有 ≥12 月免印花税）；先还清抵押贷款（股票无抵押贷款，直接全净值）；离婚时股票一律卖出平分
- **变卖**：协商变卖 → 市价 × 70%，幸福度 -10；私自变卖 → 市价 × 50%，幸福度 -30，标记 hasSecretLiquidation
- **市场事件影响**：资产增值/贬值（现价 × multiplier）；行业爆发（某行业 PE × multiplier）；公司业绩事件（个股 PE 直接调整）；溢价收购（流通股溢价 20% 收购，玩家选择卖/留）

---

### 2. 债券（BondAsset）

#### ① 数据结构与核心公式

```typescript
interface BondAsset {
  id: string;
  type: 'bond';
  subtype: string;      // 'treasury' | 'corporate' | 'convertible'
  name: string;
  cost: number;         // 买入总成本（面值 + 溢价/折价）
  faceValue: number;    // 面值
  couponRate: number;   // 票面年利率（如 0.035 = 3.5%）
  maturityMonths: number; // 到期剩余月数
  marketValue: number;  // 当前市值
  metadata: { sector: string; industry?: string };
}
```

**核心计算公式：**

```
月利息收入 = faceValue × couponRate / 12
当前市值 = 面值（到期以面值还本）
市场事件修正市值 = 原市值 × (1 + Δmultiplier)
```

- 债券的月现金流 = 固定利息收入
- 市场利率变动影响市值（加息→债券价格下跌，降息→上涨），但月利息不变

#### ② 全局联动机制

- 利率变动（interestRate 事件）：债券市值 = 面值 × (基准利率 / 新利率) 的修正
- 通胀事件：直接影响现金购买力，间接影响债券真实价值
- 月度无自然波动（无漂移）

#### ③ UI 展示字段

| 字段 | 来源 | 格式 |
|------|------|------|
| 债券名称 | card.title | "储蓄国债" |
| 类型 | subtype | "国债" |
| 面值 | faceValue | "¥10,000" |
| 票面利率 | couponRate | "3.5%" |
| 月利息 | faceValue×couponRate/12 | "¥29" |
| 当前市值 | marketValue | "¥10,000" |
| 到期月数 | maturityMonths | "36月" |

#### ④ 交互行为

- **买入**：全款支付，现金不足不支持贷款
- **卖出**：按市值卖出，无交易手续费（0.01% 可忽略）
- **持有期**：每月 maturityMonths -1，到期后自动兑付（TODO：当前代码中债券未实现自动到期处理）

---

### 3. REITs

#### ① 数据结构与核心公式

REITs 在代码中可能使用 StockLotAsset 结构（可交易份额）或普通的 Asset 结构。

```
月租金收入 = 资产月现金流 × cashFlowMultiplier[reit] × sectorMultiplier[物流/商业等]
当前市值 = 买入价 × (1 + 市场乘数变动)
```

#### ② 联动机制

- 受 cashFlowMultiplier[reit] 影响租金收入
- 受 sectorMultiplier（物流地产/商业地产等）影响
- 市场事件可调整 REITs 估值

---

### 4. 大宗商品（CommodityAsset）

#### ① 数据结构与核心公式

```typescript
interface CommodityAsset {
  id: string;
  type: 'commodity';
  subtype: 'gold' | 'metal' | 'energy' | 'agriculture' | 'preciousMetal';
  name: string;
  cost: number;           // 买入成本
  quantity: number;       // 持有数量（份额）
  currentUnitPrice: number; // 当前单价
  metadata: { sector: string; industry?: string };
}
```

**核心计算公式：**

```
当前市值 = quantity × currentUnitPrice
月现金流 = 0（大宗商品无月收入，靠价格波动获利）
```

- 价格每月随机波动 ±2%（applyMonthlyCommodityFluctuation）
- 无股息/利息/租金收入

#### ② 联动机制

- 月度：持有数量不变，单位价格随机波动 ±2%
- 市场事件：通胀/通缩直接影响价格（通胀→商品涨，通缩→商品跌）
- 市场乘数影响总市值

#### ③ UI 展示字段

| 字段 | 说明 |
|------|------|
| 名称 | 如"华安黄金ETF" |
| 持有数量 | xxx 份额 |
| 当前单价 | ¥xxx |
| 总市值 | ¥xxx |
| 成本 | ¥xxx |
| 浮盈/亏损 | ¥xxx |
| 月收入 | ¥0 |

#### ④ 交互行为

- **买入**：全款支付，不支持贷款
- **卖出**：按市价卖出，先还贷后给净值
- **变卖**：同上协商/私自折价

---

### 5. 住宅房产（RealEstateAsset）

#### ① 数据结构与核心公式

```typescript
interface RealEstateAsset extends Asset {
  id: string;
  type: 'realEstate';
  subtype: 'residential';    // 住宅
  name: string;

  // 买入时记录
  cost: number;              // 总价（买入时市场估值）
  downPayment: number;       // 首付金额
  mortgage: number;          // 贷款金额 = cost - downPayment

  // 月现金流
  monthlyCashFlow: number;   // 月租金收入（买入时卡牌给的基准值）

  // 流转
  marketValue: number;       // 当前市值（受市场乘数影响）
  isSelfLiving: boolean;     // 是否自住（自住则 rentExpense=0）
  cityTier: string;          // 城市线级
  district: string;          // 区域
  size: number;              // 面积

  metadata: {
    sector: string;          // '住宅'
    industry?: string;
    debtType?: 'houseFirst' | 'houseSecond';
  };
}
```

**核心计算公式：**

```
当前市值 = 基准市值 × marketMultiplier[realEstate] × sectorMultiplier[住宅]
月租金收入 = 基准月现金流 × cashFlowMultiplier[realEstate] × sectorMultiplier[住宅]
房产年税 = 当前市值 × propertyTaxRate（所在城市税率）
isSelfLiving = true → rentExpense = 0
```

#### ② 联动机制

- **自住标记**：首次购买住宅自动设为 isSelfLiving = true；后续购买住宅为 false
- **自住租金豁免**：有 isSelfLiving=true 的房产时，rentExpense 强制为 0
- **卖出自住房**：如果还有别的房产，自动找另一套非自住房设为自住
- **城市参数**：首付比例随城市线级变化（一线 30%、四线 15%）
- **市场乘数**：双乘数影响市值和租金
- **房产税**：持有第二套及以上时按年税率征收
- **月度**：市值无自动波动（仅通过市场事件改变）

**Mortgage 贷款绑定：**
- 买入时若 mortgage > 0，自动创建抵押贷款
- 贷款类型：首套房贷（houseFirst）或二套房贷（houseSecond）
- 由 getRealEstateMortgageDebtType 判断
- securedAssetId 绑定到该房产

#### ③ UI 展示字段

| 字段 | 来源 | 格式 |
|------|------|------|
| 房产名称 | card.title | "三线刚需房" |
| 位置 | 城市+区域 | "成都·高新区" |
| 面积 | size | "89㎡" |
| 总价 | 基准总价×城市乘数 | "¥1,200,000" |
| 首付 | cost × 首付比例 | "¥360,000" |
| 贷款 | cost - downPayment | "¥840,000" |
| 月租金 | 基准现金流×双乘数 | "¥3,500" |
| 总市值 | 当前市值 | "¥1,320,000" |
| 回报率（月） | cashFlow / downPayment | "0.97%" |
| 自住标记 | isSelfLiving | "自住" / "出租" |

#### ④ 交互行为

- **买入**：现金 + 贷款组合，先付首付，不足自动贷款补足首付；若 mortgage > 0 自动创建抵押贷款；首次购买住宅自动设 isSelfLiving = true；交易费用 成交价 × 3%
- **卖出**：先还抵押贷款（settleAssetLoan）；自住房卖出后找替代自住，无替代则触发租房；交易费用 成交价 × 3%
- **变卖**：协商 → 市价 × 70%，幸福度 -10；私自 → 市价 × 50%，幸福度 -30；先还贷后给净值
- **离婚处理**：房产可以保留（支付配偶份额）或强制卖出，卖出后平分净值

---

### 6. 商铺/商业房产

与住宅类似，但：
- 类型为 'realEstate'，subtype = 'commercial'
- 交易费率：3%
- 贷款类型：shopMortgage
- 月现金流计算规则同住宅
- 自住标记 isSelfLiving 始终为 false（商业地产不能自住）
- 变卖折价更高（协商 60%、私自 40%）

---

### 7. 实体经营（EntityAsset）

```typescript
interface EntityAsset {
  id: string;
  type: 'entity';
  subtype: 'catering' | 'retail' | 'franchise' | 'service';
  name: string;
  cost: number;              // 买入总成本
  downPayment: number;       // 首付
  monthlyCashFlow: number;   // 月净利润
  marketValue: number;        // 当前估值
  metadata: { sector: string; industry?: string };
}
```

**计算公式：**

```
当前估值 = 基准估值 × marketMultiplier[entity] × sectorMultiplier[餐饮/零售等]
月经营收入 = 基准月现金流 × cashFlowMultiplier[entity] × sectorMultiplier[餐饮/零售等]
```

**交互：**
- 买入支持首付+贷款
- 交易费率：0.5%
- 卖出/变卖逻辑同房产
- 无自住标记

---

### 8. 车辆（VehicleAsset）

```typescript
interface VehicleAsset {
  id: string;
  type: 'vehicle';
  subtype: 'car';
  name: string;
  cost: number;
  downPayment: number;
  monthlyCashFlow: number;   // 通常是负的（折旧/维护费用）或0
  loanAmount: number;         // 贷款金额
  marketValue: number;
  ageMonths: number;          // 已使用月数
  isSelfLiving: false;
  metadata: { sector: '汽车' };
}
```

**计算公式：**

```
月折旧 = 上月市值 × 0.5%（每月自动贬值）
当前市值 = 买入价 × (1 - 0.005)^ageMonths
月现金流 = 基准月现金流 × cashFlowMultiplier[vehicle]（通常为负或0）
```

- 每月折旧 0.5%（processMonthlyLifeEvents）
- 车辆作为"生产工具"对某些职业有特殊意义（司机职业）

---

### 9. 知识产权（IntellectualAsset）

```
类型: 'intellectual'
月现金流 = 基准版税收入 × 双乘数
市值 = 买入成本（固定）
```

---

### 10. 企业（BusinessAsset）

```
类型: 'business'
月现金流 = 基准经营收入 × 双乘数
买入支持贷款
交易费率: 1%
```

---

## 全卡牌完整逻辑明细

### 一、额外支出卡（Doodad Card）

#### 整体规则

**数据结构：**

```typescript
interface DoodadCard {
  id: string;
  title: string;
  description: string;
  type: 'doodad';
  cost: number;                      // 一次性支付金额
  isRecurring: boolean;              // 是否持续月度支出
  monthlyCost?: number;              // 月持续性支出
  happinessDelta?: number;           // 幸福度变化
  partnerUnemploymentTurns?: number; // 配偶失业持续回合数
  tempPerChildBoost?: number;        // 临时每子女额外支出
  tempExpenseTurns?: number;         // 临时支出持续回合数
  isFamilyEvent?: boolean;           // 家庭事件标记
  isMedicalEvent?: boolean;          // 医疗事件标记
  insuranceType?: string;            // 保险类型
  insuranceMonthlyPremium?: number;  // 保险月保费
  coverageRatio?: number;            // 保险覆盖率
  deductible?: number;              // 免赔额
  genderRequired?: 'male' | 'female'; // 性别要求
  filterConfig?: {
    minAge?: number;
    maxAge?: number;
    marriageStatus?: 'single' | 'married' | 'divorced' | 'ineligible';
    minChildren?: number;
    maxChildren?: number;
    gender?: 'male' | 'female';
    retired?: boolean;
    unemployed?: boolean;
    requiresLiabilityType?: DebtType;
    requiresSector?: string;
  };
}
```

#### 全部额外支出卡列表

**日常消费类（一次性）：**

1. 新电视 ¥8,000
2. 海边度假 ¥15,000，幸福度+5
3. 请客吃饭 ¥2,000
4. 换新手机 ¥6,000
5. 付费课程 ¥2,500，幸福度+3
6. 宠物医疗 ¥4,000
7. 汽车维修 ¥12,000（需持有车贷）
8. 牙齿检查 ¥800
9. 配新眼镜 ¥1,200

**家庭紧急事件类：**

10. 父母重病 ¥50,000 + 月¥2,000，幸福度-15（25岁以上触发，医疗事件）
11. 配偶失业 ¥0，配偶失业3回合，幸福度-20（已婚触发）
12. 赡养支出 ¥5,000 + 月¥1,500，幸福度-5（25岁以上）
13. 房屋大修 ¥35,000，幸福度-8
14. 红白喜事 ¥8,000
15. 慢性疾病 ¥3,000 + 月¥800（有医疗保险时保险覆盖70%）
16. 子女择校 ¥25,000，临时支出+6回合（有子女触发）
17. 交通事故 ¥28,000，医疗事件
18. 亲友借钱 ¥15,000（已婚触发概率更高）

**持续性支出类：**

19. 健身房会员 ¥3,000 + 月¥300，幸福度+3

**医疗事件类（v3.7）：**

20. 自身重大疾病 ¥60,000，幸福度-20
21. 父母大病 ¥50,000（保险覆盖）

**保险购买类（v3.7）：**

22. 医疗保险 月缴¥500，大病70%报销
23. 牙科保险 月缴¥200
24. 人寿保险 月缴¥800
25. 母婴医疗保险 月缴¥400（女性专属，生育补贴+50%）

#### filterConfig 过滤规则

卡片抽取时按以下规则过滤（抽卡重试最多10次）：
- minAge/maxAge：玩家年龄必须在范围内
- marriageStatus：玩家的 marriageStatus 必须匹配
- minChildren/maxChildren：玩家子嗣数量在范围内
- gender：玩家性别必须匹配
- retired：true=仅退休触发，false=仅在职触发
- unemployed：true=仅失业触发，false=仅在职触发
- requiresLiabilityType：玩家必须有该类型的负债
- requiresSector：玩家必须持有该行业的资产

#### UI 渲染

```
[额外支出] 卡头 - 红色背景 #e74c3c
标题: card.title
描述: card.description

[costInfo区域]
┌─ 需要支付：¥XX,XXX
│  （或保险卡：月缴保费：¥XXX）
│  （或配偶失业：⚠ 无直接支出，但未来数月配偶工资归零）
└─
如果是recurring: "此外每月增加支出 ¥X,XXX"
如果是配偶失业: 红字提示影响

[按钮]
支付 / 贷款支付 ¥XX / 确认（配偶失业）
```

#### 交互行为

1. 玩家停在 doodad 格 → 抽 doodad 卡
2. 弹窗显示卡片内容
3. 玩家点击"支付"（或自动支付）
4. 后台执行 PAY_DOODAD：
   - 身份过滤校验
   - 保险抵扣医疗费用
   - 现金不足自动贷款
   - 扣款 + 副作用（幸福度、配偶失业、临时支出等）
5. 回合结束

---

### 二、机会卡（Opportunity Card）

#### 整体规则

```typescript
interface OpportunityCard {
  id: string;
  title: string;
  description: string;
  type: 'opportunity';
  kind: 'smallDeal' | 'bigDeal';
  asset: Asset;                     // 完整资产对象
  dueDiligenceCost?: number;        // 尽职调查费（大买卖特有）
  infoTier?: number;                // 信息层级
  minCashRequired?: number;         // 最低现金要求
  sector?: string;                  // 资产行业
}
```

#### 小生意机会（smallDeal）完整列表

**股票类：**

1. 工商银行 - 金融，PE 6，股价 ≈ ¥5
2. 长江电力 - 公用，PE 12，股价 ≈ ¥25
3. 贵州茅台 - 消费，PE 18，股价 ≈ ¥1,650
4. 格力电器 - 消费，PE 18，股价 ≈ ¥40
5. 腾讯控股 - 科技，PE 45，股价 ≈ ¥380
6. 阿里巴巴 - 科技，PE 45，股价 ≈ ¥200
7. 宁德时代 - 新能源，PE 40，股价 ≈ ¥180

**ETF/REITs 类：**

8. 华安黄金ETF - 贵金属，月现金流¥0
9. 国开债ETF - 利率债，月利息¥28
10. 中证红利ETF - 宽基，股息¥44/月
11. 科创50ETF - 科技
12. 清洁能源REIT - 新能源
13. 京东仓储REIT - 物流地产

**房产类：**

14. 县城两居室（tier4）- 住宅，月租金¥800
15. 三线刚需房（tier3）- 住宅，月租金¥1,200
16. 二线改善房（tier2）- 住宅，月租金¥2,000
17. 社区底商（tier2）- 商铺，月租金¥3,000

**实体经营类：**

18. 品牌奶茶店 - 餐饮，月利润¥2,000
19. 精品咖啡厅 - 餐饮，月利润¥1,500
20. 社区超市 - 零售，月利润¥1,800
21. 便利店 - 零售，月利润¥1,200

**其他：**

22. 畅销书版权 - 知识产权，月版税¥500
23. 储蓄国债 - 债券，利率3.5%
24. 央企债ETF - 债券
25. 可转债 - 衍生品
26. 有色ETF - 大宗商品
27. 能源ETF - 大宗商品
28. 豆粕ETF - 大宗商品
29. 丰田卡罗拉 - 车辆，月现金流-¥500（折旧）
30. 比亚迪汉EV - 车辆

#### 大买卖机会（bigDeal）完整列表

1. 中国平安 - 金融，PE 6
2. 纳指100ETF - 海外，PE 30
3. 标普500ETF - 海外，PE 25
4. 中金普洛斯REIT - 物流地产
5. REITs指数基金 - 宽基
6. 购物中心 - 商业地产
7. 8套公寓楼 - 住宅资产包
8. 一线内环公寓 - 住宅（tier1）
9. 奔驰E300L - 车辆
10. 连锁酒店加盟 - 企业

#### UI 渲染

```
[机会] 卡头 - 蓝色背景
标题: card.title（附标记："小生意" / "大买卖"）

[资产详情区域]
┌─ 类型标签: [股票] [房产] [实体] [债券] [ETF] ...
│  成本/总价: ¥XXX,XXX
│  首付/本金: ¥XX,XXX（仅非股票类）
│  月现金流: ¥X,XXX（/月）
│  首付回报率: X.X%/月
│  (股票) 当前PE: XX.X | 基准PE: XX.X
│  (股票) 现价/合理价值: ×X.XX → [标签: 低估/合理/高估]
│  (股票) 股息率: X.X%
│  市场价格: ¥XXX,XXX（仅非股票类）
│  贷款: ¥XXX,XXX（仅非股票类）
└─
如果大买卖且有dueDiligenceCost:
  "尽职调查费：¥X,XXX"

[按钮区域]
购买 / 放弃
```

#### 购买交互

1. 玩家停在机会格 → 抽机会卡（小生意格抽小生意或大买卖，大买卖格只抽大买卖）
2. 显示卡片详情
3. 玩家选择"购买"或"放弃"
4. 购买流程：
   - 校验 minCashRequired
   - 计算总成本（首付+交易费+尽调费）
   - 现金不足：股票→拒绝；非股票→自动贷款补足
   - 创建资产，绑定贷款
   - 自动检测自住标记
5. 回合结束

#### 市场事件购买（discounted）
- 停在 market 格时可能触发 discount 事件
- 首付 5 折（downPayment × 0.5）
- 卡面显示折扣信息

---

### 三、市场波动卡（Market Card）

#### 整体规则

```typescript
interface MarketCard {
  id: string;
  title: string;
  description: string;
  type: 'market';
  effect: {
    type: 'assetAppreciation' | 'assetDepreciation' | 'buyout' | 'interestRate'
        | 'discount' | 'sectorBoom' | 'macroEvent' | 'unemployment'
        | 'reemployment' | 'stockPeEvent' | 'inflationEvent' | 'childSubsidyUp';
    multiplier?: number;            // 倍数
    sector?: string;                // 行业
    industry?: string;              // 细分行业
    rateChange?: number;            // 利率变化（百分点）
    percentage?: number;            // 百分比
    turns?: number;                 // 持续回合数
    stockPeDelta?: number;          // PE变动百分比
    sectorBasePeDelta?: number;     // 行业PE变动百分比
    macroEventSideEffect?: {        // 宏观事件副作用
      unemploymentRisk?: number;    // 失业风险调整
      marketSentiment?: number;     // 市场情绪调整
      inflationAdjustment?: number; // 通胀调整
    };
  };
  isGlobal?: boolean;              // 全局事件
  filterConfig?: { ... };          // 抽取过滤条件
}
```

#### 全部市场卡事件类型

**资产事件类（5种×4）：**

1. 房地产暴涨 - assetAppreciation, sector=住宅, ×1.5
2. 科技股寒冬 - assetDepreciation, sector=科技, ×0.6
3. 消费股利好 - assetAppreciation, sector=消费, ×1.4
4. 金融板块回调 - assetDepreciation, sector=金融, ×0.7
5. 大宗商品牛市 - assetAppreciation, sector=有色金属, ×1.6

**利率类（3种）：**

6. 央行降息 - interestRate, rateChange=-0.25%（或更高）
7. 央行加息 - interestRate, rateChange=+0.25%
8. 货币宽松 - interestRate, rateChange=-0.5%

**宏观事件类（约12-15张）：**

9. 金融危机 - macroEvent，所有资产×0.7，失业风险+20%
10. AI繁荣 - macroEvent，科技×2.0
11. 地产政策松绑 - macroEvent，住宅×1.3
12. 新能源爆发 - macroEvent，新能源×1.8
13. 经济复苏 - macroEvent，所有资产×1.15
14. 贸易战 - macroEvent，科技×0.7，制造业×0.8
15. 消费降级 - macroEvent，消费×0.75
16. 人口老龄化 - macroEvent
17. 基建投资 - macroEvent
18. 公共卫生事件 - macroEvent

**PE事件类（8张）：**

19. 公司业绩大增 - stockPeEvent, stockPeDelta=+20%
20. 财务暴雷 - stockPeEvent, stockPeDelta=-30%
21. 行业景气 - stockPeEvent, sectorBasePeDelta=+15%
22. 行业衰退 - stockPeEvent, sectorBasePeDelta=-15%

**特殊类：**

23. 通胀来袭 - inflationEvent，现金贬值+商品涨
24. 通缩风险 - inflationEvent
25. 育儿补贴上调 - childSubsidyUp
26. 股票回购 - buyout

#### UI 渲染

```
[市场] 卡头 - 黄色背景
标题: card.title
描述: card.description

如果是资产增值/贬值:
  "您的 [行业] 资产估值将 [增加/减少] X%"
如果是宏观事件:
  "全局影响：XXX"
如果是利率变动:
  "利率 [上升/下降] X%"
如果是PE事件:
  "该事件将影响股票的PE估值"

[确认按钮]
确认（应用效果）
```

#### 交互行为

1. 玩家停在 market 格 → 抽市场卡
2. 显示卡片详情
3. 玩家点击"确认"
4. 后台执行 APPLY_MARKET_EFFECT：
   - 根据 effect.type 应用不同逻辑
   - 资产增值/贬值：调整 marketMultiplier 或 sectorMultiplier
   - PE事件：调用 updateStockPeByPercent/ByEvent
   - 利率变动：调整贷款月供（syncExpenseAfterRateChange）
   - 宏观事件：多参数联动调整
5. 回合结束

---

### 四、升迁/职业卡

这部分在 GAMEPLAY.md 已有描述，补充细节：

#### 晋升权重系统

5种事件按权重随机选取：
- 晋升（权重最高）：月薪+15~30%
- 跳槽：两个选项——高薪跳槽（+35~50%）或稳定岗位（-10~-20%）
- 裁员：N+1 补偿（3-6个月薪资），失业3-6回合
- 职业转型：月薪降至50%，5回合逐步恢复到比原薪资高10~20%
- 再就业（仅失业玩家）：提前结束失业，月薪恢复85-95%

#### 裁员概率计算

```
综合裁员概率 = 基础风险 × 年龄系数 × 婚姻系数 × 宏观系数 × 修正因子 × 子女系数
```

- 基础风险：职业固有风险
- 年龄系数：<30=0.7, 30-39=0.85, 40-49=1.0, ≥50=1.5, 距退休≤5年=2.0
- 婚姻系数：已婚降低
- 宏观系数：市场事件影响
- 修正因子：晋升永久降低20%

---

## 资产卡牌联动校验清单

### 测试校验点

#### PE-现价一致性

```
校验点 PE1001: 每个股票持仓的 currentPe 必须在 [basePe×0.4, basePe×2.0] 范围内
校验点 PE1002: 股价 = intrinsicPrice × currentPe / basePe，误差 < 0.01元
校验点 PE1003: 每次 PE 变动后 PB 和 股息率 必须同步更新
校验点 PE1004: 市场乘数折算到 PE 后，对应的 marketMultiplier 必须重置为 1.0
```

#### 月现金流一致性

```
校验点 CF2001: 月总收入 = getEffectiveSalary + getPassiveIncome，且 ≥ 0
校验点 CF2002: 被动收入 = 所有资产月现金流之和，误差 < 0.01元
校验点 CF2003: 总支出 = 各负债月供 + tax + other + perChild + tempPerChildBoost + medicalPregnancy + medicalElderly + rentExpense
校验点 CF2004: 自住房存在时 rentExpense === 0
校验点 CF2005: 配偶失业期间 partnerSalary 不计入 effectiveSalary
校验点 CF2006: familyIncome ≡ undefined（已废弃）时取 salary + partnerSalary（partnerUnemployedTurnsRemaining=0时）
```

#### 买入/卖出净值

```
校验点 TR3001: 股票买入总成本 = 单价×手数×100 + 佣金（单价×手数×100×0.0003）
校验点 TR3002: 股票卖出净收入 = 单价×手数×100 - 佣金 - 印花税（持有<12月时）
校验点 TR3003: 房产买入总成本 = 首付 + 首付×3% + 尽职调查费
校验点 TR3004: 房产卖出先还抵押贷款，netCash = proceeds - loanPrincipal
校验点 TR3005: 强制变卖折价：协商=市价×0.7，私自=市价×0.5
```

#### 婚姻/家庭

```
校验点 FM4001: 已婚且幸福度 ≥ 50 时，effectiveSalary 含 ×1.1 加成
校验点 FM4002: 女性有0-3岁子嗣时，月幸福度 -5/个
校验点 FM4003: 离婚后 marriageHappiness = 0，partnerSalary 不计入
校验点 FM4004: 孕妇每月 medicalPregnancy 支出 = 1200 × city.expenseMultiplier
校验点 FM4005: 孕期满9月自动分娩，children+1，childAges+[0]
```

#### 负债/破产

```
校验点 DB5001: 月现金流 < 0 + 现金 ≤ 0 + 无可变卖资产 → 破产
校验点 DB5002: 月现金流 < 0 + 现金 ≤ 0 + 有可变卖资产 → needsLiquidation = true
校验点 DB5003: 贷款月供 = 等额本息计算，利率变动后重新计算所有 EPI 类负债
校验点 DB5004: 利率每升 1% → 所有资产估值约 -15%
```

#### 卡牌抽取验证

```
校验点 CD6001: doodad 卡抽取需满足 filterConfig 全部条件（最多重试10次）
校验点 CD6002: 配偶失业卡仅限已婚玩家抽取
校验点 CD6003: 子女费用卡仅限有子女玩家抽取
校验点 CD6004: 产假仅限女性玩家（女性特有 maternityLeaveRemaining）
校验点 CD6005: 退休玩家不应触发晋升事件
校验点 CD6006: 失业玩家仅触发"再就业"职业事件
```

#### 历史已知Bug判定标准

| Bug | 触发条件 | 判定逻辑 | 修复方向 |
|-----|---------|---------|---------|
| 现金负数 | cash < 0 | wrapCashGuard 兜底贷款 | 检查 needsLiquidation 是否先于兜底执行 |
| PE-股价脱节 | 股价 ≠ intrinsicPrice×currentPe/basePe | 误差 > 0.01 报错 | 检查 syncPbAndDivYieldOnPeChange 调用链 |
| 资产不渲染 | 资产类型缺失UI分支 | checkAndHandleBankruptcy 后检查 | 确保所有 AssetType 在 AssetCenter 有渲染分支 |
| 回报率计算错误 | 股票ROI = 年股息/12/单价 | 与 AI 决策中 ROI 公式一致 | 确保 ROI 口径统一 |
| 自住扣房租 | isSelfLiving=true 但 rentExpense>0 | 月现金流结算时检查 | getMonthlyCashFlow 中租金 = isSelfLiving ? 0 : getRentExpense |
| 股息率不联动 | PE变动后股息率不变 | syncPbAndDivYieldOnPeChange 中 intrinsicPrice>0 检查 | 创建股票时确保 intrinsicPrice 正确设置 |
