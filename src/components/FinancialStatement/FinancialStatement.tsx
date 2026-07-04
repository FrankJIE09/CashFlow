import { useMemo, useState } from 'react';
import type { DebtType, Liability, Player } from '../../types/game';
import { useGame } from '../../context/GameContext';
import { useGameActions } from '../../hooks/useGameActions';
import { getPlayerProfessionName } from '../../data/professions';
import {
  DEBT_TYPE_CONFIG,
  calcEmergencyReserveMonths,
  getAssetMarketValue,
  getAssetTypeLabel,
  getDebtTypeConfig,
  getDebtTypeLabel,
  getIncomeTypeLabel,
  getMonthlyCashFlow,
  getNetWorth,
  getPassiveIncome,
  getPassiveIncomeByAssetType,
  getPassiveIncomeByType,
  getPropertyTax,
  getSellableAssets,
  getTotalAssetsValue,
  getTotalExpenses,
  hasSellableAssets,
  inferDebtTypeFromLiability,
  isStockLotAsset,
  liquidateAssetConsent,
  liquidateAssetSecret,
  calcCurrentStockPrice,
  judgeStockValuation,
  getStockBasePe,
  getValuationLabel,
} from '../../utils/financial';
import { formatCurrency } from '../../utils/format';
import { getAssetIcon } from '../Icons/GameIcons';
import { RepayModal } from '../RepayModal/RepayModal';
import { StockTradeModal } from '../StockTradeModal/StockTradeModal';
import styles from './FinancialStatement.module.css';
import { ALL_ASSET_TYPES } from '../../types/game';

interface FinancialStatementProps {
  player: Player;
  onClose: () => void;
  canRepay?: boolean;
}

function groupLiabilitiesByDebtType(liabilities: Liability[]): Map<DebtType, Liability[]> {
  const groups = new Map<DebtType, Liability[]>();
  for (const liability of liabilities) {
    const debtType = inferDebtTypeFromLiability(liability);
    const list = groups.get(debtType) ?? [];
    list.push(liability);
    groups.set(debtType, list);
  }
  return groups;
}

export function FinancialStatement({ player, onClose, canRepay = false }: FinancialStatementProps) {
  const { state } = useGame();
  const actions = useGameActions();
  const professionName = getPlayerProfessionName(player);
  const incomeByType = getPassiveIncomeByType(player, state.cashFlowMultiplier, state.sectorMultiplier);
  const incomeByAssetType = getPassiveIncomeByAssetType(player, state.cashFlowMultiplier, state.sectorMultiplier);
  const propertyTax = getPropertyTax(player);
  const liabilityGroups = useMemo(() => groupLiabilitiesByDebtType(player.liabilities), [player.liabilities]);

  const [repayTarget, setRepayTarget] = useState<Liability | null>(null);
  const [showStockTrade, setShowStockTrade] = useState(false);
  const monthlyCashFlow = getMonthlyCashFlow(player, state.cashFlowMultiplier, state.sectorMultiplier);
  const emergencyReserve = calcEmergencyReserveMonths(player, state.cashFlowMultiplier, state.sectorMultiplier);
  const sellableAssets = useMemo(() => getSellableAssets(player), [player.assets]);
  const showLiquidateHighlight = monthlyCashFlow < 0 && hasSellableAssets(player);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>财务报表 - {player.name}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          <section className={styles.section}>
            <h3>收入</h3>
            <div className={styles.row}>
              <span>工资收入</span>
              <span>{formatCurrency(player.salary)}</span>
            </div>
            <div className={styles.row}>
              <span>被动收入</span>
              <span>{formatCurrency(getPassiveIncome(player, state.cashFlowMultiplier, state.sectorMultiplier))}</span>
            </div>
            {Object.entries(incomeByType)
              .filter(([, v]) => v > 0)
              .map(([type, amount]) => (
                <div key={type} className={styles.subRow}>
                  <span>└ {getIncomeTypeLabel(type as keyof typeof incomeByType)}</span>
                  <span>{formatCurrency(amount)}</span>
                </div>
              ))}
            <div className={`${styles.row} ${styles.total}`}>
              <span>总收入</span>
              <span>
                {formatCurrency(player.salary + getPassiveIncome(player, state.cashFlowMultiplier, state.sectorMultiplier))}
              </span>
            </div>
          </section>

          <section className={styles.section}>
            <h3>支出</h3>
            <div className={styles.row}>
              <span>税</span>
              <span>{formatCurrency(player.expenses.tax)}</span>
            </div>
            <div className={styles.row}>
              <span>其他</span>
              <span>{formatCurrency(player.expenses.other)}</span>
            </div>
            <div className={styles.row}>
              <span>子女支出（{player.children} × {formatCurrency(player.expenses.perChild)}）</span>
              <span>{formatCurrency(player.children * player.expenses.perChild)}</span>
            </div>
            {propertyTax > 0 && (
              <div className={styles.row}>
                <span>房产税（持有 2 套及以上房产）</span>
                <span>{formatCurrency(propertyTax)}</span>
              </div>
            )}
            {Array.from(liabilityGroups.entries()).map(([debtType, items]) => {
              const config = DEBT_TYPE_CONFIG[debtType];
              const totalPayment = items.reduce((sum, l) => sum + l.monthlyPayment, 0);
              return (
                <div key={debtType} className={styles.liabilityGroup}>
                  <div className={styles.row}>
                    <span>
                      {getDebtTypeLabel(debtType)}（{(config.monthlyRate * 100).toFixed(2)}%/月）
                    </span>
                    <span>{formatCurrency(totalPayment)}</span>
                  </div>
                  {items.map((liability) => (
                    <div key={liability.id} className={styles.subRow}>
                      <span>
                        └ {liability.name} · 本金 {formatCurrency(liability.principal)} · 已还{' '}
                        {liability.paidPeriods ?? 0} 期
                      </span>
                      <span>{formatCurrency(liability.monthlyPayment)}</span>
                    </div>
                  ))}
                </div>
              );
            })}
            <div className={`${styles.row} ${styles.total}`}>
              <span>总支出</span>
              <span>{formatCurrency(getTotalExpenses(player))}</span>
            </div>
          </section>

          <section className={styles.section}>
            <h3>现金流</h3>
            <div className={styles.row}>
              <span>应急储备</span>
              <span className={emergencyReserve < 3 && monthlyCashFlow < 0 ? styles.negative : undefined}>
                {emergencyReserve >= 99 ? '∞' : `${emergencyReserve.toFixed(1)} 个月`}
              </span>
            </div>
            <div className={`${styles.row} ${styles.total}`}>
              <span>月现金流</span>
              <span
                className={
                  monthlyCashFlow >= 0 ? styles.positive : styles.negative
                }
              >
                {formatCurrency(monthlyCashFlow)}
              </span>
            </div>
            {showLiquidateHighlight && (
              <p className={styles.liquidateHint}>
                ⚠️ 月现金流为负，可考虑变卖资产或申请银行贷款缓解。
              </p>
            )}
          </section>

          <section className={styles.section}>
            <h3>资产分类汇总</h3>
            {ALL_ASSET_TYPES.filter((t) => (incomeByAssetType[t] ?? 0) > 0 || player.assets.some((a) => a.type === t)).map(
              (type) => {
                const typeAssets = player.assets.filter((a) => a.type === type);
                const typeValue = typeAssets.reduce(
                  (sum, a) => sum + getAssetMarketValue(a, state.marketMultiplier[type], state.sectorMultiplier),
                  0
                );
                return (
                  <div key={type} className={styles.categoryRow}>
                    <span>
                      {getAssetIcon(type)} {getAssetTypeLabel(type)}（{typeAssets.length}）
                    </span>
                    <span>
                      市值 {formatCurrency(typeValue)} / 月收 {formatCurrency(incomeByAssetType[type] ?? 0)}
                    </span>
                  </div>
                );
              }
            )}
            {player.assets.length === 0 && <div className={styles.empty}>暂无资产</div>}
          </section>

          <section className={styles.section}>
            <h3>资产明细</h3>
            {player.assets.length === 0 ? (
              <div className={styles.empty}>暂无资产</div>
            ) : (
              <>
                {player.assets.some((a) => isStockLotAsset(a)) && (
                  <button
                    className={`${styles.stockTradeBtn} cartoon-button`}
                    onClick={() => setShowStockTrade(true)}
                  >
                    📈 证券交易（自主卖出）
                  </button>
                )}
                {player.assets.map((asset) => {
                  const canLiquidate = sellableAssets.some((a) => a.id === asset.id);
                  const consent = canLiquidate
                    ? liquidateAssetConsent(asset, state.marketMultiplier, state.sectorMultiplier)
                    : null;
                  const secret = canLiquidate
                    ? liquidateAssetSecret(asset, state.marketMultiplier, state.sectorMultiplier)
                    : null;

                  // v3.6 PE 显示
                  const isStock = isStockLotAsset(asset);
                  let peInfo = null;
                  if (isStock) {
                    const basePe = getStockBasePe(asset);
                    const currentPe = asset.currentPe ?? basePe;
                    const valuation = judgeStockValuation(currentPe, basePe);
                    const currentPrice = calcCurrentStockPrice(asset);
                    const buyPrice = asset.originalSinglePrice ?? asset.singlePrice ?? 0;
                    const profit = currentPrice - buyPrice;
                    const intrinsicPrice = asset.intrinsicPrice ?? 0;
                    peInfo = (
                      <div className={styles.peInfo}>
                        <span>行业中枢PE {basePe.toFixed(1)} | 动态PE {currentPe.toFixed(1)}</span>
                        <span className={`${styles.valuationTag} ${styles[valuation]}`}>
                          {getValuationLabel(valuation)}
                        </span>
                        <span>内在价值 {formatCurrency(intrinsicPrice)} | 现价 {formatCurrency(currentPrice)}</span>
                        <span>持仓成本 {formatCurrency(buyPrice)} | 浮盈/浮亏 {profit >= 0 ? '+' : ''}{formatCurrency(profit)}</span>
                      </div>
                    );
                  }

                  return (
                    <div key={asset.id} className={styles.assetRow}>
                      <div>
                        {getAssetIcon(asset.type)} {asset.name}
                        {asset.metadata?.sector && <span className={styles.sectorTag}>{asset.metadata.sector}</span>}
                      </div>
                      <div className={styles.assetMeta}>
                        <span>基础市值 {formatCurrency(asset.marketValue)}</span>
                        <span>
                          当前市值{' '}
                          {formatCurrency(
                            getAssetMarketValue(asset, state.marketMultiplier[asset.type], state.sectorMultiplier)
                          )}
                        </span>
                        <span>月现金流 +{formatCurrency(asset.cashFlow)}</span>
                      </div>
                      {peInfo}
                      {canLiquidate && monthlyCashFlow < 0 && (
                        <div className={styles.liquidateActions}>
                          <button
                            type="button"
                            className={`${styles.liquidateBtn} cartoon-button`}
                            onClick={() => actions.liquidateAsset(asset.id, false)}
                          >
                            协商变卖 {formatCurrency(consent!.proceeds)}
                          </button>
                          <button
                            type="button"
                            className={`${styles.liquidateBtnSecret} cartoon-button`}
                            onClick={() => actions.liquidateAsset(asset.id, true)}
                          >
                            私自变卖 {formatCurrency(secret!.proceeds)}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </section>

          <section className={styles.section}>
            <h3>负债明细</h3>
            {player.liabilities.length === 0 ? (
              <div className={styles.empty}>暂无负债</div>
            ) : (
              player.liabilities.map((liability) => {
                const debtType = inferDebtTypeFromLiability(liability);
                const config = getDebtTypeConfig(debtType);
                return (
                  <div key={liability.id} className={styles.liabilityCard}>
                    <div className={styles.liabilityHeader}>
                      <span className={styles.liabilityName}>{liability.name}</span>
                      <span className={styles.debtTypeBadge}>{getDebtTypeLabel(debtType)}</span>
                    </div>
                    <div className={styles.liabilityDetails}>
                      <span>月利率 {(config.monthlyRate * 100).toFixed(2)}%</span>
                      <span>本金 {formatCurrency(liability.principal)}</span>
                      <span>月供 {formatCurrency(liability.monthlyPayment)}</span>
                      <span>已还 {liability.paidPeriods ?? 0} 期</span>
                    </div>
                    {canRepay && liability.principal > 0 && (
                      <button
                        className={`${styles.repayButton} cartoon-button`}
                        onClick={() => setRepayTarget(liability)}
                      >
                        💰 偿还本金
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </section>

          <section className={styles.section}>
            <h3>关键指标</h3>
            <div className={styles.row}>
              <span>净资产</span>
              <span>{formatCurrency(getNetWorth(player, state.marketMultiplier, state.sectorMultiplier))}</span>
            </div>
            <div className={styles.row}>
              <span>资产总市值</span>
              <span>{formatCurrency(getTotalAssetsValue(player, state.marketMultiplier, state.sectorMultiplier))}</span>
            </div>
            <div className={styles.row}>
              <span>财务自由进度</span>
              <span>
                {formatCurrency(getPassiveIncome(player, state.cashFlowMultiplier, state.sectorMultiplier))} /{' '}
                {formatCurrency(getTotalExpenses(player))}
              </span>
            </div>
            <div className={styles.row}>
              <span>职业</span>
              <span>{professionName}</span>
            </div>
          </section>
        </div>

        {repayTarget && (
          <RepayModal
            player={player}
            initialLiability={repayTarget}
            nested
            onClose={() => setRepayTarget(null)}
          />
        )}

        {showStockTrade && (
          <StockTradeModal onClose={() => setShowStockTrade(false)} />
        )}
      </div>
    </div>
  );
}
