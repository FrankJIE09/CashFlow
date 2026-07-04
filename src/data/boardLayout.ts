import type { Space } from '../types/game';

export const SPACES: Space[] = [
  { id: 0, type: 'opportunity', name: '小生意机会', description: '抽取一张机会卡。' },
  { id: 1, type: 'opportunity', name: '小生意机会', description: '抽取一张机会卡。' },
  { id: 2, type: 'doodad', name: '额外支出', description: '生活总有意外开销。' },
  { id: 3, type: 'market', name: '市场波动', description: '市场发生变化。' },
  { id: 4, type: 'doodad', name: '额外支出', description: '生活总有意外开销。' },
  { id: 5, type: 'opportunity', name: '大买卖机会', description: '抽取一张机会卡。' },
  { id: 6, type: 'promotion', name: '升迁机会', description: '职场晋升，薪资上涨但需投入。' },
  { id: 7, type: 'charity', name: '慈善捐款', description: '捐款可换取未来掷双骰子的机会。' },
  { id: 8, type: 'settlement', name: '税务结算', description: '缴纳本月税款。' },
  { id: 9, type: 'opportunity', name: '小生意机会', description: '抽取一张机会卡。' },
  { id: 10, type: 'marriage', name: '婚恋格', description: '人生重大选择：结婚或保持单身。' },
  { id: 11, type: 'opportunity', name: '大买卖机会', description: '抽取一张机会卡。' },
  { id: 12, type: 'market', name: '市场波动', description: '市场发生变化。' },
  { id: 13, type: 'opportunity', name: '大买卖机会', description: '抽取一张机会卡。' },
  { id: 14, type: 'baby', name: '生孩子', description: '家里添丁，支出增加。' },
  { id: 15, type: 'doodad', name: '额外支出', description: '生活总有意外开销。' },
  { id: 16, type: 'doodad', name: '额外支出', description: '生活总有意外开销。' },
  { id: 17, type: 'market', name: '市场波动', description: '市场发生变化。' },
  { id: 18, type: 'market', name: '市场波动', description: '市场发生变化。' },
  { id: 19, type: 'opportunity', name: '小生意机会', description: '抽取一张机会卡。' },
  { id: 20, type: 'opportunity', name: '小生意机会', description: '抽取一张机会卡。' },
  { id: 21, type: 'market', name: '市场波动', description: '市场发生变化。' },
  { id: 22, type: 'opportunity', name: '大买卖机会', description: '抽取一张机会卡。' },
  { id: 23, type: 'settlement', name: '年度结算', description: '年度财务结算。' },
];

export const SPACE_COLORS: Record<Space['type'], string> = {
  opportunity: '#3498db',
  market: '#f1c40f',
  doodad: '#e74c3c',
  charity: '#9b59b6',
  baby: '#ff9ff3',
  marriage: '#ffb3ba',
  settlement: '#7f8c8d',
  promotion: '#f39c12',
};
