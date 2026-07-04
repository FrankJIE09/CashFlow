import type { AssetType } from '../../types/game';

export const SPACE_ICONS: Record<string, string> = {
  opportunity: '💼',
  market: '📈',
  doodad: '🛍️',
  charity: '💝',
  baby: '👶',
  marriage: '💍',
  settlement: '🏛️',
  promotion: '🎖️',
};

export const ASSET_ICONS: Record<AssetType, string> = {
  stock: '📊',
  bond: '📜',
  reit: '🏢',
  commodity: '🥇',
  derivative: '📉',
  overseas: '🌏',
  entity: '🏪',
  realEstate: '🏠',
  business: '🏭',
  intellectual: '📚',
};

export const STATUS_ICONS: Record<string, string> = {
  fastTrack: '🚀',
  bankrupt: '💀',
  charity: '✨',
  baby: '🍼',
  positive: '😊',
  negative: '😢',
  coin: '🪙',
  loan: '⛓️',
  child: '👣',
  married: '💑',
  divorced: '💔',
  unemployed: '📭',
  pregnant: '🤰',
};

export const PROFESSION_AVATARS: Record<string, string> = {
  engineer: '👨‍💻',
  teacher: '👩‍🏫',
  doctor: '👨‍⚕️',
  driver: '🚕',
  secretary: '👩‍💼',
  security: '👮',
  lawyer: '👩‍⚖️',
  pilot: '👨‍✈️',
  nurse: '👩‍⚕️',
  accountant: '🧮',
  designer: '🎨',
  sales: '📣',
  delivery: '🛵',
  factory: '🏭',
  freelancer: '💻',
  custom: '✨',
};

export function getSpaceIcon(type: string): string {
  return SPACE_ICONS[type] ?? '❓';
}

export function getAssetIcon(type: AssetType): string {
  return ASSET_ICONS[type] ?? '💼';
}
