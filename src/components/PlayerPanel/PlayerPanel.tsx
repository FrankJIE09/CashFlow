import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../context/GameContext';
import { getCityById, CITY_TIER_LABELS } from '../../data/cities';
import { getPlayerProfessionName } from '../../data/professions';
import { PROFESSIONS } from '../../data/professions';
import {
  calcEmergencyReserveMonths,
  calcUnemploymentHappinessPenalty,
  getEffectiveSalary,
  getMonthlyCashFlow,
  getNetWorth,
  getPassiveIncome,
  getTotalExpenses,
  getCurrentDebt,
  getCityExpenseMultiplier,
  getUnemploymentRiskLevel,
  getYearsToRetirement,
  calcMarriageHappinessBySalary,
} from '../../utils/financial';
import { canPlayerRepay } from '../../utils/repayEligibility';
import { formatCurrency, formatPlayerAge } from '../../utils/format';
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
  const effectiveSalary = getEffectiveSalary(selectedPlayer);
  const netWorth = getNetWorth(selectedPlayer, state.marketMultiplier, state.sectorMultiplier);
  const debt = getCurrentDebt(selectedPlayer);
  const maxReference = Math.max(Math.abs(monthlyCashFlow), 5000) * 1.5;
  const netWorthMax = Math.max(Math.abs(netWorth), 100000) * 1.2;
  const canRepay = canPlayerRepay(state, selectedPlayer);
  const profTier = PROFESSIONS.find((p) => p.id === selectedPlayer.professionId)?.tier ?? 'service';
  const unemploymentRisk = getUnemploymentRiskLevel(
    selectedPlayer.age,
    profTier,
    selectedPlayer.professionId,
    selectedPlayer.retireStandardAge
  );
  const yearsToRetire = getYearsToRetirement(selectedPlayer);
  const marriageSalaryBonus =
    selectedPlayer.marriageStatus === 'married'
      ? calcMarriageHappinessBySalary(
          selectedPlayer.salary,
          getPassiveIncome(selectedPlayer, state.cashFlowMultiplier, state.sectorMultiplier),
          city.expenseMultiplier
        )
      : 0;
  const emergencyReserve = calcEmergencyReserveMonths(
    selectedPlayer,
    state.cashFlowMultiplier,
    state.sectorMultiplier
  );
  const unemploymentPenalty =
    selectedPlayer.isUnemployed || (selectedPlayer.partnerUnemployedTurnsRemaining ?? 0) > 0
      ? calcUnemploymentHappinessPenalty(
          selectedPlayer,
          state.cashFlowMultiplier,
          state.sectorMultiplier
        )
      : 0;
  const promoLevel = selectedPlayer.promotionLevel ?? selectedPlayer.promotionCount ?? 0;

  return (
    <div className={`${styles.panel} cartoon-card`}>
      {(selectedPlayer.isUnemployed || (selectedPlayer.partnerUnemployedTurnsRemaining ?? 0) > 0) && (
        <div className={styles.unemploymentBanner}>
          {selectedPlayer.isUnemployed && (
            <span>
              🔴 失业第 {selectedPlayer.consecutiveUnemployedTurns ?? 0} 月
              （剩余 {selectedPlayer.unemploymentTurnsRemaining ?? 0} 回合）
            </span>
          )}
          {(selectedPlayer.partnerUnemployedTurnsRemaining ?? 0) > 0 && (
            <span> · 配偶失业（剩余 {selectedPlayer.partnerUnemployedTurnsRemaining} 回合）</span>
          )}
          {unemploymentPenalty > 0 && (
            <span> · 本月幸福度 -{unemploymentPenalty}</span>
          )}
        </div>
      )}
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
            <div className={styles.characterName}>
              {selectedPlayer.name}
              <span className={styles.genderTag}>
                {selectedPlayer.gender === 'female' ? '♀' : '♂'}
              </span>
            </div>
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
                <span className={`${styles.badge} ${styles.baby}`}>
                  {STATUS_ICONS.child} ×{selectedPlayer.children}
                  {selectedPlayer.childAges.length > 0 && <span>（0-3: {selectedPlayer.childAges.length}）</span>}
                </span>
              )}
              {selectedPlayer.maternityLeaveRemaining > 0 && (
                <span className={`${styles.badge} ${styles.maternity}`}>
                  🤱 产假 {selectedPlayer.maternityLeaveRemaining}月
                </span>
              )}
              {selectedPlayer.marriageStatus === 'married' && (
                <span className={`${styles.badge} ${styles.married}`}>
                  {STATUS_ICONS.married} 幸福 {selectedPlayer.marriageHappiness}
                </span>
              )}
              {selectedPlayer.marriageStatus === 'divorced' && (
                <span className={`${styles.badge} ${styles.divorced}`}>{STATUS_ICONS.divorced} 离异</span>
              )}
              {selectedPlayer.hasPregnancy && (
                <span className={`${styles.badge} ${styles.pregnant}`}>{STATUS_ICONS.pregnant} 孕期</span>
              )}
              {selectedPlayer.isUnemployed && (
                <span className={`${styles.badge} ${styles.unemployed}`}>
                  {STATUS_ICONS.unemployed} 失业 ({selectedPlayer.unemploymentTurnsRemaining}回合)
                </span>
              )}
              {selectedPlayer.isRetired && (
                <span className={`${styles.badge} ${styles.retired}`}>🏖️ 已退休</span>
              )}
              {promoLevel > 0 && (
                <span className={`${styles.badge} ${styles.promotion}`}>
                  🎖️ 升迁 Lv.{promoLevel}
                </span>
              )}
            </div>
            <div className={styles.ageLine}>
              🎂 {formatPlayerAge(selectedPlayer)}
              {yearsToRetire != null && !selectedPlayer.isRetired && (
                <span> · 距退休 {yearsToRetire} 年</span>
              )}
              {selectedPlayer.retireStandardAge == null && !selectedPlayer.isRetired && (
                <span> · 无强制退休</span>
              )}
              {!selectedPlayer.isRetired && (
                <span> · 失业风险 {unemploymentRisk}</span>
              )}
            </div>
            {selectedPlayer.marriageStatus === 'married' && marriageSalaryBonus > 0 && (
              <div className={styles.hintLine}>
                💑 收入幸福加成约 +{marriageSalaryBonus}/月（含被动收入，按城市生活成本折算，上限20）
              </div>
            )}
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
            <span className={styles.statLabel}>{selectedPlayer.isRetired ? '养老金' : '工资'}</span>
            <span className={styles.statValue}>
              {formatCurrency(effectiveSalary)}
            </span>
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
          <div className={styles.statItem}>
            <span className={styles.statIcon}>🛡️</span>
            <span className={styles.statLabel}>应急储备</span>
            <span className={styles.statValue}>
              {emergencyReserve >= 99 ? '∞' : `${emergencyReserve.toFixed(1)}月`}
            </span>
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
