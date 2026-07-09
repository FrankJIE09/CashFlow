import { useState } from 'react';
import type { Asset } from '../../types/game';
import { useGameActions } from '../../hooks/useGameActions';
import { getAssetAverageCost } from '../../utils/financial';
import { formatCurrency } from '../../utils/format';
import { getAssetIcon } from '../Icons/GameIcons';
import styles from './DcaModal.module.css';

interface DcaModalProps {
  asset: Asset;
  currentRound: number;
  onClose: () => void;
}

export function DcaModal({ asset, currentRound, onClose }: DcaModalProps) {
  const actions = useGameActions();
  const [monthlyAmount, setMonthlyAmount] = useState(Math.round(asset.marketValue * 0.1 / 100) * 100 || 1000);
  const [smartEnabled, setSmartEnabled] = useState(true);
  const [endYears, setEndYears] = useState(5);

  const handleSubmit = () => {
    const endRound = endYears > 0 ? currentRound + endYears * 12 : null;
    actions.setDcaPlan(asset.id, monthlyAmount, smartEnabled, endRound);
    onClose();
  };

  const avgCost = getAssetAverageCost(asset);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>📊 设置定投 - {asset.name}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.assetInfo}>
            {getAssetIcon(asset.type)} {asset.name}
            {asset.shareHand != null && (
              <span className={styles.handInfo}>
                {asset.shareHand}手{avgCost > 0 ? ` · 均价 ${formatCurrency(avgCost)}` : ''}
              </span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              每月定投金额（元）
            </label>
            <input
              type="number"
              className={styles.input}
              min={100}
              step={100}
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(Math.max(100, parseInt(e.target.value, 10) || 0))}
            />
            <div className={styles.quickAmounts}>
              {[500, 1000, 2000, 5000].map((amt) => (
                <button
                  key={amt}
                  className={`${styles.quickBtn} ${monthlyAmount === amt ? styles.quickBtnActive : ''}`}
                  onClick={() => setMonthlyAmount(amt)}
                >
                  {formatCurrency(amt)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.switchLabel}>
              <span>
                智能定投
                <span className={styles.switchHint}>
                  PE低估时加倍买入，高估时减半
                </span>
              </span>
              <input
                type="checkbox"
                className={styles.switch}
                checked={smartEnabled}
                onChange={(e) => setSmartEnabled(e.target.checked)}
              />
            </label>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              终止年限
            </label>
            <select
              className={styles.select}
              value={endYears}
              onChange={(e) => setEndYears(parseInt(e.target.value, 10))}
            >
              <option value={1}>1 年后</option>
              <option value={2}>2 年后</option>
              <option value={3}>3 年后</option>
              <option value={5}>5 年后</option>
              <option value={10}>10 年后</option>
              <option value={0}>不终止</option>
            </select>
          </div>

          <div className={styles.tip}>
            当前回合：第 {currentRound} 回合
            {endYears > 0 && ` · 预计终止：第 ${currentRound + endYears * 12} 回合`}
          </div>

          <div className={styles.actions}>
            <button className={styles.cancelBtn} onClick={onClose}>
              取消
            </button>
            <button
              className={styles.submitBtn}
              disabled={monthlyAmount < 100}
              onClick={handleSubmit}
            >
              确认设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
