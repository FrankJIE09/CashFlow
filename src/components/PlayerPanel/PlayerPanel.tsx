import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../context/GameContext';
import { getPlayerProfessionName } from '../../data/professions';
import { getCityById, CITY_TIER_LABELS } from '../../data/cities';
import {
  getMonthlyCashFlow,
  getNetWorth,
  getPassiveIncome,
  getTotalExpenses,
  getCurrentDebt,
  getCityExpenseMultiplier,
} from '../../utils/financial';
import { canPlayerRepay } from '../../utils/repayEligibility';
import { formatCurrency } from '../../utils/format';
import { FinancialStatement } from '../FinancialStatement/FinancialStatement';
import { ProgressBar } from '../ProgressBar/ProgressBar';
import { PROFESSION_AVATARS, STATUS_ICONS } from '../Icons/GameIcons';
import styles from './PlayerPanel.module.css';

export function PlayerPanel() {
  const { state } = useGame();
  const [showStatement, setShowStatement] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [cashAnim, setCashAnim] = useState(false);
  const [floatingIcon, setFloatingIcon] = useState<string | null>(null);

  const selectedPlayer =
    selectedPlayerId
      ? state.players.find((p) => p.id === selectedPlayerId) || state.players[state.currentPlayerIndex]
      : state.players[state.currentPlayerIndex];

  useEffect(() => {
    if (!selectedPlayer) return;
    setCashAnim(true);
    const icon = selectedPlayer.cash >= 0 ? STATUS_ICONS.coin : STATUS_ICONS.negative;
    setFloatingIcon(icon);
    const timer = setTimeout(() => {
      setCashAnim(false);
      setFloatingIcon(null);
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayer?.cash, selectedPlayer?.id]);

  if (!selectedPlayer) return null;

  const professionName = getPlayerProfessionName(selectedPlayer);
  const city = getCityById(selectedPlayer.cityId);
  const expenseMult = getCityExpenseMultiplier(selectedPlayer.cityId);
  const monthlyCashFlow = getMonthlyCashFlow(selectedPlayer, state.cashFlowMultiplier, state.sectorMultiplier);
  const netWorth = getNetWorth(selectedPlayer, state.marketMultiplier, state.sectorMultiplier);
  const debt = getCurrentDebt(selectedPlayer);
  const maxReference = Math.max(Math.abs(monthlyCashFlow), 5000) * 1.5;
  const netWorthMax = Math.max(Math.abs(netWorth), 100000) * 1.2;
  const canRepay = canPlayerRepay(state, selectedPlayer);

  return (
    <div className={`${styles.panel} cartoon-card`}>
      <div className={styles.header}>
        <h3 className={styles.title}>👤 角色面板</h3>
        <div className={styles.playerTabs}>
          {state.players.map((p) => (
            <button
              key={p.id}
              className={`${styles.tab} ${p.id === selectedPlayer.id ? styles.activeTab : ''}`}
              onClick={() => setSelectedPlayerId(p.id)}
              disabled={p.isBankrupt}
            >
              <span className={styles.tabDot} style={{ backgroundColor: p.color }} />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.characterCard}>
        <div className={styles.avatarSection}>
          <div className={styles.avatar} style={{ backgroundColor: selectedPlayer.color }}>
            {PROFESSION_AVATARS[selectedPlayer.professionId] || '👤'}
          </div>
          <div className={styles.characterInfo}>
            <div className={styles.characterName}>{selectedPlayer.name}</div>
            <div className={styles.profession}>{professionName}</div>
            <div className={styles.cityLine}>
              📍 {city.name} · {CITY_TIER_LABELS[city.tier]} · 生活×{expenseMult.toFixed(2)}
            </div>
            <div className={styles.badges}>
              {selectedPlayer.isInFastTrack && (
                <span className={`${styles.badge} ${styles.fastTrack}`}>{STATUS_ICONS.fastTrack} 快车道</span>
              )}
              {selectedPlayer.isBankrupt && (
                <span className={`${styles.badge} ${styles.bankrupt}`}>{STATUS_ICONS.bankrupt} 现金流失败</span>
              )}
              {selectedPlayer.charityTurns > 0 && (
                <span className={`${styles.badge} ${styles.charity}`}>{STATUS_ICONS.charity} 双骰子×{selectedPlayer.charityTurns}</span>
              )}
              {selectedPlayer.children > 0 && (
                <span className={`${styles.badge} ${styles.baby}`}>{STATUS_ICONS.child} ×{selectedPlayer.children}</span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.moneyDisplay}>
          <div className={styles.moneyLabel}>现金</div>
          <div className={`${styles.moneyValue} ${cashAnim ? styles.cashPulse : ''}`}>
            {formatCurrency(selectedPlayer.cash)}
          </div>
          <AnimatePresence>
            {floatingIcon && (
              <motion.div
                className={styles.floatingIcon}
                initial={{ opacity: 1, y: 0, scale: 1 }}
                animate={{ opacity: 0, y: -40, scale: 1.3 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
              >
                {floatingIcon}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={styles.progressSection}>
          <ProgressBar
            value={monthlyCashFlow}
            max={maxReference}
            label="月现金流"
            color={monthlyCashFlow >= 0 ? 'green' : 'red'}
            icon={monthlyCashFlow >= 0 ? '😊' : '😢'}
          />
          <ProgressBar
            value={netWorth}
            max={netWorthMax}
            label="净资产"
            color={netWorth >= 0 ? 'gold' : 'red'}
            icon={netWorth >= 0 ? '💰' : '⛓️'}
          />
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>💵</span>
            <span className={styles.statLabel}>工资</span>
            <span className={styles.statValue}>{formatCurrency(selectedPlayer.salary)}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>📈</span>
            <span className={styles.statLabel}>被动收入</span>
            <span className={styles.statValue}>
              {formatCurrency(getPassiveIncome(selectedPlayer, state.cashFlowMultiplier, state.sectorMultiplier))}
            </span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>💸</span>
            <span className={styles.statLabel}>月支出</span>
            <span className={styles.statValue}>{formatCurrency(getTotalExpenses(selectedPlayer))}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>🏦</span>
            <span className={styles.statLabel}>负债</span>
            <span className={styles.statValue}>{formatCurrency(debt)}</span>
          </div>
        </div>

        <button className={`${styles.detailButton} cartoon-button`} onClick={() => setShowStatement(true)}>
          📋 查看详细财务报表
        </button>
      </div>

      {showStatement && (
        <FinancialStatement
          player={selectedPlayer}
          onClose={() => setShowStatement(false)}
          canRepay={canRepay}
        />
      )}
    </div>
  );
}
