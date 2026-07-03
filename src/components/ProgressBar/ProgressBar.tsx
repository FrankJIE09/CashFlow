import { motion } from 'framer-motion';
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  color?: 'green' | 'red' | 'gold' | 'blue' | 'purple';
  icon?: string;
}

export function ProgressBar({ value, max, label, color = 'green', icon }: ProgressBarProps) {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  const isNegative = value < 0;

  return (
    <div className={styles.container}>
      <div className={styles.labelRow}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <span className={styles.label}>{label}</span>
        <span className={`${styles.value} ${isNegative ? styles.negative : styles.positive}`}>
          {isNegative ? '-' : ''}¥{Math.abs(Math.round(value)).toLocaleString()}
        </span>
      </div>
      <div className={styles.barBackground}>
        <motion.div
          className={`${styles.barFill} ${styles[color]}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
        {isNegative && (
          <div className={styles.negativeOverlay} style={{ width: `${Math.min(100, (Math.abs(value) / max) * 100)}%` }} />
        )}
      </div>
    </div>
  );
}
