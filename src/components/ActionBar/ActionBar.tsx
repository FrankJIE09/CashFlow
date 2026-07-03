import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../context/GameContext';
import { useGameActions } from '../../hooks/useGameActions';
import { useSound } from '../../hooks/useSound';
import { AnimatedDice } from '../AnimatedDice/AnimatedDice';
import { getCurrentDebt, getMaxLoanAmount, getMonthlyCashFlow } from '../../utils/financial';
import { formatCurrency } from '../../utils/format';
import { STATUS_ICONS } from '../Icons/GameIcons';
import styles from './ActionBar.module.css';

export function ActionBar() {
  const { state } = useGame();
  const actions = useGameActions();
  const { play } = useSound();
  const player = state.players[state.currentPlayerIndex];
  const [loanAmount, setLoanAmount] = useState(1000);
  const [isRolling, setIsRolling] = useState(false);
  const [diceValue, setDiceValue] = useState(1);
  const [feedbackIcon, setFeedbackIcon] = useState<string | null>(null);

  useEffect(() => {
    if (state.phase === 'TURN_END' && player) {
      const icon = getMonthlyCashFlow(player) >= 0 ? STATUS_ICONS.coin : STATUS_ICONS.negative;
      setFeedbackIcon(icon);
      const timer = setTimeout(() => setFeedbackIcon(null), 1200);
      return () => clearTimeout(timer);
    }
  }, [state.phase, player, player?.id]);

  if (!player) return null;

  const isHumanTurn = !player.isAI && !player.isBankrupt;
  const canRoll = state.phase === 'ROLLING' || state.phase === 'FAST_TRACK';
  const canEndTurn = state.phase === 'TURN_END';
  const maxLoan = Math.max(0, getMaxLoanAmount(player) - getCurrentDebt(player));
  const cashFlow = getMonthlyCashFlow(player);

  const handleRoll = () => {
    if (!canRoll || !isHumanTurn) return;
    setIsRolling(true);
    play('dice');
    actions.rollAndMove(player.isInFastTrack, player.charityTurns > 0);
    setTimeout(() => {
      setIsRolling(false);
      setDiceValue(state.pendingDice ?? 1);
    }, 700);
  };

  return (
    <div className={`${styles.actionBar} cartoon-card`}>
      <div className={styles.turnInfo}>
        <div className={styles.currentPlayer}>
          <span className={styles.colorDot} style={{ backgroundColor: player.color }} />
          <span className={styles.playerName}>当前回合：{player.name}</span>
        </div>
        <div className={styles.phase}>阶段：{getPhaseText(state.phase)}</div>
      </div>

      <div className={styles.actions}>
        <div className={styles.rollArea}>
          <button
            className={`${styles.rollButton} cartoon-button`}
            onClick={handleRoll}
            disabled={!canRoll || !isHumanTurn || isRolling}
          >
            {isRolling ? '掷骰中...' : '🎲 掷骰子'}
            {player.charityTurns > 0 && <span className={styles.badge}>双骰子</span>}
            {player.isInFastTrack && <span className={styles.badge}>双骰子</span>}
          </button>
          <AnimatePresence>
            {isRolling && (
              <motion.div
                className={styles.diceContainer}
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: -20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <AnimatedDice value={diceValue} isRolling={isRolling} size={56} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          className={`${styles.endButton} cartoon-button`}
          onClick={actions.endTurn}
          disabled={!canEndTurn || !isHumanTurn}
        >
          ✅ 结束回合
        </button>

        <div className={styles.loanSection}>
          <input
            type="number"
            className={styles.loanInput}
            value={loanAmount}
            onChange={(e) => setLoanAmount(Math.max(0, Number(e.target.value)))}
            min={0}
            step={1000}
          />
          <button
            className={`${styles.loanButton} cartoon-button`}
            onClick={() => actions.takeLoan(loanAmount)}
            disabled={loanAmount > maxLoan || loanAmount <= 0 || !isHumanTurn}
          >
            🏦 贷款
          </button>
          <span className={styles.loanInfo}>可贷上限：{formatCurrency(maxLoan)}</span>
        </div>
      </div>

      <div className={styles.statusBar}>
        <div className={`${styles.statusItem} ${cashFlow >= 0 ? styles.positive : styles.negative}`}>
          <span className={styles.statusIcon}>{cashFlow >= 0 ? '😊' : '😢'}</span>
          <span>现金流：{formatCurrency(cashFlow)}</span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusIcon}>🔄</span>
          <span>回合 {state.round}</span>
        </div>
      </div>

      <AnimatePresence>
        {feedbackIcon && (
          <motion.div
            className={styles.feedbackOverlay}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4 }}
          >
            <span className={styles.feedbackIcon}>{feedbackIcon}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getPhaseText(phase: string): string {
  const map: Record<string, string> = {
    SETUP: '准备',
    ROLLING: '等待掷骰子',
    MOVING: '移动中',
    EVENT_RESOLVING: '事件处理',
    CARD_DECISION: '决策中',
    TURN_END: '回合结束',
    FAST_TRACK: '快车道',
    GAME_OVER: '游戏结束',
  };
  return map[phase] || phase;
}
