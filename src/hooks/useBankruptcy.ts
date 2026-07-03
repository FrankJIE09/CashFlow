import { useGame } from '../context/GameContext';
import { checkBankruptcy } from '../utils/financial';

export function useBankruptcy() {
  const { state } = useGame();
  const player = state.players[state.currentPlayerIndex];

  if (!player) return { isBankrupt: false, canRecover: false };

  const isBankrupt = player.isBankrupt;
  const canRecover = !checkBankruptcy(player) && player.cash < 0;

  return { isBankrupt, canRecover, player };
}
