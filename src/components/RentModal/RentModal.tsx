import { useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useGameActions } from '../../hooks/useGameActions';
import { getRentExpense } from '../../utils/financial';
import styles from './RentModal.module.css';

interface RentModalProps {
  forced?: boolean;
  onClose?: () => void;
}

const TIERS = [
  { key: 'economy' as const, label: '经济型', desc: '简朴实用', multiplier: 0.7 },
  { key: 'standard' as const, label: '标准型', desc: '舒适均衡', multiplier: 1.0 },
  { key: 'luxury' as const, label: '舒适型', desc: '品质生活', multiplier: 1.5 },
];

export function RentModal({ forced = false, onClose }: RentModalProps) {
  const { state } = useGame();
  const actions = useGameActions();
  const player = state.players[state.currentPlayerIndex];
  const currentTier = player.rentTier ?? 'standard';

  const [selectedTier, setSelectedTier] = useState<'economy' | 'standard' | 'luxury'>(currentTier);

  const estimatedRent = useMemo(() => {
    return TIERS.map(t => ({
      ...t,
      rent: getRentExpense(
        { ...player, rentTier: t.key },
        player.cityId
      ),
    }));
  }, [player]);

  const handleConfirm = () => {
    actions.setRentTier(selectedTier);
    onClose?.();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>🏠 租房设置</h2>
          <p className={styles.subtitle}>
            {forced ? '您已卖出唯一自住房，请选择租房档位' : '选择您偏好的租房标准'}
          </p>
        </div>

        <div className={styles.tierOptions}>
          {estimatedRent.map((tier) => (
            <button
              key={tier.key}
              className={`${styles.tierBtn} ${selectedTier === tier.key ? styles.tierBtnActive : ''}`}
              onClick={() => setSelectedTier(tier.key)}
            >
              <div>
                <div className={styles.tierLabel}>
                  {tier.label}
                  {currentTier === tier.key && <span className={styles.currentBadge}>当前</span>}
                </div>
                <div className={styles.tierDesc}>{tier.desc}</div>
              </div>
              <div className={styles.tierPrice}>{tier.rent.toLocaleString()} 元/月</div>
            </button>
          ))}
        </div>

        <div className={styles.actions}>
          <button className={styles.confirmBtn} onClick={handleConfirm}>
            确认选择
          </button>
        </div>
      </div>
    </div>
  );
}
