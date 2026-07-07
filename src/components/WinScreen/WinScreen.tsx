import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useGameActions } from '../../hooks/useGameActions';
import { getPlayerProfessionName } from '../../data/professions';
import { getMonthlyCashFlow, getNetWorth, getPassiveIncome, getTotalExpenses } from '../../utils/financial';
import { generateAdvices } from '../../utils/analysis';
import { formatCurrency } from '../../utils/format';
import styles from './WinScreen.module.css';

const LOG_ICONS: Record<string, string> = {
  move: '🚶', income: '💰', expense: '💸', asset: '🏦',
  liability: '⛓️', repay: '✅', market: '📈', system: '🔔', win: '👑',
};

export function WinScreen() {
  const { state } = useGame();
  const { restartGame } = useGameActions();
  const [showLogs, setShowLogs] = useState(false);

  if (state.phase !== 'GAME_OVER') return null;

  const human = state.players.find((p) => !p.isAI);
  const humanFailed = Boolean(human?.isBankrupt);
  const winner = state.winner;

  const target = humanFailed ? human : winner;
  const advices = target ? generateAdvices(target) : [];

  const logs = state.logs;

  return (
    <div className={styles.overlay}>
      <div className={`${styles.modal} ${humanFailed ? styles.failModal : ''}`}>
        {humanFailed ? (
          <>
            <div className={styles.trophy}>💀</div>
            <h1 className={styles.title}>游戏失败</h1>
            <p className={styles.failReason}>月现金流为负，无法继续游戏</p>
            {human && (
              <p className={styles.subWinner}>
                你的月现金流：{formatCurrency(getMonthlyCashFlow(human, state.cashFlowMultiplier, state.sectorMultiplier))}
              </p>
            )}
            {winner && <p className={styles.subWinner}>{winner.name} 继续游戏并获胜</p>}
          </>
        ) : !winner ? null : (
          <>
            <div className={styles.trophy}>🏆</div>
            <h1 className={styles.title}>游戏结束</h1>
            <p className={styles.winner}>{winner.name} 赢得了游戏！</p>
            <div className={styles.stats}>
              <div className={styles.stat}><span>职业</span><span>{getPlayerProfessionName(winner)}</span></div>
              <div className={styles.stat}><span>现金</span><span>{formatCurrency(winner.cash)}</span></div>
              <div className={styles.stat}><span>净资产</span><span>{formatCurrency(getNetWorth(winner, state.marketMultiplier, state.sectorMultiplier))}</span></div>
              <div className={styles.stat}><span>月被动收入</span><span>{formatCurrency(getPassiveIncome(winner, state.cashFlowMultiplier, state.sectorMultiplier))}</span></div>
              <div className={styles.stat}><span>月支出</span><span>{formatCurrency(getTotalExpenses(winner))}</span></div>
              <div className={styles.stat}><span>月现金流</span><span>{formatCurrency(getMonthlyCashFlow(winner))}</span></div>
            </div>
          </>
        )}

        {/* 复盘建议 */}
        {advices.length > 0 && (
          <div className={styles.adviceSection}>
            <h3 className={styles.sectionTitle}>📊 复盘诊断</h3>
            <div className={styles.adviceList}>
              {advices.map((a, i) => (
                <div key={i} className={styles.adviceItem}>
                  <span className={styles.adviceLevel}>{a.level}</span>
                  <div>
                    <div className={styles.adviceLabel}>{a.label}</div>
                    <div className={styles.adviceDetail}>{a.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 日志 */}
        <div className={styles.logSection}>
          <button
            className={styles.logToggle}
            onClick={() => setShowLogs(!showLogs)}
          >
            {showLogs ? '📜 收起对局日志' : '📜 查看对局日志'}
          </button>
          {showLogs && (
            <div className={styles.logList}>
              {logs.length === 0 ? (
                <div className={styles.logEmpty}>暂无日志</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className={styles.logItem}>
                    <span className={styles.logIcon}>{LOG_ICONS[log.type] || '🔔'}</span>
                    <span className={styles.logMessage}>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          )}
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
