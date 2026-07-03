import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import styles from './AnimatedDice.module.css';

interface AnimatedDiceProps {
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

export function AnimatedDice({ value, isRolling, size = 64 }: AnimatedDiceProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isRolling) {
      setDisplayValue(value);
      return;
    }

    let last = value;
    const interval = window.setInterval(() => {
      let next = Math.floor(Math.random() * 6) + 1;
      while (next === last) {
        next = Math.floor(Math.random() * 6) + 1;
      }
      last = next;
      setDisplayValue(next);
      setRotation({
        x: Math.random() * 360 - 180,
        y: Math.random() * 360 - 180,
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isRolling, value]);

  return (
    <motion.div
      className={styles.dice}
      style={{ width: size, height: size }}
      animate={{
        rotateX: rotation.x,
        rotateY: rotation.y,
        scale: isRolling ? [1, 1.1, 1] : 1,
      }}
      transition={{ duration: 0.1 }}
    >
      <div className={styles.face}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className={`${styles.dot} ${DOTS[displayValue].includes(i) ? styles.active : ''}`}
          />
        ))}
      </div>
    </motion.div>
  );
}
