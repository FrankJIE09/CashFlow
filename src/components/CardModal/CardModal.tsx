import { useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { useGameActions } from '../../hooks/useGameActions';
import { useSound } from '../../hooks/useSound';
import type { AssetType } from '../../types/game';
import {
  calculateBuyCost,
  calculateSellProceeds,
  canAffordDownPayment,
  canPurchaseOpportunity,
  getAssetPriceMultiplier,
  getAssetTypeLabel,
  getNetWorth,
  getOpportunityAsset,
} from '../../utils/financial';
import { formatCurrency } from '../../utils/format';
import { getAssetIcon } from '../Icons/GameIcons';
import styles from './CardModal.module.css';

export function CardModal() {
  const { state } = useGame();
  const actions = useGameActions();
  const { play } = useSound();
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    if (state.phase === 'CARD_DECISION' && !hasPlayedRef.current) {
      play('card');
      hasPlayedRef.current = true;
    } else if (state.phase !== 'CARD_DECISION') {
      hasPlayedRef.current = false;
    }
  }, [state.phase, play]);

  if (state.phase !== 'CARD_DECISION') return null;

  const player = state.players[state.currentPlayerIndex];
  const space = state.spaces[player.position];
  const card = state.currentCard;

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

  if (space.type === 'baby') {
    const perChild = player.expenses.perChild;
    const atLimit = player.children >= 3;
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.cardType} style={{ backgroundColor: '#ffb6c1' }}>人生选择</div>
          <h2 className={styles.title}>👶 生育计划</h2>
          <p className={styles.description}>
            你来到了「生孩子」格子。是否迎接新生命？
          </p>
          <p className={styles.description}>
            生孩子后，每月额外支出 {formatCurrency(perChild)}（当前 {player.children} 个孩子，上限 3 个）。
          </p>
          <p className={styles.description}>选择「暂不生育」无任何惩罚。</p>
          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              onClick={() => actions.chooseBaby(true)}
              disabled={atLimit}
            >
              {atLimit ? '已达孩子上限' : '生孩子'}
            </button>
            <button className={styles.secondaryButton} onClick={() => actions.chooseBaby(false)}>
              暂不生育
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!card) return null;

  if (card.type === 'market') {
    const effect = card.effect;

    if (effect.type === 'buyout') {
      const targetType = effect.targetAssetType;
      const sellableAssets = targetType
        ? player.assets.filter((a) => a.type === targetType)
        : player.assets;

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
                  return (
                    <div key={asset.id} className={styles.assetListItem}>
                      <div>
                        <div className={styles.assetListName}>
                          {getAssetIcon(asset.type)} {asset.name}
                        </div>
                        <div className={styles.assetListMeta}>
                          当前市值 {formatCurrency(asset.marketValue)} × {effectiveMult.toFixed(2)} ={' '}
                          {formatCurrency(sellPrice)}（已扣交易费）
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
        });

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
          <div className={styles.marketInfo}>
            <div>当前市场乘数（部分）</div>
            <div className={styles.marketMultipliers}>
              {(['stock', 'bond', 'reit', 'realEstate', 'overseas'] as AssetType[]).map((type) => (
                <span key={type}>
                  {getAssetTypeLabel(type)}: {state.marketMultiplier[type].toFixed(2)}
                </span>
              ))}
            </div>
            <div>当前利率: {(state.interestRate * 100).toFixed(1)}%</div>
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
    const shortfall = card.cost - player.cash;
    const canPay = player.cash >= card.cost;
    const canLoan = shortfall > 0;

    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.cardType} style={{ backgroundColor: '#e74c3c' }}>额外支出</div>
          <h2 className={styles.title}>{card.title}</h2>
          <p className={styles.description}>{card.description}</p>
          <div className={styles.costInfo}>
            <span>需要支付：</span>
            <span className={styles.cost}>{formatCurrency(card.cost)}</span>
          </div>
          {card.isRecurring && card.monthlyCost && (
            <div className={styles.recurringInfo}>此外每月增加支出 {formatCurrency(card.monthlyCost)}</div>
          )}
          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              onClick={actions.payDoodad}
              disabled={!canPay && !canLoan}
            >
              {canPay ? '支付' : `贷款支付 ${formatCurrency(shortfall)}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (card.type === 'opportunity') {
    const asset = getOpportunityAsset(card, player);
    const meta = asset.metadata;
    const isDiscounted = space.type === 'market';
    const purchaseGate = canPurchaseOpportunity(player, card, state.marketMultiplier, state.sectorMultiplier);
    const totalBuyCost = calculateBuyCost(asset) + (card.dueDiligenceCost ?? 0);
    const affordable = canAffordDownPayment(player, asset) && player.cash >= totalBuyCost - asset.downPayment;
    const shortfall = totalBuyCost - player.cash;
    const canLoan = shortfall > 0 && purchaseGate.allowed;

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

          {meta && (
            <div className={styles.fundamentals}>
              {meta.ticker && (
                <span className={styles.fundTag}>{meta.exchange} {meta.ticker}</span>
              )}
              {meta.sector && <span className={styles.fundTag}>{meta.sector}</span>}
              {meta.liquidity && <span className={styles.fundTag}>{meta.liquidity}</span>}
              {meta.peTTM && <span className={styles.fundTag}>PE {meta.peTTM}</span>}
              {meta.dividendYield && (
                <span className={styles.fundTag}>股息 {(meta.dividendYield * 100).toFixed(1)}%</span>
              )}
              {meta.creditRating && <span className={styles.fundTag}>{meta.creditRating}</span>}
              {meta.ytm && <span className={styles.fundTag}>YTM {(meta.ytm * 100).toFixed(1)}%</span>}
              {meta.riskLevel && <span className={styles.fundTag}>风险 {meta.riskLevel}</span>}
            </div>
          )}

          {card.minNetWorth && (
            <div className={styles.gateInfo}>
              门槛：净资产 ≥ {formatCurrency(card.minNetWorth)}
              （当前 {formatCurrency(getNetWorth(player, state.marketMultiplier, state.sectorMultiplier))}）
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
            <div className={styles.assetRow}>
              <span>首付/本金</span>
              <span className={styles.highlight}>{formatCurrency(asset.downPayment)}</span>
              {isDiscounted && <span className={styles.discountTag}>打折</span>}
            </div>
            <div className={styles.assetRow}>
              <span>贷款</span>
              <span>{formatCurrency(asset.mortgage)}</span>
            </div>
            <div className={styles.assetRow}>
              <span>月现金流</span>
              <span className={styles.positive}>+{formatCurrency(asset.cashFlow)}</span>
            </div>
            <div className={styles.assetRow}>
              <span>含交易费总支出</span>
              <span>{formatCurrency(totalBuyCost)}</span>
            </div>
            <div className={styles.assetRow}>
              <span>投资回报率</span>
              <span>{asset.downPayment > 0 ? ((asset.cashFlow / asset.downPayment) * 100).toFixed(1) : '0'}%</span>
            </div>
          </div>

          {!purchaseGate.allowed && (
            <div className={styles.blockedReason}>{purchaseGate.reason}</div>
          )}

          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              onClick={isDiscounted ? actions.buyDiscountedAsset : actions.buyAsset}
              disabled={!purchaseGate.allowed || (!affordable && !canLoan)}
            >
              {affordable ? '买入' : purchaseGate.allowed ? `贷款买入（缺 ${formatCurrency(shortfall)}）` : '无法买入'}
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
