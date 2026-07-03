import type { MarketCard } from '../types/game';

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
