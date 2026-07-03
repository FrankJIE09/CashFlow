import { useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { useGameActions } from '../../hooks/useGameActions';
import { useSound } from '../../hooks/useSound';
import type { AssetType } from '../../types/game';
import {
  canAffordDownPayment,
  getAssetTypeLabel,
  getCurrentDebt,
  getMaxLoanAmount,
} from '../../utils/financial';
import { formatCurrency } from '../../utils/format';
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

  // Charity handling
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

  if (!card) return null;

  // Market card
  if (card.type === 'market') {
    const effect = card.effect;

    // Buyout: let player choose an asset to sell
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
                  const totalMultiplier = (effect.multiplier || 1) * state.marketMultiplier[asset.type];
                  const sellPrice = Math.round(asset.marketValue * totalMultiplier);
                  return (
                    <div key={asset.id} className={styles.assetListItem}>
                      <div>
                        <div className={styles.assetListName}>{asset.name}</div>
                        <div className={styles.assetListMeta}>
                          当前市值 {formatCurrency(asset.marketValue)} × {totalMultiplier.toFixed(2)} ={' '}
                          {formatCurrency(sellPrice)}
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

    // Discount: draw a discounted real estate opportunity
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

    // Other market effects: appreciation, depreciation, rate change, sector boom
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.cardType} style={{ backgroundColor: '#f1c40f' }}>市场卡</div>
          <h2 className={styles.title}>{card.title}</h2>
          <p className={styles.description}>{card.description}</p>
          <div className={styles.marketInfo}>
            <div>当前市场乘数</div>
            <div className={styles.marketMultipliers}>
              {Object.entries(state.marketMultiplier).map(([type, value]) => (
                <span key={type}>
                  {getAssetTypeLabel(type as AssetType)}: {value.toFixed(2)}
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

  // Doodad card
  if (card.type === 'doodad') {
    const shortfall = card.cost - player.cash;
    const canPay = player.cash >= card.cost;
    const maxLoan = getMaxLoanAmount(player) - getCurrentDebt(player);
    const canLoan = shortfall > 0 && shortfall <= maxLoan;

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

  // Opportunity card
  if (card.type === 'opportunity') {
    const asset = card.asset;
    const isDiscounted = space.type === 'market';
    const affordable = canAffordDownPayment(player, asset);
    const shortfall = asset.downPayment - player.cash;
    const maxLoan = getMaxLoanAmount(player) - getCurrentDebt(player);
    const canLoan = shortfall > 0 && shortfall <= maxLoan;

    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.cardType} style={{ backgroundColor: '#3498db' }}>
            {isDiscounted ? '打折房产' : card.kind === 'smallDeal' ? '小生意' : '大买卖'}
          </div>
          <h2 className={styles.title}>{card.title}</h2>
          <p className={styles.description}>{card.description}</p>

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
              <span>首付</span>
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
              <span>投资回报率</span>
              <span>{((asset.cashFlow / asset.downPayment) * 100).toFixed(1)}%</span>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              onClick={isDiscounted ? actions.buyDiscountedAsset : actions.buyAsset}
              disabled={!affordable && !canLoan}
            >
              {affordable ? '买入' : `贷款买入（缺 ${formatCurrency(shortfall)}）`}
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
