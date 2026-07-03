import { useEffect, useState } from 'react';
import styles from './Dice.module.css';

interface DiceProps {
  value: number;
  isRolling: boolean;
  size?: number;
}

const DOTS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function Dice({ value, isRolling, size = 64 }: DiceProps) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (!isRolling) {
      setDisplayValue(value);
      return;
    }

    let interval: number;
    let last = value;
    interval = window.setInterval(() => {
      let next = Math.floor(Math.random() * 6) + 1;
      while (next === last) {
        next = Math.floor(Math.random() * 6) + 1;
      }
      last = next;
      setDisplayValue(next);
    }, 80);

    return () => clearInterval(interval);
  }, [isRolling, value]);

  return (
    <div
      className={`${styles.dice} ${isRolling ? styles.rolling : ''}`}
      style={{ width: size, height: size }}
      aria-label={`骰子 ${displayValue}`}
    >
      <div className={styles.face}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className={`${styles.dot} ${DOTS[displayValue].includes(i) ? styles.active : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
