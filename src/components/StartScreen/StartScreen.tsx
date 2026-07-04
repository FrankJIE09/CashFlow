import { useState, useMemo } from 'react';
import {
  PROFESSIONS,
  PROFESSION_TIER_LABELS,
  CUSTOM_PROFESSION_ID,
  DEFAULT_CUSTOM_PROFESSION,
  buildCustomProfession,
  validateCustomProfession,
} from '../../data/professions';
import { CITIES, CITY_TIER_LABELS, DEFAULT_CITY_ID, getCityById } from '../../data/cities';
import { useGameActions } from '../../hooks/useGameActions';
import type { CityTier, CustomProfessionConfig, Difficulty } from '../../types/game';
import { calcLiabilityMonthlyPayment } from '../../utils/financial';
import { PROFESSION_AVATARS } from '../Icons/GameIcons';
import styles from './StartScreen.module.css';

const TIER_ORDER: CityTier[] = ['tier1', 'tier2', 'tier3', 'tier4'];

function computePreviewStats(
  profession: ReturnType<typeof buildCustomProfession> | (typeof PROFESSIONS)[number],
  city: ReturnType<typeof getCityById>
) {
  const salaryBuff = profession.buff?.salary ?? 1;
  const expenseBuff = profession.buff?.expense ?? 1;
  const savingsBuff = profession.buff?.savings ?? 1;
  const salary = Math.round(profession.salary * city.salaryMultiplier * salaryBuff);
  const other = Math.round(profession.expenses.other * city.expenseMultiplier * expenseBuff);
  const tax = Math.round(profession.expenses.tax * city.expenseMultiplier);
  const liabilityPay = profession.liabilities.reduce(
    (sum, l) => sum + calcLiabilityMonthlyPayment(l.principal, l.debtType ?? 'houseFirst'),
    0
  );
  const cashFlow = salary - tax - other - liabilityPay;
  return {
    salary,
    cash: Math.round(profession.cash * savingsBuff),
    liabilityPay,
    cashFlow,
    expenseHint: city.expenseMultiplier,
  };
}

export function StartScreen() {
  const { setupGame } = useGameActions();
  const [name, setName] = useState('玩家');
  const [cityId, setCityId] = useState(DEFAULT_CITY_ID);
  const [professionId, setProfessionId] = useState(PROFESSIONS[0].id);
  const [customProfession, setCustomProfession] = useState<CustomProfessionConfig>({
    ...DEFAULT_CUSTOM_PROFESSION,
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [aiCount, setAiCount] = useState(0);
  const [aiDifficulty, setAiDifficulty] = useState<Difficulty>('medium');
  const [testMode, setTestMode] = useState(false);
  const [testMaxRounds, setTestMaxRounds] = useState(50);

  const isCustom = professionId === CUSTOM_PROFESSION_ID;
  const selectedCity = getCityById(cityId);
  const selectedProfession = isCustom
    ? buildCustomProfession(customProfession)
    : PROFESSIONS.find((p) => p.id === professionId);

  const previewStats = useMemo(() => {
    if (!selectedProfession) return null;
    return computePreviewStats(selectedProfession, selectedCity);
  }, [selectedProfession, selectedCity]);

  const updateCustom = (patch: Partial<CustomProfessionConfig>) => {
    setCustomProfession((prev) => ({ ...prev, ...patch }));
    setValidationErrors([]);
  };

  const parseNumber = (value: string, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const handleStart = () => {
    if (isCustom) {
      const result = validateCustomProfession(customProfession);
      if (!result.valid) {
        setValidationErrors(result.errors);
        return;
      }
      setupGame({
        humanPlayerName: name,
        humanProfessionId: CUSTOM_PROFESSION_ID,
        customProfession,
        cityId,
        aiCount,
        aiDifficulty,
        testMode,
        testMaxRounds: testMode ? testMaxRounds : undefined,
      });
      return;
    }

    setupGame({
      humanPlayerName: name,
      humanProfessionId: professionId,
      cityId,
      aiCount,
      aiDifficulty,
      testMode,
      testMaxRounds: testMode ? testMaxRounds : undefined,
    });
  };

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <h1 className={styles.title}>CashFlow</h1>
        <p className={styles.subtitle}>富爸爸现金流游戏 · v3.0</p>

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
            <label>选择城市（先于职业）</label>
            <div className={styles.cityList}>
              {TIER_ORDER.map((tier) => (
                <div key={tier} className={styles.cityTierGroup}>
                  <div className={styles.cityTierLabel}>{CITY_TIER_LABELS[tier]}</div>
                  <div className={styles.cityButtons}>
                    {CITIES.filter((c) => c.tier === tier).map((city) => (
                      <button
                        key={city.id}
                        type="button"
                        className={`${styles.cityButton} ${city.id === cityId ? styles.selectedCity : ''}`}
                        onClick={() => setCityId(city.id)}
                      >
                        <span className={styles.cityName}>{city.name}</span>
                        <span className={styles.cityHint}>
                          生活×{city.expenseMultiplier.toFixed(2)} · 首付{city.downPaymentFirst * 100}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
                    <span className={styles.tierBadge}>{PROFESSION_TIER_LABELS[profession.tier]}</span>
                  </div>
                  <div className={styles.professionStats}>
                    <span>基准 {profession.salary.toLocaleString()}</span>
                    {profession.buff?.salary && <span>薪资 Buff</span>}
                  </div>
                  <div className={styles.professionDesc}>{profession.description}</div>
                </button>
              ))}
              <button
                type="button"
                className={`${styles.professionCard} ${styles.customCard} ${isCustom ? styles.selected : ''}`}
                onClick={() => setProfessionId(CUSTOM_PROFESSION_ID)}
              >
                <div className={styles.professionHeader}>
                  <span className={styles.professionAvatar}>{PROFESSION_AVATARS.custom}</span>
                  <span className={styles.professionName}>自定义职业</span>
                  <span className={`${styles.tierBadge} ${styles.customBadge}`}>自由配置</span>
                </div>
                <div className={styles.professionStats}>
                  <span>自定义薪资与支出</span>
                </div>
                <div className={styles.professionDesc}>按你的实际情况设定收入、支出与负债，同样受城市系数影响。</div>
              </button>
            </div>
          </div>

          {isCustom && (
            <div className={styles.customForm}>
              <div className={styles.customFormTitle}>✏️ 自定义职业配置</div>
              <p className={styles.customHint}>数值为二线城基准，开局将按所选城市自动调整薪资与生活成本。</p>

              <div className={styles.customGrid}>
                <div className={styles.customField}>
                  <label>职业名称</label>
                  <input
                    type="text"
                    value={customProfession.name}
                    onChange={(e) => updateCustom({ name: e.target.value })}
                    placeholder="如：产品经理"
                  />
                </div>
                <div className={styles.customField}>
                  <label>月薪（基准）</label>
                  <input
                    type="number"
                    min={1}
                    value={customProfession.salary}
                    onChange={(e) => updateCustom({ salary: parseNumber(e.target.value, 1) })}
                  />
                </div>
                <div className={styles.customField}>
                  <label>初始现金</label>
                  <input
                    type="number"
                    min={0}
                    value={customProfession.cash ?? DEFAULT_CUSTOM_PROFESSION.cash}
                    onChange={(e) => updateCustom({ cash: parseNumber(e.target.value, 0) })}
                  />
                </div>
                <div className={styles.customField}>
                  <label>月税金</label>
                  <input
                    type="number"
                    min={0}
                    value={customProfession.tax}
                    onChange={(e) => updateCustom({ tax: parseNumber(e.target.value, 0) })}
                  />
                </div>
                <div className={styles.customField}>
                  <label>其它生活支出</label>
                  <input
                    type="number"
                    min={0}
                    value={customProfession.other}
                    onChange={(e) => updateCustom({ other: parseNumber(e.target.value, 0) })}
                  />
                </div>
              </div>

              <div className={styles.debtSection}>
                <div className={styles.debtTitle}>可选初始负债（本金，0 表示无）</div>
                <div className={styles.customGrid}>
                  <div className={styles.customField}>
                    <label>房贷本金</label>
                    <input
                      type="number"
                      min={0}
                      value={customProfession.mortgagePrincipal ?? 0}
                      onChange={(e) => updateCustom({ mortgagePrincipal: parseNumber(e.target.value, 0) })}
                    />
                  </div>
                  <div className={styles.customField}>
                    <label>车贷本金</label>
                    <input
                      type="number"
                      min={0}
                      value={customProfession.carLoanPrincipal ?? 0}
                      onChange={(e) => updateCustom({ carLoanPrincipal: parseNumber(e.target.value, 0) })}
                    />
                  </div>
                  <div className={styles.customField}>
                    <label>学贷本金</label>
                    <input
                      type="number"
                      min={0}
                      value={customProfession.studentLoanPrincipal ?? 0}
                      onChange={(e) => updateCustom({ studentLoanPrincipal: parseNumber(e.target.value, 0) })}
                    />
                  </div>
                  <div className={styles.customField}>
                    <label>信用卡欠款</label>
                    <input
                      type="number"
                      min={0}
                      value={customProfession.creditCardDebt ?? 0}
                      onChange={(e) => updateCustom({ creditCardDebt: parseNumber(e.target.value, 0) })}
                    />
                  </div>
                </div>
              </div>

              {validationErrors.length > 0 && (
                <div className={styles.validationErrors}>
                  {validationErrors.map((err) => (
                    <div key={err}>{err}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={styles.field}>
            <label>AI 对手数量</label>
            <select value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))}>
              <option value={0}>0 个</option>
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

          <div className={styles.field}>
            <label>
              <input
                type="checkbox"
                checked={testMode}
                onChange={(e) => setTestMode(e.target.checked)}
              />
              {' '}自动测试模式
            </label>
          </div>

          {testMode && (
            <div className={styles.field}>
              <label>测试回合数</label>
              <select value={testMaxRounds} onChange={(e) => setTestMaxRounds(Number(e.target.value))}>
                <option value={10}>10 回合</option>
                <option value={50}>50 回合</option>
                <option value={200}>200 回合</option>
              </select>
            </div>
          )}
        </div>

        {selectedProfession && previewStats && (
          <div className={styles.preview}>
            <h3>
              预览：{selectedCity.name} · {selectedProfession.name}
            </h3>
            <div className={styles.previewGrid}>
              <div>城市：{selectedCity.name}（{CITY_TIER_LABELS[selectedCity.tier]}）</div>
              <div>生活成本乘数：×{selectedCity.expenseMultiplier.toFixed(2)}</div>
              <div>调整后工资：{previewStats.salary.toLocaleString()}</div>
              <div>初始现金：{previewStats.cash.toLocaleString()}</div>
              <div>负债月供：{previewStats.liabilityPay.toLocaleString()}</div>
              <div>预估月现金流：{previewStats.cashFlow.toLocaleString()}</div>
            </div>
          </div>
        )}

        <button className={styles.startButton} onClick={handleStart}>
          {testMode ? '开始自动测试' : '开始游戏'}
        </button>
      </div>
    </div>
  );
}
