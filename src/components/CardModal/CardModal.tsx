import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useGameActions } from '../../hooks/useGameActions';
import { useSound } from '../../hooks/useSound';
import type { AssetType } from '../../types/game';
import {
  calculateBuyCost,
  calculateSellProceeds,
  canPurchaseOpportunity,
  getAssetPriceMultiplier,
  getAssetTypeLabel,
  getOpportunityAsset,
  isStockLotAsset,
  stockLotBuyCost,
  calcPensionIncome,
  calcElderlyMedicalExpense,
  weddingCost,
  remarriageCost,
  pregnancyMedicalCost,
  judgeStockValuation,
  getStockBasePe,
  getValuationLabel,
  calcCurrentStockPrice,
} from '../../utils/financial';
import { formatCurrency, formatPlayerAge } from '../../utils/format';
import { getAssetIcon } from '../Icons/GameIcons';
import styles from './CardModal.module.css';

export function CardModal() {
  const { state } = useGame();
  const actions = useGameActions();
  const { play } = useSound();
  const hasPlayedRef = useRef(false);
  const [stockLots, setStockLots] = useState<number | ''>(1);

  useEffect(() => {
    if (state.phase === 'CARD_DECISION' && !hasPlayedRef.current) {
      play('card');
      hasPlayedRef.current = true;
    } else if (state.phase !== 'CARD_DECISION') {
      hasPlayedRef.current = false;
    }
  }, [state.phase, play]);

  useEffect(() => {
    if (state.phase === 'CARD_DECISION' && state.currentCard?.type === 'opportunity') {
      const asset = getOpportunityAsset(state.currentCard, state.players[state.currentPlayerIndex]);
      if (isStockLotAsset(asset)) {
        setStockLots(1);
      }
    }
  }, [state.phase, state.currentCard?.id, state.currentPlayerIndex]);

  if (state.phase !== 'CARD_DECISION') return null;
  if (state.testMode) return null;

  const player = state.players[state.currentPlayerIndex];
  const space = state.spaces[player.position];
  const card = state.currentCard;

  if (state.pendingLifeEvent === 'retirement') {
    const pension = calcPensionIncome(player.baseSalary ?? player.salary, player.cityId);
    const elderlyMedical = calcElderlyMedicalExpense(player.cityId);
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.cardType} style={{ backgroundColor: '#FFD700' }}>人生里程碑</div>
          <h2 className={styles.title}>🏖️ 正式退休</h2>
          <p className={styles.description}>
            你已 {formatPlayerAge(player)}，达到法定退休年龄。全职工作结束，转入退休生活。
          </p>
          <p className={styles.description}>
            养老金约 {formatCurrency(pension)}/月 · 老年医疗约 +{formatCurrency(elderlyMedical)}/月
          </p>
          <p className={styles.description}>退休后不再触发升迁/失业事件，仍可遭遇家庭支出。</p>
          <div className={styles.actions}>
            <button className={styles.primaryButton} onClick={() => actions.confirmRetirement()}>
              确认退休
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (space.type === 'promotion' && state.careerEvent) {
    const event = state.careerEvent;
    const eventColor =
      event.type === 'layoff'
        ? '#e74c3c'
        : event.type === 'jobHop'
          ? '#3498db'
          : event.type === 'careerChange'
            ? '#9b59b6'
            : event.type === 'reemployment'
              ? '#2ecc71'
              : '#FFE4B5';

    if (event.type === 'promotion') {
      const newSalary = Math.round(player.salary * (1 + (event.salaryBoostPct ?? 0)));
      const cost = event.cost ?? 0;
      return (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.cardType} style={{ backgroundColor: eventColor }}>职场事件</div>
            <h2 className={styles.title}>{event.title}</h2>
            <p className={styles.description}>{event.description}</p>
            <p className={styles.description}>
              接受后月薪约 {formatCurrency(newSalary)}，费用 {formatCurrency(cost)}。
            </p>
            <div className={styles.actions}>
              <button
                className={styles.primaryButton}
                onClick={() => actions.choosePromotion(true)}
                disabled={player.cash + 50000 < cost && player.cash < cost}
              >
                接受（{formatCurrency(cost)}）
              </button>
              <button className={styles.secondaryButton} onClick={() => actions.choosePromotion(false)}>
                放弃
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (event.type === 'jobHop') {
      const highSalary = Math.round(player.salary * (1 + (event.highPayBoostPct ?? 0.4)));
      const stableSalary = Math.round(player.salary * (1 - (event.stableSalaryCutPct ?? 0.15)));
      return (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.cardType} style={{ backgroundColor: eventColor }}>职场事件</div>
            <h2 className={styles.title}>{event.title}</h2>
            <p className={styles.description}>{event.description}</p>
            <div className={styles.actions}>
              <button
                className={styles.primaryButton}
                onClick={() => actions.choosePromotion(true, 'highPay')}
              >
                高薪 Offer（约 {formatCurrency(highSalary)}，无缝入职，试用期裁员风险↑）
              </button>
              <button
                className={styles.secondaryButton}
                onClick={() => actions.choosePromotion(true, 'stable')}
              >
                稳定岗位（约 {formatCurrency(stableSalary)}，无缝入职，极低裁员）
              </button>
              <button className={styles.secondaryButton} onClick={() => actions.choosePromotion(false)}>
                暂不跳槽
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (event.type === 'layoff') {
      const severance = Math.round(player.salary * (event.severanceMonths ?? 4));
      return (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.cardType} style={{ backgroundColor: eventColor }}>职场事件</div>
            <h2 className={styles.title}>{event.title}</h2>
            <p className={styles.description}>{event.description}</p>
            <p className={styles.description}>预计补偿 {formatCurrency(severance)}，失业 {event.unemploymentTurns ?? 4} 回合。</p>
            <div className={styles.actions}>
              <button className={styles.primaryButton} onClick={() => actions.choosePromotion(true)}>
                确认收到通知
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (event.type === 'careerChange') {
      return (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.cardType} style={{ backgroundColor: eventColor }}>职场事件</div>
            <h2 className={styles.title}>{event.title}</h2>
            <p className={styles.description}>{event.description}</p>
            <div className={styles.actions}>
              <button className={styles.primaryButton} onClick={() => actions.choosePromotion(true)}>
                开始转型
              </button>
              <button className={styles.secondaryButton} onClick={() => actions.choosePromotion(false)}>
                放弃
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (event.type === 'reemployment') {
      const base = player.baseSalary ?? player.salary;
      const restored = Math.round(base * (event.restoredSalaryPct ?? 0.9));
      return (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.cardType} style={{ backgroundColor: eventColor }}>职场事件</div>
            <h2 className={styles.title}>{event.title}</h2>
            <p className={styles.description}>{event.description}</p>
            <p className={styles.description}>再就业月薪约 {formatCurrency(restored)}，立即结束失业。</p>
            <div className={styles.actions}>
              <button className={styles.primaryButton} onClick={() => actions.choosePromotion(true)}>
                接受 Offer
              </button>
              <button className={styles.secondaryButton} onClick={() => actions.choosePromotion(false)}>
                继续观望
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  if (space.type === 'charity') {
    const donation = Math.round(player.salary * 0.1);
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <h2 className={styles.title}>慈善捐款</h2>
          <p className={styles.description}>
            你愿意捐赠月收入的 10%（{formatCurrency(donation)}）给慈善机构吗？
          </p>
          <p className={styles.description}>捐赠后，未来 3 回合你可以掷两个骰子并选择其中一个前进。</p>
          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              onClick={() => actions.donateCharity(true)}
              disabled={player.cash < donation}
            >
              捐款 {formatCurrency(donation)}
            </button>
            <button className={styles.secondaryButton} onClick={() => actions.donateCharity(false)}>
              不捐款
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (space.type === 'family') {
    if (player.marriageStatus === 'ineligible') {
      return null;
    }

    if (player.marriageStatus === 'married') {
      // 已婚 → 育儿/怀孕事件
      const medical = pregnancyMedicalCost(player.cityId);
      const atLimit = player.children >= 3 && !player.hasPregnancy;
      const h = player.marriageHappiness;

      if (player.hasPregnancy) {
        return (
          <div className={styles.overlay}>
            <div className={styles.modal}>
              <div className={styles.cardType} style={{ backgroundColor: '#ffb6c1' }}>人生选择</div>
              <h2 className={styles.title}>🤰 孕期管理</h2>
              <p className={styles.description}>已怀孕 {player.pregnancyMonths ?? 0}/9 月，请选择后续方向：</p>
              <div className={styles.actions}>
                <button className={styles.primaryButton} onClick={() => actions.choosePregnancyPath('postpone')}>
                  继续孕期（推迟生育决策）
                </button>
                <button className={styles.secondaryButton} onClick={() => actions.choosePregnancyPath('dink')}>
                  转 DINK（幸福度惩罚，离婚风险↑）
                </button>
              </div>
            </div>
          </div>
        );
      }

      if (h >= 70) {
        return (
          <div className={styles.overlay}>
            <div className={styles.modal}>
              <div className={styles.cardType} style={{ backgroundColor: '#ffb3ba' }}>家庭状态 · 甜蜜</div>
              <h2 className={styles.title}>💑 婚姻甜蜜期</h2>
              <p className={styles.description}>幸福度 {h}，感情稳定，工资 +10% 加成生效中。</p>
              <div className={styles.actions}>
                <button className={styles.primaryButton} onClick={() => actions.resolveMarriageGrid()}>
                  继续甜蜜生活（幸福度 +5）
                </button>
              </div>
            </div>
          </div>
        );
      }
      if (h >= 40) {
        return (
          <div className={styles.overlay}>
            <div className={styles.modal}>
              <div className={styles.cardType} style={{ backgroundColor: '#ffd9a0' }}>家庭状态 · 平淡</div>
              <h2 className={styles.title}>💑 平淡日常</h2>
              <p className={styles.description}>幸福度 {h}，需要继续经营家庭关系。</p>
              <div className={styles.actions}>
                <button className={styles.primaryButton} onClick={() => actions.resolveMarriageGrid()}>
                  确认
                </button>
              </div>
            </div>
          </div>
        );
      }
      const counselingCost = Math.round(player.salary * 0.5);
      return (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.cardType} style={{ backgroundColor: '#ff6b6b' }}>家庭状态 · 危机</div>
            <h2 className={styles.title}>💔 婚姻危机</h2>
            <p className={styles.description}>幸福度仅 {h}，关系亮红灯。可投资婚姻咨询（{formatCurrency(counselingCost)}）或选择忽视。</p>
            <p className={styles.description}>此外，你们也可以考虑生育计划：</p>
            <div className={styles.actions}>
              <button
                className={styles.primaryButton}
                onClick={() => actions.resolveMarriageGrid(true)}
                disabled={player.cash + 50000 < counselingCost && player.cash < counselingCost}
              >
                婚姻咨询（{formatCurrency(counselingCost)}，幸福度 +15）
              </button>
              <button className={styles.secondaryButton} onClick={() => actions.resolveMarriageGrid(false)}>
                忽视（幸福度 -5，可能离婚）
              </button>
            </div>
            <hr className={styles.divider} />
            <p className={styles.description}>生育计划（已婚可选）：</p>
            <div className={styles.actions}>
              <button
                className={styles.primaryButton}
                onClick={() => actions.choosePregnancyPath('plan')}
                disabled={atLimit}
              >
                计划怀孕（月医疗 +{formatCurrency(medical)}）
              </button>
              <button className={styles.secondaryButton} onClick={() => actions.choosePregnancyPath('dink')}>
                DINK（幸福度惩罚）
              </button>
              <button className={styles.secondaryButton} onClick={() => actions.choosePregnancyPath('postpone')}>
                推迟
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 单身（single）→ 结婚；离异（divorced）→ 再婚
    const isRemarriage = player.marriageStatus === 'divorced';
    const cost = isRemarriage ? remarriageCost(player.cityId) : weddingCost(player.cityId);
    const canMarry = player.cash >= cost || player.cash + 50000 >= cost;
    const happiness = isRemarriage ? 50 : 60;
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.cardType} style={{ backgroundColor: '#ffb3ba' }}>人生选择</div>
          <h2 className={styles.title}>{isRemarriage ? '💍 再婚机会' : '💍 家庭格'}</h2>
          <p className={styles.description}>
            {isRemarriage
              ? '你有一次再婚机会。再婚后再离婚将永久失去婚姻资格，且财产分割更严（60%）。'
              : '你来到了「家庭格」。是否考虑步入婚姻？'}
          </p>
          <p className={styles.description}>
            {isRemarriage ? '再婚' : '结婚'}费用 {formatCurrency(cost)}，幸福度初始 {happiness}，伴侣月薪加成，幸福≥50 时工资 +10%。
          </p>
          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              onClick={() => actions.chooseMarriage(true)}
              disabled={!canMarry}
            >
              {isRemarriage ? '再婚' : '结婚'}（{formatCurrency(cost)}）
            </button>
            <button className={styles.secondaryButton} onClick={() => actions.chooseMarriage(false)}>
              {isRemarriage ? '暂不' : '保持单身'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (space.type === 'settlement' && state.pendingSettlement) {
    const { amount, isAnnual } = state.pendingSettlement;
    const realEstateCount = player.assets.filter((a) => a.type === 'realEstate').length;
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.cardType} style={{ backgroundColor: '#E8E8E8' }}>
            {isAnnual ? '年度结算' : '税务结算'}
          </div>
          <h2 className={styles.title}>🏛️ {space.name}</h2>
          {amount > 0 ? (
            <>
              <p className={styles.description}>
                你持有 {realEstateCount} 套房产（≥2 套触发持有税）。{isAnnual ? '年度结算将一次性扣除 12 个月' : '本月'}房产持有税。
              </p>
              <div className={styles.costInfo}>
                <span>应缴持有税：</span>
                <span className={styles.cost}>{formatCurrency(amount)}</span>
              </div>
              <p className={styles.description}>所得税已在每月现金流中扣减，此处仅扣房产持有税。</p>
            </>
          ) : (
            <p className={styles.description}>
              你持有房产不足 2 套，无需缴纳房产持有税。所得税已在月现金流中扣减。
            </p>
          )}
          <div className={styles.actions}>
            <button className={styles.primaryButton} onClick={() => actions.confirmSettlement()}>
              {amount > 0 ? `确认缴纳 ${formatCurrency(amount)}` : '确认'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 生育决策已合并至 family 格中（见上方 space.type === 'family' 分支）

  if (!card) return null;

  if (card.type === 'market') {
    const effect = card.effect;

    if (effect.type === 'buyout') {
      const targetType = effect.targetAssetType;
      // 收购要约不包含自住房屋
      const sellableAssets = targetType
        ? player.assets.filter((a) => a.type === targetType && !a.isSelfLiving)
        : player.assets.filter((a) => !a.isSelfLiving);

      return (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.cardType} style={{ backgroundColor: '#f1c40f' }}>市场卡 - 收购要约</div>
            <h2 className={styles.title}>{card.title}</h2>
            <p className={styles.description}>{card.description}</p>

            {sellableAssets.length === 0 ? (
              <div className={styles.emptyAssets}>你没有可卖出的{targetType ? getAssetTypeLabel(targetType) : '资产'}</div>
            ) : (
              <div className={styles.assetList}>
                {sellableAssets.map((asset) => {
                  const effectiveMult =
                    (effect.multiplier || 1) *
                    getAssetPriceMultiplier(asset, state.marketMultiplier, state.sectorMultiplier);
                  const sellPrice = calculateSellProceeds(asset, effectiveMult, {});
                  const lotLabel = isStockLotAsset(asset) ? `（${asset.shareHand} 手）` : '';
                  return (
                    <div key={asset.id} className={styles.assetListItem}>
                      <div>
                        <div className={styles.assetListName}>
                          {getAssetIcon(asset.type)} {asset.name}{lotLabel}
                        </div>
                        <div className={styles.assetListMeta}>
                          当前市值 {formatCurrency(asset.marketValue)} × {effectiveMult.toFixed(2)} ={' '}
                          {formatCurrency(sellPrice)}（已扣交易费/印花税）
                        </div>
                      </div>
                      <button
                        className={styles.primaryButton}
                        onClick={() => actions.sellAsset(asset.id, effect.multiplier || 1)}
                      >
                        卖出
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className={styles.actions}>
              <button className={styles.secondaryButton} onClick={actions.declineCard}>
                放弃
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (effect.type === 'unemployment' || effect.type === 'reemployment') {
      return (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.cardType} style={{ backgroundColor: '#e74c3c' }}>生活事件</div>
            <h2 className={styles.title}>{card.title}</h2>
            <p className={styles.description}>{card.description}</p>
            {player.isUnemployed && effect.type === 'unemployment' && (
              <p className={styles.description}>你已在失业中（剩余 {player.unemploymentTurnsRemaining} 回合）。</p>
            )}
            {!player.isUnemployed && effect.type === 'reemployment' && (
              <p className={styles.description}>你目前在职，此机会不适用。</p>
            )}
            <div className={styles.actions}>
              <button className={styles.primaryButton} onClick={actions.applyMarketEffect}>
                确认
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (effect.type === 'discount') {
      return (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.cardType} style={{ backgroundColor: '#f1c40f' }}>市场卡 - 买方市场</div>
            <h2 className={styles.title}>{card.title}</h2>
            <p className={styles.description}>{card.description}</p>
            <div className={styles.actions}>
              <button className={styles.primaryButton} onClick={actions.drawDiscountedOpportunity}>
                寻找打折房产
              </button>
              <button className={styles.secondaryButton} onClick={actions.declineCard}>
                放弃
              </button>
            </div>
          </div>
        </div>
      );
    }

    const impactPreview =
      effect.assetImpacts &&
      Object.entries(effect.assetImpacts)
        .slice(0, 6)
        .map(([key, impact]) => {
          const parts: string[] = [];
          if (impact.priceChange) parts.push(`估值×${impact.priceChange}`);
          if (impact.cashFlowChange) parts.push(`现金流×${impact.cashFlowChange}`);
          const label = (['stock', 'bond', 'reit', 'commodity', 'derivative', 'overseas', 'entity', 'realEstate', 'business', 'intellectual'] as string[]).includes(key)
            ? getAssetTypeLabel(key as AssetType)
            : key;
          return `${label}: ${parts.join(', ')}`;
        }      );

      return (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.cardType} style={{ backgroundColor: '#f1c40f' }}>市场卡</div>
            <h2 className={styles.title}>{card.title}</h2>
            <p className={styles.description}>{card.description}</p>
            {effect.eventCategory && (
              <div className={styles.marketInfo}>
                <div>事件类别: {effect.eventCategory}</div>
              </div>
            )}
            {impactPreview && impactPreview.length > 0 && (
              <div className={styles.marketInfo}>
                <div>主要影响</div>
                <div className={styles.impactList}>
                  {impactPreview.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </div>
              </div>
            )}
            {/* 【新增】v3.6 PE 事件公告 */}
            {effect.type === 'stockPeEvent' && (
              <div className={styles.valuationHint}>
                {effect.stockPeDelta != null && (
                  <span>持仓股票动态PE {effect.stockPeDelta >= 0 ? '+' : ''}{Math.round(effect.stockPeDelta * 100)}%</span>
                )}
                {effect.sectorBasePeDelta != null && (
                  <span>行业中枢PE {effect.sectorBasePeDelta >= 0 ? '+' : ''}{Math.round(effect.sectorBasePeDelta * 100)}%</span>
                )}
              </div>
            )}
            <div className={styles.marketInfo}>
              <div>📊 当前市场状况</div>
              <div className={styles.marketMultipliers}>
                {(['stock', 'bond', 'reit', 'realEstate', 'entity', 'commodity', 'overseas', 'derivative'] as AssetType[]).map((type) => (
                  <span key={type} className={
                    state.marketMultiplier[type] > 1.01 ? styles.multUp :
                    state.marketMultiplier[type] < 0.99 ? styles.multDown :
                    undefined
                  }>
                    {getAssetTypeLabel(type)}: ×{state.marketMultiplier[type].toFixed(2)}
                  </span>
                ))}
              </div>
              <div className={styles.rateDisplay}>
                基准利率: <strong>{(state.interestRate * 100).toFixed(1)}%</strong>
                {state.interestRate > 0.05 && <span className={styles.rateHigh}> ⚠️ 高息环境</span>}
                {state.interestRate < 0.015 && <span className={styles.rateLow}> ✅ 低息环境</span>}
              </div>
            </div>
            <div className={styles.actions}>
              <button className={styles.primaryButton} onClick={actions.applyMarketEffect}>
                确认
              </button>
            </div>
          </div>
        </div>
      );
    }

  if (card.type === 'doodad') {
    const isInsuranceCard = (card as any).insuranceType != null && (card as any).insuranceMonthlyPremium != null;
    const shortfall = card.cost - player.cash;
    const canPay = player.cash >= card.cost;
    const canLoan = shortfall > 0;

    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.cardType} style={{ backgroundColor: '#e74c3c' }}>额外支出</div>
          <h2 className={styles.title}>{card.title}</h2>
          <p className={styles.description}>{card.description}</p>
          {isInsuranceCard ? (
            <div className={styles.costInfo}>
              <span>月缴保费：</span>
              <span className={styles.cost}>{formatCurrency((card as any).insuranceMonthlyPremium!)}</span>
              <div className={styles.recurringInfo}>无首付，确认后次月起每月自动扣缴</div>
            </div>
          ) : (
            <div className={styles.costInfo}>
              <span>需要支付：</span>
              <span className={styles.cost}>{formatCurrency(card.cost)}</span>
            </div>
          )}
          {card.isRecurring && card.monthlyCost && !isInsuranceCard && (
            <div className={styles.recurringInfo}>此外每月增加支出 {formatCurrency(card.monthlyCost)}</div>
          )}
          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              onClick={actions.payDoodad}
              disabled={!canPay && !canLoan && !isInsuranceCard}
            >
              {isInsuranceCard ? '确认投保' : canPay ? '支付' : `贷款支付 ${formatCurrency(shortfall)}`}
            </button>
            {isInsuranceCard && (
              <button className={styles.secondaryButton} onClick={actions.declineCard}>
                跳过
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (card.type === 'opportunity') {
    const asset = getOpportunityAsset(card, player);
    const meta = asset.metadata;
    const isDiscounted = space.type === 'market';
    const isStock = isStockLotAsset(asset);
    const lots = isStock ? (stockLots === '' ? 0 : Math.max(1, Math.floor(stockLots))) : 1;
    const lotPrincipal = isStock ? lots * 100 * (asset.singlePrice ?? 0) : asset.downPayment;
    const lotCashFlow = isStock
      ? Math.round((lots * 100 * (asset.yearDivPerShare ?? 0)) / 12)
      : asset.cashFlow;
    const purchaseGate = canPurchaseOpportunity(player, card, state.marketMultiplier, state.sectorMultiplier);
    const stockLotsValid = stockLots !== '';
    const stockLotsNum = stockLotsValid ? Math.max(1, Math.floor(stockLots as number)) : 1;
    const totalBuyCost = isStock
      ? (stockLotsValid ? stockLotBuyCost(stockLotsNum, asset.singlePrice ?? 0) + (card.dueDiligenceCost ?? 0) : 0)
      : calculateBuyCost(asset) + (card.dueDiligenceCost ?? 0);
    const affordable = isStock ? (stockLotsValid && player.cash >= totalBuyCost) : player.cash >= totalBuyCost;
    const shortfall = totalBuyCost - player.cash;
    const canLoan = !isStock && shortfall > 0 && purchaseGate.allowed;

    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.cardType} style={{ backgroundColor: '#3498db' }}>
            {isDiscounted ? '打折房产' : card.kind === 'smallDeal' ? '小生意' : '大买卖'}
          </div>
          <h2 className={styles.title}>
            {getAssetIcon(asset.type)} {card.title}
          </h2>
          <p className={styles.description}>{card.description}</p>

          {isStock && (
            <div className={styles.gateInfo}>
              <label>
                买入手数（整数，1手=100份）：
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={stockLots}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') { setStockLots(''); return; }
                    const v = parseInt(raw, 10);
                    setStockLots(Number.isFinite(v) && v >= 1 ? Math.floor(v) : 1);
                  }}
                  className={styles.lotInput}
                />
              </label>
              <div>单价 {formatCurrency(asset.singlePrice ?? 0)} × {lots} 手 = {formatCurrency(lots * 100 * (asset.singlePrice ?? 0))}</div>
              <div>含佣金总支出：{formatCurrency(totalBuyCost)}</div>
            </div>
          )}

          {meta && (
            <div className={styles.fundamentals}>
              {meta.ticker && (
                <span className={styles.fundTag}>{meta.exchange} {meta.ticker}</span>
              )}
              {meta.sector && <span className={styles.fundTag}>{meta.sector}</span>}
              {meta.liquidity && <span className={styles.fundTag}>{meta.liquidity}</span>}
              {isStock && asset.currentPe != null ? (
                <span className={styles.fundTag}>PE {asset.currentPe.toFixed(1)}</span>
              ) : meta.peTTM ? (
                <span className={styles.fundTag}>PE {meta.peTTM}</span>
              ) : null}
              {meta.pb && <span className={styles.fundTag}>PB {meta.pb}</span>}
              {meta.dividendYield && (
                <span className={styles.fundTag}>股息 {(meta.dividendYield * 100).toFixed(1)}%</span>
              )}
              {meta.creditRating && <span className={styles.fundTag}>{meta.creditRating}</span>}
              {meta.ytm && <span className={styles.fundTag}>YTM {(meta.ytm * 100).toFixed(1)}%</span>}
              {meta.riskLevel && <span className={styles.fundTag}>风险 {meta.riskLevel}</span>}
            </div>
          )}

          {/* 【新增】v3.6 PE 估值提示 */}
          {isStock && asset.basePe != null && asset.currentPe != null && (
            <div className={styles.valuationHint}>
              {(() => {
                const basePe = getStockBasePe(asset);
                const currentPe = asset.currentPe ?? basePe;
                const valuation = judgeStockValuation(currentPe, basePe);
                const hintLabel = getValuationLabel(valuation);
                const price = calcCurrentStockPrice(asset, state.marketMultiplier, state.sectorMultiplier);
                return (
                  <span>
                    当前PE {currentPe.toFixed(1)}，行业中枢PE {basePe.toFixed(1)}，标的{hintLabel}
                    {valuation === 'deepUndervalue' && ' 💎'}
                    {valuation === 'severeOvervalue' && ' ⚠️'}
                    {valuation === 'fair' && ' ✅'}
                    （市价 {formatCurrency(price)}）
                  </span>
                );
              })()}
            </div>
          )}

          {card.dueDiligenceCost && (
            <div className={styles.gateInfo}>尽调费：{formatCurrency(card.dueDiligenceCost)}</div>
          )}

          <div className={styles.assetDetails}>
            <div className={styles.assetRow}>
              <span>类型</span>
              <span>{getAssetTypeLabel(asset.type)}</span>
            </div>
            <div className={styles.assetRow}>
              <span>总价</span>
              <span>{formatCurrency(asset.cost)}</span>
            </div>
            {isStock && (
              <div className={styles.assetRow}>
                <span>发行价</span>
                <span>{formatCurrency(asset.singlePrice ?? 0)}/份</span>
              </div>
            )}
            {isStock && (
              <div className={styles.assetRow}>
                <span>市价</span>
                <span>{formatCurrency(calcCurrentStockPrice(asset, state.marketMultiplier, state.sectorMultiplier))}/份</span>
              </div>
            )}
            <div className={styles.assetRow}>
              <span>首付/本金</span>
              <span className={styles.highlight}>
                {isStock ? `${lots} 手 (${formatCurrency(lotPrincipal)})` : formatCurrency(asset.downPayment)}
              </span>
              {isDiscounted && <span className={styles.discountTag}>打折</span>}
            </div>
            <div className={styles.assetRow}>
              <span>贷款</span>
              <span>{formatCurrency(asset.mortgage)}</span>
            </div>
            <div className={styles.assetRow}>
              <span>月现金流</span>
              <span className={styles.positive}>+{formatCurrency(lotCashFlow)}</span>
            </div>
            <div className={styles.assetRow}>
              <span>含交易费总支出</span>
              <span>{formatCurrency(totalBuyCost)}</span>
            </div>
            <div className={styles.assetRow}>
              <span>投资回报率</span>
              <span>
                {lotPrincipal > 0 ? ((lotCashFlow / lotPrincipal) * 100).toFixed(1) : '0'}%
              </span>
            </div>
            {isStock && asset.basePe != null && (
              <div className={styles.assetRow}>
                <span>估值</span>
                <span>
                  PE {asset.currentPe?.toFixed(1) ?? asset.basePe.toFixed(1)} /
                  中枢 {asset.basePe.toFixed(1)}
                  {asset.metadata?.pb != null && ` / PB ${asset.metadata.pb}`}
                  {asset.intrinsicPrice != null && ` / 内在价 ${formatCurrency(asset.intrinsicPrice)}`}
                </span>
              </div>
            )}
          </div>

          {!purchaseGate.allowed && (
            <div className={styles.blockedReason}>{purchaseGate.reason}</div>
          )}

          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              onClick={() =>
                isDiscounted
                  ? actions.buyDiscountedAsset(isStock ? lots : undefined)
                  : actions.buyAsset(isStock ? lots : undefined)
              }
              disabled={
                !purchaseGate.allowed ||
                (!affordable && !canLoan) ||
                (isStock && !stockLotsValid)
              }
            >
              {affordable ? '买入' : canLoan ? `贷款买入（缺 ${formatCurrency(shortfall)}）` : '无法买入'}
            </button>
            <button className={styles.secondaryButton} onClick={actions.declineCard}>
              放弃
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
