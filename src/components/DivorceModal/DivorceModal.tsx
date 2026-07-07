import { useGame } from '../../context/GameContext';
import { useGameActions } from '../../hooks/useGameActions';
import { formatCurrency } from '../../utils/format';
import styles from '../CardModal/CardModal.module.css';

export function DivorceModal() {
  const { state } = useGame();
  const actions = useGameActions();

  if (!state.pendingDivorce) return null;
  if (state.testMode) return null;

  const dv = state.pendingDivorce;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.cardType} style={{ backgroundColor: '#e74c3c' }}>离婚</div>
        <h2 className={styles.title}>💔 婚姻破裂</h2>
        <div className={styles.description}>
          <p style={{ marginBottom: 12 }}>由于长期感情不和或其他原因，你与配偶离婚了。</p>

          <div style={{ backgroundColor: '#2a2a3a', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>现金分割给配偶</span>
              <span style={{ color: '#e74c3c' }}>-{formatCurrency(dv.cashToSpouse)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>律师费</span>
              <span style={{ color: '#e74c3c' }}>-{formatCurrency(dv.legalFees)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>资产变卖折扣率</span>
              <span>{Math.round(dv.forcedAssetDiscount * 100)}% 市价</span>
            </div>
          </div>

          {dv.soldAssetNames.length > 0 && (
            <div style={{ backgroundColor: '#2a2a3a', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>被强制出售的资产：</p>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {dv.soldAssetNames.map((name, i) => (
                  <li key={i}>{name}</li>
                ))}
              </ul>
            </div>
          )}

          {dv.isPostRemarriage && (
            <p style={{ color: '#e74c3c', fontWeight: 600 }}>
              再婚后再离婚，财产分割更为严格！
            </p>
          )}
        </div>
        <div className={styles.actions}>
          <button className={styles.primaryButton} onClick={() => actions.confirmDivorce()}>
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
