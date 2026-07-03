import { useCallback } from 'react';
import { rollDice, rollTwoDice } from '../utils/random';

export function useDice() {
  const roll = useCallback(() => rollDice(), []);
  const rollTwo = useCallback(() => rollTwoDice(), []);

  return { roll, rollTwo };
}
