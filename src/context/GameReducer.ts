import type { Asset, AssetType, Card, CardType, GameAction, GameConfig, GameState, MarketEffect, OpportunityCard, Player } from '../types/game';
import { PROFESSIONS, PLAYER_COLORS, CUSTOM_PROFESSION_ID, buildCustomProfession } from '../data/professions';
import { getCityById, DEFAULT_CITY_ID } from '../data/cities';
import { SPACES } from '../data/boardLayout';
import { OPPORTUNITY_CARDS } from '../data/opportunityCards';
import { MARKET_CARDS } from '../data/marketCards';
import { DOODAD_CARDS } from '../data/doodadCards';
import {
  calculateBuyCost,
  calculateSellProceeds,
  calcPrepaymentPenalty,
  canPurchaseOpportunity,
  checkBankruptcy,
  checkFinancialFreedom,
  createDefaultMultiplierRecord,
  createLiability,
  getAssetPriceMultiplier,
  getAssetTypeLabel,
  getMonthlyCashFlow,
  getOpportunityAsset,
  getRealEstateMortgageDebtType,
  getTotalAssetsValue,
  inferDebtTypeFromLiability,
  inferProfessionDebtType,
  isAssetTypeKey,
  normalizeLiability,
  syncExpenseOnRepay,
  calcLiabilityMonthlyPayment,
  applyCityTierDownPayment,
  scaleAssetByPlayerCity,
  recalcAllPlayersMortgagesOnRateChange,
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
  const playerIndex = state.currentPlayerIndex;
  const player = state.players[playerIndex];
  if (!checkBankruptcy(player, state.cashFlowMultiplier, state.sectorMultiplier)) return state;

  const cashFlow = getMonthlyCashFlow(player, state.cashFlowMultiplier, state.sectorMultiplier);
  let newState = updatePlayer(state, playerIndex, (p) => ({
    ...p,
    isBankrupt: true,
    cash: 0,
  }));
  newState = addLog(
    newState,
    player.id,
    `${player.name} 月现金流为负（${cashFlow} 元），游戏失败！`,
    'system'
  );

  const activePlayers = newState.players.filter((p) => !p.isBankrupt);

  if (!player.isAI) {
    const aiWinner = activePlayers.find((p) => p.isAI) ?? null;
    return { ...newState, winner: aiWinner, phase: 'GAME_OVER' };
  }

  if (activePlayers.length === 1) {
    return { ...newState, winner: activePlayers[0], phase: 'GAME_OVER' };
  }

  if (activePlayers.length === 0) {
    return { ...newState, phase: 'GAME_OVER' };
  }

  return newState;
}

function handlePayday(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  const cashFlow = getMonthlyCashFlow(player, state.cashFlowMultiplier, state.sectorMultiplier);
  const newState = updatePlayer(state, playerIndex, (p) => ({
    ...p,
    cash: p.cash + cashFlow,
    liabilities: p.liabilities.map((l) => ({
      ...l,
      paidPeriods: (l.paidPeriods ?? 0) + 1,
    })),
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

function executeBuyAsset(
  state: GameState,
  playerIndex: number,
  asset: Asset,
  isDiscounted: boolean,
  dueDiligenceCost = 0
): GameState {
  const player = state.players[playerIndex];
  let newState = state;

  const buyCost = calculateBuyCost(asset) + dueDiligenceCost;
  const transactionFee = buyCost - asset.downPayment - dueDiligenceCost;
  const shortfall = buyCost - player.cash;

  if (shortfall > 0) {
    newState = updatePlayer(newState, playerIndex, (p) => ({
      ...p,
      cash: p.cash + shortfall,
      liabilities: [
        ...p.liabilities,
        {
          id: generateId(),
          ...createLiability({
            name: `${asset.name} 贷款`,
            principal: shortfall,
            debtType: 'bankBusinessLoan',
            source: 'game',
          }),
        },
      ],
    }));
    newState = addLog(newState, player.id, `${player.name} 为购买 ${asset.name} 贷款 ${shortfall} 元`, 'liability');
  }

  newState = updatePlayer(newState, playerIndex, (p) => ({
    ...p,
    cash: p.cash - buyCost,
    assets: [...p.assets, { ...asset, id: generateId() }],
  }));

  if (dueDiligenceCost > 0) {
    newState = addLog(newState, player.id, `${player.name} 支付尽调费 ${dueDiligenceCost} 元`, 'expense');
  }
  if (transactionFee > 0) {
    newState = addLog(newState, player.id, `${player.name} 支付交易费 ${transactionFee} 元`, 'expense');
  }

  if (asset.mortgage > 0) {
    const mortgageDebtType =
      asset.type === 'realEstate'
        ? getRealEstateMortgageDebtType(player, asset)
        : 'bankBusinessLoan';

    newState = updatePlayer(newState, playerIndex, (p) => ({
      ...p,
      liabilities: [
        ...p.liabilities,
        {
          id: generateId(),
          ...createLiability({
            name: `${asset.name} 抵押贷款`,
            principal: asset.mortgage,
            debtType: mortgageDebtType,
            source: 'game',
          }),
        },
      ],
    }));
  }

  newState = addLog(
    newState,
    player.id,
    `${player.name} ${isDiscounted ? '打折购买' : '购买'} ${asset.name}，总支出 ${buyCost} 元，月现金流 +${asset.cashFlow} 元`,
    'asset'
  );
  newState = checkAndHandleBankruptcy(newState);
  return { ...newState, currentCard: null, phase: 'TURN_END' };
}

function applyInterestRateChange(
  state: GameState,
  playerId: string,
  rateChange: number,
  cardTitle?: string
): GameState {
  const oldRate = state.interestRate;
  const newRate = Math.max(0.001, oldRate + rateChange);
  const { players, changeLogs } = recalcAllPlayersMortgagesOnRateChange(state.players, newRate);
  let newState: GameState = { ...state, interestRate: newRate, players };

  const prefix = cardTitle ? `【${cardTitle}】` : '';
  newState = addLog(
    newState,
    playerId,
    `${prefix}市场利率 ${(oldRate * 100).toFixed(1)}% → ${(newRate * 100).toFixed(1)}%，EPI 类负债月供已重算`,
    'market'
  );

  for (const log of changeLogs) {
    newState = addLog(newState, playerId, log, 'market');
  }

  return newState;
}

function applyAssetImpacts(state: GameState, playerId: string, cardTitle: string, effect: MarketEffect): GameState {
  if (!effect.assetImpacts && !effect.rateChange) return state;

  let newState = state;
  const impactLogs: string[] = [];

  if (effect.assetImpacts) {
    let marketMultiplier = { ...state.marketMultiplier };
    let cashFlowMultiplier = { ...state.cashFlowMultiplier };
    let sectorMultiplier = { ...state.sectorMultiplier };

    for (const [key, impact] of Object.entries(effect.assetImpacts)) {
      if (impact.priceChange) {
        if (isAssetTypeKey(key)) {
          marketMultiplier[key] *= impact.priceChange;
          impactLogs.push(`${getAssetTypeLabel(key)} 估值×${impact.priceChange}`);
        } else {
          sectorMultiplier[key] = (sectorMultiplier[key] ?? 1) * impact.priceChange;
          impactLogs.push(`${key}板块 估值×${impact.priceChange}`);
        }
      }
      if (impact.cashFlowChange) {
        if (isAssetTypeKey(key)) {
          cashFlowMultiplier[key] *= impact.cashFlowChange;
          impactLogs.push(`${getAssetTypeLabel(key)} 现金流×${impact.cashFlowChange}`);
        } else {
          sectorMultiplier[key] = (sectorMultiplier[key] ?? 1) * impact.cashFlowChange;
        }
      }
    }

    newState = { ...newState, marketMultiplier, cashFlowMultiplier, sectorMultiplier };
  }

  if (effect.rateChange) {
    newState = applyInterestRateChange(newState, playerId, effect.rateChange);
  }

  if (impactLogs.length > 0) {
    const summary = impactLogs.slice(0, 4).join('；');
    newState = addLog(newState, playerId, `【${cardTitle}】${summary}`, 'market');
  } else if (effect.assetImpacts && !effect.rateChange) {
    newState = addLog(newState, playerId, `【${cardTitle}】市场格局发生变化`, 'market');
  }

  return newState;
}

function applyMarketEffect(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  const card = state.currentCard;
  if (!card || card.type !== 'market') return state;

  const effect = card.effect;
  let newState = state;

  switch (effect.type) {
    case 'macroEvent': {
      newState = applyAssetImpacts(newState, player.id, card.title, effect);
      break;
    }
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
          `${getAssetTypeLabel(effect.targetAssetType)} 增值，乘数 ${newState.marketMultiplier[effect.targetAssetType].toFixed(2)}`,
          'market'
        );
      }
      break;
    }
    case 'assetDepreciation': {
      if (effect.multiplier) {
        const multiplier = { ...state.marketMultiplier };
        for (const type of Object.keys(multiplier) as AssetType[]) {
          multiplier[type] *= effect.multiplier;
        }
        newState = { ...newState, marketMultiplier: multiplier };
        if (effect.assetImpacts) {
          newState = applyAssetImpacts(newState, player.id, card.title, effect);
        } else {
          newState = addLog(newState, player.id, '所有资产贬值', 'market');
        }
      }
      break;
    }
    case 'interestRate': {
      if (effect.rateChange) {
        newState = applyInterestRateChange(newState, player.id, effect.rateChange, card.title);
      }
      break;
    }
    case 'sectorBoom': {
      if (effect.sector && effect.multiplier) {
        if (isAssetTypeKey(effect.sector)) {
          newState = {
            ...newState,
            marketMultiplier: {
              ...newState.marketMultiplier,
              [effect.sector]: state.marketMultiplier[effect.sector] * effect.multiplier,
            },
          };
        } else {
          newState = {
            ...newState,
            sectorMultiplier: {
              ...newState.sectorMultiplier,
              [effect.sector]: (state.sectorMultiplier[effect.sector] ?? 1) * effect.multiplier,
            },
          };
        }
        newState = addLog(newState, player.id, `${effect.sector} 板块暴涨`, 'market');
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

  const discountedAsset = applyCityTierDownPayment(
    scaleAssetByPlayerCity(
      {
        ...foundCard.asset,
        downPayment: Math.round(foundCard.asset.downPayment * discountRate),
        mortgage: foundCard.asset.cost - Math.round(foundCard.asset.downPayment * discountRate),
      },
      player.cityId
    ),
    player.cityId
  );

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
  const professionId = isAI ? PROFESSIONS[index % PROFESSIONS.length].id : config.humanProfessionId;
  const profession =
    !isAI && professionId === CUSTOM_PROFESSION_ID && config.customProfession
      ? buildCustomProfession(config.customProfession)
      : PROFESSIONS.find((p) => p.id === professionId)!;
  const city = getCityById(config.cityId ?? DEFAULT_CITY_ID);
  const name = isAI ? aiName || `${['智能 A', '智能 B', '智能 C', '智能 D'][index - 1] || 'AI'}` : config.humanPlayerName;

  const salaryBuff = profession.buff?.salary ?? 1;
  const expenseBuff = profession.buff?.expense ?? 1;
  const savingsBuff = profession.buff?.savings ?? 1;

  const salary = Math.round(profession.salary * city.salaryMultiplier * salaryBuff);
  const cash = Math.round(profession.cash * savingsBuff);
  const expenses = {
    ...profession.expenses,
    tax: Math.round(profession.expenses.tax * city.expenseMultiplier),
    other: Math.round(profession.expenses.other * city.expenseMultiplier * expenseBuff),
    perChild: Math.round(profession.expenses.perChild * city.expenseMultiplier),
    mortgage: 0,
    studentLoan: 0,
    carLoan: 0,
    creditCard: 0,
  };

  return {
    id: generateId(),
    name,
    professionId: profession.id,
    customProfessionName:
      !isAI && professionId === CUSTOM_PROFESSION_ID ? config.customProfession?.name.trim() : undefined,
    cityId: city.id,
    color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    position: 0,
    cash,
    salary,
    expenses,
    children: 0,
    assets: [],
    liabilities: profession.liabilities.map((l) =>
      normalizeLiability({
        ...l,
        id: generateId(),
        debtType: inferProfessionDebtType(l.name),
        originalPrincipal: l.principal,
        paidPeriods: l.paidPeriods ?? 0,
        source: 'profession' as const,
      })
    ),
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
    marketMultiplier: createDefaultMultiplierRecord(),
    cashFlowMultiplier: createDefaultMultiplierRecord(),
    sectorMultiplier: {},
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
      const { humanPlayerName, humanProfessionId, customProfession, cityId, aiCount, aiDifficulty } = action.payload;
      const config: GameConfig = {
        humanPlayerName,
        humanProfessionId,
        customProfession,
        cityId: cityId ?? DEFAULT_CITY_ID,
        aiCount,
        aiDifficulty,
      };
      const newState: GameState = {
        ...getInitialState(),
        players: [
          createPlayer(config, false, 0),
          ...Array.from({ length: aiCount }, (_, i) =>
            createPlayer(config, true, i + 1, `AI ${i + 1}`)
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
          if (player.children >= CHILDREN_LIMIT) {
            newState = addLog(newState, player.id, `${player.name} 已经有 ${CHILDREN_LIMIT} 个孩子了`, 'system');
            return { ...newState, phase: 'TURN_END' };
          }
          return { ...newState, phase: 'CARD_DECISION', currentCard: null };
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
      const gate = canPurchaseOpportunity(player, card, state.marketMultiplier, state.sectorMultiplier);
      if (!gate.allowed) {
        return addLog(state, player.id, `无法购买：${gate.reason}`, 'system');
      }
      return executeBuyAsset(state, playerIndex, getOpportunityAsset(card, player), false, card.dueDiligenceCost ?? 0);
    }

    case 'BUY_DISCOUNTED_ASSET': {
      const card = state.currentCard;
      if (!card || card.type !== 'opportunity') return state;
      const gate = canPurchaseOpportunity(player, card, state.marketMultiplier, state.sectorMultiplier);
      if (!gate.allowed) {
        return addLog(state, player.id, `无法购买：${gate.reason}`, 'system');
      }
      return executeBuyAsset(state, playerIndex, getOpportunityAsset(card, player), true, card.dueDiligenceCost ?? 0);
    }

    case 'DECLINE_CARD': {
      return { ...state, currentCard: null, phase: 'TURN_END' };
    }

    case 'PAY_DOODAD': {
      const card = state.currentCard;
      if (!card || card.type !== 'doodad') return state;

      const cost = card.cost;
      let newState = state;
      const shortfall = Math.max(0, cost - player.cash);

      if (shortfall > 0) {
        newState = updatePlayer(newState, playerIndex, (p) => ({
          ...p,
          cash: p.cash + shortfall,
          liabilities: [
            ...p.liabilities,
            {
              id: generateId(),
              ...createLiability({
                name: `${card.title} 贷款`,
                principal: shortfall,
                debtType: 'creditCard',
                source: 'game',
              }),
            },
          ],
        }));
        newState = addLog(newState, player.id, `${player.name} 为支付 ${card.title} 贷款 ${shortfall} 元`, 'liability');
      }

      newState = updatePlayer(newState, playerIndex, (p) => ({
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

    case 'CHOOSE_BABY': {
      if (!action.payload.haveBaby) {
        const skipState = addLog(state, player.id, `${player.name} 选择暂不生育`, 'system');
        return { ...skipState, phase: 'TURN_END', currentCard: null };
      }
      if (player.children >= CHILDREN_LIMIT) {
        return addLog(state, player.id, `${player.name} 已有 ${CHILDREN_LIMIT} 个孩子`, 'system');
      }
      let newState = updatePlayer(state, playerIndex, (p) => ({
        ...p,
        children: p.children + 1,
      }));
      newState = addLog(
        newState,
        player.id,
        `${player.name} 决定生孩子，月支出 +${player.expenses.perChild} 元`,
        'expense'
      );
      newState = checkAndHandleBankruptcy(newState);
      return { ...newState, phase: 'TURN_END', currentCard: null };
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
      if (amount <= 0) return state;

      let newState = updatePlayer(state, playerIndex, (p) => ({
        ...p,
        cash: p.cash + amount,
        liabilities: [
          ...p.liabilities,
          {
            id: generateId(),
            ...createLiability({
              name: '银行贷款',
              principal: amount,
              debtType: 'bankBusinessLoan',
              source: 'game',
            }),
          },
        ],
      }));
      newState = addLog(newState, player.id, `${player.name} 向银行贷款 ${amount} 元`, 'liability');
      return newState;
    }

    case 'REPAY_LIABILITY': {
      const { liabilityId, amount } = action.payload;
      const liability = player.liabilities.find((l) => l.id === liabilityId);
      if (!liability || amount <= 0) return state;

      const debtType = inferDebtTypeFromLiability(liability);
      const repayAmount = Math.min(amount, liability.principal);
      const penalty = calcPrepaymentPenalty(debtType, liability.principal, liability.paidPeriods ?? 0);
      const totalCost = repayAmount + penalty;

      if (player.cash < totalCost) {
        return addLog(state, player.id, `${player.name} 现金不足，无法偿还 ${liability.name}`, 'system');
      }

      const oldPayment = liability.monthlyPayment;
      const newPrincipal = liability.principal - repayAmount;
      const newPayment =
        newPrincipal > 0
          ? calcLiabilityMonthlyPayment(newPrincipal, debtType, liability.totalLoanMonth)
          : 0;

      let newState = updatePlayer(state, playerIndex, (p) => {
        const updatedLiabilities =
          newPrincipal <= 0
            ? p.liabilities.filter((l) => l.id !== liabilityId)
            : p.liabilities.map((l) =>
                l.id === liabilityId
                  ? { ...l, principal: newPrincipal, monthlyPayment: newPayment }
                  : l
              );

        const paymentReduction = oldPayment - newPayment;
        const expenses =
          liability.source === 'profession'
            ? syncExpenseOnRepay(p.expenses, debtType, paymentReduction)
            : p.expenses;

        return {
          ...p,
          cash: p.cash - totalCost,
          liabilities: updatedLiabilities,
          expenses,
        };
      });

      const penaltyText = penalty > 0 ? `，提前还款罚金 ${penalty} 元` : '';
      newState = addLog(
        newState,
        player.id,
        `${player.name} 偿还 ${liability.name} 本金 ${repayAmount} 元${penaltyText}，月供 ${oldPayment} → ${newPayment} 元`,
        'repay'
      );
      newState = checkAndHandleBankruptcy(newState);
      return newState;
    }

    case 'SELL_ASSET': {
      const { assetId, multiplier } = action.payload;
      const asset = player.assets.find((a) => a.id === assetId);
      if (!asset) return state;

      const effectiveMult = multiplier * getAssetPriceMultiplier(asset, state.marketMultiplier, state.sectorMultiplier);
      const sellPrice = calculateSellProceeds(asset, effectiveMult, {});
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
      if (checkFinancialFreedom(player, state.cashFlowMultiplier, state.sectorMultiplier) && !player.isInFastTrack) {
        const newState = updatePlayer(state, playerIndex, (p) => ({
          ...p,
          isInFastTrack: true,
          fastTrackPosition: 0,
          cash: p.cash + getTotalAssetsValue(p, state.marketMultiplier, state.sectorMultiplier),
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
