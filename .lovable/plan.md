

## Fix: Predictions Not Persisting on Home Screen Refresh

### Root Cause

The Home page stores predictions in **local React state** only (`useState`). When you make a prediction, it saves to the database AND updates local state -- so it looks correct. But on refresh, the local state resets to empty and no code fetches existing predictions from the database. So every fixture shows "Pick needed" again.

### Solution

Add a query to fetch the user's existing predictions for the displayed fixtures, and merge them with any new predictions made in the current session.

### Changes

**`src/hooks/useHomeFixtures.ts`**:

1. Add a new React Query that fetches predictions from the `predictions` table for the current user and the fixture IDs returned by the upcoming fixtures query
2. Return a `predictionsMap` (keyed by fixture ID) containing `team`, `margin`, and `schoolId` -- matching the shape Home.tsx already expects
3. The query will select `fixture_id, predicted_team, predicted_margin, predicted_school_id` from `predictions` where `user_id` matches and `fixture_id` is in the list of upcoming fixture IDs

**`src/pages/Home.tsx`**:

1. Consume the new `predictionsMap` from `useHomeFixtures`
2. Merge DB predictions with local state predictions (local state takes priority so newly-made predictions show immediately)
3. Use the merged map when passing `isPredicted`, `predictedTeam`, and `predictedMargin` to `FixtureCard`
4. This applies to both the "Upcoming Matches" section and the "Your School's Fixture" section

### Technical Details

The predictions query follows the same pattern already used in `useFixturesData.ts`:

```text
SELECT fixture_id, predicted_team, predicted_margin, predicted_school_id
FROM predictions
WHERE user_id = :userId AND fixture_id IN (:fixtureIds)
```

The query is enabled only when the user is logged in and fixtures have loaded. It uses `CACHE_TIMES.DYNAMIC` (2 minutes) for staleness, consistent with fixture data.

