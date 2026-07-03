import { useState } from 'react';
import { PROFESSIONS } from '../../data/professions';
import { useGameActions } from '../../hooks/useGameActions';
import type { Difficulty } from '../../types/game';
import { PROFESSION_AVATARS } from '../Icons/GameIcons';
import styles from './StartScreen.module.css';

export function StartScreen() {
  const { setupGame } = useGameActions();
  const [name, setName] = useState('玩家');
  const [professionId, setProfessionId] = useState(PROFESSIONS[0].id);
  const [aiCount, setAiCount] = useState(2);
  const [aiDifficulty, setAiDifficulty] = useState<Difficulty>('medium');

  const selectedProfession = PROFESSIONS.find((p) => p.id === professionId);

  const handleStart = () => {
    setupGame({
      humanPlayerName: name,
      humanProfessionId: professionId,
      aiCount,
      aiDifficulty,
    });
  };

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <h1 className={styles.title}>CashFlow</h1>
        <p className={styles.subtitle}>富爸爸现金流游戏</p>

        <div className={styles.form}>
          <div className={styles.field}>
            <label>玩家姓名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入你的名字"
            />
          </div>

          <div className={styles.field}>
            <label>选择职业</label>
            <div className={styles.professionList}>
              {PROFESSIONS.map((profession) => (
                <button
                  key={profession.id}
                  className={`${styles.professionCard} ${profession.id === professionId ? styles.selected : ''}`}
                  onClick={() => setProfessionId(profession.id)}
                >
                  <div className={styles.professionHeader}>
                    <span className={styles.professionAvatar}>{PROFESSION_AVATARS[profession.id] || '👤'}</span>
                    <span className={styles.professionName}>{profession.name}</span>
                  </div>
                  <div className={styles.professionStats}>
                    <span>工资 {profession.salary.toLocaleString()}</span>
                    <span>现金流 {(profession.salary - profession.expenses.tax - profession.expenses.mortgage - profession.expenses.studentLoan - profession.expenses.carLoan - profession.expenses.creditCard - profession.expenses.other).toLocaleString()}</span>
                  </div>
                  <div className={styles.professionDesc}>{profession.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label>AI 对手数量</label>
            <select value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))}>
              <option value={1}>1 个</option>
              <option value={2}>2 个</option>
              <option value={3}>3 个</option>
              <option value={4}>4 个</option>
              <option value={5}>5 个</option>
            </select>
          </div>

          <div className={styles.field}>
            <label>AI 难度</label>
            <select value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value as Difficulty)}>
              <option value="easy">简单</option>
              <option value="medium">中等</option>
              <option value="hard">困难</option>
            </select>
          </div>
        </div>

        {selectedProfession && (
          <div className={styles.preview}>
            <h3>职业预览：{selectedProfession.name}</h3>
            <div className={styles.previewGrid}>
              <div>工资：{selectedProfession.salary.toLocaleString()}</div>
              <div>初始现金：{selectedProfession.cash.toLocaleString()}</div>
              <div>月支出：{Object.values(selectedProfession.expenses).reduce((a, b) => a + b, 0).toLocaleString()}</div>
              <div>初始负债：{selectedProfession.liabilities.reduce((a, b) => a + b.principal, 0).toLocaleString()}</div>
            </div>
          </div>
        )}

        <button className={styles.startButton} onClick={handleStart}>
          开始游戏
        </button>
      </div>
    </div>
  );
}
