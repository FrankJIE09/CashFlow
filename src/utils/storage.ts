import type { GameState } from '../types/game';

const SAVE_KEY = 'cashflow-game-save';

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

export function loadGame(): GameState | null {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    return data ? (JSON.parse(data) as GameState) : null;
  } catch {
    return null;
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
