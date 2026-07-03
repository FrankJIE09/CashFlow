import { useGame } from '../../context/GameContext';
import styles from './LogPanel.module.css';

const LOG_ICONS: Record<string, string> = {
  move: '🚶',
  income: '💰',
  expense: '💸',
  asset: '🏦',
  liability: '⛓️',
  market: '📈',
  system: '🔔',
  win: '👑',
};

export function LogPanel() {
  const { state } = useGame();
  const logs = state.logs.slice(-50).reverse();

  return (
    <div className={`${styles.panel} cartoon-card`}>
      <h3 className={styles.title}>📝 游戏日志</h3>
      <div className={styles.logList}>
        {logs.length === 0 ? (
          <div className={styles.empty}>暂无日志</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={styles.logItem}>
              <span className={styles.icon}>{LOG_ICONS[log.type] || '🔔'}</span>
              <span className={styles.message}>{log.message}</span>
              <span className={styles.time}>{new Date(log.timestamp).toLocaleTimeString('zh-CN')}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
