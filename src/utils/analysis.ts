import type { Player } from '../types/game';
import { getTotalLiabilities, getTotalExpenses, getPassiveIncome } from './financial';

export interface AnalysisAdvice {
  level: '🔴' | '🟡' | '🟢' | 'ℹ️';
  label: string;
  detail: string;
}

/** 基于玩家最终快照生成复盘诊断建议 */
export function generateAdvices(player: Player): AnalysisAdvice[] {
  const advices: AnalysisAdvice[] = [];
  const totalLiab = getTotalLiabilities(player);
  const annualIncome = (player.baseSalary ?? player.salary) * 12;
  const monthlyExpenses = getTotalExpenses(player);
  const passiveIncome = getPassiveIncome(player);

  // ① 杠杆率
  if (annualIncome > 0) {
    const leverage = totalLiab / annualIncome;
    if (leverage > 8) {
      advices.push({
        level: '🔴',
        label: '负债过高',
        detail: `总负债 ${(totalLiab / 10000).toFixed(0)} 万元，是年收入的 ${leverage.toFixed(1)} 倍。月供压力极大，建议将负债控制在年收入的 2 倍以内。`,
      });
    } else if (leverage > 3) {
      advices.push({
        level: '🟡',
        label: '杠杆偏高',
        detail: `总负债是年收入的 ${leverage.toFixed(1)} 倍，注意控制贷款规模，避免现金流断裂。`,
      });
    } else if (leverage < 0.5) {
      advices.push({
        level: '🟢',
        label: '负债控制良好',
        detail: `总负债仅为年收入的 ${(leverage * 100).toFixed(0)}%，财务状况稳健。`,
      });
    }
  }

  // ② 备用金
  if (monthlyExpenses > 0) {
    const reserveMonths = player.cash / monthlyExpenses;
    if (reserveMonths < 1) {
      advices.push({
        level: '🔴',
        label: '备用金严重不足',
        detail: `现金仅 ${player.cash} 元，不够 1 个月开支（月支出 ${monthlyExpenses} 元）。建议预留 6 个月生活费作为紧急备用金。`,
      });
    } else if (reserveMonths < 3) {
      advices.push({
        level: '🟡',
        label: '备用金偏少',
        detail: `现金可支撑 ${reserveMonths.toFixed(1)} 个月开支，建议储备 6 个月以上。`,
      });
    } else {
      advices.push({
        level: '🟢',
        label: '备用金充足',
        detail: `现金可支撑 ${reserveMonths.toFixed(1)} 个月开支，抗风险能力较好。`,
      });
    }
  }

  // ③ 财务自由进度
  if (monthlyExpenses > 0) {
    const freedom = passiveIncome / monthlyExpenses;
    if (freedom >= 1) {
      advices.push({
        level: '🟢',
        label: '已实现财务自由',
        detail: `被动收入已覆盖全部支出，恭喜出圈！`,
      });
    } else if (freedom >= 0.5) {
      advices.push({
        level: '🟢',
        label: '财务自由过半',
        detail: `被动收入覆盖了 ${(freedom * 100).toFixed(0)}% 的支出，继续积累生息资产！`,
      });
    } else if (freedom >= 0.2) {
      advices.push({
        level: 'ℹ️',
        label: '财务自由进度',
        detail: `被动收入覆盖 ${(freedom * 100).toFixed(0)}% 的支出，建议优先买入能产生正向现金流的资产。`,
      });
    } else {
      advices.push({
        level: 'ℹ️',
        label: '被动收入偏低',
        detail: `被动收入仅覆盖 ${(freedom * 100).toFixed(0)}% 的支出，应重点积累生息资产，不要只靠工资。`,
      });
    }
  }

  // ④ 资产配置
  const stockAssets = player.assets.filter(a => a.type === 'stock' || a.type === 'overseas' || a.type === 'derivative');
  const reAssets = player.assets.filter(a => a.type === 'realEstate');
  const totalAssets = player.assets.length;

  if (totalAssets > 0) {
    const stockRatio = stockAssets.length / totalAssets;
    const reRatio = reAssets.length / totalAssets;

    if (stockRatio > 0.7) {
      advices.push({
        level: '🟡',
        label: '持仓过于集中',
        detail: `股票类资产占总资产的 ${(stockRatio * 100).toFixed(0)}%，波动风险大，建议配置房产或实体经营分散风险。`,
      });
    } else if (reRatio > 0.7) {
      advices.push({
        level: '🟡',
        label: '不动产占比过高',
        detail: `房产类资产占总资产的 ${(reRatio * 100).toFixed(0)}%，流动性差，紧急时难以快速变现。`,
      });
    } else {
      advices.push({
        level: '🟢',
        label: '资产配置合理',
        detail: `股票 ${(stockRatio * 100).toFixed(0)}% / 房产 ${(reRatio * 100).toFixed(0)}% / 其他 ${((1 - stockRatio - reRatio) * 100).toFixed(0)}%，分散度较好。`,
      });
    }
  } else {
    advices.push({
      level: '🔴',
      label: '无任何资产',
      detail: '一局游戏下来没有买入任何资产，工资永远无法让你财务自由。',
    });
  }

  // ⑤ 职业发展
  const promoCount = player.promotionCount ?? player.promotionLevel ?? 0;
  if (promoCount > 0) {
    advices.push({
      level: 'ℹ️',
      label: '升迁记录',
      detail: `职业生涯晋升 ${promoCount} 次，每次升迁都能提升工资和被动收入。`,
    });
  }

  if (player.isUnemployed) {
    advices.push({
      level: '🟡',
      label: '处于失业状态',
      detail: '失业期间工资归零，应尽快通过升迁格触发再就业事件。',
    });
  }

  // ⑥ 婚姻
  if (player.marriageStatus === 'married') {
    if (player.marriageHappiness >= 50) {
      advices.push({
        level: '🟢',
        label: '婚姻幸福',
        detail: `幸福度 ${player.marriageHappiness}，工资 +10% 加成生效中。`,
      });
    } else if (player.marriageHappiness < 40) {
      advices.push({
        level: '🟡',
        label: '婚姻危机',
        detail: `幸福度仅 ${player.marriageHappiness}，有离婚风险。离婚会损失伴侣收入和一半现金，尽量维持婚姻。`,
      });
    }
  }

  if ((player.divorceCount ?? 0) > 0) {
    advices.push({
      level: '🟡',
      label: '有过离婚经历',
      detail: `离婚 ${player.divorceCount} 次，每次离婚都有财产损失。`,
    });
  }

  // ⑦ 投资行为总结
  if (totalAssets > 0 && passiveIncome <= 0) {
    advices.push({
      level: '🔴',
      label: '总被动收入为负或零',
      detail: '持有的资产没有产生正向现金流，说明主要以消耗型资产（车辆）或投机型资产为主。应优先买入能带来正向现金流的资产（房产出租、实体经营、高股息股票）。',
    });
  }

  return advices;
}
