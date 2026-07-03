import type { Player } from '../../types/game';
import { useGame } from '../../context/GameContext';
import { PROFESSIONS } from '../../data/professions';
import {
  getAssetMarketValue,
  getMonthlyCashFlow,
  getNetWorth,
  getPassiveIncome,
  getTotalAssetsValue,
  getTotalExpenses,
} from '../../utils/financial';
import { formatCurrency } from '../../utils/format';
import styles from './FinancialStatement.module.css';

interface FinancialStatementProps {
  player: Player;
  onClose: () => void;
}

export function FinancialStatement({ player, onClose }: FinancialStatementProps) {
  const { state } = useGame();
  const profession = PROFESSIONS.find((p) => p.id === player.professionId);

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
              <span>{formatCurrency(getPassiveIncome(player))}</span>
            </div>
            <div className={`${styles.row} ${styles.total}`}>
              <span>总收入</span>
              <span>{formatCurrency(player.salary + getPassiveIncome(player))}</span>
            </div>
          </section>

          <section className={styles.section}>
            <h3>支出</h3>
            <div className={styles.row}>
              <span>税</span>
              <span>{formatCurrency(player.expenses.tax)}</span>
            </div>
            <div className={styles.row}>
              <span>房贷</span>
              <span>{formatCurrency(player.expenses.mortgage)}</span>
            </div>
            <div className={styles.row}>
              <span>学贷</span>
              <span>{formatCurrency(player.expenses.studentLoan)}</span>
            </div>
            <div className={styles.row}>
              <span>车贷</span>
              <span>{formatCurrency(player.expenses.carLoan)}</span>
            </div>
            <div className={styles.row}>
              <span>信用卡</span>
              <span>{formatCurrency(player.expenses.creditCard)}</span>
            </div>
            <div className={styles.row}>
              <span>其他</span>
              <span>{formatCurrency(player.expenses.other)}</span>
            </div>
            <div className={styles.row}>
              <span>子女支出（{player.children} × {formatCurrency(player.expenses.perChild)}）</span>
              <span>{formatCurrency(player.children * player.expenses.perChild)}</span>
            </div>
            <div className={`${styles.row} ${styles.total}`}>
              <span>总支出</span>
              <span>{formatCurrency(getTotalExpenses(player))}</span>
            </div>
          </section>

          <section className={styles.section}>
            <h3>现金流</h3>
            <div className={`${styles.row} ${styles.total}`}>
              <span>月现金流</span>
              <span className={getMonthlyCashFlow(player) >= 0 ? styles.positive : styles.negative}>
                {formatCurrency(getMonthlyCashFlow(player))}
              </span>
            </div>
          </section>

          <section className={styles.section}>
            <h3>资产</h3>
            {player.assets.length === 0 ? (
              <div className={styles.empty}>暂无资产</div>
            ) : (
              player.assets.map((asset) => (
                <div key={asset.id} className={styles.assetRow}>
                  <div>{asset.name}</div>
                  <div className={styles.assetMeta}>
                    <span>基础市值 {formatCurrency(asset.marketValue)}</span>
                    <span>当前市值 {formatCurrency(getAssetMarketValue(asset, state.marketMultiplier[asset.type]))}</span>
                    <span>月现金流 +{formatCurrency(asset.cashFlow)}</span>
                  </div>
                </div>
              ))
            )}
          </section>

          <section className={styles.section}>
            <h3>负债</h3>
            {player.liabilities.length === 0 ? (
              <div className={styles.empty}>暂无负债</div>
            ) : (
              player.liabilities.map((liability) => (
                <div key={liability.id} className={styles.row}>
                  <span>{liability.name}</span>
                  <span>{formatCurrency(liability.principal)}</span>
                </div>
              ))
            )}
          </section>

          <section className={styles.section}>
            <h3>关键指标</h3>
            <div className={styles.row}>
              <span>净资产</span>
              <span>{formatCurrency(getNetWorth(player, state.marketMultiplier))}</span>
            </div>
            <div className={styles.row}>
              <span>资产总市值</span>
              <span>{formatCurrency(getTotalAssetsValue(player, state.marketMultiplier))}</span>
            </div>
            <div className={styles.row}>
              <span>财务自由进度</span>
              <span>
                {formatCurrency(getPassiveIncome(player))} / {formatCurrency(getTotalExpenses(player))}
              </span>
            </div>
            <div className={styles.row}>
              <span>职业</span>
              <span>{profession?.name}</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
