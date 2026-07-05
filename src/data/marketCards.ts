import type { MarketCard } from '../types/game';

export const MARKET_CARDS: MarketCard[] = [
  // ── 保留原有交互型卡片 ──
  {
    id: 'market_boom',
    title: '经济繁荣',
    description: '房地产市场火热，所有房产增值 50%，买家求购。',
    type: 'market',
    effect: { type: 'assetAppreciation', targetAssetType: 'realEstate', multiplier: 1.5 },
  },
  {
    id: 'market_buyout',
    title: '资产收购要约',
    description: '机构买家溢价 15% 收购你的房产类资产。',
    type: 'market',
    effect: { type: 'buyout', targetAssetType: 'realEstate', multiplier: 1.15 },
  },
  {
    id: 'market_buyers_market',
    title: '买方市场',
    description: '房东急于出售，房产首付降至 5 折。',
    type: 'market',
    effect: { type: 'discount', targetAssetType: 'realEstate', discountRate: 0.5 },
  },

  // ── 宏观事件：经济危机 ──
  {
    id: 'crisis_2008',
    title: '2008 全球金融危机',
    description: '次贷危机引发全球流动性枯竭，风险资产暴跌，避险资产受追捧。',
    type: 'market',
    effect: {
      type: 'macroEvent',
      eventCategory: 'globalLiquidity',
      assetImpacts: {
        stock: { priceChange: 0.55, cashFlowChange: 0.8 },
        bond: { priceChange: 1.15 },
        reit: { priceChange: 0.65, cashFlowChange: 0.85 },
        commodity: { priceChange: 0.85 },
        derivative: { priceChange: 0.5 },
        overseas: { priceChange: 0.5, cashFlowChange: 0.8 },
        entity: { priceChange: 0.7, cashFlowChange: 0.75 },
        realEstate: { priceChange: 0.6, cashFlowChange: 0.8 },
        business: { priceChange: 0.65, cashFlowChange: 0.75 },
        intellectual: { priceChange: 0.8 },
        金融: { priceChange: 0.45 },
        科技: { priceChange: 0.5 },
        贵金属: { priceChange: 1.2 },
      },
    },
  },
  {
    id: 'crisis_2015',
    title: '2015 A股杠杆股灾',
    description: '杠杆资金踩踏出逃，A股暴跌，高估值成长股重创。',
    type: 'market',
    effect: {
      type: 'macroEvent',
      eventCategory: 'economicCycle',
      assetImpacts: {
        stock: { priceChange: 0.5, cashFlowChange: 0.9 },
        derivative: { priceChange: 0.6 },
        overseas: { priceChange: 0.85 },
        reit: { priceChange: 0.9 },
        科技: { priceChange: 0.4 },
        新能源: { priceChange: 0.45 },
        消费: { priceChange: 0.75 },
      },
    },
  },

  // ── 产业周期 ──
  {
    id: 'ai_boom',
    title: 'AI 产业繁荣 / 算力周期',
    description: '大模型与算力基建爆发，科技、新能源板块领涨。',
    type: 'market',
    effect: {
      type: 'macroEvent',
      eventCategory: 'industryTrend',
      assetImpacts: {
        stock: { priceChange: 1.15 },
        overseas: { priceChange: 1.3, cashFlowChange: 1.1 },
        科技: { priceChange: 1.8, cashFlowChange: 1.2 },
        新能源: { priceChange: 1.5, cashFlowChange: 1.15 },
        先进制造: { priceChange: 1.4 },
        commodity: { priceChange: 1.1 },
      },
    },
  },
  {
    id: 'new_quality_productivity',
    title: '新质生产力产业周期',
    description: '政策推动高端制造与数字经济，先进制造板块估值提升。',
    type: 'market',
    effect: {
      type: 'macroEvent',
      eventCategory: 'policyRegulation',
      assetImpacts: {
        stock: { priceChange: 1.1 },
        entity: { priceChange: 1.15, cashFlowChange: 1.1 },
        先进制造: { priceChange: 1.5, cashFlowChange: 1.2 },
        新能源: { priceChange: 1.25 },
        科技: { priceChange: 1.2 },
      },
    },
  },
  {
    id: 'internet_crackdown',
    title: '互联网平台整改',
    description: '平台经济监管趋严，互联网与平台类资产承压。',
    type: 'market',
    effect: {
      type: 'macroEvent',
      eventCategory: 'policyRegulation',
      assetImpacts: {
        stock: { priceChange: 0.9 },
        overseas: { priceChange: 0.85 },
        科技: { priceChange: 0.7, cashFlowChange: 0.85 },
        business: { priceChange: 0.8, cashFlowChange: 0.9 },
      },
    },
  },

  // ── 利率周期 ──
  {
    id: 'domestic_rate_cut',
    title: '国内降息周期',
    description: '央行连续降息，债券价格上涨，地产股回暖，高股息受追捧。',
    type: 'market',
    effect: {
      type: 'macroEvent',
      eventCategory: 'economicCycle',
      rateChange: -0.015,
      assetImpacts: {
        bond: { priceChange: 1.12, cashFlowChange: 0.95 },
        reit: { priceChange: 1.1, cashFlowChange: 1.05 },
        realEstate: { priceChange: 1.15, cashFlowChange: 1.05 },
        stock: { priceChange: 1.08 },
        金融: { priceChange: 1.05 },
        利率债: { priceChange: 1.15 },
        REITs: { priceChange: 1.12 },
      },
    },
  },
  {
    id: 'domestic_rate_hike',
    title: '国内加息周期',
    description: '通胀压力上升，央行加息，债券与成长股承压。',
    type: 'market',
    effect: {
      type: 'macroEvent',
      eventCategory: 'economicCycle',
      rateChange: 0.015,
      assetImpacts: {
        bond: { priceChange: 0.92, cashFlowChange: 1.05 },
        stock: { priceChange: 0.9, cashFlowChange: 0.95 },
        reit: { priceChange: 0.95 },
        realEstate: { priceChange: 0.88, cashFlowChange: 0.95 },
        科技: { priceChange: 0.85 },
        利率债: { priceChange: 0.9 },
      },
    },
  },
  {
    id: 'fed_rate_cut',
    title: '美联储降息周期',
    description: '美联储开启降息，全球流动性改善，海外资产与大宗商品受益。',
    type: 'market',
    effect: {
      type: 'macroEvent',
      eventCategory: 'globalLiquidity',
      rateChange: -0.01,
      assetImpacts: {
        overseas: { priceChange: 1.2, cashFlowChange: 1.05 },
        commodity: { priceChange: 1.15 },
        stock: { priceChange: 1.05 },
        bond: { priceChange: 1.03 },
        贵金属: { priceChange: 1.25 },
        科技: { priceChange: 1.15 },
      },
    },
  },

  // ── 主题行情 ──
  {
    id: 'high_dividend_defense',
    title: '高股息防御行情',
    description: '市场避险情绪升温，高股息蓝筹与公用事业板块走强。',
    type: 'market',
    effect: {
      type: 'macroEvent',
      eventCategory: 'industryTrend',
      assetImpacts: {
        stock: { priceChange: 1.05, cashFlowChange: 1.1 },
        bond: { priceChange: 1.03 },
        金融: { priceChange: 1.2, cashFlowChange: 1.15 },
        公用事业: { priceChange: 1.25, cashFlowChange: 1.1 },
        消费: { priceChange: 1.1 },
        科技: { priceChange: 0.95 },
        新能源: { priceChange: 0.9 },
      },
    },
  },
  {
    id: 'global_inflation',
    title: '全球通胀周期',
    description: '大宗商品价格飙升，实物资产抗通胀，成长股估值承压。',
    type: 'market',
    effect: {
      type: 'macroEvent',
      eventCategory: 'economicCycle',
      assetImpacts: {
        commodity: { priceChange: 1.35 },
        realEstate: { priceChange: 1.1, cashFlowChange: 1.05 },
        reit: { priceChange: 1.08 },
        entity: { priceChange: 1.05, cashFlowChange: 1.08 },
        贵金属: { priceChange: 1.3 },
        stock: { priceChange: 0.95 },
        bond: { priceChange: 0.9 },
        科技: { priceChange: 0.85 },
      },
    },
  },
  {
    id: 'reit_expansion',
    title: '公募 REITs 扩募常态化',
    description: 'REITs 市场扩容，物流与商业地产 REITs 估值提升、分红增加。',
    type: 'market',
    effect: {
      type: 'macroEvent',
      eventCategory: 'policyRegulation',
      assetImpacts: {
        reit: { priceChange: 1.2, cashFlowChange: 1.15 },
        物流地产: { priceChange: 1.25, cashFlowChange: 1.2 },
        商业地产: { priceChange: 1.15, cashFlowChange: 1.1 },
        REITs: { priceChange: 1.2, cashFlowChange: 1.15 },
      },
    },
  },

  {
    id: 'fed_rate_hike',
    title: '美联储加息周期',
    description: '美联储持续加息，全球流动性收紧，海外资产与成长股承压。',
    type: 'market',
    effect: {
      type: 'macroEvent',
      eventCategory: 'globalLiquidity',
      rateChange: 0.01,
      assetImpacts: {
        overseas: { priceChange: 0.85, cashFlowChange: 0.95 },
        stock: { priceChange: 0.92, cashFlowChange: 0.95 },
        bond: { priceChange: 0.95 },
        commodity: { priceChange: 0.9 },
        reit: { priceChange: 0.92 },
        科技: { priceChange: 0.8 },
        贵金属: { priceChange: 0.95 },
      },
    },
  },

  // ── 地产政策 ──
  {
    id: 'property_easing',
    title: '地产政策放松',
    description: '限购松绑、首付下调，一二线楼市回暖，商铺租金回升。',
    type: 'market',
    effect: {
      type: 'macroEvent',
      eventCategory: 'policyRegulation',
      rateChange: -0.005,
      assetImpacts: {
        realEstate: { priceChange: 1.2, cashFlowChange: 1.08 },
        reit: { priceChange: 1.1, cashFlowChange: 1.05 },
        商业地产: { priceChange: 1.15, cashFlowChange: 1.1 },
        物流地产: { priceChange: 1.08 },
        entity: { priceChange: 1.05 },
      },
    },
  },
  {
    id: 'property_tightening',
    title: '地产政策收紧',
    description: '三道红线与限购加码，开发商承压，房产估值回调。',
    type: 'market',
    effect: {
      type: 'macroEvent',
      eventCategory: 'policyRegulation',
      assetImpacts: {
        realEstate: { priceChange: 0.82, cashFlowChange: 0.9 },
        reit: { priceChange: 0.88, cashFlowChange: 0.92 },
        商业地产: { priceChange: 0.85, cashFlowChange: 0.88 },
        entity: { priceChange: 0.9, cashFlowChange: 0.92 },
        business: { priceChange: 0.88 },
      },
    },
  },

  // ── 主题行情（续） ──
  {
    id: 'commodity_super_cycle',
    title: '大宗商品超级周期',
    description: '全球复苏拉动资源需求，有色、能源、农产品价格齐涨。',
    type: 'market',
    effect: {
      type: 'macroEvent',
      eventCategory: 'economicCycle',
      assetImpacts: {
        commodity: { priceChange: 1.4 },
        有色金属: { priceChange: 1.5 },
        能源: { priceChange: 1.45 },
        农产品: { priceChange: 1.3 },
        贵金属: { priceChange: 1.2 },
        stock: { priceChange: 1.05 },
        bond: { priceChange: 0.95 },
        科技: { priceChange: 0.9 },
      },
    },
  },
  {
    id: 'offline_consumption_recovery',
    title: '线下消费复苏',
    description: '客流回暖，餐饮零售实体经营改善，商业地产租金回升。',
    type: 'market',
    effect: {
      type: 'macroEvent',
      eventCategory: 'industryTrend',
      assetImpacts: {
        entity: { priceChange: 1.2, cashFlowChange: 1.25 },
        餐饮: { priceChange: 1.3, cashFlowChange: 1.3 },
        零售: { priceChange: 1.15, cashFlowChange: 1.2 },
        商业地产: { priceChange: 1.12, cashFlowChange: 1.1 },
        reit: { priceChange: 1.08, cashFlowChange: 1.05 },
        消费: { priceChange: 1.15, cashFlowChange: 1.05 },
      },
    },
  },
  {
    id: 'geopolitical_energy_crisis',
    title: '地缘能源危机',
    description: '地缘冲突推高油气价格，能源股与商品大涨，出行成本上升。',
    type: 'market',
    effect: {
      type: 'macroEvent',
      eventCategory: 'globalLiquidity',
      assetImpacts: {
        commodity: { priceChange: 1.35 },
        能源: { priceChange: 1.6, cashFlowChange: 1.2 },
        贵金属: { priceChange: 1.25 },
        stock: { priceChange: 0.92, cashFlowChange: 0.95 },
        overseas: { priceChange: 0.9 },
        entity: { priceChange: 0.95, cashFlowChange: 0.9 },
        汽车: { priceChange: 0.88, cashFlowChange: 0.85 },
        bond: { priceChange: 1.05 },
      },
    },
  },

  // ── 兼容旧卡（保留交互型效果） ──
  {
    id: 'market_rate_cut',
    title: '央行降息',
    description: '贷款利率下调，EPI 类负债月供重算，月供压力减轻。',
    type: 'market',
    effect: { type: 'interestRate', rateChange: -0.02 },
  },
  {
    id: 'market_recession',
    title: '经济衰退',
    description: '资产贬值 30%，现金流减少 20%。',
    type: 'market',
    effect: {
      type: 'assetDepreciation',
      multiplier: 0.7,
      assetImpacts: {
        stock: { cashFlowChange: 0.8 },
        bond: { cashFlowChange: 0.9 },
        reit: { cashFlowChange: 0.8 },
        commodity: { cashFlowChange: 0.85 },
        derivative: { cashFlowChange: 0.75 },
        overseas: { cashFlowChange: 0.8 },
        entity: { cashFlowChange: 0.8 },
        realEstate: { cashFlowChange: 0.8 },
        business: { cashFlowChange: 0.8 },
        intellectual: { cashFlowChange: 0.85 },
      },
    },
  },
  {
    id: 'market_tech_boom',
    title: '科技行业利好',
    description: '科技股翻倍，手中股票价值 ×2。',
    type: 'market',
    effect: { type: 'sectorBoom', sector: 'stock', multiplier: 2 },
  },
  {
    id: 'life_unemployment',
    title: '公司裁员 / 行业下行失业',
    description: '经济寒冬来袭，你的行业遭遇裁员潮。职业层级越低，失业风险越高。',
    type: 'market',
    effect: { type: 'unemployment', eventCategory: 'economicCycle' },
  },
  {
    id: 'life_reemployment',
    title: '再就业机遇',
    description: '市场回暖，你收到新的工作机会。薪资可能恢复或略有下降。',
    type: 'market',
    effect: { type: 'reemployment', eventCategory: 'economicCycle' },
  },

  // ── 【新增】v3.6 个股 PE 事件 ──
  {
    id: 'stock_earnings_beat',
    title: '个股业绩大增',
    description: '你持仓的一只股票发布超预期财报，当前动态 PE 大幅提升。',
    type: 'market',
    effect: {
      type: 'stockPeEvent',
      eventCategory: 'industryTrend',
      stockPeDelta: 0.4,
    },
  },
  {
    id: 'stock_financial_fraud',
    title: '财务暴雷',
    description: '你持仓的一只股票深陷财务造假丑闻，当前 PE 腰斩，全年股息归零。',
    type: 'market',
    effect: {
      type: 'stockPeEvent',
      eventCategory: 'policyRegulation',
      stockPeDelta: -0.5,
      assetImpacts: {
        stock: { cashFlowChange: 0 },
      },
    },
  },
  {
    id: 'sector_upswing',
    title: '行业景气上行',
    description: '你持仓股票所属行业迎来景气周期，行业中枢 PE 提升。',
    type: 'market',
    effect: {
      type: 'stockPeEvent',
      eventCategory: 'industryTrend',
      sectorBasePeDelta: 0.2,
    },
  },
  {
    id: 'sector_decline',
    title: '行业衰退',
    description: '你持仓股票所属行业陷入衰退周期，行业中枢 PE 下调。',
    type: 'market',
    effect: {
      type: 'stockPeEvent',
      eventCategory: 'economicCycle',
      sectorBasePeDelta: -0.3,
    },
  },
  {
    id: 'buyout_premium',
    title: '场外收购要约',
    description: '有买家向你持有的某只股票发出溢价 20% 的收购要约。',
    type: 'market',
    effect: {
      type: 'buyout',
      targetAssetType: 'stock',
      multiplier: 1.2,
      buyoutPremium: 0.2,
    },
  },
  {
    id: 'dividend_adjust',
    title: '分红调整',
    description: '市场风格切换，高股息与成长股估值微调，持仓股票动态 PE 小幅波动。',
    type: 'market',
    effect: {
      type: 'stockPeEvent',
      eventCategory: 'industryTrend',
      stockPeDelta: 0.05,
    },
  },

  // ── 【新增】v3.7 PE 均值回归市场卡 ──
  {
    id: 'pe_mean_reversion_high',
    title: '高PE均值回归',
    description: '市场估值过高引发获利回吐，所有股票当前动态PE回落30%，高估值品种承压最大。',
    type: 'market',
    effect: {
      type: 'stockPeEvent',
      eventCategory: 'economicCycle',
      stockPeDelta: -0.3,
    },
  },
  {
    id: 'pe_mean_reversion_low',
    title: '低PE均值修复',
    description: '市场情绪回暖价值发现，所有股票当前动态PE修复反弹40%，低估品种率先受益。',
    type: 'market',
    effect: {
      type: 'stockPeEvent',
      eventCategory: 'economicCycle',
      stockPeDelta: 0.4,
    },
  },

  // ── 【新增】v3.7 通胀/通缩对冲市场卡 ──
  {
    id: 'inflation_spike',
    title: '通胀飙升',
    description: 'CPI超预期大涨，现金购买力下降5%，房地产/商品/高股息股票受益，债券承压。',
    type: 'market',
    effect: {
      type: 'inflationEvent',
      eventCategory: 'economicCycle',
      inflationDelta: 0.05,
      assetImpacts: {
        realEstate: { priceChange: 1.08 },
        commodity: { priceChange: 1.15 },
        stock: { cashFlowChange: 1.05 },
        bond: { priceChange: 0.92 },
      },
    },
  },
  {
    id: 'deflation_spiral',
    title: '通缩螺旋',
    description: '需求萎缩物价下跌，现金购买力上升5%，债券受益，股票/房产等风险资产承压。',
    type: 'market',
    effect: {
      type: 'inflationEvent',
      eventCategory: 'economicCycle',
      inflationDelta: -0.05,
      assetImpacts: {
        bond: { priceChange: 1.08 },
        stock: { priceChange: 0.92 },
        realEstate: { priceChange: 0.88 },
        commodity: { priceChange: 0.85 },
      },
    },
  },
  {
    id: 'inflation_mild',
    title: '温和通胀',
    description: '温和通胀环境利好实体经济和楼市，现金小幅贬值2%，消费板块受益。',
    type: 'market',
    effect: {
      type: 'inflationEvent',
      eventCategory: 'economicCycle',
      inflationDelta: 0.02,
      assetImpacts: {
        realEstate: { priceChange: 1.05 },
        entity: { priceChange: 1.03, cashFlowChange: 1.05 },
        消费: { priceChange: 1.08 },
        bond: { priceChange: 0.97 },
      },
    },
  },
  // 【新增】v3.8 育儿补贴上调市场卡
  {
    id: 'market_child_subsidy_up',
    title: '育儿补贴上调',
    description: '国家发布新育儿补贴政策，0-3岁儿童补贴翻倍，持续10回合。',
    type: 'market',
    effect: {
      type: 'childSubsidyUp',
    },
  },
];
