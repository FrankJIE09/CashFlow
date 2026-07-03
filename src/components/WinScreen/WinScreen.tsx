import { useGame } from '../../context/GameContext';
import { useGameActions } from '../../hooks/useGameActions';
import { PROFESSIONS } from '../../data/professions';
import { getMonthlyCashFlow, getNetWorth, getPassiveIncome, getTotalExpenses } from '../../utils/financial';
import { formatCurrency } from '../../utils/format';
import styles from './WinScreen.module.css';

export function WinScreen() {
  const { state } = useGame();
  const { restartGame } = useGameActions();
  const winner = state.winner;

  if (!winner) return null;

  const profession = PROFESSIONS.find((p) => p.id === winner.professionId);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.trophy}>🏆</div>
        <h1 className={styles.title}>游戏结束</h1>
        <p className={styles.winner}>{winner.name} 赢得了游戏！</p>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span>职业</span>
            <span>{profession?.name}</span>
          </div>
          <div className={styles.stat}>
            <span>现金</span>
            <span>{formatCurrency(winner.cash)}</span>
          </div>
          <div className={styles.stat}>
            <span>净资产</span>
            <span>{formatCurrency(getNetWorth(winner, state.marketMultiplier))}</span>
          </div>
          <div className={styles.stat}>
            <span>月被动收入</span>
            <span>{formatCurrency(getPassiveIncome(winner))}</span>
          </div>
          <div className={styles.stat}>
            <span>月支出</span>
            <span>{formatCurrency(getTotalExpenses(winner))}</span>
          </div>
          <div className={styles.stat}>
            <span>月现金流</span>
            <span>{formatCurrency(getMonthlyCashFlow(winner))}</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.restartButton} onClick={restartGame}>
            再玩一局
          </button>
        </div>
      </div>
    </div>
  );
}
