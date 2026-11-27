import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  CustomNeedDef,
  EnergyProfile,
  NeedCheckIn,
  NeedCheckInSource,
  NeedConfig,
  NeedEffect,
  NeedId,
  NeedMetadataSource,
  NeedRefill,
} from '../types/need';
import { addEffectSample, EFFECT_MIN_GAP, findEffectCandidates, forecastEffect } from '../utils/need-effect-utils';
import { emptyRateHistory, NEED_CHART_COLORS, type NeedRatePoint } from '../utils/need-history-utils';
import {
  applyBuiltInEmojis,
  applyNeedOrder,
  clampLevel,
  DEFAULT_NEED_CONFIGS,
  getDecayPerHour,
  getNeedEvents,
  getNeedMetadataSource,
  getPanelOrder,
  learnEmptyHours,
  NEED_IDS,
  NEED_LOOKBACK_MS,
  NEED_UNKNOWN_START_LEVEL,
  type PanelRowKey,
  registerCustomNeeds,
  simulateNeed,
} from '../utils/need-utils';
import { useBehaviorStore } from './behavior-store';
import { useEffectPromptStore } from './effect-prompt-store';

const MAX_CHECK_INS = 500;
const MAX_RATE_POINTS = 200;

export type NeedHistoryDisplay = 'lanes' | 'overlay';

/** Needs list order: the order set in settings, or the lowest level first. */
export type NeedSortMode = 'manual' | 'level';

/** Makes custom needs known to the lookup tables (and chart colours) before anything reads them. */
function syncCustomNeeds(
  defs: readonly CustomNeedDef[],
  emojiOverrides?: Record<NeedId, string>,
  needOrder?: readonly PanelRowKey[],
) {
  registerCustomNeeds(defs);
  applyNeedOrder(needOrder);
  applyBuiltInEmojis(emojiOverrides);
  for (const def of defs) NEED_CHART_COLORS[def.id] = def.color;
}

export interface NewCustomNeed {
  emoji: string;
  label: string;
  emptyHours: number;
  color: string;
}

export interface NeedsStore {
  /** Needs the user made, in order. Their ids are in NEED_IDS too once registered. */
  customNeeds: CustomNeedDef[];
  /** Icons picked for built-in needs, by need id. Missing = the original icon. */
  emojiOverrides: Record<NeedId, string>;
  /** The user's order of needs (ids). Empty = the default order. */
  needOrder: PanelRowKey[];
  /** How needs are ordered where they are listed. */
  needSortMode: NeedSortMode;
  /** Body details for the Hunger screen's calorie balance. Undefined until set. */
  energyProfile?: EnergyProfile;
  setEnergyProfile: (profile: EnergyProfile | undefined) => void;
  setNeedSortMode: (mode: NeedSortMode) => void;
  /** Moves a need one place up (-1) or down (1) in the list. */
  moveNeed: (id: PanelRowKey, direction: -1 | 1) => void;
  /** Sets a built-in need's icon; an empty emoji restores the original. */
  setBuiltInEmoji: (id: NeedId, emoji: string) => void;
  /** Makes a need with the built-in model; returns its id. */
  addCustomNeed: (input: NewCustomNeed) => NeedId;
  updateCustomNeed: (id: NeedId, patch: Partial<NewCustomNeed>) => void;
  /** Deletes the need and its check-ins. Logs and behaviours are untouched. */
  removeCustomNeed: (id: NeedId) => void;
  needs: Record<NeedId, NeedConfig>;
  checkIns: NeedCheckIn[];
  /** Each need's learned rate over time, so history charts use the rate you had then. */
  rateHistory: Record<NeedId, NeedRatePoint[]>;
  /** Needs history screen: one chart per need, or all needs on one chart. */
  historyDisplay: NeedHistoryDisplay;
  setHistoryDisplay: (display: NeedHistoryDisplay) => void;
  /** The Energy scoring explainer atop a sleep behaviour's log list was dismissed. */
  energyRuleHidden: boolean;
  setEnergyRuleHidden: (hidden: boolean) => void;
  /** Records how the need feels now and nudges its decay rate toward what that implies. */
  checkIn: (needId: NeedId, level: number, source: NeedCheckInSource) => void;
  /** Like checkIn, but does nothing when the need is already at or below `level` (a sensation never raises it). */
  lowerTo: (needId: NeedId, level: number, source: NeedCheckInSource) => void;
  /** Tops a need up by `amount` points without logging a behaviour. Doesn't teach the decay rate. */
  /** Tops a need up by hand. `ts` is when it happened (default now). */
  updateLevel: (needId: NeedId, amount: number, ts?: number) => void;
  /** Undoes a check-in or update. */
  removeCheckIn: (id: string) => void;
  /** Sets how much one log refills a need, or clears it with undefined. */
  setLogAmount: (needId: NeedId, logId: string, amount: number | undefined) => void;
  setRefill: (needId: NeedId, behaviorId: string, refill: NeedRefill | undefined) => void;
  setCategoryRefill: (needId: NeedId, categoryId: string, refill: NeedRefill | undefined) => void;
  setMetadataSource: (needId: NeedId, source: NeedMetadataSource | null | undefined) => void;
  setEnabled: (needId: NeedId, enabled: boolean) => void;
  /** Sets the words that make a body sensation lower this need. Undefined restores the default words. */
  setBodyWords: (needId: NeedId, words: string | undefined) => void;
  /** Sets the full-to-empty time by hand; recorded in the rate history like a learned change. */
  setEmptyHours: (needId: NeedId, emptyHours: number) => void;
  resetLearning: (needId: NeedId) => void;
  /** Sets a behaviour's side effect on a need, or removes it with undefined. */
  setEffect: (needId: NeedId, behaviorId: string, effect: NeedEffect | undefined) => void;
  /** Confirms that a behaviour caused a check-in's gap: adds it to the behaviour's effect on the need. */
  learnEffect: (needId: NeedId, behaviorId: string, sample: { expected: number; actual: number }) => void;
}

function withRateHistory(
  saved: Partial<Record<NeedId, NeedRatePoint[]>> | undefined,
  needs: Record<NeedId, NeedConfig>,
): Record<NeedId, NeedRatePoint[]> {
  const result = emptyRateHistory();
  for (const id of NEED_IDS) {
    const points = saved?.[id];
    if (points?.length) result[id] = points;
    // Rates learned before history was kept apply from the start.
    else if (needs[id].emptyHours !== DEFAULT_NEED_CONFIGS[id].emptyHours) {
      result[id] = [{ ts: 0, emptyHours: needs[id].emptyHours }];
    }
  }
  return result;
}

const appendRate = (points: NeedRatePoint[], ts: number, emptyHours: number) =>
  [...points, { ts, emptyHours }].slice(-MAX_RATE_POINTS);

function withDefaults(needs: Partial<Record<NeedId, Partial<NeedConfig>>> | undefined): Record<NeedId, NeedConfig> {
  const result = {} as Record<NeedId, NeedConfig>;
  for (const id of NEED_IDS) {
    const saved = needs?.[id];
    result[id] = {
      ...DEFAULT_NEED_CONFIGS[id],
      ...saved,
      refills: { ...saved?.refills },
      categoryRefills: { ...saved?.categoryRefills },
      logAmounts: { ...saved?.logAmounts },
      effects: { ...saved?.effects },
    };
  }
  // Body Energy came after Energy split in two: start it with Energy's sleep refills and Comfort's at half.
  if (needs && !needs.body) result.body = { ...result.body, ...getSeededBodyRefills(result) };
  return result;
}

/** Halves a refill, for Comfort behaviours that also rest the body. */
function halfRefill(refill: NeedRefill): NeedRefill {
  if (refill.mode === 'add') return { mode: 'add', amount: refill.amount / 2 };
  if (refill.mode === 'set') return { mode: 'add', amount: 50 };
  return { mode: 'duration', fullMinutes: refill.fullMinutes * 2 };
}

function getSeededBodyRefills(needs: Record<NeedId, NeedConfig>): Pick<NeedConfig, 'refills' | 'categoryRefills'> {
  const refills: Record<string, NeedRefill> = {};
  const categoryRefills: Record<string, NeedRefill> = {};
  for (const [id, refill] of Object.entries(needs.comfort?.refills ?? {})) refills[id] = halfRefill(refill);
  for (const [id, refill] of Object.entries(needs.comfort?.categoryRefills ?? {})) {
    categoryRefills[id] = halfRefill(refill);
  }
  for (const [id, refill] of Object.entries(needs.energy?.refills ?? {})) {
    if (refill.mode === 'duration') refills[id] = refill;
  }
  for (const [id, refill] of Object.entries(needs.energy?.categoryRefills ?? {})) {
    if (refill.mode === 'duration') categoryRefills[id] = refill;
  }
  return { refills, categoryRefills };
}

/** A need's state right now, from logs and earlier check-ins. `withoutEffects` leaves out side effects. */
function getCurrentNeedState(
  state: Pick<NeedsStore, 'needs' | 'checkIns'>,
  needId: NeedId,
  now: number,
  withoutEffects = false,
) {
  const config = withoutEffects ? { ...state.needs[needId], effects: undefined } : state.needs[needId];
  const { behaviors, categories } = useBehaviorStore.getState();
  const events = getNeedEvents(
    needId,
    config,
    behaviors,
    state.checkIns,
    getNeedMetadataSource(needId, config, categories),
    now - NEED_LOOKBACK_MS,
  );
  return simulateNeed(events, getDecayPerHour(config), now);
}

/**
 * After a check-in well off what was expected, soon after a behaviour: if that behaviour's known effect
 * already explains it, counts it as another sample; otherwise asks whether the behaviour did it.
 * Returns true when a recent behaviour may explain the gap.
 */
function checkForEffect(state: Pick<NeedsStore, 'needs' | 'checkIns'>, needId: NeedId, entry: NeedCheckIn): boolean {
  const config = state.needs[needId];
  const expected = getCurrentNeedState(state, needId, entry.ts, true).level;
  if (expected == null || Math.abs(entry.level - expected) < EFFECT_MIN_GAP) return false;
  const candidates = findEffectCandidates(useBehaviorStore.getState().behaviors, config, entry.ts);
  if (candidates.length === 0) return false;
  const sample = { expected, actual: entry.level };
  const known = config.effects?.[candidates[0].behaviorId];
  if (known && Math.abs(forecastEffect(expected, known) - entry.level) < EFFECT_MIN_GAP) {
    // Runs after this set() so it isn't overwritten by it.
    setTimeout(() => useNeedsStore.getState().learnEffect(needId, candidates[0].behaviorId, sample), 0);
    return true;
  }
  useEffectPromptStore.getState().show({ needId, ts: entry.ts, ...sample, candidates });
  return true;
}

export const useNeedsStore = create<NeedsStore>()(
  persist(
    (set, get) => ({
      needs: withDefaults(undefined),
      customNeeds: [],
      emojiOverrides: {},
      needOrder: [],
      needSortMode: 'manual',
      setEnergyProfile: profile => set({ energyProfile: profile }),
      setNeedSortMode: mode => set({ needSortMode: mode }),
      moveNeed: (id, direction) =>
        set(state => {
          const order = getPanelOrder(state.needOrder);
          const from = order.indexOf(id);
          const to = from + direction;
          if (from === -1 || to < 0 || to >= order.length) return {};
          [order[from], order[to]] = [order[to], order[from]];
          syncCustomNeeds(state.customNeeds, state.emojiOverrides, order);
          return { needOrder: order };
        }),
      setBuiltInEmoji: (id, emoji) =>
        set(state => {
          const { [id]: _old, ...rest } = state.emojiOverrides;
          const emojiOverrides = emoji ? { ...rest, [id]: emoji } : rest;
          syncCustomNeeds(state.customNeeds, emojiOverrides, state.needOrder);
          return { emojiOverrides };
        }),
      addCustomNeed: input => {
        const id = `custom:${uuidv4().slice(0, 8)}`;
        const def: CustomNeedDef = { id, ...input, label: input.label.trim() };
        set(state => {
          const customNeeds = [...state.customNeeds, def];
          syncCustomNeeds(customNeeds, state.emojiOverrides, state.needOrder);
          return {
            customNeeds,
            needs: { ...state.needs, [id]: { ...DEFAULT_NEED_CONFIGS[id], refills: {}, categoryRefills: {} } },
            rateHistory: { ...state.rateHistory, [id]: [] },
          };
        });
        return id;
      },
      updateCustomNeed: (id, patch) =>
        set(state => {
          const old = state.customNeeds.find(def => def.id === id);
          if (!old) return {};
          const next = { ...old, ...patch, label: (patch.label ?? old.label).trim() };
          const customNeeds = state.customNeeds.map(def => (def.id === id ? next : def));
          syncCustomNeeds(customNeeds, state.emojiOverrides, state.needOrder);
          const config = state.needs[id];
          // Until a check-in has taught a rate, the typed decay time is the rate.
          const emptyHours = config.learnedFrom === 0 ? next.emptyHours : config.emptyHours;
          return { customNeeds, needs: { ...state.needs, [id]: { ...config, emptyHours } } };
        }),
      removeCustomNeed: id =>
        set(state => {
          const customNeeds = state.customNeeds.filter(def => def.id !== id);
          syncCustomNeeds(customNeeds, state.emojiOverrides, state.needOrder);
          const { [id]: _config, ...needs } = state.needs;
          const { [id]: _history, ...rateHistory } = state.rateHistory;
          return { customNeeds, needs, rateHistory, checkIns: state.checkIns.filter(entry => entry.needId !== id) };
        }),
      checkIns: [],
      rateHistory: emptyRateHistory(),
      historyDisplay: 'lanes',
      setHistoryDisplay: display => set({ historyDisplay: display }),
      energyRuleHidden: false,
      setEnergyRuleHidden: hidden => set({ energyRuleHidden: hidden }),
      lowerTo: (needId, level, source) => {
        const current = getCurrentNeedState(get(), needId, Date.now()).level;
        if (current == null || current > level) get().checkIn(needId, level, source);
      },
      checkIn: (needId, level, source) =>
        set(state => {
          const now = Date.now();
          const config = state.needs[needId];
          const { anchor } = getCurrentNeedState(state, needId, now);
          const entry: NeedCheckIn = { id: uuidv4(), needId, ts: now, level: clampLevel(level), source };
          const blamed = checkForEffect(state, needId, entry);
          // A gap a recent behaviour may explain says nothing about the decay rate.
          const emptyHours = blamed ? config.emptyHours : learnEmptyHours(config.emptyHours, anchor, entry);
          const learned = emptyHours !== config.emptyHours;
          return {
            checkIns: [...state.checkIns, entry].slice(-MAX_CHECK_INS),
            rateHistory: learned
              ? { ...state.rateHistory, [needId]: appendRate(state.rateHistory[needId], now, emptyHours) }
              : state.rateHistory,
            needs: {
              ...state.needs,
              [needId]: {
                ...config,
                emptyHours,
                learnedFrom: learned ? config.learnedFrom + 1 : config.learnedFrom,
              },
            },
          };
        }),
      updateLevel: (needId, amount, ts) =>
        set(state => {
          const now = ts ?? Date.now();
          const { level } = getCurrentNeedState(state, needId, now);
          const entry: NeedCheckIn = {
            id: uuidv4(),
            needId,
            ts: now,
            level: clampLevel((level ?? NEED_UNKNOWN_START_LEVEL) + amount),
            source: 'update',
            amount,
          };
          return { checkIns: [...state.checkIns, entry].slice(-MAX_CHECK_INS) };
        }),
      removeCheckIn: id => set(state => ({ checkIns: state.checkIns.filter(checkIn => checkIn.id !== id) })),
      setLogAmount: (needId, logId, amount) =>
        set(state => {
          const logAmounts = { ...state.needs[needId].logAmounts };
          if (amount == null) delete logAmounts[logId];
          else logAmounts[logId] = amount;
          return { needs: { ...state.needs, [needId]: { ...state.needs[needId], logAmounts } } };
        }),
      setRefill: (needId, behaviorId, refill) =>
        set(state => {
          const refills = { ...state.needs[needId].refills };
          if (refill) refills[behaviorId] = refill;
          else delete refills[behaviorId];
          return { needs: { ...state.needs, [needId]: { ...state.needs[needId], refills } } };
        }),
      setCategoryRefill: (needId, categoryId, refill) =>
        set(state => {
          const categoryRefills = { ...state.needs[needId].categoryRefills };
          if (refill) categoryRefills[categoryId] = refill;
          else delete categoryRefills[categoryId];
          return { needs: { ...state.needs, [needId]: { ...state.needs[needId], categoryRefills } } };
        }),
      setMetadataSource: (needId, source) =>
        set(state => ({ needs: { ...state.needs, [needId]: { ...state.needs[needId], metadataSource: source } } })),
      setBodyWords: (needId, bodyWords) =>
        set(state => ({ needs: { ...state.needs, [needId]: { ...state.needs[needId], bodyWords } } })),
      setEnabled: (needId, enabled) =>
        set(state => ({ needs: { ...state.needs, [needId]: { ...state.needs[needId], enabled } } })),
      setEmptyHours: (needId, emptyHours) =>
        set(state => {
          const config = state.needs[needId];
          if (config.emptyHours === emptyHours) return state;
          return {
            rateHistory: {
              ...state.rateHistory,
              [needId]: appendRate(state.rateHistory[needId], Date.now(), emptyHours),
            },
            needs: { ...state.needs, [needId]: { ...config, emptyHours, learnedFrom: config.learnedFrom + 1 } },
          };
        }),
      setEffect: (needId, behaviorId, effect) =>
        set(state => {
          const effects = { ...state.needs[needId].effects };
          if (effect) effects[behaviorId] = effect;
          else delete effects[behaviorId];
          return { needs: { ...state.needs, [needId]: { ...state.needs[needId], effects } } };
        }),
      learnEffect: (needId, behaviorId, sample) =>
        set(state => {
          const config = state.needs[needId];
          const effects = { ...config.effects, [behaviorId]: addEffectSample(config.effects?.[behaviorId], sample) };
          return { needs: { ...state.needs, [needId]: { ...config, effects } } };
        }),
      resetLearning: needId =>
        set(state => ({
          rateHistory: {
            ...state.rateHistory,
            [needId]: appendRate(state.rateHistory[needId], Date.now(), DEFAULT_NEED_CONFIGS[needId].emptyHours),
          },
          needs: {
            ...state.needs,
            [needId]: {
              ...state.needs[needId],
              emptyHours: DEFAULT_NEED_CONFIGS[needId].emptyHours,
              learnedFrom: 0,
            },
          },
        })),
    }),
    {
      name: 'recupero-needs',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: persistedState => {
        const state = persistedState as Partial<NeedsStore>;
        syncCustomNeeds(state.customNeeds ?? [], state.emojiOverrides, state.needOrder);
        const needs = withDefaults(state.needs);
        return {
          ...state,
          customNeeds: state.customNeeds ?? [],
          emojiOverrides: state.emojiOverrides ?? {},
          needOrder: state.needOrder ?? [],
          needs,
          checkIns: state.checkIns ?? [],
          rateHistory: withRateHistory(state.rateHistory, needs),
        } as NeedsStore;
      },
      merge: (persisted, current) => {
        const state = persisted as Partial<NeedsStore> | undefined;
        syncCustomNeeds(state?.customNeeds ?? [], state?.emojiOverrides, state?.needOrder);
        const needs = withDefaults(state?.needs);
        return {
          ...current,
          ...state,
          customNeeds: state?.customNeeds ?? [],
          emojiOverrides: state?.emojiOverrides ?? {},
          needOrder: state?.needOrder ?? [],
          needs,
          checkIns: state?.checkIns ?? [],
          rateHistory: withRateHistory(state?.rateHistory, needs),
        };
      },
    },
  ),
);
