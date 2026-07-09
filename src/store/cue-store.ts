import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CueLogEntry, CueLogType, CueTriggerRule, EnergyLevel, LocationCue, MoodCue } from '../types/cue';

const MAX_CUE_LOGS = 50;

interface CueStore {
  energyLevel: EnergyLevel | null;
  mood: MoodCue | null;
  location: LocationCue | null;
  homeName: string;
  bedtime: string;
  wakeUpTime: string;
  cueLogs: CueLogEntry[];
  triggerRules: CueTriggerRule[];
  setEnergyLevel: (energyLevel: EnergyLevel) => void;
  setMood: (mood: MoodCue) => void;
  setLocation: (location: LocationCue) => void;
  setHomeName: (homeName: string) => void;
  setBedtime: (bedtime: string) => void;
  setWakeUpTime: (wakeUpTime: string) => void;
  addTriggerRule: (input: Pick<CueTriggerRule, 'sourceBehaviorId' | 'targetBehaviorId' | 'delayMinutes'>) => void;
  toggleTriggerRule: (ruleId: string) => void;
  removeTriggerRule: (ruleId: string) => void;
}

function appendCueLog(logs: CueLogEntry[], type: CueLogType, value: string, label: string) {
  return [
    {
      id: uuidv4(),
      type,
      value,
      label,
      timestamp: Date.now(),
    },
    ...logs,
  ].slice(0, MAX_CUE_LOGS);
}

export const useCueStore = create<CueStore>()(
  persist(
    set => ({
      energyLevel: null,
      mood: null,
      location: null,
      homeName: 'Home',
      bedtime: '22:30',
      wakeUpTime: '07:00',
      cueLogs: [],
      triggerRules: [],
      setEnergyLevel: energyLevel =>
        set(state =>
          state.energyLevel === energyLevel
            ? state
            : { energyLevel, cueLogs: appendCueLog(state.cueLogs, 'energy', energyLevel, 'Energy') },
        ),
      setMood: mood =>
        set(state =>
          state.mood === mood ? state : { mood, cueLogs: appendCueLog(state.cueLogs, 'mood', mood, 'Mood') },
        ),
      setLocation: location =>
        set(state =>
          state.location === location
            ? state
            : { location, cueLogs: appendCueLog(state.cueLogs, 'location', location, 'Location') },
        ),
      setHomeName: homeName => set({ homeName }),
      setBedtime: bedtime => set({ bedtime }),
      setWakeUpTime: wakeUpTime => set({ wakeUpTime }),
      addTriggerRule: input =>
        set(state => ({
          triggerRules: [
            ...state.triggerRules,
            {
              id: uuidv4(),
              sourceBehaviorId: input.sourceBehaviorId,
              targetBehaviorId: input.targetBehaviorId,
              delayMinutes: input.delayMinutes,
              enabled: true,
              createdAt: Date.now(),
            },
          ],
        })),
      toggleTriggerRule: ruleId =>
        set(state => ({
          triggerRules: state.triggerRules.map(rule =>
            rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule,
          ),
        })),
      removeTriggerRule: ruleId =>
        set(state => ({
          triggerRules: state.triggerRules.filter(rule => rule.id !== ruleId),
        })),
    }),
    {
      name: 'recupero-cues',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
