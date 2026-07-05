import { useState } from 'react';
import type { Liability, Player } from '../../types/game';
import { useGame } from '../../context/GameContext';
import { useGameActions } from '../../hooks/useGameActions';
import {
  getDebtTypeConfig,
  getDebtTypeLabel,
  getMonthlyCashFlow,
  inferDebtTypeFromLiability,
  previewRepayment,
} from '../../utils/financial';
import { getRepayableLiabilities } from '../../utils/repayEligibility';
import { formatCurrency } from '../../utils/format';
import styles from './RepayModal.module.css';

interface RepayModalProps {
  player: Player;
  onClose: () => void;
  initialLiability?: Liability | null;
  nested?: boolean;
}

export function RepayModal({ player, onClose, initialLiability = null, nested = false }: RepayModalProps) {
  const { state } = useGame();
  const actions = useGameActions();
  const repayableLiabilities = getRepayableLiabilities(player);

  const [repayTarget, setRepayTarget] = useState<Liability | null>(() => {
    if (initialLiability && initialLiability.principal > 0) return initialLiability;
    if (repayableLiabilities.length === 1) return repayableLiabilities[0];
    return null;
  });
  const [repayAmount, setRepayAmount] = useState(() => {
    const target = initialLiability ?? (repayableLiabilities.length === 1 ? repayableLiabilities[0] : null);
    if (!target) return 1000;
    return Math.min(target.principal, Math.max(1000, Math.floor(player.cash * 0.2)));
  });

  const showPicker = !repayTarget;
  const repayPreview = repayTarget ? previewRepayment(repayTarget, repayAmount) : null;
  const monthlyCashFlow = getMonthlyCashFlow(player, state.cashFlowMultiplier, state.sectorMultiplier);
  const newCashFlowAfterRepay =
    repayPreview !== null ? monthlyCashFlow + repayPreview.paymentReduction : null;

  const handleSelectLiability = (liability: Liability) => {
    setRepayTarget(liability);
    setRepayAmount(Math.min(liability.principal, Math.max(1000, Math.floor(player.cash * 0.2))));
  };

  const handleConfirmRepay = () => {
    if (!repayTarget || !repayPreview || repayPreview.repayAmount <= 0) return;
    if (repayPreview.totalCost > player.cash) return;
    actions.repayLiability(repayTarget.id, repayPreview.repayAmount);
    onClose();
  };

  const overlayClass = nested ? styles.overlayNested : styles.overlayFixed;

  return (
    <div className={`${styles.overlay} ${overlayClass}`} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {showPicker ? (
          <>
            <h3>💳 选择要偿还的负债</h3>
            <p className={styles.pickerHint}>优先偿还高息债务可更快改善现金流</p>
            <div className={styles.liabilityList}>
              {repayableLiabilities.map((liability) => {
                const debtType = inferDebtTypeFromLiability(liability);
                const config = getDebtTypeConfig(debtType);
                return (
                  <button
                    key={liability.id}
                    type="button"
                    className={`${styles.liabilityOption} cartoon-button`}
                    onClick={() => handleSelectLiability(liability)}
                  >
                    <div className={styles.liabilityOptionHeader}>
                      <span className={styles.liabilityOptionName}>{liability.name}</span>
                      <span className={styles.debtTypeBadge}>{getDebtTypeLabel(debtType)}</span>
                    </div>
                    <div className={styles.liabilityOptionMeta}>
                      <span>本金 {formatCurrency(liability.principal)}</span>
                      <span>月供 {formatCurrency(liability.monthlyPayment)}</span>
                      <span>月利率 {(config.monthlyRate * 100).toFixed(2)}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className={styles.actions}>
              <button type="button" className={`${styles.cancelButton} cartoon-button`} onClick={onClose}>
                取消
              </button>
            </div>
          </>
        ) : (
          repayTarget &&
          repayPreview && (
            <>
              <h3>偿还 · {repayTarget.name}</h3>
              <p className={styles.repayHint}>
                当前本金 {formatCurrency(repayTarget.principal)}，月供 {formatCurrency(repayTarget.monthlyPayment)}
              </p>
              <label className={styles.repayLabel}>
                偿还金额
                <input
                  type="number"
                  className={styles.repayInput}
                  value={repayAmount || ''}
                  min={0}
                  max={repayTarget.principal}
                  step={100}
                  onChange={(e) => setRepayAmount(Math.max(0, Number(e.target.value)))}
                />
                <div className={styles.quickActions}>
                  <button
                    type="button"
                    className={`${styles.quickBtn} cartoon-button`}
                    onClick={() => setRepayAmount(Math.min(1000, repayTarget.principal))}
                    disabled={repayTarget.principal < 1000}
                  >
                    1,000
                  </button>
                  <button
                    type="button"
                    className={`${styles.quickBtn} cartoon-button`}
                    onClick={() => setRepayAmount(Math.min(10000, repayTarget.principal))}
                    disabled={repayTarget.principal < 10000}
                  >
                    10,000
                  </button>
                  <button
                    type="button"
                    className={`${styles.fullRepayBtn} cartoon-button`}
                    onClick={() => setRepayAmount(repayTarget.principal)}
                  >
                    全额还款
                  </button>
                </div>
              </label>
              <div className={styles.previewGrid}>
                <div className={styles.previewItem}>
                  <span>提前还款罚金</span>
                  <span>{formatCurrency(repayPreview.penalty)}</span>
                </div>
                <div className={styles.previewItem}>
                  <span>合计扣款</span>
                  <span>{formatCurrency(repayPreview.totalCost)}</span>
                </div>
                <div className={styles.previewItem}>
                  <span>剩余本金</span>
                  <span>{formatCurrency(repayPreview.newPrincipal)}</span>
                </div>
                <div className={styles.previewItem}>
                  <span>新月供</span>
                  <span>{formatCurrency(repayPreview.newMonthlyPayment)}</span>
                </div>
                <div className={styles.previewItem}>
                  <span>月现金流变化</span>
                  <span className={styles.positive}>+{formatCurrency(repayPreview.paymentReduction)}</span>
                </div>
                {newCashFlowAfterRepay !== null && (
                  <div className={styles.previewItem}>
                    <span>偿还后月现金流</span>
                    <span className={newCashFlowAfterRepay >= 0 ? styles.positive : styles.negative}>
                      {formatCurrency(newCashFlowAfterRepay)}
                    </span>
                  </div>
                )}
              </div>
              <div className={styles.actions}>
                {repayableLiabilities.length > 1 && (
                  <button
                    type="button"
                    className={`${styles.backButton} cartoon-button`}
                    onClick={() => setRepayTarget(null)}
                  >
                    返回
                  </button>
                )}
                <button type="button" className={`${styles.cancelButton} cartoon-button`} onClick={onClose}>
                  取消
                </button>
                <button
                  type="button"
                  className={`${styles.confirmButton} cartoon-button`}
                  onClick={handleConfirmRepay}
                  disabled={repayPreview.repayAmount <= 0 || repayPreview.totalCost > player.cash}
                >
                  确认偿还
                </button>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
