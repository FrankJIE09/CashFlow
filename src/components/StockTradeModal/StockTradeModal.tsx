import { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { useGameActions } from '../../hooks/useGameActions';
import {
  isStockLotAsset,
  calcCurrentStockPrice,
  calcCurrentStockMarketValue,
  judgeStockValuation,
  getStockBasePe,
  getValuationLabel,
  calcStockProfit,
} from '../../utils/financial';
import { formatCurrency } from '../../utils/format';
import { getAssetIcon } from '../Icons/GameIcons';
import styles from './StockTradeModal.module.css';

interface StockTradeModalProps {
  onClose: () => void;
}

export function StockTradeModal({ onClose }: StockTradeModalProps) {
  const { state } = useGame();
  const actions = useGameActions();
  const player = state.players[state.currentPlayerIndex];

  const stockAssets = useMemo(
    () => player.assets.filter((a) => isStockLotAsset(a)),
    [player.assets]
  );

  const [sellInputs, setSellInputs] = useState<Record<string, number>>({});

  const handleSellHandChange = (assetId: string, val: number) => {
    setSellInputs((prev) => ({ ...prev, [assetId]: Math.max(1, Math.floor(val)) }));
  };

  const handleSell = (assetId: string, sellHand: number) => {
    actions.sellStockManually(assetId, sellHand);
  };

  const totalProceeds = useMemo(() => {
    let sum = 0;
    for (const asset of stockAssets) {
      const qty = sellInputs[asset.id];
      if (qty && qty > 0 && qty <= (asset.shareHand ?? 0)) {
        sum += calcStockProfit(asset, qty, state.marketMultiplier, state.sectorMultiplier);
      }
    }
    return sum;
  }, [stockAssets, sellInputs]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>📈 证券交易</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          {stockAssets.length === 0 ? (
            <div className={styles.empty}>暂无股票持仓</div>
          ) : (
            <div className={styles.stockList}>
              {stockAssets.map((asset) => {
                const currentPrice = calcCurrentStockPrice(asset, state.marketMultiplier, state.sectorMultiplier);
                const basePe = getStockBasePe(asset);
                const currentPe = asset.currentPe ?? basePe;
                const totalLots = asset.shareHand ?? 0;
                const marketValue = calcCurrentStockMarketValue(asset, state.marketMultiplier, state.sectorMultiplier);
                const intrinsicPrice = asset.intrinsicPrice ?? 0;
                const buyPrice = totalLots > 0 ? (asset.cost ?? 0) / (totalLots * 100) : 0;
                const valuation = judgeStockValuation(currentPrice, intrinsicPrice);
                const profitPerShare = currentPrice - buyPrice;
                const profitPct = buyPrice > 0 ? ((profitPerShare / buyPrice) * 100).toFixed(1) : '0';
                const isEquityPE = asset.type === 'stock' || asset.type === 'overseas' || asset.type === 'derivative';

                const sellQty = sellInputs[asset.id] ?? 0;
                const previewProceeds = sellQty > 0 ? calcStockProfit(asset, sellQty, state.marketMultiplier, state.sectorMultiplier) : 0;
                const effectiveMaxSell = totalLots;

                return (
                  <div key={asset.id} className={styles.stockCard}>
                    <div className={styles.stockHeader}>
                      <span className={styles.stockName}>
                        {getAssetIcon(asset.type)} {asset.name}
                      </span>
                      <span className={styles.sectorTag}>{asset.metadata?.sector}</span>
                    </div>

                    {/* v3.6 PE 估值显示（仅限股票类资产） */}
                    {isEquityPE && (
                      <div className={styles.valuationRow}>
                        <span className={styles.peLabel}>行业中枢PE {basePe.toFixed(1)}</span>
                        <span className={styles.peLabel}>当前动态PE {currentPe.toFixed(1)}</span>
                        <span className={`${styles.valuationTag} ${styles[valuation]}`}>
                          {getValuationLabel(valuation)}
                        </span>
                      </div>
                    )}

                    {/* 价格信息 */}
                    <div className={styles.priceRow}>
                      <div className={styles.priceItem}>
                        <span className={styles.priceLabel}>内在价值</span>
                        <span className={styles.priceValue}>{formatCurrency(intrinsicPrice)}</span>
                      </div>
                      <div className={styles.priceItem}>
                        <span className={styles.priceLabel}>实时现价</span>
                        <span className={styles.priceValue}>{formatCurrency(currentPrice)}</span>
                      </div>
                      <div className={styles.priceItem}>
                        <span className={styles.priceLabel}>持仓成本</span>
                        <span className={styles.priceValue}>{formatCurrency(buyPrice)}</span>
                      </div>
                      <div className={styles.priceItem}>
                        <span className={styles.priceLabel}>浮盈/浮亏</span>
                        <span className={`${styles.priceValue} ${profitPerShare >= 0 ? styles.profit : styles.loss}`}>
                          {profitPerShare >= 0 ? '+' : ''}{formatCurrency(profitPerShare)} ({profitPct}%)
                        </span>
                      </div>
                    </div>

                    <div className={styles.positionRow}>
                      <span>持仓 {totalLots} 手 · 市值 {formatCurrency(marketValue)}</span>
                    </div>

                    {/* 卖出操作 */}
                    <div className={styles.sellRow}>
                      <label className={styles.sellLabel}>
                        卖出（手）：
                        <input
                          type="number"
                          min={1}
                          max={effectiveMaxSell}
                          step={1}
                          value={sellInputs[asset.id] ?? ''}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            handleSellHandChange(asset.id, Number.isFinite(v) && v >= 1 ? v : 0);
                          }}
                          className={styles.sellInput}
                          placeholder="0"
                        />
                      </label>
                      {sellQty > 0 && (
                        <span className={styles.sellPreview}>
                          预计净收 {formatCurrency(previewProceeds)}
                        </span>
                      )}
                      <button
                        className={styles.sellButton}
                        disabled={!sellQty || sellQty < 1 || sellQty > effectiveMaxSell}
                        onClick={() => handleSell(asset.id, sellQty)}
                      >
                        卖出{sellQty > 0 ? ` ${sellQty}手` : ''}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalProceeds > 0 && (
            <div className={styles.totalProceeds}>
              预计总计净收：{formatCurrency(totalProceeds)}
            </div>
          )}

          <div className={styles.tip}>
            💡 自由交易按市场实时价格成交，佣金0.03% + 印花税0.1%（持有≥12月免印花税），无关系惩罚。
          </div>
          <div className={styles.tip}>
            ⚠️ 不足100股（零股）仅支持一次性全部清仓，无法分批卖出。
          </div>
        </div>
      </div>
    </div>
  );
}
