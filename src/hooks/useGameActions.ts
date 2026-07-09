import { useCallback } from 'react';
import type { Difficulty, GameConfig } from '../types/game';
import { useGame } from '../context/GameContext';
import { rollDice, rollTwoDice } from '../utils/random';

export function useGameActions() {
  const { dispatch } = useGame();

  const setupGame = useCallback((config: GameConfig) => {
    dispatch({ type: 'SETUP_GAME', payload: config });
  }, [dispatch]);

  const stopAutoTest = useCallback(() => {
    dispatch({ type: 'STOP_AUTO_TEST' });
  }, [dispatch]);

  const restartGame = useCallback(() => {
    dispatch({ type: 'RESTART_GAME' });
  }, [dispatch]);

  const rollAndMove = useCallback((isFastTrack: boolean, hasCharity: boolean) => {
    let dice: number;
    if (isFastTrack || hasCharity) {
      const [d1, d2] = rollTwoDice();
      // 对于双骰子，选择较大的值（简单策略）
      dice = Math.max(d1, d2);
    } else {
      dice = rollDice();
    }
    dispatch({ type: 'ROLL_DICE', payload: { dice } });
    // 移动动画后调用
    setTimeout(() => {
      dispatch({ type: 'MOVE_PLAYER' });
    }, 500);
  }, [dispatch]);

  const rollSingleDice = useCallback(() => {
    const dice = rollDice();
    dispatch({ type: 'ROLL_DICE', payload: { dice } });
  }, [dispatch]);

  const movePlayer = useCallback(() => {
    dispatch({ type: 'MOVE_PLAYER' });
  }, [dispatch]);

  const buyAsset = useCallback((shareHand?: number) => {
    dispatch({ type: 'BUY_ASSET', payload: shareHand !== undefined ? { shareHand } : undefined });
  }, [dispatch]);

  const buyDiscountedAsset = useCallback((shareHand?: number) => {
    dispatch({ type: 'BUY_DISCOUNTED_ASSET', payload: shareHand !== undefined ? { shareHand } : undefined });
  }, [dispatch]);

  const declineCard = useCallback(() => {
    dispatch({ type: 'DECLINE_CARD' });
  }, [dispatch]);

  const payDoodad = useCallback(() => {
    dispatch({ type: 'PAY_DOODAD' });
  }, [dispatch]);

  const donateCharity = useCallback((donate: boolean) => {
    dispatch({ type: 'DONATE_CHARITY', payload: { donate } });
  }, [dispatch]);

  const chooseBaby = useCallback((haveBaby: boolean) => {
    dispatch({ type: 'CHOOSE_BABY', payload: { haveBaby } });
  }, [dispatch]);

  const chooseMarriage = useCallback((marry: boolean) => {
    dispatch({ type: 'CHOOSE_MARRIAGE', payload: { marry } });
  }, [dispatch]);

  const choosePregnancyPath = useCallback((path: import('../types/game').PregnancyPath) => {
    dispatch({ type: 'CHOOSE_PREGNANCY_PATH', payload: { path } });
  }, [dispatch]);

  const confirmRetirement = useCallback(() => {
    dispatch({ type: 'CONFIRM_RETIREMENT' });
  }, [dispatch]);

  const confirmSettlement = useCallback(() => {
    dispatch({ type: 'CONFIRM_SETTLEMENT' });
  }, [dispatch]);

  const choosePromotion = useCallback(
    (accept: boolean, jobHopChoice?: 'highPay' | 'stable') => {
      dispatch({
        type: 'CHOOSE_PROMOTION',
        payload: { accept, jobHopChoice },
      });
    },
    [dispatch]
  );

  const resolveMarriageGrid = useCallback(
    (counseling?: boolean) => {
      dispatch({ type: 'RESOLVE_MARRIAGE_GRID', payload: { counseling } });
    },
    [dispatch]
  );

  const manualRetire = useCallback(() => {
    dispatch({ type: 'MANUAL_RETIRE' });
  }, [dispatch]);

  const applyMarketEffect = useCallback(() => {
    dispatch({ type: 'APPLY_MARKET_EFFECT' });
  }, [dispatch]);

  const drawDiscountedOpportunity = useCallback(() => {
    dispatch({ type: 'DRAW_DISCOUNTED_OPPORTUNITY' });
  }, [dispatch]);

  const endTurn = useCallback(() => {
    dispatch({ type: 'END_TURN' });
  }, [dispatch]);

  const takeLoan = useCallback((amount: number) => {
    dispatch({ type: 'TAKE_LOAN', payload: { amount } });
  }, [dispatch]);

  const repayLiability = useCallback((liabilityId: string, amount: number) => {
    dispatch({ type: 'REPAY_LIABILITY', payload: { liabilityId, amount } });
  }, [dispatch]);

  const sellAsset = useCallback((assetId: string, multiplier: number, shareHand?: number) => {
    dispatch({ type: 'SELL_ASSET', payload: { assetId, multiplier, shareHand } });
  }, [dispatch]);

  const declareBankruptcy = useCallback(() => {
    dispatch({ type: 'DECLARE_BANKRUPTCY' });
  }, [dispatch]);

  const liquidateAsset = useCallback((assetId: string) => {
    dispatch({ type: 'LIQUIDATE_ASSET', payload: { assetId } });
  }, [dispatch]);

  const confirmCashFlowSettlement = useCallback(() => {
    dispatch({ type: 'CONFIRM_CASH_FLOW_SETTLEMENT' });
  }, [dispatch]);

  const confirmDivorce = useCallback((keepHouse: boolean) => {
    dispatch({ type: 'CONFIRM_DIVORCE', payload: { keepHouse } });
  }, [dispatch]);

  const sellStockManually = useCallback((assetId: string, sellHand: number) => {
    dispatch({ type: 'MANUAL_SELL_STOCK', payload: { assetId, sellHand } });
  }, [dispatch]);

  const setRentTier = useCallback((tier: 'economy' | 'standard' | 'luxury') => {
    dispatch({ type: 'SET_RENT_TIER', payload: { tier } });
  }, [dispatch]);

  const setDcaPlan = useCallback((assetId: string, monthlyAmount: number, smartEnabled: boolean, endRound: number | null) => {
    dispatch({ type: 'SET_DCA_PLAN', payload: { assetId, monthlyAmount, smartEnabled, endRound } });
  }, [dispatch]);

  const toggleDcaPlan = useCallback((planId: string) => {
    dispatch({ type: 'TOGGLE_DCA_PLAN', payload: { planId } });
  }, [dispatch]);

  const updateDcaPlan = useCallback((planId: string, params: { monthlyAmount?: number; smartEnabled?: boolean; endRound?: number | null }) => {
    dispatch({ type: 'UPDATE_DCA_PLAN', payload: { planId, ...params } });
  }, [dispatch]);

  const deleteDcaPlan = useCallback((planId: string) => {
    dispatch({ type: 'DELETE_DCA_PLAN', payload: { planId } });
  }, [dispatch]);

  return {
    setupGame,
    restartGame,
    stopAutoTest,
    rollAndMove,
    rollSingleDice,
    movePlayer,
    buyAsset,
    buyDiscountedAsset,
    declineCard,
    payDoodad,
    donateCharity,
    chooseBaby,
    chooseMarriage,
    choosePregnancyPath,
    confirmRetirement,
    confirmSettlement,
    choosePromotion,
    resolveMarriageGrid,
    manualRetire,
    applyMarketEffect,
    drawDiscountedOpportunity,
    endTurn,
    takeLoan,
    repayLiability,
    sellAsset,
    declareBankruptcy,
    liquidateAsset,
    confirmCashFlowSettlement,
    confirmDivorce,
    sellStockManually,
    setRentTier,
    setDcaPlan,
    toggleDcaPlan,
    updateDcaPlan,
    deleteDcaPlan,
  };
}

export function useCreateGameConfig(
  humanName: string,
  professionId: string,
  cityId: string,
  aiCount: number,
  aiDifficulty: Difficulty
): GameConfig {
  return {
    humanPlayerName: humanName || '玩家',
    humanProfessionId: professionId,
    cityId,
    aiCount,
    aiDifficulty,
  };
}
