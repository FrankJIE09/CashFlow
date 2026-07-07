import { useGame } from '../../context/GameContext';
import { useGameActions } from '../../hooks/useGameActions';
import {
  getAssetMarketValue,
  getAssetTypeLabel,
  getSellableAssets,
  liquidateAsset,
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
          月现金流为负且现金已耗尽。请选择要变卖的资产（按市价 70% 强制出售，幸福度 -20）。
        </p>
        <p className={styles.description}>也可先关闭此窗，在财务报表中操作，或申请银行贷款（12% 仅付息）周转。</p>

        <div className={styles.assetList}>
          {sellable.map((asset) => {
            const marketValue = getAssetMarketValue(
              asset,
              state.marketMultiplier[asset.type],
              state.sectorMultiplier
            );
            const result = liquidateAsset(asset, state.marketMultiplier, state.sectorMultiplier);
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
                    变卖可得 {formatCurrency(result.proceeds)}（幸福度 {result.happinessDelta}）
                  </div>
                </div>
                <div className={styles.actions} style={{ flexDirection: 'column', gap: 6 }}>
                  <button
                    className={styles.primaryButton}
                    onClick={() => actions.liquidateAsset(asset.id)}
                  >
                    变卖
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
