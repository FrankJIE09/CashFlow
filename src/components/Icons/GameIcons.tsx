import type { SpaceType } from '../../types/game';

export const SPACE_ICONS: Record<SpaceType, string> = {
  payday: '💰',
  opportunity: '💼',
  market: '📈',
  doodad: '🛍️',
  charity: '💝',
  baby: '👶',
  settlement: '🏛️',
};

export const ASSET_ICONS: Record<string, string> = {
  stock: '📊',
  realEstate: '🏠',
  business: '🏪',
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
};

export function getSpaceIcon(type: SpaceType): string {
  return SPACE_ICONS[type];
}
