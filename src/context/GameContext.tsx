import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { GameState } from '../types/game';
import { gameReducer, getInitialGameState } from './GameReducer';
import type { GameAction } from '../types/game';

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, getInitialGameState());

  return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
