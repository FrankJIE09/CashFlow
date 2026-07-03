import type { Asset, AssetType, Card, CardType, GameAction, GameConfig, GameState, OpportunityCard, Player } from '../types/game';
import { PROFESSIONS, PLAYER_COLORS } from '../data/professions';
import { SPACES } from '../data/boardLayout';
import { OPPORTUNITY_CARDS } from '../data/opportunityCards';
import { MARKET_CARDS } from '../data/marketCards';
import { DOODAD_CARDS } from '../data/doodadCards';
import {
  checkBankruptcy,
  checkFinancialFreedom,
  getCurrentDebt,
  getMaxLoanAmount,
  getMonthlyCashFlow,
  getSellPrice,
  getTotalAssetsValue,
} from '../utils/financial';
import { drawCard, generateId, shuffle } from '../utils/random';

const CHARITY_TURNS = 3;
const CHILDREN_LIMIT = 3;
const FAST_TRACK_WIN_AMOUNT = 500000;

function updatePlayer(state: GameState, index: number, updater: (player: Player) => Player): GameState {
  const players = [...state.players];
  players[index] = updater({ ...players[index] });
  return { ...state, players };
}

function addLog(
  state: GameState,
  playerId: string,
  message: string,
  type: GameState['logs'][number]['type'] = 'system'
): GameState {
  return {
    ...state,
    logs: [
      ...state.logs,
      {
        id: generateId(),
        timestamp: Date.now(),
        playerId,
        message,
        type,
      },
    ],
  };
}

function findNextActivePlayer(state: GameState): number {
  let index = state.currentPlayerIndex;
  for (let i = 0; i < state.players.length; i++) {
    index = (index + 1) % state.players.length;
    if (!state.players[index].isBankrupt) return index;
  }
  return index;
}

function advanceTurn(state: GameState): GameState {
  const nextIndex = findNextActivePlayer(state);
  const round = nextIndex === 0 ? state.round + 1 : state.round;
  return { ...state, currentPlayerIndex: nextIndex, round };
}

function checkAndHandleBankruptcy(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];
  if (player.cash < 0) {
    if (checkBankruptcy(player)) {
      const newState = updatePlayer(state, state.currentPlayerIndex, (p) => ({
        ...p,
        isBankrupt: true,
        cash: 0,
      }));
      return addLog(newState, player.id, `${player.name} 破产了！`, 'system');
    }
  }
  return state;
}

function handlePayday(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  const cashFlow = getMonthlyCashFlow(player);
  const newState = updatePlayer(state, playerIndex, (p) => ({
    ...p,
    cash: p.cash + cashFlow,
  }));

  return addLog(
    newState,
    player.id,
    `${player.name} 发工资，现金流 ${cashFlow >= 0 ? '+' : ''}${cashFlow} 元`,
    'income'
  );
}

function drawCardAndUpdateState(
  state: GameState,
  cardType: CardType
): { state: GameState; card: Card } | null {
  const result = drawCard(state.decks[cardType], state.discardPiles[cardType]);
  if (!result) return null;

  const newState: GameState = {
    ...state,
    decks: { ...state.decks, [cardType]: result.deck },
    discardPiles: { ...state.discardPiles, [cardType]: result.discardPile },
    currentCard: result.card,
  };
  return { state: newState, card: result.card };
}

function executeBuyAsset(state: GameState, playerIndex: number, asset: Asset, isDiscounted: boolean): GameState {
  const player = state.players[playerIndex];
  let newState = state;

  const shortfall = asset.downPayment - player.cash;
  if (shortfall > 0) {
    const maxLoan = getMaxLoanAmount(player) - getCurrentDebt(player);
    if (shortfall > maxLoan) {
      return addLog(newState, player.id, '现金不足且无法贷款，无法购买', 'system');
    }
    newState = updatePlayer(newState, playerIndex, (p) => ({
      ...p,
      cash: p.cash + shortfall,
      liabilities: [
        ...p.liabilities,
        {
          id: generateId(),
          name: `${asset.name} 贷款`,
          principal: shortfall,
          monthlyPayment: Math.round(shortfall * state.interestRate),
          interestRate: state.interestRate * 12,
        },
      ],
    }));
    newState = addLog(newState, player.id, `${player.name} 为购买 ${asset.name} 贷款 ${shortfall} 元`, 'liability');
  }

  newState = updatePlayer(newState, playerIndex, (p) => ({
    ...p,
    cash: p.cash - asset.downPayment,
    assets: [...p.assets, { ...asset, id: generateId() }],
  }));

  if (asset.mortgage > 0) {
    newState = updatePlayer(newState, playerIndex, (p) => ({
      ...p,
      liabilities: [
        ...p.liabilities,
        {
          id: generateId(),
          name: `${asset.name} 抵押贷款`,
          principal: asset.mortgage,
          monthlyPayment: Math.round(asset.mortgage * state.interestRate),
          interestRate: state.interestRate * 12,
        },
      ],
    }));
  }

  newState = addLog(
    newState,
    player.id,
    `${player.name} ${isDiscounted ? '打折购买' : '购买'} ${asset.name}，首付 ${asset.downPayment} 元，月现金流 +${asset.cashFlow} 元`,
    'asset'
  );
  newState = checkAndHandleBankruptcy(newState);
  return { ...newState, currentCard: null, phase: 'TURN_END' };
}

function applyMarketEffect(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  const card = state.currentCard;
  if (!card || card.type !== 'market') return state;

  const effect = card.effect;
  let newState = state;

  switch (effect.type) {
    case 'assetAppreciation': {
      if (effect.targetAssetType && effect.multiplier) {
        newState = {
          ...newState,
          marketMultiplier: {
            ...newState.marketMultiplier,
            [effect.targetAssetType]: newState.marketMultiplier[effect.targetAssetType] * effect.multiplier,
          },
        };
        newState = addLog(
          newState,
          player.id,
          `${effect.targetAssetType} 类资产增值，当前市场乘数 ${newState.marketMultiplier[effect.targetAssetType].toFixed(2)}`,
          'market'
        );
      }
      break;
    }
    case 'assetDepreciation': {
      if (effect.multiplier) {
        const multiplier: Record<AssetType, number> = {
          stock: state.marketMultiplier.stock * effect.multiplier,
          realEstate: state.marketMultiplier.realEstate * effect.multiplier,
          business: state.marketMultiplier.business * effect.multiplier,
          intellectual: state.marketMultiplier.intellectual * effect.multiplier,
        };
        newState = { ...newState, marketMultiplier: multiplier };
        newState = addLog(newState, player.id, '所有资产贬值', 'market');
      }
      break;
    }
    case 'interestRate': {
      if (effect.rateChange) {
        const newRate = Math.max(0.001, state.interestRate + effect.rateChange);
        newState = { ...newState, interestRate: newRate };
        newState = addLog(newState, player.id, `市场利率调整为 ${(newRate * 100).toFixed(1)}%`, 'market');
      }
      break;
    }
    case 'sectorBoom': {
      if (effect.sector === 'stock' && effect.multiplier) {
        newState = {
          ...newState,
          marketMultiplier: { ...newState.marketMultiplier, stock: state.marketMultiplier.stock * effect.multiplier },
        };
        newState = addLog(newState, player.id, '科技股暴涨，股票市值翻倍', 'market');
      }
      break;
    }
    default:
      break;
  }

  return { ...newState, currentCard: null, phase: 'TURN_END' };
}

function drawDiscountedOpportunity(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  const card = state.currentCard;
  const discountRate = (card?.type === 'market' && card.effect.discountRate) || 0.5;

  let deck = [...state.decks.opportunity];
  let discardPile = [...state.discardPiles.opportunity];
  let foundCard: OpportunityCard | null = null;

  // 优先寻找房地产类打折资产
  for (let i = 0; i < deck.length; i++) {
    const c = deck[i];
    if (c.type === 'opportunity' && c.asset.type === 'realEstate') {
      foundCard = c;
      deck = [...deck.slice(0, i), ...deck.slice(i + 1)];
      break;
    }
  }

  if (!foundCard && discardPile.length > 0) {
    deck = shuffle(discardPile);
    discardPile = [];
    for (let i = 0; i < deck.length; i++) {
      const c = deck[i];
      if (c.type === 'opportunity' && c.asset.type === 'realEstate') {
        foundCard = c;
        deck = [...deck.slice(0, i), ...deck.slice(i + 1)];
        break;
      }
    }
  }

  if (!foundCard) {
    return addLog(state, player.id, '市场没有打折房产可买', 'system');
  }

  const discountedAsset = {
    ...foundCard.asset,
    downPayment: Math.round(foundCard.asset.downPayment * discountRate),
    mortgage: foundCard.asset.cost - Math.round(foundCard.asset.downPayment * discountRate),
  };

  const discountedCard: OpportunityCard = { ...foundCard, asset: discountedAsset };

  let newState: GameState = {
    ...state,
    decks: { ...state.decks, opportunity: deck },
    discardPiles: { ...state.discardPiles, opportunity: [...discardPile, foundCard] },
  };
  newState = addLog(
    newState,
    player.id,
    `市场出现打折房产 ${discountedAsset.name}，首付降至 ${discountedAsset.downPayment} 元`,
    'market'
  );
  return { ...newState, currentCard: discountedCard };
}

function createPlayer(config: GameConfig, isAI: boolean, index: number, aiName?: string): Player {
  const profession = PROFESSIONS.find((p) => p.id === (isAI ? PROFESSIONS[index % PROFESSIONS.length].id : config.humanProfessionId))!;
  const name = isAI ? aiName || `${['智能 A', '智能 B', '智能 C', '智能 D'][index - 1] || 'AI'}` : config.humanPlayerName;

  return {
    id: generateId(),
    name,
    professionId: profession.id,
    color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    position: 0,
    cash: profession.cash,
    salary: profession.salary,
    expenses: { ...profession.expenses },
    children: 0,
    assets: [],
    liabilities: profession.liabilities.map((l) => ({ ...l, id: generateId() })),
    isInFastTrack: false,
    fastTrackPosition: 0,
    charityTurns: 0,
    isAI,
    difficulty: isAI ? config.aiDifficulty : undefined,
    isBankrupt: false,
  };
}

function getInitialState(): GameState {
  return {
    phase: 'SETUP',
    players: [],
    currentPlayerIndex: 0,
    round: 1,
    spaces: SPACES,
    decks: {
      opportunity: shuffle([...OPPORTUNITY_CARDS]),
      market: shuffle([...MARKET_CARDS]),
      doodad: shuffle([...DOODAD_CARDS]),
    },
    discardPiles: { opportunity: [], market: [], doodad: [] },
    currentCard: null,
    marketMultiplier: { stock: 1, realEstate: 1, business: 1, intellectual: 1 },
    interestRate: 0.01,
    winner: null,
    logs: [],
    pendingDice: null,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  const playerIndex = state.currentPlayerIndex;
  const player = state.players[playerIndex];

  switch (action.type) {
    case 'SETUP_GAME': {
      const { humanPlayerName, humanProfessionId, aiCount, aiDifficulty } = action.payload;
      const newState: GameState = {
        ...getInitialState(),
        players: [
          createPlayer(
            { humanPlayerName, humanProfessionId, aiCount, aiDifficulty },
            false,
            0
          ),
          ...Array.from({ length: aiCount }, (_, i) =>
            createPlayer(
              { humanPlayerName, humanProfessionId, aiCount, aiDifficulty },
              true,
              i + 1,
              `AI ${i + 1}`
            )
          ),
        ],
        phase: 'ROLLING',
      };
      return addLog(newState, newState.players[0].id, '游戏开始！', 'system');
    }

    case 'RESTART_GAME': {
      return getInitialState();
    }

    case 'ROLL_DICE': {
      if (state.phase !== 'ROLLING' && state.phase !== 'FAST_TRACK') return state;

      const dice = action.payload.dice;
      return { ...state, phase: 'MOVING', pendingDice: dice };
    }

    case 'MOVE_PLAYER': {
      if (state.phase !== 'MOVING') return state;

      const steps = state.pendingDice ?? 1;
      const currentPos = player.position;
      const newPos = (currentPos + steps) % state.spaces.length;

      let newState = updatePlayer(state, playerIndex, (p) => ({
        ...p,
        position: newPos,
        charityTurns: Math.max(0, p.charityTurns - 1),
      }));
      newState = { ...newState, pendingDice: null };

      // 经过发工资日（起点）时发工资
      if (newPos < currentPos) {
        newState = handlePayday(newState, playerIndex);
      }

      // 落点也是 payday 时发工资
      if (state.spaces[newPos].type === 'payday') {
        newState = handlePayday(newState, playerIndex);
      }

      newState = addLog(newState, player.id, `${player.name} 移动到 ${state.spaces[newPos].name}`, 'move');

      // 自动触发格子事件
      const space = state.spaces[newPos];
      switch (space.type) {
        case 'opportunity':
        case 'market':
        case 'doodad': {
          const cardType: CardType =
            space.type === 'opportunity' ? 'opportunity' : space.type === 'market' ? 'market' : 'doodad';
          const result = drawCardAndUpdateState(newState, cardType);
          if (!result) return { ...newState, phase: 'TURN_END' };
          const cardState = result.state;
          const card = result.card;
          const logState = addLog(
            cardState,
            player.id,
            `${player.name} 抽到 ${card.title}`,
            cardType === 'market' ? 'market' : 'system'
          );
          return { ...logState, phase: 'CARD_DECISION' };
        }
        case 'charity': {
          return { ...newState, phase: 'CARD_DECISION' };
        }
        case 'baby': {
          if (player.children < CHILDREN_LIMIT) {
            newState = updatePlayer(newState, playerIndex, (p) => ({
              ...p,
              children: p.children + 1,
            }));
            newState = addLog(newState, player.id, `${player.name} 生了一个孩子，月支出增加`, 'expense');
          } else {
            newState = addLog(newState, player.id, `${player.name} 已经有太多孩子了`, 'system');
          }
          return { ...newState, phase: 'TURN_END' };
        }
        case 'settlement': {
          const tax = player.expenses.tax;
          newState = updatePlayer(newState, playerIndex, (p) => ({
            ...p,
            cash: p.cash - tax,
          }));
          newState = addLog(newState, player.id, `${player.name} 缴纳税款 ${tax} 元`, 'expense');
          newState = checkAndHandleBankruptcy(newState);
          return { ...newState, phase: 'TURN_END' };
        }
        case 'payday':
        default:
          return { ...newState, phase: 'TURN_END' };
      }
    }

    case 'DRAW_CARD': {
      const cardType = action.payload.cardType;
      const result = drawCardAndUpdateState(state, cardType);
      if (!result) return state;

      let newState = result.state;
      const card = result.card;
      newState = addLog(newState, player.id, `${player.name} 抽到 ${card.title}`, cardType === 'market' ? 'market' : 'system');
      return { ...newState, phase: 'CARD_DECISION' };
    }

    case 'BUY_ASSET': {
      const card = state.currentCard;
      if (!card || card.type !== 'opportunity') return state;
      return executeBuyAsset(state, playerIndex, card.asset, false);
    }

    case 'BUY_DISCOUNTED_ASSET': {
      const card = state.currentCard;
      if (!card || card.type !== 'opportunity') return state;
      return executeBuyAsset(state, playerIndex, card.asset, true);
    }

    case 'DECLINE_CARD': {
      return { ...state, currentCard: null, phase: 'TURN_END' };
    }

    case 'PAY_DOODAD': {
      const card = state.currentCard;
      if (!card || card.type !== 'doodad') return state;

      const cost = card.cost;
      let newState = updatePlayer(state, playerIndex, (p) => ({
        ...p,
        cash: p.cash - cost,
      }));

      if (card.isRecurring && card.monthlyCost) {
        newState = updatePlayer(newState, playerIndex, (p) => ({
          ...p,
          expenses: { ...p.expenses, other: p.expenses.other + card.monthlyCost! },
        }));
      }

      newState = addLog(newState, player.id, `${player.name} 支付额外支出 ${card.title} ${cost} 元`, 'expense');
      newState = checkAndHandleBankruptcy(newState);
      return { ...newState, currentCard: null, phase: 'TURN_END' };
    }

    case 'APPLY_MARKET_EFFECT': {
      return applyMarketEffect(state, playerIndex);
    }

    case 'DRAW_DISCOUNTED_OPPORTUNITY': {
      const newState = drawDiscountedOpportunity(state, playerIndex);
      return { ...newState, phase: 'CARD_DECISION' };
    }

    case 'DONATE_CHARITY': {
      if (!action.payload.donate) {
        return { ...state, phase: 'TURN_END' };
      }
      const donation = Math.round(player.salary * 0.1);
      let newState = updatePlayer(state, playerIndex, (p) => ({
        ...p,
        cash: p.cash - donation,
        charityTurns: CHARITY_TURNS,
      }));
      newState = addLog(newState, player.id, `${player.name} 捐款 ${donation} 元，未来 ${CHARITY_TURNS} 回合可掷双骰子`, 'expense');
      newState = checkAndHandleBankruptcy(newState);
      return { ...newState, phase: 'TURN_END' };
    }

    case 'TAKE_LOAN': {
      const amount = action.payload.amount;
      const maxLoan = getMaxLoanAmount(player) - getCurrentDebt(player);
      if (amount > maxLoan) return state;

      let newState = updatePlayer(state, playerIndex, (p) => ({
        ...p,
        cash: p.cash + amount,
        liabilities: [
          ...p.liabilities,
          {
            id: generateId(),
            name: '银行贷款',
            principal: amount,
            monthlyPayment: Math.round(amount * state.interestRate),
            interestRate: state.interestRate * 12,
          },
        ],
      }));
      newState = addLog(newState, player.id, `${player.name} 向银行贷款 ${amount} 元`, 'liability');
      return newState;
    }

    case 'SELL_ASSET': {
      const { assetId, multiplier } = action.payload;
      const asset = player.assets.find((a) => a.id === assetId);
      if (!asset) return state;

      const totalMultiplier = multiplier * state.marketMultiplier[asset.type];
      const sellPrice = getSellPrice(asset, totalMultiplier);
      let newState = updatePlayer(state, playerIndex, (p) => ({
        ...p,
        cash: p.cash + sellPrice,
        assets: p.assets.filter((a) => a.id !== assetId),
        liabilities: p.liabilities.filter((l) => l.name !== `${asset.name} 抵押贷款`),
      }));
      newState = addLog(newState, player.id, `${player.name} 卖出 ${asset.name}，获得 ${sellPrice} 元`, 'asset');
      return { ...newState, currentCard: null, phase: 'TURN_END' };
    }

    case 'END_TURN': {
      if (checkFinancialFreedom(player) && !player.isInFastTrack) {
        const newState = updatePlayer(state, playerIndex, (p) => ({
          ...p,
          isInFastTrack: true,
          fastTrackPosition: 0,
          // 简化：快车道现金 = 原现金 + 资产当前市值
          cash: p.cash + getTotalAssetsValue(p, state.marketMultiplier),
          // 保留资产但不保留原负债
          liabilities: [],
          position: 0,
        }));
        const logState = addLog(newState, player.id, `${player.name} 实现财务自由，进入快车道！`, 'system');
        return { ...advanceTurn(logState), phase: 'ROLLING' };
      }

      if (player.isInFastTrack && player.cash >= FAST_TRACK_WIN_AMOUNT) {
        const winnerState = { ...state, winner: player, phase: 'GAME_OVER' as const };
        return addLog(winnerState, player.id, `${player.name} 在快车道积累 ${FAST_TRACK_WIN_AMOUNT} 元，赢得游戏！`, 'win');
      }

      const nextState = advanceTurn(state);
      const nextPlayer = nextState.players[nextState.currentPlayerIndex];
      if (nextPlayer.isInFastTrack) {
        return { ...nextState, phase: 'FAST_TRACK' };
      }
      return { ...nextState, phase: 'ROLLING' };
    }

    case 'DECLARE_BANKRUPTCY': {
      return updatePlayer(state, playerIndex, (p) => ({ ...p, isBankrupt: true, cash: 0 }));
    }

    default:
      return state;
  }
}

export function getInitialGameState(): GameState {
  return getInitialState();
}
