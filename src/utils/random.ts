import type { Card, Decks } from '../types/game';

export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function rollTwoDice(): [number, number] {
  return [rollDice(), rollDice()];
}

export function drawCard<T extends Card>(deck: T[], discardPile: T[]): { card: T; deck: T[]; discardPile: T[] } | null {
  if (deck.length === 0) {
    if (discardPile.length === 0) return null;
    deck = shuffle(discardPile);
    discardPile = [];
  }

  const card = deck[0];
  const newDeck = deck.slice(1);
  const newDiscardPile = [...discardPile, card];

  return { card, deck: newDeck, discardPile: newDiscardPile };
}

export function createInitialDecks(): Decks {
  return {
    opportunity: [],
    market: [],
    doodad: [],
  };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
