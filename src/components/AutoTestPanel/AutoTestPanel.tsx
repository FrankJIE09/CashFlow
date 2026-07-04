import { useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import type { BugLogEntry } from '../../types/game';
import styles from './AutoTestPanel.module.css';

function formatBug(bug: BugLogEntry): string {
  const time = new Date(bug.timestamp).toLocaleTimeString();
  return `[${time}] [${bug.severity}] ${bug.category} · R${bug.round} · ${bug.message}${bug.action ? ` (${bug.action})` : ''}`;
}

export function AutoTestPanel() {
  const { state, dispatch } = useGame();
  const bugs = state.bugLogs ?? [];

  const handleExport = useCallback(async () => {
    const header = `CashFlow 自动测试报告\n回合: ${state.round}/${state.testMaxRounds ?? '?'}\nBug 数: ${bugs.length}\n`;
    const body = bugs.map(formatBug).join('\n');
    const report = `${header}\n${body || '（无 Bug 记录）'}`;
    try {
      await navigator.clipboard.writeText(report);
      alert('测试报告已复制到剪贴板');
    } catch {
      alert(report);
    }
  }, [bugs, state.round, state.testMaxRounds]);

  const handleStop = useCallback(() => {
    dispatch({ type: 'STOP_AUTO_TEST' });
  }, [dispatch]);

  if (!state.testMode) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>🤖 自动测试</h3>
        <span className={styles.meta}>
          回合 {state.round}/{state.testMaxRounds ?? '?'}
          {state.testStopped ? ' · 已停止' : ' · 运行中'}
        </span>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.exportBtn} onClick={handleExport}>
          导出报告
        </button>
        <button
          type="button"
          className={styles.stopBtn}
          onClick={handleStop}
          disabled={state.testStopped}
        >
          停止测试
        </button>
      </div>

      <div className={styles.logList}>
        {bugs.length === 0 ? (
          <div className={styles.empty}>暂无 Bug 记录</div>
        ) : (
          bugs
            .slice()
            .reverse()
            .map((bug) => (
              <div
                key={bug.id}
                className={`${styles.logItem} ${bug.severity === 'critical' ? styles.critical : styles.warning}`}
              >
                {formatBug(bug)}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
