# Behavior: Add Cooldown

> **Draft Issue:** [Recupero Project Board](https://github.com/users/DleanJeans/projects/4) — "Behavior: Add Cooldown" (Backlog)
>
> Add a cooldown field to behaviors — a minimum interval between logs, set per behavior.

---

## Quick Path

1. Add `cooldownMinutes: number` to `BehaviorEntry`.
2. Add `updateBehaviorCooldown` action to the store.
3. Build a simple number + unit dropdown for setting cooldown.
4. Integrate into `AddBehaviorForm` and `BehaviorDetailsScreen`.

---

## Motivation

Recupero is named after cooldown / recovery. Behaviors like "Cold shower" or "Hard workout" need a rest period. A cooldown tells the app "wait X before logging again" — the draft describes the two main surfaces: setting it on creation, and viewing/editing it in details.

---

## Data Model

### BehaviorEntry (`src/types/behavior.ts`)

```typescript
export interface BehaviorEntry {
  id: string;
  name: string;
  icon?: string | { uri: string };
  lastTimestamp: number | null;
  metadata: Record<string, string | number>;  // unchanged
  logs: LogEntry[];
  /** NEW: Cooldown in minutes. 0 means no cooldown. */
  cooldownMinutes: number;
}
```

Defaults to `0` (no cooldown) when creating a behavior.

### Store (`src/store/behaviorStore.ts`)

**New action:**

```typescript
updateBehaviorCooldown: (behaviorId: string, cooldownMinutes: number) => void;
```

**Changes to `addBehavior`:** Accept optional `cooldownMinutes` param, default `0`.

No migration needed — `cooldownMinutes` will be `undefined` on existing data, handled by defaulting to `0` at read time.

---

## UI

### CooldownInput — Number + dropdown

```
┌──────────────────────────────────────┐
│  [ 30  ]  [ minutes ▼ ]             │
└──────────────────────────────────────┘
```

- **Number input**: numeric keyboard, min 0, max 9999.
- **Unit dropdown**: `minutes` | `hours` | `days` | `weeks`.
- Internally converts to minutes for storage.
- When value is 0, show "No cooldown" as placeholder.

### formatCooldown utility (`src/utils/timeUtils.ts`)

```typescript
export function formatCooldown(totalMinutes: number): string {
  if (totalMinutes <= 0) return 'No cooldown';
  if (totalMinutes < 60) return `${totalMinutes} min`;
  if (totalMinutes < 24 * 60) return `${Math.floor(totalMinutes / 60)} hr${totalMinutes >= 120 ? 's' : ''}`;
  if (totalMinutes < 7 * 24 * 60) return `${Math.floor(totalMinutes / (24 * 60))} day${totalMinutes >= 2 * 24 * 60 ? 's' : ''}`;
  return `${Math.floor(totalMinutes / (7 * 24 * 60))} wk`;
}
```

---

## Integration Points

### AddBehaviorForm

Add a collapsible "Cooldown" section below the name row:

```
[🏃] [Behavior name _______]     [Cancel] [Add]

Cooldown (optional)  ▼
  [ 30  ]  [ minutes ▼ ]
```

- Collapsed by default.
- When expanded, shows `CooldownInput`.
- State lifted to `HomeScreen` and passed as prop.

### BehaviorDetailsScreen

```
┌──────────────────────────────────────┐
│  ← 💪 Push-ups                       │
│  Cooldown: 30 min          [✏️ Edit] │
│                                      │
│  (edit mode)                         │
│  [ 45  ]  [ minutes ▼ ]             │
│                     [Cancel] [Save]  │
│                                      │
│  ── Logs ──                          │
│  ...                                 │
└──────────────────────────────────────┘
```

- Cooldown line always visible under the title.
- Edit button toggles inline `CooldownInput`.
- Save calls `updateBehaviorCooldown`.
- Cancel reverts to previous value.

---

## Scope Boundaries

| Out of scope | Rationale |
|---|---|
| Cooldown enforcement (warning when logging early) | Follow-up once field exists |
| Remaining cooldown on home card | Follow-up |
| Metadata fields (reps, weight, notes) | Separate from cooldown |
| Migrating PR #6 metadata | Not applicable — ignoring PR #6 |

---

## Implementation Plan

| Step | File | What |
|------|------|------|
| 1 | `src/types/behavior.ts` | Add `cooldownMinutes: number` |
| 2 | `src/store/behaviorStore.ts` | Add `updateBehaviorCooldown`, update `addBehavior` |
| 3 | `src/utils/timeUtils.ts` | Add `formatCooldown` |
| 4 | `src/components/CooldownInput.tsx` | New component |
| 5 | `src/components/AddBehaviorForm.tsx` | Integrate CooldownInput |
| 6 | `src/screens/HomeScreen.tsx` | Wire cooldown state |
| 7 | `src/screens/BehaviorDetailsScreen.tsx` | Show cooldown under title, edit toggle |

---

## Verification

- [ ] Creating a behavior with cooldown persists and loads correctly
- [ ] Creating a behavior without setting cooldown defaults to 0
- [ ] BehaviorDetails shows cooldown under the title
- [ ] Edit toggle switches to CooldownInput and saves correctly
- [ ] `formatCooldown` renders correct labels (min, hr, days, wk)
- [ ] Existing behaviors without `cooldownMinutes` don't crash (default to 0)
- [ ] TypeScript compiles with no errors
- [ ] Biome format/lint passes
