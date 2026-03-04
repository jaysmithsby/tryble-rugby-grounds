

## Swipe-to-Dismiss Fixture Cards

### Approach

All fixture cards across the app get swipe-to-dismiss. No toast — dismissed fixtures return on pull-to-refresh (or page reload). The gesture is a left-swipe that slides the card off-screen, then the card animates closed vertically.

### New Component: `SwipeableFixtureCard`

A wrapper using `framer-motion` that wraps any children (the existing `FixtureCard` or `FixtureListCard`). On left-swipe past a threshold (~100px), the card slides off-screen right-to-left, collapses its height, and calls an `onDismiss(id)` callback. The wrapper stops touch event propagation to avoid triggering tab-swipe navigation.

### State Management

Each page that renders fixture cards manages a `dismissedIds: Set<string>` state. Dismissed fixtures are filtered out of the visible list entirely (not moved to bottom — cleaner UX). The set resets when:
- Pull-to-refresh fires (already invalidates queries, we just clear the set in the same callback)
- Filters/date range change
- Page remount

### Files Changed

1. **`src/components/fixtures/SwipeableFixtureCard.tsx`** (new) — framer-motion drag wrapper with `drag="x"`, `dragConstraints`, `onDragEnd` threshold check, exit animation via `AnimatePresence`.

2. **`src/pages/Fixtures.tsx`** — Wrap `FixtureListCard` in `SwipeableFixtureCard`. Add `dismissedIds` state, filter them out of `paginatedMyGroups`. Clear on refresh/filter change.

3. **`src/pages/Home.tsx`** — Wrap the 3 upcoming `FixtureCard`s in `SwipeableFixtureCard`. Add `dismissedIds` state, clear on refresh.

4. **`src/pages/SchoolProfile.tsx`** — Wrap `FixtureCard`s in the upcoming fixtures section. Add `dismissedIds` state.

5. **`src/pages/PoolLeaderboard.tsx`** — Wrap `FixtureCard`s. Add `dismissedIds` state.

6. **`src/pages/Tournament.tsx`** — Wrap `FixtureCard`s. Add `dismissedIds` state.

7. **`src/hooks/useSwipeNavigation.ts`** — Add a check: if the touch originates inside an element with `data-swipeable-card`, skip tab navigation to avoid gesture conflicts.

### SwipeableFixtureCard Sketch

```tsx
<AnimatePresence>
  {!dismissed && (
    <motion.div
      drag="x"
      dragDirectionLock
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.x < -100) onDismiss(id);
      }}
      exit={{ x: -300, height: 0, opacity: 0 }}
      data-swipeable-card
    >
      {children}
    </motion.div>
  )}
</AnimatePresence>
```

Only allows dragging left (constraints keep right at 0). The card snaps back if the swipe isn't far enough. Exit animation collapses the space smoothly.

