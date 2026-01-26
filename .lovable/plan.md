
# Plan: Fix Personalized Home Screen Fixtures Feed

## Problem Summary
Users who have created pools with schools (including St John's College, St Alban's College, and others with 2026 fixtures loaded) are seeing "No upcoming matches for your pools" despite verified fixture data existing in the database.

## Root Cause Analysis

After extensive investigation, I've identified **two primary issues**:

### Issue 1: Stale Closure in `fetchFixtures` Function
The `fetchFixtures` function is defined inside the component and captures `effectiveDate`, `seasonYear`, and `weekendRange` from the hook closure. When the useEffect callbacks run (on auth state change), the function may capture stale values because:

1. The SimulationContext loads state from localStorage via a `useEffect` that runs AFTER the initial render
2. The Home component's `useEffect` also runs after initial render, potentially before the context is fully initialized
3. The `fetchFixtures` function is not memoized with `useCallback` and its dependencies

### Issue 2: Missing useCallback and Dependency Array Issues
The `fetchFixtures` function uses `effectiveDate`, `seasonYear`, and `weekendRange` but these are not properly tracked as dependencies. The second useEffect (lines 296-300) has `[effectiveDate, seasonYear]` as dependencies but the function itself isn't memoized.

## Proposed Solution

### Step 1: Refactor `fetchFixtures` with `useCallback`
Wrap the `fetchFixtures` function in `useCallback` with proper dependencies to ensure it always uses the latest values:

```typescript
const fetchFixtures = useCallback(async (userId: string, schoolName?: string | null) => {
  setFixturesLoading(true);
  try {
    const now = effectiveDate.toISOString();
    // ... rest of function
  }
}, [effectiveDate, seasonYear, weekendRange]);
```

### Step 2: Add Console Logging for Debugging
Add strategic console.log statements to trace the data flow:
- Log `seasonYear` and `effectiveDate` when query is executed
- Log `poolSchoolNames` after fetching from pools
- Log `poolSchoolIds` after looking up school IDs
- Log `allUpcoming.length` after base fixtures query
- Log `filteredUpcoming.length` after filtering

### Step 3: Update useEffect Dependencies
Ensure both useEffects that call `fetchFixtures` have proper dependencies:
- Add `fetchFixtures` to the dependency arrays
- This will cause the function to be called when its dependencies change

### Step 4: Add a Loading State Check
Add a check to delay initial fixture fetching until the SimulationContext has loaded from localStorage (if in simulation mode):

```typescript
const [contextReady, setContextReady] = useState(false);

useEffect(() => {
  // Mark context as ready after first render
  setContextReady(true);
}, []);

// Only fetch when context is ready
useEffect(() => {
  if (contextReady && user) {
    fetchFixtures(user.id, userSchoolName);
  }
}, [contextReady, effectiveDate, seasonYear, fetchFixtures]);
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Home.tsx` | Refactor `fetchFixtures` with `useCallback`, fix dependency arrays, add logging |

## Technical Details

### Current Code Structure (Problem)
```typescript
const { effectiveDate, weekendRange, seasonYear } = useEffectiveDate();

// Function captures closure values at definition time
const fetchFixtures = async (userId: string, schoolName?: string | null) => {
  const now = effectiveDate.toISOString(); // May be stale!
  // ...
  .eq("year", seasonYear) // May be stale!
};

useEffect(() => {
  // This runs immediately after mount
  supabase.auth.getUser().then(({ data: { user } }) => {
    // fetchFixtures called with potentially stale seasonYear
    fetchFixtures(user.id, schoolName);
  });
}, [navigate]); // Missing dependencies!
```

### Fixed Code Structure
```typescript
const { effectiveDate, weekendRange, seasonYear } = useEffectiveDate();

// Memoized function with proper dependencies
const fetchFixtures = useCallback(async (userId: string, schoolName?: string | null) => {
  console.log('[Debug] fetchFixtures called with seasonYear:', seasonYear);
  const now = effectiveDate.toISOString();
  // ...
  .eq("year", seasonYear)
}, [effectiveDate, seasonYear, weekendRange]);

useEffect(() => {
  supabase.auth.getUser().then(({ data: { user } }) => {
    fetchFixtures(user.id, schoolName);
  });
}, [navigate, fetchFixtures]); // Now includes fetchFixtures
```

## Expected Outcome
After these changes:
1. The fixtures query will always use the correct `seasonYear` (2026)
2. The `match_date >= now` filter will use the correct current date
3. Fixtures for schools in the user's pools will display correctly on the Home screen

## Verification Steps
1. Log in as a user with pools containing schools that have 2026 fixtures
2. Verify fixtures appear in the "Upcoming Fixtures" section
3. Check browser console for debug logs confirming correct `seasonYear` (2026)
4. Verify the fixture count matches expected results from database queries
