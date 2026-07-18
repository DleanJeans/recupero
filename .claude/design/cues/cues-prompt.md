# Codex task: build the **Cues** feature (location / time / habit / mood triggers)

## Repo
Recupero — **Expo ~55 / React Native 0.83 / TypeScript**, state in **Zustand + `persist` (AsyncStorage)**,
navigation via **@react-navigation/native-stack**. Read `AGENTS.md` before coding and follow it.

## What this feature is
A **cue** is a rule **trigger → suggested behaviour(s)**: when a condition fires (you enter/leave a
place, a time/pattern hits, you log a habit, or you log a mood) the app nudges you to log one or
more behaviours. Four trigger types: **location, time, habit, mood.**

## Design source (must be handed over with this prompt)
The mocks are **not in this repo** — they live in the sibling design project. Attach these three
files; build from the markup, not screenshots (Codex reproduces UI far better from HTML+CSS):
- `Recupero App.dc.html` — every Cues screen is a static mock inside a `.opt` block. Find by id:
  `#cues-list`, `#cues-form`, `#cue-time`, `#cue-time-auto`, `#cue-habit`, `#cue-mood`,
  `#act-day`, `#loc-list`, `#loc-add`, `#mood-log`.
- `app.css` + `app2.css` — Cues styles start at `/* ===== Cues ===== */` in `app2.css`.
- Screenshots (`screenshots/cues-*.png`, `time-auto.png`) are an optional visual gut-check only.

**Styling note — reconcile two palettes.** The mocks use a refreshed dark theme
(`--bg:#0c0c0e --surface:#161619 --green:#3ddc84 …`); the shipped app uses `src/utils/colors.ts`
(`bg.primary:#121212`, `bg.card:#1e1e1e`, etc.) and the existing `Button`/`Text`/`SafeAreaView`
components. **Match the existing app** — port the mock *layouts and interactions* but express colours,
type, and controls through `Colors` and the current components so Cues sits consistently with Home/Day.
Keep the mocks' per-trigger accent hues (they have no equivalent in `Colors` yet — add them):
Location `#5aa9f0`, Time → `Colors.star.filled`/gold, Habit → `Colors.type.desirable`, Mood `#b98cf0`.
Primary CTA = existing `<Button variant="primary">` (white pill, dark text). Icon buttons use
`variant="icon"`.

## New dependencies (NOT currently installed — call this out to the user before adding)
The repo has **no** location, maps, or notifications libraries. Real triggers need:
- `expo-location` — geofencing + foreground/background position for location & time-auto (wake-up).
- `expo-notifications` — local notifications for the nudge.
- `expo-task-manager` — background geofence/location tasks.
- A map view for `#loc-add`/`#loc-list`: `react-native-maps` (needs a config plugin + API key) OR
  render the geofence on a static tile — **ask the user which** before wiring the SDK; until then the
  mock's `.map`/`.mapgrid` placeholder is fine and the radius slider can still drive `radiusM`.

Add these to `package.json`, run through `expo install`, update `pnpm-lock.yaml` (AGENTS rule 3),
and add the required `app.config.ts` plugins/permissions (location background modes,
notification permissions). If the user wants a **UI-only first pass**, stub the engine
(see "Phased delivery") and skip the native deps for now.

## Data model
Create a **new store** `src/store/cues-store.ts` following the exact `behavior-store.ts` pattern
(`create<CuesStore>()(persist(…, { name:'recupero-cues', storage: createJSONStorage(()=>AsyncStorage),
version: 1, migrate }))`, ids via `uuidv4()`). **Do not** overload `behavior-store`. Types go in a new
`src/types/cue.ts`. Reference existing behaviours/categories by id from `useBehaviorStore`.

```ts
// src/types/cue.ts
export type CueTriggerType = 'location' | 'time' | 'habit' | 'mood';
export type MoodId = 'great' | 'good' | 'okay' | 'stressed' | 'low' | 'tired';

export interface Cue {
  id: string;
  enabled: boolean;
  name?: string;
  trigger: CueTrigger;
  conditions?: CueTrigger[];          // extra conditions
  combiner?: 'AND' | 'OR';            // when conditions.length > 0
  behaviorIds: string[];              // suggested behaviours (BehaviorEntry.id)
  notify: { push: boolean };
}
export type CueTrigger =
  | { type: 'location'; placeId: string; direction: 'enter' | 'exit' }
  | { type: 'time'; mode: 'simple'; at: string /* 'HH:MM' */; repeatDays: number[] /* 0..6 */ }
  | { type: 'time'; mode: 'auto'; pattern: 'wakeup' } 
  | { type: 'time'; mode: 'auto'; pattern: 'afterBehavior'; behaviorId: string; delayMin: number }
  | { type: 'habit'; behaviorId: string; delayMin?: number }
  | { type: 'mood'; moods: MoodId[] };

export interface SavedPlace {
  id: string; name: string; address?: string;
  lat: number; lng: number; radiusM: number; isHome: boolean;
}
export interface MoodLog { id: string; mood: MoodId; note?: string; ts: number; }
export interface CueActivityEvent {
  id: string; kind: 'enter' | 'exit' | 'mood';
  placeId?: string; mood?: MoodId; ts: number;
}
```
Store holds: `cues[]`, `places[]`, `moodLogs[]`, `activity[]`, plus CRUD + `toggleCue(id)`,
`logMood(mood, note?)`, `addActivityEvent(...)`. Moods = the fixed six in `#mood-log`.

## Screens (one component per file — AGENTS rule 1)
Add each as a folder under `src/screens/` with `index.tsx` (+ a local `components/` dir), mirroring
`day-screen`/`home-screen`. Reuse `SafeAreaView`, `ScreenTitle`, `MoneyBalance`, `Button`, `Text`,
`date-navigation-row`, `date-picker`. Read/write stores directly (AGENTS rule 7 — minimize prop drilling).

1. **CuesScreen** (`#cues-list`) — hub. Two `.quicktile` shortcuts (Saved places → count; Mood →
   current mood). Rules grouped by trigger type; each `.cuecard` = accent icon + "cue → behaviour",
   AND/OR chip for combined triggers, `AUTO` tag for auto time, and an enable toggle. Live activity
   log preview + primary "New cue" CTA.
2. **CueFormScreen** (`#cues-form` + `#cue-time`/`#cue-time-auto`/`#cue-habit`/`#cue-mood`) — **one**
   screen. A 2×2 `.typegrid` trigger-type picker swaps in that type's condition editor. Conditions
   stack with an AND/OR `.combiner` chip. Behaviour multi-picker (from `useBehaviorStore`). Notify
   toggle. Save writes a `Cue`. Editors:
   - **Location**: enter/exit + saved place, or drop a new geofence (→ LocationEditScreen).
   - **Time**: Simple/Auto segmented toggle. Simple = `@react-native-community/datetimepicker`
     (already a dep) + repeat-days. Auto = `.autoopt` list: Wake-up, or "N min after a behaviour".
   - **Habit**: trigger behaviour + optional delay → behaviours to suggest.
   - **Mood**: multi-select `.moodchip` → behaviours to suggest.
3. **CueActivityScreen** (`#act-day`) — full location+mood history grouped by day, paged with the
   shared `date-navigation-row`/`date-picker`. Each `.actrow`: dot + Entered/Left place or mood + time.
4. **SavedPlacesScreen** (`#loc-list`) — Home pinned top (`.locitem.home`, `HOME` tag); others show
   name/address/radius; tap → edit.
5. **LocationEditScreen** (`#loc-add`) — search + map with draggable pin + geofence radius slider
   (`.radiusrow`/`.slider`) + name + Home toggle. Persists `lat/lng/radiusM` to a `SavedPlace`.
6. **MoodLogScreen** (`#mood-log`) — 3-col `.moodgrid`; tapping logs a `MoodLog` immediately and
   surfaces that mood's cue-suggested behaviours (`.suggest`) + optional note.

## Navigation wiring
- Add routes to `RootStackParamList` in `src/types/navigation.ts`:
  `Cues: undefined; CueForm: { cueId?: string } | undefined; CueActivity: undefined;
  SavedPlaces: undefined; LocationEdit: { placeId?: string } | undefined; MoodLog: undefined;`
- Register each `<Stack.Screen>` in `App.tsx` and add the deep-link paths in `linking.config.screens`.
- Add the entry point to Cues (the mocks assume a hub link — put it wherever the user wants; likely
  Settings or the Home header). Cues screens are **not** bottom-nav routes; leave `BOTTOM_NAV_ROUTES`
  unchanged unless the user asks.

## Engine (utils, gated behind enabled cues)
Put logic in `src/utils/` (AGENTS rule 4), e.g. `cue-engine.ts`:
- **Geofence**: register enter/exit regions (`expo-location` + `expo-task-manager`) for every place
  used by an **enabled** location cue; on transition write a `CueActivityEvent` and fire matching cues.
- **Time · simple**: schedule local notifications for `at` on `repeatDays`.
- **Time · auto**: "wakeup" = first significant activity after a long morning idle window;
  "afterBehavior" = schedule `delayMin` after that behaviour logs.
- **Habit/Mood**: on a behaviour log (`logBehavior`) or `logMood`, evaluate matching enabled cues.
- Multi-condition cues respect `combiner` (AND = all within a short window; OR = any).
- Toggling a cue off stops its monitoring.

## Conventions checklist (AGENTS.md)
- One React component per file; extra Pure/Stateless components in-file OK.
- Utils in `src/utils`, not components. Read/write stores directly.
- Keep `behavior-store` backward-compatible (you're adding a separate store, so no migration risk
  there — but if you touch it, add a version bump + `migrate`).
- Icon buttons: `<Button variant="icon">`. Text via the `Text` component.
- After coding: `pnpm format:imports <touched files>` then `pnpm format:changed`.
- Don't commit `package-lock.json`; update `pnpm-lock.yaml` if deps change.

## Phased delivery (recommended)
1. **UI + store, no native deps** — all six screens render from `Colors`/existing components, full
   CRUD to `cues-store`, mood logging + manual activity events work, map is the placeholder, radius
   slider stores `radiusM`. Fully testable in-app.
2. **Engine + native deps** — add `expo-location`/`expo-notifications`/`expo-task-manager`
   (+ maps decision), config plugins/permissions, real geofencing, scheduling, and nudges.
Ship phase 1 first for design review; get the user's go-ahead on dependencies before phase 2.

## Acceptance
- Six screens render consistently with the existing app (Colors + components), per-trigger accents
  correct, primary CTA is the white `Button variant="primary"`.
- Each of the four cue types persists a valid `Cue` in `cues-store`; toggle enable/disable works.
- Saved places persist with a working radius; Home pins to top.
- Location enter/exit + mood logs append to activity; `#act-day` pages with the shared date picker.
- Logging a mood surfaces its suggested behaviours.
- No TS/biome errors; `pnpm test:unit` passes; no console errors.

## Out of scope
- Redesigning non-Cues screens or migrating the whole app to the mock palette.
- Server-side push infra beyond local notifications.
