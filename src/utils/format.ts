export function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  return `${sign}¥${absAmount.toLocaleString('zh-CN')}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
