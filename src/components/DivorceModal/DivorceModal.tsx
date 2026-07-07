import { useGame } from '../../context/GameContext';
import { useGameActions } from '../../hooks/useGameActions';
import { formatCurrency } from '../../utils/format';
import { getAssetTypeLabel } from '../../utils/financial';
import styles from '../CardModal/CardModal.module.css';

export function DivorceModal() {
  const { state } = useGame();
  const actions = useGameActions();

  if (!state.pendingDivorce) return null;
  if (state.testMode) return null;

  const dv = state.pendingDivorce;
  const hasRealEstate = dv.maritalAssets.some(a => a.type === 'realEstate');

  // 合计配偶应得资产份额
  const totalSpouseShare = dv.maritalAssets.reduce((sum, a) => sum + a.spouseShare, 0);
  const totalCost = totalSpouseShare + dv.cashToSpouse + dv.legalFees;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.cardType} style={{ backgroundColor: '#e74c3c' }}>离婚</div>
        <h2 className={styles.title}>💔 婚姻破裂 — 财产分割</h2>
        <div className={styles.description}>
          <p style={{ marginBottom: 12 }}>由于长期感情不和等原因，你与配偶离婚了。以下为婚姻共有财产：</p>

          <div style={{ backgroundColor: '#2a2a3a', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>共有资产明细</p>
            {dv.maritalAssets.map((asset) => {
              const typeLabel = getAssetTypeLabel(asset.type);
              return (
                <div key={asset.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span>
                    {asset.name}
                    {asset.isSelfLiving ? ' 🏠' : ''}
                    <span style={{ color: '#888', marginLeft: 4 }}>{typeLabel}</span>
                  </span>
                  <span>
                    净值 {formatCurrency(asset.equity)}
                    {asset.mortgagePrincipal > 0 && (
                      <span style={{ color: '#aaa', fontSize: 12, marginLeft: 4 }}>
                        （贷 {formatCurrency(asset.mortgagePrincipal)}）
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ backgroundColor: '#2a2a3a', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>配偶应得资产折价</span>
              <span style={{ color: '#e74c3c' }}>-{formatCurrency(totalSpouseShare)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>现金分割给配偶</span>
              <span style={{ color: '#e74c3c' }}>-{formatCurrency(dv.cashToSpouse)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>律师费</span>
              <span style={{ color: '#e74c3c' }}>-{formatCurrency(dv.legalFees)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, borderTop: '1px solid #444', paddingTop: 6, marginTop: 6 }}>
              <span>合计损失</span>
              <span style={{ color: '#e74c3c' }}>-{formatCurrency(totalCost)}</span>
            </div>
          </div>

          {dv.isPostRemarriage && (
            <p style={{ color: '#e74c3c', fontWeight: 600, marginBottom: 12 }}>
              再婚后再离婚，财产分割更为严格！
            </p>
          )}

          {hasRealEstate && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>请选择房产处理方式：</p>
              <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                <button
                  className={styles.primaryButton}
                  onClick={() => actions.confirmDivorce(true)}
                  style={{ width: '100%' }}
                >
                  🏠 保留房产 — 支付配偶 {formatCurrency(totalSpouseShare)} 元折价款
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={() => actions.confirmDivorce(false)}
                  style={{ width: '100%' }}
                >
                  🏪 卖房分割 — 卖房还贷后平分净值
                </button>
              </div>
            </div>
          )}
          {!hasRealEstate && (
            <div style={{ marginTop: 16 }}>
              <p>无共有房产，直接进行现金与股票分割。</p>
              <div className={styles.actions}>
                <button
                  className={styles.primaryButton}
                  onClick={() => actions.confirmDivorce(false)}
                >
                  确认离婚
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
