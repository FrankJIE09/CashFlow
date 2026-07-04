import { useGame } from '../../context/GameContext';
import { useGameActions } from '../../hooks/useGameActions';
import {
  getAssetMarketValue,
  getAssetTypeLabel,
  getSellableAssets,
  liquidateAssetConsent,
  liquidateAssetSecret,
} from '../../utils/financial';
import { formatCurrency } from '../../utils/format';
import { getAssetIcon } from '../Icons/GameIcons';
import styles from '../CardModal/CardModal.module.css';

export function LiquidateModal() {
  const { state } = useGame();
  const actions = useGameActions();

  if (!state.pendingLiquidation || state.phase !== 'CARD_DECISION') return null;
  if (state.testMode) return null;

  const player = state.players[state.currentPlayerIndex];
  const sellable = getSellableAssets(player);

  if (sellable.length === 0) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.cardType} style={{ backgroundColor: '#e74c3c' }}>资产变卖</div>
        <h2 className={styles.title}>⚠️ 现金耗尽 — 必须变卖资产</h2>
        <p className={styles.description}>
          月现金流为负且现金已耗尽。请选择变卖方式：协商变卖（70% 市价，幸福度 -10）或私自变卖（50% 市价，幸福度 -30，高离婚风险）。
        </p>
        <p className={styles.description}>也可先关闭此窗，在财务报表中操作，或申请银行贷款（12% 仅付息）周转。</p>

        <div className={styles.assetList}>
          {sellable.map((asset) => {
            const marketValue = getAssetMarketValue(
              asset,
              state.marketMultiplier[asset.type],
              state.sectorMultiplier
            );
            const consent = liquidateAssetConsent(asset, state.marketMultiplier, state.sectorMultiplier);
            const secret = liquidateAssetSecret(asset, state.marketMultiplier, state.sectorMultiplier);
            return (
              <div key={asset.id} className={styles.assetListItem}>
                <div>
                  <div className={styles.assetListName}>
                    {getAssetIcon(asset.type)} {asset.name}
                  </div>
                  <div className={styles.assetListMeta}>
                    {getAssetTypeLabel(asset.type)} · 市价 {formatCurrency(marketValue)}
                  </div>
                  <div className={styles.assetListMeta}>
                    协商 {formatCurrency(consent.proceeds)}（幸福 {consent.happinessDelta}）
                    {' · '}
                    私自 {formatCurrency(secret.proceeds)}（幸福 {secret.happinessDelta}）
                  </div>
                </div>
                <div className={styles.actions} style={{ flexDirection: 'column', gap: 6 }}>
                  <button
                    className={styles.primaryButton}
                    onClick={() => actions.liquidateAsset(asset.id, false)}
                  >
                    协商变卖
                  </button>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => actions.liquidateAsset(asset.id, true)}
                  >
                    私自变卖
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
