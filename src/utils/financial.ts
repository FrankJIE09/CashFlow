import type { Asset, AssetType, Player } from '../types/game';

export function getPassiveIncome(player: Player): number {
  return player.assets.reduce((sum, asset) => sum + asset.cashFlow, 0);
}

export function getTotalExpenses(player: Player): number {
  const base =
    player.expenses.tax +
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

export function getAssetMarketValue(asset: Asset, multiplier: number): number {
  return Math.round(asset.marketValue * multiplier);
}

export function getTotalAssetsValue(player: Player, multiplier: Record<AssetType, number>): number {
  return player.assets.reduce((sum, a) => sum + getAssetMarketValue(a, multiplier[a.type]), 0);
}

export function getNetWorth(player: Player, multiplier: Record<AssetType, number>): number {
  return player.cash + getTotalAssetsValue(player, multiplier) - getCurrentDebt(player);
}

export function canAffordDownPayment(player: Player, asset: Asset): boolean {
  return player.cash >= asset.downPayment;
}

export function getMaxLoanAmount(player: Player): number {
  const cashFlow = Math.max(getMonthlyCashFlow(player), 0);
  return cashFlow * 10;
}

export function getCurrentDebt(player: Player): number {
  return player.liabilities.reduce((sum, l) => sum + l.principal, 0);
}

export function canTakeLoan(player: Player, amount: number): boolean {
  const currentDebt = getCurrentDebt(player);
  const maxDebt = getMaxLoanAmount(player);
  return currentDebt + amount <= maxDebt;
}

export function checkFinancialFreedom(player: Player): boolean {
  return getPassiveIncome(player) > getTotalExpenses(player);
}

export function checkBankruptcy(player: Player): boolean {
  return player.cash < 0 && getMonthlyCashFlow(player) <= 0;
}

export function getAssetTypeLabel(type: AssetType): string {
  const labels: Record<AssetType, string> = {
    stock: '股票',
    realEstate: '房地产',
    business: '企业',
    intellectual: '知识产权',
  };
  return labels[type];
}

export function getSellPrice(asset: Asset, multiplier: number): number {
  return Math.round(asset.marketValue * multiplier);
}

export function calculateLoanMonthlyInterest(principal: number, annualRate: number): number {
  return Math.round(principal * (annualRate / 12));
}
