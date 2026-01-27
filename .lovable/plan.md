
# Plan: Fix Home Screen Infinite Re-render Loop

## Problem Summary

The home screen is experiencing continuous flickering and "jumping" between loading and loaded states. For a split second, fixtures appear correctly, then the UI resets to "Loading fixtures..." repeatedly.

## Root Cause Analysis

The issue stems from **unstable Date object references** in the SimulationContext:

### The Core Problem

In `SimulationContext.tsx`, line 65-67:

```typescript
const getEffectiveDate = () => {
  return isSimulationMode ? simulatedDate : new Date();
};
```

When **NOT** in simulation mode (which is the normal case for regular users), this function returns `new Date()` on every call. Since `Date` objects are compared by reference (not value), this creates a new object every time the function is called.

### The Cascade Effect

1. `Home.tsx` calls `useEffectiveDate()` which calls `simulation.getEffectiveDate()`
2. A new Date object is created → `effectiveDate` is a new reference
3. `fetchFixtures` depends on `effectiveDate.getTime()` but since it's called within `useCallback`, it captures the closure
4. `HomeCarousel.tsx` also calls `useEffectiveDate()` and uses `weekendRange.start` and `weekendRange.end` as dependencies
5. Every render creates new Date objects → dependencies change → callbacks recreate → useEffects fire → data fetches → state updates → re-render → LOOP

## Solution

### Step 1: Stabilize the Date in SimulationContext

Store the "current date" as state and only update it when necessary (e.g., every minute for non-simulation mode, or when simulation state changes):

```typescript
// Add a stable current date that updates periodically, not on every render
const [stableCurrentDate, setStableCurrentDate] = useState(() => new Date());

// Update the current date every minute (not every render)
useEffect(() => {
  if (!isSimulationMode) {
    const interval = setInterval(() => {
      setStableCurrentDate(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }
}, [isSimulationMode]);

const getEffectiveDate = () => {
  return isSimulationMode ? simulatedDate : stableCurrentDate;
};
```

### Step 2: Memoize the effectiveDate in useEffectiveDate Hook

Add memoization to ensure stable references:

```typescript
export function useEffectiveDate() {
  const simulation = useSimulation();
  
  // The effectiveDate is now stable from the context
  const effectiveDate = simulation.getEffectiveDate();
  
  // Use useMemo to create stable derived values
  const dateTimestamp = effectiveDate.getTime();
  
  const weekNumber = useMemo(() => 
    getWeek(effectiveDate, { weekStartsOn: 1 }), 
    [dateTimestamp]
  );
  
  const seasonYear = useMemo(() => 
    getYear(effectiveDate), 
    [dateTimestamp]
  );
  
  // weekendRange already memoized
  const weekendRange = useMemo(() => {
    return simulation.getWeekendRange();
  }, [dateTimestamp]);
  
  // ... rest
}
```

### Step 3: Simplify useCallback Dependencies in Home.tsx

Use stable primitive values instead of objects:

```typescript
const { effectiveDate, weekendRange, seasonYear } = useEffectiveDate();

// Store timestamps as stable references
const effectiveDateTimestamp = effectiveDate.getTime();
const weekendStartTimestamp = weekendRange.start.getTime();

const fetchFixtures = useCallback(async (userId: string, schoolName?: string | null) => {
  // Use the timestamps to create dates inside the function
  const now = new Date(effectiveDateTimestamp).toISOString();
  // ...
}, [effectiveDateTimestamp, seasonYear, weekendStartTimestamp]);
```

### Step 4: Fix HomeCarousel.tsx Similarly

Apply the same pattern to prevent its re-render loop:

```typescript
const { weekendRange } = useEffectiveDate();

// Store stable timestamp references
const startTimestamp = weekendRange.start.getTime();
const endTimestamp = weekendRange.end.getTime();

const fetchCarouselData = useCallback(async () => {
  const start = new Date(startTimestamp);
  const end = new Date(endTimestamp);
  // ...
}, [startTimestamp, endTimestamp]);
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/SimulationContext.tsx` | Add stable current date state with periodic updates |
| `src/hooks/useEffectiveDate.ts` | Memoize all derived values using the stable date |
| `src/pages/Home.tsx` | Use timestamp primitives for stable dependencies |
| `src/components/home/HomeCarousel.tsx` | Use timestamp primitives for stable dependencies |

## Technical Details

### Before (Broken)

```text
Render 1: getEffectiveDate() → new Date() @ 12:00:00.001
  ↓ effectiveDate changes → fetchFixtures recreates
  ↓ useEffect fires → setFixturesLoading(true)
  ↓ Re-render triggered

Render 2: getEffectiveDate() → new Date() @ 12:00:00.050  
  ↓ effectiveDate changes → fetchFixtures recreates AGAIN
  ↓ useEffect fires → infinite loop
```

### After (Fixed)

```text
Initial: stableCurrentDate = new Date() @ 12:00:00.001

Render 1: getEffectiveDate() → stableCurrentDate (same reference)
  ↓ effectiveDate stable → fetchFixtures stays same
  ↓ useEffect doesn't fire unnecessarily

Render 2: getEffectiveDate() → stableCurrentDate (same reference)
  ↓ No change → no re-render cascade

After 60 seconds: setStableCurrentDate(new Date())
  ↓ Single controlled re-render
```

## Expected Outcome

After these changes:
1. The home screen will load fixtures once and display them stably
2. No more flickering or "jumping" between loading and loaded states
3. The date will still update periodically (every minute) for freshness
4. Simulation mode will continue to work correctly with manual date changes
5. All existing functionality preserved

## Verification Steps

1. Load the home page and verify fixtures appear without flickering
2. Verify the page doesn't continuously reload or show "Loading..."
3. Test simulation mode still works correctly in admin
4. Verify the live site at trybal.co.za works correctly
