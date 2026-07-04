export function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  return `${sign}¥${absAmount.toLocaleString('zh-CN')}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** 显示年龄到月，如 28岁3月 */
export function formatPlayerAge(player: { age: number; ageMonths?: number }): string {
  const months = player.ageMonths ?? 0;
  if (months === 0) return `${player.age}岁`;
  return `${player.age}岁${months}月`;
}
