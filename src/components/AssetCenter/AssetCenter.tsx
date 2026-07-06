import { useMemo, useState } from 'react';
import type { Player } from '../../types/game';
import { useGame } from '../../context/GameContext';
import { useGameActions } from '../../hooks/useGameActions';
import {
  getRentExpense,
  isStockLotAsset,
  getAssetMarketValue,
  getAssetTypeLabel,
  calcCurrentStockPrice,
  getStockBuyPrice,
  getStockPriceChange,
  getStockCurrentPb,
  getStockBasePe,
} from '../../utils/financial';
import { formatCurrency } from '../../utils/format';
import { getAssetIcon } from '../Icons/GameIcons';
import styles from './AssetCenter.module.css';

interface AssetCenterProps {
  player: Player;
  onClose: () => void;
}

const TIERS = [
  { key: 'economy' as const, label: '经济型', desc: '×0.7' },
  { key: 'standard' as const, label: '标准型', desc: '×1.0' },
  { key: 'luxury' as const, label: '舒适型', desc: '×1.5' },
];

export function AssetCenter({ player, onClose }: AssetCenterProps) {
  const { state } = useGame();
  const actions = useGameActions();
  const [sellingIds, setSellingIds] = useState<Set<string>>(new Set());

  const hasSelfLiving = player.assets.some(a => a.type === 'realEstate' && a.isSelfLiving);
  const currentTier = player.rentTier ?? 'standard';

  // Group assets by type
  const assetGroups = useMemo(() => {
    const groups: Record<string, typeof player.assets> = {};
    for (const asset of player.assets) {
      const key = asset.type;
      if (!groups[key]) groups[key] = [];
      groups[key].push(asset);
    }
    return groups;
  }, [player.assets]);

  const handleSell = (assetId: string, multiplier: number, shareHand?: number) => {
    setSellingIds(prev => new Set(prev).add(assetId));
    actions.sellAsset(assetId, multiplier, shareHand);
    // The sell is async via dispatch, but we close the modal via the reducer
    // We keep sellingIds to show visual feedback (won't actually block)
  };

  // Rent tier settings (only show when no self-living home)
  const renderRentSettings = () => {
    if (hasSelfLiving) return null;
    return (
      <div className={styles.rentSettings}>
        <h4 className={styles.rentSettingsTitle}>🏠 租房设置</h4>
        <p className={styles.rentSettingsDesc}>当前无自住房屋，每月需支付租金</p>
        <div className={styles.rentTierOptions}>
          {TIERS.map(tier => {
            const rent = getRentExpense(
              { ...player, rentTier: tier.key },
              player.cityId
            );
            return (
              <button
                key={tier.key}
                className={`${styles.rentTierBtn} ${currentTier === tier.key ? styles.rentTierBtnActive : ''}`}
                onClick={() => actions.setRentTier(tier.key)}
              >
                <span className={styles.rentTierLabel}>
                  {tier.label} {tier.desc}
                </span>
                <span className={styles.rentTierPrice}>
                  {rent.toLocaleString()} 元/月
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Render a single asset card
  const renderAsset = (asset: typeof player.assets[number]) => {
    const isSelling = sellingIds.has(asset.id);
    const stockLike = isStockLotAsset(asset);
    const marketValue = getAssetMarketValue(
      asset,
      state.marketMultiplier[asset.type],
      state.sectorMultiplier
    );

    // 证券类资产价格信息
    let priceInfo: React.ReactNode = null;
    if (stockLike) {
      const buyPrice = getStockBuyPrice(asset);
      const curPrice = calcCurrentStockPrice(asset, state.marketMultiplier, state.sectorMultiplier);
      const changePct = getStockPriceChange(asset, state.marketMultiplier, state.sectorMultiplier);
      const isUp = changePct >= 0;
      const pb = getStockCurrentPb(asset);
      const basePe = getStockBasePe(asset);
      const currentPe = asset.currentPe ?? basePe;
      const buyPe = asset.buyPe;
      const divYield = asset.metadata?.dividendYield;

      priceInfo = (
        <div className={styles.priceRow}>
          <span className={styles.priceItem}>
            买入价 <strong>{formatCurrency(buyPrice)}</strong>
          </span>
          <span className={styles.priceArrow}>→</span>
          <span className={styles.priceItem}>
            现价 <strong>{formatCurrency(curPrice)}</strong>
          </span>
          <span className={isUp ? styles.priceUp : styles.priceDown}>
            {isUp ? '+' : ''}{changePct.toFixed(1)}%
          </span>
          <span className={styles.priceDivider}>|</span>
          {currentPe != null && (
            <span className={styles.priceItem}>
              PE <strong>{currentPe.toFixed(1)}</strong>
              {buyPe != null && buyPe !== currentPe && (
                <span className={styles.priceSub}>（买入{buyPe.toFixed(1)}）</span>
              )}
            </span>
          )}
          {pb != null && (
            <span className={styles.priceItem}>
              PB <strong>{pb.toFixed(2)}</strong>
            </span>
          )}
          {divYield != null && (
            <span className={styles.priceItem}>
              股息 <strong>{(divYield * 100).toFixed(1)}%</strong>
            </span>
          )}
        </div>
      );
    }

    return (
      <div key={asset.id} className={styles.assetCard}>
        <div className={styles.assetInfo}>
          <div className={styles.assetName}>
            {getAssetIcon(asset.type)} {asset.name}
            {asset.type === 'realEstate' && asset.isSelfLiving && (
              <span className={styles.selfLivingTag}>🏠 自住</span>
            )}
            {stockLike && (
              <span className={styles.handTag}>{asset.shareHand ?? 1}手</span>
            )}
          </div>
          {priceInfo}
          <div className={styles.assetMeta}>
            市值 {marketValue.toLocaleString()} 元 | 月现金流 +{asset.cashFlow} 元
          </div>
        </div>
        <div className={styles.assetActions}>
          <button
            className={styles.sellBtn}
            onClick={() => handleSell(asset.id, 1, stockLike ? (asset.shareHand ?? 1) : undefined)}
            disabled={isSelling}
          >
            {stockLike ? `卖出（${asset.shareHand ?? 1}手）` : '卖出'}
          </button>
        </div>
      </div>
    );
  };

  // Render a section for an asset type
  const renderSection = (type: string, assets: typeof player.assets) => {
    if (assets.length === 0) return null;
    return (
      <div key={type} className={styles.section}>
        <h3 className={styles.sectionTitle}>
          {getAssetIcon(type as any)} {getAssetTypeLabel(type as any)}（{assets.length}）
        </h3>
        {assets.map(renderAsset)}
      </div>
    );
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>资产中心 - {player.name}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        {renderRentSettings()}

        {Object.entries(assetGroups).length === 0 ? (
          <div className={styles.empty}>暂无资产</div>
        ) : (
          Object.entries(assetGroups).map(([type, assets]) =>
            renderSection(type, assets)
          )
        )}
      </div>
    </div>
  );
}
