import { useGame } from '../context/GameContext';
import { checkBankruptcy } from '../utils/financial';

export function useBankruptcy() {
  const { state } = useGame();
  const player = state.players[state.currentPlayerIndex];

  if (!player) return { isBankrupt: false, canRecover: false };

  const isBankrupt = player.isBankrupt;
  const canRecover = player.cash < 0 && !checkBankruptcy(player, state.cashFlowMultiplier, state.sectorMultiplier);

  return { isBankrupt, canRecover, player };
}
