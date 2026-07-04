import type { GameState } from '../types/game';
import { createDefaultMultiplierRecord, normalizeLiability } from './financial';
import { DEFAULT_CITY_ID } from '../data/cities';

const SAVE_KEY = 'cashflow-game-save';

function normalizePlayer(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({
      ...p,
      cityId: p.cityId ?? DEFAULT_CITY_ID,
      liabilities: p.liabilities.map(normalizeLiability),
      expenses: { taxHouse: 0, ...p.expenses },
    })),
  };
}

function normalizeGameState(state: GameState): GameState {
  return normalizePlayer({
    ...state,
    marketMultiplier: { ...createDefaultMultiplierRecord(), ...state.marketMultiplier },
    cashFlowMultiplier: state.cashFlowMultiplier
      ? { ...createDefaultMultiplierRecord(), ...state.cashFlowMultiplier }
      : createDefaultMultiplierRecord(),
    sectorMultiplier: state.sectorMultiplier ?? {},
  });
}

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
    return data ? normalizeGameState(JSON.parse(data) as GameState) : null;
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
