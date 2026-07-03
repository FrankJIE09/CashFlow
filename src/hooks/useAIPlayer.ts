import { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useGameActions } from './useGameActions';
import {
  canAffordDownPayment,
  checkBankruptcy,
  getCurrentDebt,
  getMaxLoanAmount,
} from '../utils/financial';
import type { Card, Player } from '../types/game';

function shouldBuyOpportunity(player: Player, card: Card): boolean {
  if (card.type !== 'opportunity') return false;
  const asset = card.asset;
  const roi = asset.cashFlow / asset.downPayment;

  if (player.difficulty === 'hard') {
    const shortfall = asset.downPayment - player.cash;
    if (shortfall > 0) {
      return roi > 0.05 && getCurrentDebt(player) + shortfall <= getMaxLoanAmount(player);
    }
    return roi > 0.03;
  }

  if (player.difficulty === 'medium') {
    return asset.cashFlow > 0 && canAffordDownPayment(player, asset);
  }

  // easy: random
  return Math.random() > 0.7;
}

export function useAIPlayer() {
  const { state } = useGame();
  const actions = useGameActions();
  const player = state.players[state.currentPlayerIndex];

  useEffect(() => {
    if (!player || !player.isAI || player.isBankrupt) return;

    const timer = setTimeout(() => {
      if (state.phase === 'ROLLING' || state.phase === 'FAST_TRACK') {
        actions.rollAndMove(player.isInFastTrack, player.charityTurns > 0);
      } else if (state.phase === 'CARD_DECISION') {
        const space = state.spaces[player.position];
        const card = state.currentCard;

        if (space.type === 'charity') {
          // AI  rarely donates
          actions.donateCharity(player.difficulty === 'hard' && player.cash > player.salary * 2);
        } else if (card?.type === 'opportunity') {
          if (shouldBuyOpportunity(player, card)) {
            if (space.type === 'market') {
              actions.buyDiscountedAsset();
            } else {
              actions.buyAsset();
            }
          } else {
            actions.declineCard();
          }
        } else if (card?.type === 'doodad') {
          actions.payDoodad();
        } else if (card?.type === 'market') {
          const effect = card.effect;
          if (effect.type === 'buyout') {
            const targetType = effect.targetAssetType;
            const sellable = targetType
              ? player.assets.filter((a) => a.type === targetType)
              : player.assets;
            if (sellable.length > 0) {
              // sell the asset with lowest ROI
              const worst = sellable.reduce((prev, curr) =>
                curr.cashFlow / curr.downPayment < prev.cashFlow / prev.downPayment ? curr : prev
              );
              actions.sellAsset(worst.id, effect.multiplier || 1);
            } else {
              actions.declineCard();
            }
          } else if (effect.type === 'discount') {
            actions.drawDiscountedOpportunity();
          } else {
            actions.applyMarketEffect();
          }
        } else {
          actions.declineCard();
        }
      } else if (state.phase === 'TURN_END') {
        // Check if need loan to avoid bankruptcy
        if (player.cash < 0 && !checkBankruptcy(player)) {
          const needed = Math.abs(player.cash) + 1000;
          const maxLoan = getMaxLoanAmount(player) - getCurrentDebt(player);
          if (maxLoan > 0) {
            actions.takeLoan(Math.min(needed, maxLoan));
            return;
          }
        }
        actions.endTurn();
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [state, player, actions]);
}
