import { useGame } from '../../context/GameContext';
import { useGameActions } from '../../hooks/useGameActions';
import { getPlayerProfessionName } from '../../data/professions';
import { getMonthlyCashFlow, getNetWorth, getPassiveIncome, getTotalExpenses } from '../../utils/financial';
import { formatCurrency } from '../../utils/format';
import styles from './WinScreen.module.css';

export function WinScreen() {
  const { state } = useGame();
  const { restartGame } = useGameActions();

  if (state.phase !== 'GAME_OVER') return null;

  const human = state.players.find((p) => !p.isAI);
  const humanFailed = Boolean(human?.isBankrupt);
  const winner = state.winner;

  if (humanFailed) {
    return (
      <div className={styles.overlay}>
        <div className={`${styles.modal} ${styles.failModal}`}>
          <div className={styles.trophy}>💀</div>
          <h1 className={styles.title}>游戏失败</h1>
          <p className={styles.failReason}>月现金流为负，无法继续游戏</p>
          {human && (
            <p className={styles.winner}>
              你的月现金流：{formatCurrency(getMonthlyCashFlow(human, state.cashFlowMultiplier, state.sectorMultiplier))}
            </p>
          )}
          {winner && <p className={styles.subWinner}>{winner.name} 继续游戏并获胜</p>}

          <div className={styles.actions}>
            <button className={styles.restartButton} onClick={restartGame}>
              再玩一局
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!winner) return null;

  const professionName = getPlayerProfessionName(winner);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.trophy}>🏆</div>
        <h1 className={styles.title}>游戏结束</h1>
        <p className={styles.winner}>{winner.name} 赢得了游戏！</p>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span>职业</span>
            <span>{professionName}</span>
          </div>
          <div className={styles.stat}>
            <span>现金</span>
            <span>{formatCurrency(winner.cash)}</span>
          </div>
          <div className={styles.stat}>
            <span>净资产</span>
            <span>{formatCurrency(getNetWorth(winner, state.marketMultiplier, state.sectorMultiplier))}</span>
          </div>
          <div className={styles.stat}>
            <span>月被动收入</span>
            <span>{formatCurrency(getPassiveIncome(winner, state.cashFlowMultiplier, state.sectorMultiplier))}</span>
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
