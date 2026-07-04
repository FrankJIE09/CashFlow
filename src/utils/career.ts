import type { CareerEvent, CareerEventType, GameState, Player } from '../types/game';
import { getProfessionAgeConfig, type ProfessionAgeCategory } from '../data/professions';

/** 职业赛道分类（用于事件概率） */
export type CareerTrack =
  | 'publicSector'
  | 'internet'
  | 'blueCollar'
  | 'whiteCollar'
  | 'realEstate'
  | 'private';

const TRACK_BY_CATEGORY: Record<ProfessionAgeCategory, CareerTrack> = {
  publicSector: 'publicSector',
  tech: 'internet',
  blueCollar: 'blueCollar',
  whiteCollar: 'whiteCollar',
  highSalary: 'private',
  selfEmployed: 'private',
};

const REAL_ESTATE_PROFESSIONS = new Set(['sales']);

export function getCareerTrack(professionId: string): CareerTrack {
  if (REAL_ESTATE_PROFESSIONS.has(professionId)) return 'realEstate';
  return TRACK_BY_CATEGORY[getProfessionAgeConfig(professionId).ageCategory] ?? 'whiteCollar';
}

/** 基础裁员风险（0–1） */
export function getBaseCareerRisk(professionId: string): number {
  const track = getCareerTrack(professionId);
  switch (track) {
    case 'blueCollar':
    case 'internet':
    case 'realEstate':
      return 0.3;
    case 'whiteCollar':
    case 'private':
      return 0.15;
    case 'publicSector':
      return 0.05;
    default:
      return 0.15;
  }
}

export function getAgeCoeff(age: number, retireStandardAge: number | null): number {
  const yearsToRetire = retireStandardAge != null ? retireStandardAge - age : 99;
  if (yearsToRetire > 0 && yearsToRetire <= 5) return 2.5;
  if (age < 30) return 0.8;
  if (age <= 45) return 1.0;
  if (age >= 55) return 2.0;
  return 1.5 + (age - 45) * 0.05;
}

export function getMarriageHappinessCoeff(happiness: number): number {
  if (happiness >= 70) return 0.9;
  if (happiness >= 40) return 1.0;
  return 1.3;
}

export function getMacroCoeff(state: GameState): number {
  const recentCrisis = state.logs
    .slice(-12)
    .some((l) => /危机|衰退|裁员潮|股灾|金融危机/.test(l.message));
  if (recentCrisis) return 2.0;
  const avgMult =
    Object.values(state.marketMultiplier).reduce((s, v) => s + v, 0) /
    Math.max(Object.keys(state.marketMultiplier).length, 1);
  if (avgMult < 0.85) return 2.0;
  return 1.0;
}

/** finalLayoffProb = baseCareerRisk × ageCoeff × marriageHappinessCoeff × macroCoeff × layoffRiskModifier */
export function calcFinalLayoffProb(player: Player, state: GameState): number {
  const base = getBaseCareerRisk(player.professionId);
  const age = getAgeCoeff(player.age, player.retireStandardAge);
  const marriage =
    player.marriageStatus === 'married'
      ? getMarriageHappinessCoeff(player.marriageHappiness)
      : 1.0;
  const macro = getMacroCoeff(state);
  const modifier = player.layoffRiskModifier ?? 1;
  return Math.min(1, base * age * marriage * macro * modifier);
}

function getPromotionWeight(professionId: string): number {
  const track = getCareerTrack(professionId);
  if (track === 'publicSector') return 0.4;
  if (track === 'internet' || track === 'blueCollar') return 0.2;
  if (track === 'realEstate') return 0.25;
  if (track === 'whiteCollar') return 0.3;
  return 0.28;
}

function getJobHopWeight(professionId: string): number {
  const track = getCareerTrack(professionId);
  if (track === 'internet' || track === 'private') return 0.35;
  if (track === 'publicSector') return 0.15;
  return 0.25;
}

function getLayoffEventWeight(professionId: string, player: Player, state: GameState): number {
  const track = getCareerTrack(professionId);
  let base: number;
  switch (track) {
    case 'blueCollar':
    case 'internet':
    case 'realEstate':
      base = 0.3;
      break;
    case 'publicSector':
      base = 0.05;
      break;
    default:
      base = 0.15;
  }
  return base * calcFinalLayoffProb(player, state) * 2;
}

function pickWeightedEvent(weights: Record<CareerEventType, number>): CareerEventType {
  const entries = Object.entries(weights).filter(([, w]) => w > 0) as [CareerEventType, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) return 'promotion';
  let roll = Math.random() * total;
  for (const [type, w] of entries) {
    roll -= w;
    if (roll <= 0) return type;
  }
  return entries[entries.length - 1][0];
}

export function createReemploymentEvent(player: Player): CareerEvent {
  const base = player.baseSalary ?? player.salary;
  const restoredPct = 0.85 + Math.random() * 0.1;
  const restored = Math.round(base * restoredPct);
  return {
    type: 'reemployment',
    title: '再就业机遇',
    description: `猎头联系你，提供再就业机会。接受后月薪约 ${restored.toLocaleString()} 元（${Math.round(restoredPct * 100)}% 原薪资），立即结束失业。`,
    restoredSalaryPct: restoredPct,
  };
}

function createPromotionEvent(player: Player): CareerEvent {
  const boostPct = 0.15 + Math.random() * 0.15;
  const costMonths = 1 + Math.floor(Math.random() * 2);
  const cost = Math.round(player.salary * costMonths);
  const monthlyHappinessBoost = 2 + Math.floor(Math.random() * 3);
  return {
    type: 'promotion',
    title: '内部晋升通知',
    description: `公司决定晋升你！月薪 +${Math.round(boostPct * 100)}%，需投入 ${costMonths} 个月薪资的培训/社交费用，永久降低 20% 裁员概率，已婚幸福度每月 +${monthlyHappinessBoost}。`,
    salaryBoostPct: boostPct,
    cost,
    monthlyHappinessBoost,
  };
}

function createJobHopEvent(_player: Player): CareerEvent {
  const highPayBoost = 0.35 + Math.random() * 0.15;
  const stableCut = 0.1 + Math.random() * 0.1;
  return {
    type: 'jobHop',
    title: '猎头 Offer',
    description: '猎头带来两个选择：高薪跳槽（涨薪但有空窗期与短期裁员风险），或稳定体制内岗位（降薪但几乎不会被裁）。',
    highPayBoostPct: highPayBoost,
    highPayGapTurns: 2,
    highPayLayoffRiskTurns: 3,
    stableSalaryCutPct: stableCut,
  };
}

function createLayoffEvent(player: Player, state: GameState): CareerEvent {
  const prob = calcFinalLayoffProb(player, state);
  const severanceMonths = 3 + Math.floor(Math.random() * 4);
  const unemploymentTurns = 3 + Math.floor(Math.random() * 4);
  const happinessDelta = -(20 + Math.floor(Math.random() * 11));
  return {
    type: 'layoff',
    title: '裁员通知',
    description: `公司优化裁员，你收到 N+1 通知（综合裁员概率 ${Math.round(prob * 100)}%）。补偿 ${severanceMonths} 个月薪资，失业 ${unemploymentTurns} 回合，幸福度 ${happinessDelta}。`,
    severanceMonths,
    unemploymentTurns,
    happinessDelta,
  };
}

function createCareerChangeEvent(player: Player): CareerEvent {
  const targetBoost = 0.1 + Math.random() * 0.1;
  const failureCost = Math.round(player.salary * (0.5 + Math.random() * 0.5));
  return {
    type: 'careerChange',
    title: '职业转型/创业',
    description: `决定转型或创业：短期月薪降至 50%，5 回合内恢复至原薪资 +${Math.round(targetBoost * 100)}%。转型期裁员风险中等，失败额外损失约 ${failureCost} 元。`,
    transitionSalaryRatio: 0.5,
    recoveryTurns: 5,
    targetSalaryBoostPct: targetBoost,
    failureCost,
  };
}

export function rollCareerEvent(player: Player, state: GameState): CareerEvent | null {
  if (player.isRetired || isSelfEmployed(player.professionId)) return null;

  if (player.isUnemployed) {
    return createReemploymentEvent(player);
  }

  const promotionCount = player.promotionCount ?? player.promotionLevel ?? 0;
  const weights: Record<CareerEventType, number> = {
    promotion: promotionCount >= 3 ? 0 : getPromotionWeight(player.professionId),
    jobHop: getJobHopWeight(player.professionId),
    layoff: getLayoffEventWeight(player.professionId, player, state),
    careerChange: 0.1,
    reemployment: 0,
  };

  const eventType = pickWeightedEvent(weights);
  switch (eventType) {
    case 'promotion':
      return createPromotionEvent(player);
    case 'jobHop':
      return createJobHopEvent(player);
    case 'layoff':
      return createLayoffEvent(player, state);
    case 'careerChange':
      return createCareerChangeEvent(player);
    default:
      return createPromotionEvent(player);
  }
}

function isSelfEmployed(professionId: string): boolean {
  return getProfessionAgeConfig(professionId).ageCategory === 'selfEmployed';
}

export function canReceiveCareerEvent(player: Player): boolean {
  if (player.isRetired) return false;
  if (isSelfEmployed(player.professionId)) return false;
  if (player.isUnemployed) return true;
  return !player.isRetired;
}
