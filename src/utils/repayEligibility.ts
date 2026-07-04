import type { GamePhase, GameState, Liability, Player } from '../types/game';

export const REPAY_ALLOWED_PHASES: GamePhase[] = ['TURN_END'];

export function getRepayableLiabilities(player: Player): Liability[] {
  return player.liabilities.filter((l) => l.principal > 0);
}

export function canPlayerRepay(state: GameState, player: Player): boolean {
  if (player.isAI || player.isBankrupt) return false;
  const current = state.players[state.currentPlayerIndex];
  if (!current || player.id !== current.id) return false;
  if (!REPAY_ALLOWED_PHASES.includes(state.phase)) return false;
  return getRepayableLiabilities(player).length > 0;
}
