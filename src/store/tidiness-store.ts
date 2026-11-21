import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { TidyMark, TidyPlanSize, TidyRect, TidyRoom, TidySpot, TidyWeight } from '../types/tidiness';
import {
  clampPlanSize,
  clampRect,
  daysToHours,
  getFittingPlanSize,
  getNewRoomRect,
  getSpotState,
  learnSpotEmptyHours,
  matchStarterBehaviors,
  TIDY_DEFAULT_PLAN_SIZE,
  TIDY_STARTER_ROOMS,
} from '../utils/tidiness-utils';
import { useBehaviorStore } from './behavior-store';

const MAX_MARKS = 1000;

export interface TidySpotInput {
  roomId: string;
  name: string;
  emoji: string;
  emptyHours: number;
  weight: TidyWeight;
  behaviorIds: string[];
}

export interface TidinessStore {
  rooms: TidyRoom[];
  spots: TidySpot[];
  marks: TidyMark[];
  /** Floor plan width and height in cells. */
  planSize: TidyPlanSize;
  /** Changes the plan size; tiles outside it move in (and shrink if they must). */
  setPlanSize: (size: TidyPlanSize) => void;
  /** Whether the floor plan shows above the room list. */
  showPlan: boolean;
  /** Rooms unfolded in the list. */
  expandedRoomIds: string[];
  setShowPlan: (show: boolean) => void;
  toggleRoomExpanded: (roomId: string) => void;
  addRoom: (input: { name: string; emoji: string }) => string;
  updateRoom: (roomId: string, patch: Partial<Pick<TidyRoom, 'name' | 'emoji'>>) => void;
  /** Deletes the room with its spots and their marks. */
  removeRoom: (roomId: string) => void;
  setRoomRect: (roomId: string, rect: TidyRect) => void;
  /** Adds a spot; `initialLevel` is how it looks right now (a check-in that teaches nothing). */
  addSpot: (input: TidySpotInput, initialLevel?: number) => string;
  updateSpot: (spotId: string, patch: Partial<TidySpotInput>) => void;
  removeSpot: (spotId: string) => void;
  setSpotPin: (spotId: string, pin: { x: number; y: number }) => void;
  /** The ✓: the spot is clean now. */
  markClean: (spotId: string) => void;
  /** "How is it now?": sets the level and teaches how fast the spot gets messy. */
  checkInSpot: (spotId: string, level: number) => void;
  removeMark: (markId: string) => void;
  /** Adds the starter rooms and spots, linking behaviours whose names match. */
  addStarterRooms: (initialLevel: number) => void;
}

export const useTidinessStore = create<TidinessStore>()(
  persist(
    (set, get) => ({
      rooms: [],
      spots: [],
      marks: [],
      planSize: TIDY_DEFAULT_PLAN_SIZE,
      showPlan: true,
      expandedRoomIds: [],
      setPlanSize: size => {
        const planSize = clampPlanSize(size);
        set(state => ({
          planSize,
          rooms: state.rooms.map(room => ({ ...room, rect: clampRect(room.rect, planSize) })),
        }));
      },
      setShowPlan: show => set({ showPlan: show }),
      toggleRoomExpanded: roomId =>
        set(state => ({
          expandedRoomIds: state.expandedRoomIds.includes(roomId)
            ? state.expandedRoomIds.filter(id => id !== roomId)
            : [...state.expandedRoomIds, roomId],
        })),
      addRoom: ({ name, emoji }) => {
        const id = uuidv4();
        set(state => {
          // Grow the plan downward when there is no free row for the new tile.
          const bottom = state.rooms.reduce((max, room) => Math.max(max, room.rect.y + room.rect.h), 0);
          const planSize = clampPlanSize({ ...state.planSize, rows: Math.max(state.planSize.rows, bottom + 3) });
          return {
            planSize,
            rooms: [...state.rooms, { id, name, emoji, rect: getNewRoomRect(state.rooms, planSize) }],
            expandedRoomIds: [...state.expandedRoomIds, id],
          };
        });
        return id;
      },
      updateRoom: (roomId, patch) =>
        set(state => ({ rooms: state.rooms.map(room => (room.id === roomId ? { ...room, ...patch } : room)) })),
      removeRoom: roomId =>
        set(state => {
          const removed = new Set(state.spots.filter(spot => spot.roomId === roomId).map(spot => spot.id));
          return {
            rooms: state.rooms.filter(room => room.id !== roomId),
            spots: state.spots.filter(spot => !removed.has(spot.id)),
            marks: state.marks.filter(mark => !removed.has(mark.spotId)),
            expandedRoomIds: state.expandedRoomIds.filter(id => id !== roomId),
          };
        }),
      setRoomRect: (roomId, rect) =>
        set(state => ({
          rooms: state.rooms.map(room =>
            room.id === roomId ? { ...room, rect: clampRect(rect, state.planSize) } : room,
          ),
        })),
      addSpot: (input, initialLevel) => {
        const id = uuidv4();
        const now = Date.now();
        const spot: TidySpot = { ...input, id, learnedFrom: 0, createdAt: now };
        set(state => ({
          spots: [...state.spots, spot],
          marks:
            initialLevel == null
              ? state.marks
              : [...state.marks, { id: uuidv4(), spotId: id, ts: now, level: initialLevel, checkIn: true }],
        }));
        return id;
      },
      updateSpot: (spotId, patch) =>
        set(state => ({
          spots: state.spots.map(spot =>
            spot.id === spotId
              ? {
                  ...spot,
                  ...patch,
                  // A spot moved to another room goes back to an automatic pin.
                  pin: patch.roomId != null && patch.roomId !== spot.roomId ? undefined : spot.pin,
                }
              : spot,
          ),
        })),
      removeSpot: spotId =>
        set(state => ({
          spots: state.spots.filter(spot => spot.id !== spotId),
          marks: state.marks.filter(mark => mark.spotId !== spotId),
        })),
      setSpotPin: (spotId, pin) =>
        set(state => ({
          spots: state.spots.map(spot =>
            spot.id === spotId
              ? { ...spot, pin: { x: Math.max(0.05, Math.min(0.95, pin.x)), y: Math.max(0.05, Math.min(0.95, pin.y)) } }
              : spot,
          ),
        })),
      markClean: spotId =>
        set(state => ({
          marks: [...state.marks, { id: uuidv4(), spotId, ts: Date.now(), level: 100, checkIn: false }].slice(
            -MAX_MARKS,
          ),
        })),
      checkInSpot: (spotId, level) => {
        const state = get();
        const spot = state.spots.find(item => item.id === spotId);
        if (!spot) return;
        const now = Date.now();
        const { anchor } = getSpotState(spot, state.marks, useBehaviorStore.getState().behaviors, now);
        const emptyHours = learnSpotEmptyHours(spot.emptyHours, anchor, { ts: now, level });
        const learned = emptyHours !== spot.emptyHours;
        set({
          spots: state.spots.map(item =>
            item.id === spotId
              ? { ...item, emptyHours, learnedFrom: learned ? item.learnedFrom + 1 : item.learnedFrom }
              : item,
          ),
          marks: [...state.marks, { id: uuidv4(), spotId, ts: now, level, checkIn: true }].slice(-MAX_MARKS),
        });
      },
      removeMark: markId => set(state => ({ marks: state.marks.filter(mark => mark.id !== markId) })),
      addStarterRooms: initialLevel => {
        const now = Date.now();
        const behaviors = useBehaviorStore.getState().behaviors;
        const rooms: TidyRoom[] = [];
        const spots: TidySpot[] = [];
        const marks: TidyMark[] = [];
        for (const starter of TIDY_STARTER_ROOMS) {
          const roomId = uuidv4();
          rooms.push({ id: roomId, name: starter.name, emoji: starter.emoji, rect: starter.rect });
          for (const item of starter.spots) {
            const spotId = uuidv4();
            spots.push({
              id: spotId,
              roomId,
              name: item.name,
              emoji: item.emoji,
              emptyHours: daysToHours(item.days),
              weight: item.weight,
              behaviorIds: matchStarterBehaviors(item, behaviors),
              learnedFrom: 0,
              createdAt: now,
            });
            marks.push({ id: uuidv4(), spotId, ts: now, level: initialLevel, checkIn: true });
          }
        }
        set(state => ({
          rooms: [...state.rooms, ...rooms],
          planSize: getFittingPlanSize([...state.rooms, ...rooms], state.planSize),
          spots: [...state.spots, ...spots],
          marks: [...state.marks, ...marks],
        }));
      },
    }),
    {
      name: 'recupero-tidiness',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      merge: (persisted, current) => {
        const state = persisted as Partial<TidinessStore> | undefined;
        const rooms = state?.rooms ?? [];
        return {
          ...current,
          ...state,
          rooms,
          planSize: state?.planSize ? clampPlanSize(state.planSize) : getFittingPlanSize(rooms),
          spots: state?.spots ?? [],
          marks: state?.marks ?? [],
          expandedRoomIds: state?.expandedRoomIds ?? [],
        };
      },
    },
  ),
);
