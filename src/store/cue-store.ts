import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CueTriggerRule, EnergyLevel, LocationCue, MoodCue } from '../types/cue';

interface CueStore {
  energyLevel: EnergyLevel | null;
  mood: MoodCue | null;
  location: LocationCue | null;
  homeName: string;
  bedtime: string;
  wakeUpTime: string;
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

export const useCueStore = create<CueStore>()(
  persist(
    set => ({
      energyLevel: null,
      mood: null,
      location: null,
      homeName: 'Home',
      bedtime: '22:30',
      wakeUpTime: '07:00',
      triggerRules: [],
      setEnergyLevel: energyLevel => set({ energyLevel }),
      setMood: mood => set({ mood }),
      setLocation: location => set({ location }),
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
