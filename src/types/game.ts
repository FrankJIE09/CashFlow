export type GamePhase =
  | 'SETUP'
  | 'ROLLING'
  | 'MOVING'
  | 'EVENT_RESOLVING'
  | 'CARD_DECISION'
  | 'TURN_END'
  | 'FAST_TRACK'
  | 'GAME_OVER';

export type AssetType = 'stock' | 'realEstate' | 'business' | 'intellectual';

export type CardType = 'opportunity' | 'market' | 'doodad';
export type OpportunityKind = 'smallDeal' | 'bigDeal';

export type SpaceType =
  | 'payday'
  | 'opportunity'
  | 'market'
  | 'doodad'
  | 'charity'
  | 'baby'
  | 'settlement';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type MarketEffectType =
  | 'assetAppreciation'
  | 'assetDepreciation'
  | 'buyout'
  | 'interestRate'
  | 'discount'
  | 'sectorBoom';

export interface ExpenseBreakdown {
  tax: number;
  mortgage: number;
  studentLoan: number;
  carLoan: number;
  creditCard: number;
  other: number;
  perChild: number;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  cost: number;
  downPayment: number;
  cashFlow: number;
  mortgage: number;
  marketValue: number;
  shares?: number;
}

export interface Liability {
  id: string;
  name: string;
  principal: number;
  monthlyPayment: number;
  interestRate: number;
}

export interface Player {
  id: string;
  name: string;
  professionId: string;
  color: string;
  position: number;
  cash: number;
  salary: number;
  expenses: ExpenseBreakdown;
  children: number;
  assets: Asset[];
  liabilities: Liability[];
  isInFastTrack: boolean;
  fastTrackPosition: number;
  dream?: string;
  dreamCost?: number;
  charityTurns: number;
  isAI: boolean;
  difficulty?: Difficulty;
  isBankrupt: boolean;
}

export interface Space {
  id: number;
  type: SpaceType;
  name: string;
  description: string;
}

export interface BaseCard {
  id: string;
  title: string;
  description: string;
  type: CardType;
}

export interface OpportunityCard extends BaseCard {
  type: 'opportunity';
  kind: OpportunityKind;
  asset: Asset;
  minCashRequired?: number;
}

export interface MarketEffect {
  type: MarketEffectType;
  targetAssetType?: AssetType;
  multiplier?: number;
  rateChange?: number;
  discountRate?: number;
  sector?: string;
}

export interface MarketCard extends BaseCard {
  type: 'market';
  effect: MarketEffect;
}

export interface DoodadCard extends BaseCard {
  type: 'doodad';
  cost: number;
  isRecurring: boolean;
  monthlyCost?: number;
}

export type Card = OpportunityCard | MarketCard | DoodadCard;

export interface Decks {
  opportunity: Card[];
  market: Card[];
  doodad: Card[];
}

export interface LogEntry {
  id: string;
  timestamp: number;
  playerId: string;
  message: string;
  type: 'move' | 'income' | 'expense' | 'asset' | 'liability' | 'market' | 'system' | 'win';
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  round: number;
  spaces: Space[];
  decks: Decks;
  discardPiles: Decks;
  currentCard: Card | null;
  marketMultiplier: Record<AssetType, number>;
  interestRate: number;
  winner: Player | null;
  logs: LogEntry[];
  pendingDice: number | null;
}

export interface GameConfig {
  humanPlayerName: string;
  humanProfessionId: string;
  aiCount: number;
  aiDifficulty: Difficulty;
}

export interface Profession {
  id: string;
  name: string;
  salary: number;
  cash: number;
  expenses: ExpenseBreakdown;
  liabilities: Omit<Liability, 'id'>[];
  description: string;
}

export type GameAction =
  | { type: 'SETUP_GAME'; payload: GameConfig }
  | { type: 'RESTART_GAME' }
  | { type: 'ROLL_DICE'; payload: { dice: number } }
  | { type: 'MOVE_PLAYER' }
  | { type: 'RESOLVE_SPACE' }
  | { type: 'DRAW_CARD'; payload: { cardType: CardType } }
  | { type: 'BUY_ASSET' }
  | { type: 'BUY_DISCOUNTED_ASSET' }
  | { type: 'DECLINE_CARD' }
  | { type: 'PAY_DOODAD' }
  | { type: 'DONATE_CHARITY'; payload: { donate: boolean } }
  | { type: 'APPLY_MARKET_EFFECT' }
  | { type: 'DRAW_DISCOUNTED_OPPORTUNITY' }
  | { type: 'END_TURN' }
  | { type: 'TAKE_LOAN'; payload: { amount: number } }
  | { type: 'SELL_ASSET'; payload: { assetId: string; multiplier: number } }
  | { type: 'DECLARE_BANKRUPTCY' };
