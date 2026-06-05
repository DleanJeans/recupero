# Home: Sort by last done

> **Draft Issue:** [Recupero Project Board](https://github.com/users/DleanJeans/projects/4) — "Home: Sort by last done" (Backlog, QOL)
>
> Sort behaviors on the home screen so the ones you interacted with most recently appear first.

---

## Quick Path

1. Sort the behaviors array by `lastTimestamp` descending before rendering in the FlatList.
2. Behaviors with `lastTimestamp === null` (never logged) sink to the bottom.
3. Use `useMemo` to avoid re-sorting on every render.

---

## Motivation

The home screen currently displays behaviors in creation order (oldest first). As the list grows, recently-active behaviors get buried and the user has to scroll to log them again. Sorting by "last done" puts the most relevant behaviors at the top — the ones you just used or are most likely to use again.

---

## Current Behavior

- `HomeScreen` renders `behaviors` directly from `useBehaviorStore()` in store order (insertion order).
- `BehaviorCard` shows `formatElapsed(behavior.lastTimestamp)` — correctly reflects recency, but the card position doesn't.
- A behavior you just logged stays at its original position.

## Desired Behavior

```
[Top]  🏃 Running      — 2m ago      ← most recent
       💧 Water         — 1h ago
       📖 Journal       — Yesterday
       💪 Push-ups      — 3d ago
       🧘 Meditation    — Never       ← never logged, at bottom
[Bottom]
```

- Behaviors sorted by `lastTimestamp` descending (most recent first).
- Null timestamps treated as lowest priority (sorted to the end).
- Secondary sort: by name alphabetically for identical timestamps (stable tiebreaker).

---

## Implementation

### Changes

| File | Change |
|------|--------|
| `src/screens/HomeScreen.tsx` | Add a `useMemo` that sorts behaviors before passing to FlatList |

### Sort Logic

```typescript
const sortedBehaviors = useMemo(() => {
  return [...behaviors].sort((a, b) => {
    // Null timestamps go to the bottom
    if (a.lastTimestamp === null && b.lastTimestamp === null) return 0;
    if (a.lastTimestamp === null) return 1;
    if (b.lastTimestamp === null) return -1;
    // Descending by timestamp (most recent first)
    const diff = b.lastTimestamp - a.lastTimestamp;
    if (diff !== 0) return diff;
    // Stable tiebreaker: alphabetical by name
    return a.name.localeCompare(b.name);
  });
}, [behaviors]);
```

**Notes:**
- `[...behaviors].sort(...)` creates a copy — Zustand's `behaviors` is frozen in strict mode, and mutating it would break other consumers.
- `useMemo` prevents re-sort on unrelated re-renders.

### No Changes Needed

| File | Reason |
|------|--------|
| `src/store/behaviorStore.ts` | Sorting is a display concern, not store logic |
| `src/types/behavior.ts` | No model changes |
| `src/components/BehaviorCard.tsx` | Only renders what it receives; no change needed |

---

## Related Draft

The project board also has **"Home: Show less generic time ago"** (Backlog, QOL) with the body:

```
- <24h → Today
- Yesterday
- 1h ago
- Last week
- Last month
```

That's a complementary change to `formatElapsed` in `src/utils/timeUtils.ts`. The sorting in this spec works independently — they can be implemented in either order or together.

---

## Scope Boundaries

| Out of scope | Rationale |
|---|---|
| Manual reordering (drag to reorder) | Separate feature, larger scope |
| Sort by name / by creation date | Can be added as options later; this is the most useful default |
| Filtering or search | Not requested |
| Section headers ("Today", "Yesterday") | Related to the time-ago draft, not this sort change |
| Animation on sort | Plain re-render is fine for now; added complexity not justified |

---

## Verification

- [ ] Creating a new behavior places it at the bottom (null timestamp)
- [ ] Logging a behavior moves it to the top
- [ ] Behaviors with identical timestamps are tied by name alphabetically
- [ ] Behaviors with `null lastTimestamp` appear at the bottom
- [ ] No errors or warnings in TypeScript
- [ ] Biome format/lint passes (`pnpm biome check --apply`)
