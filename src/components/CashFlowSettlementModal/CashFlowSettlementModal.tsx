import { useGame } from '../../context/GameContext';
import { useGameActions } from '../../hooks/useGameActions';
import {
  calcEmergencyReserveMonths,
  getMonthlyCashFlow,
  hasSellableAssets,
} from '../../utils/financial';
import { formatCurrency } from '../../utils/format';
import styles from '../CardModal/CardModal.module.css';

export function CashFlowSettlementModal() {
  const { state } = useGame();
  const actions = useGameActions();

  if (!state.pendingCashFlowSettlement || state.pendingLiquidation) return null;
  if (state.testMode) return null;

  const player = state.players[state.currentPlayerIndex];
  const cf = state.pendingCashFlowSettlement.cashFlow;
  const reserve = calcEmergencyReserveMonths(player, state.cashFlowMultiplier, state.sectorMultiplier);
  const currentCf = getMonthlyCashFlow(player, state.cashFlowMultiplier, state.sectorMultiplier);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.cardType} style={{ backgroundColor: cf < 0 ? '#e74c3c' : '#2ecc71' }}>
          月现金流结算
        </div>
        <h2 className={styles.title}>{cf < 0 ? '📉 负现金流警告' : '💰 本月结算'}</h2>
        <p className={styles.description}>
          本月净现金流 {formatCurrency(cf)}，当前现金 {formatCurrency(player.cash)}。
        </p>
        {cf < 0 && (
          <>
            <p className={styles.description}>
              应急储备约 <strong>{reserve.toFixed(1)}</strong> 个月
              {hasSellableAssets(player) ? ' · 可变卖资产缓解' : ' · 无可变卖资产，请谨慎！'}
            </p>
            <p className={styles.description}>
              建议：提前还款降低支出、变卖资产（协商 70% / 私自 50%）、或申请银行贷款（12% 仅付息）。
            </p>
          </>
        )}
        <div className={styles.actions}>
          <button className={styles.primaryButton} onClick={() => actions.confirmCashFlowSettlement()}>
            确认（当前月现金流 {formatCurrency(currentCf)}）
          </button>
        </div>
      </div>
    </div>
  );
}
