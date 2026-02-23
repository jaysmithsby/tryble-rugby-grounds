

# Streamlined Brags Scoring System

## Overview

Replace the current two-step scoring flow (manual RPC + rollup into `user_scores`) with a single source of truth: the `predictions` table. All leaderboard data will be derived live from `predictions` joined with `fixtures`, eliminating sync issues entirely.

---

## 1. Database Migration

### Create: Auto-Scoring Trigger

A trigger on the `fixtures` table that fires whenever `score_a` or `score_b` is updated. It automatically runs the brags calculation for all predictions on that fixture -- no admin button press needed for point calculation.

**Brags rules (unchanged):**
- Correct winner: 4 brags
- Correct winner + within 7 margin: 5 brags
- Correct winner + exact margin: 6 brags
- Wrong winner + within 7 margin: 1 brag
- Wrong winner + far off: 0 brags

### Create: `get_leaderboard_stats` RPC

A `SECURITY DEFINER` function that aggregates directly from `predictions` joined with `fixtures`:

```
Returns per user:
  - user_id
  - total_brags (SUM of points_earned)
  - picks_made (COUNT of scored predictions)
  - picks_correct (COUNT where points_earned >= 4)
  - avg_efficiency (total_brags / picks_made)
```

Parameters: `p_season_year` (integer), optional `p_school_id` (uuid, for school-scoped leaderboards).

Sorting: total_brags DESC, avg_efficiency DESC, picks_correct DESC.

### Create: `get_user_season_stats` RPC

A lightweight function for the Profile/Pools pages to get a single user's stats:

```
Returns:
  - total_brags
  - picks_made
  - picks_correct
  - accuracy_pct
  - global_rank (via window function)
  - school_rank (via window function)
```

### Drop Tables

Remove `user_scores` and `school_scores` after all frontend references are migrated.

### Keep Existing

The `calculate_prediction_points` RPC stays (used by the trigger internally and as manual admin fallback). The `rollup_week_scores` and `process_fixtures_in_range` RPCs can be dropped since the trigger handles scoring and the RPC handles aggregation.

---

## 2. Frontend Changes

### LeaderboardDetail.tsx

- Replace `user_scores` query with call to `get_leaderboard_stats` RPC
- Remove deduplication logic (RPC returns one row per user)
- Feed efficiency values from RPC directly into BoxWhiskerChart
- Keep season selector and pagination unchanged

### Leaderboard.tsx

- **Global tab**: Call `get_leaderboard_stats` with season year, limit 50
- **School tab**: Derive school rankings by grouping `get_leaderboard_stats` results by school (via `profiles_public.school_name`), or create a small `get_school_leaderboard_stats` helper RPC
- Remove all `user_scores` and `school_scores` references

### PoolLeaderboard.tsx

- Replace `user_scores` query (lines 239-249) with `get_leaderboard_stats` filtered to pool member IDs
- The pool-scoped predictions query for current user stays as-is (it already reads `predictions` directly)

### Pools.tsx

- Replace `user_scores` rank query with call to `get_user_season_stats` RPC for the current user's global/school rank

### useUserStats.ts

- Replace `user_scores` query with `get_user_season_stats` RPC
- Remove streak logic dependency on user_scores (streak already reads predictions directly)

### Admin: TestingCenter.tsx

- **Simplify "Process Week"**: Remove the `rollup_week_scores` step entirely. The button now only calls `calculate_prediction_points` per fixture (as a manual re-run fallback). The trigger handles this automatically going forward.
- **Remove "Reset Scores"** option (no `user_scores` table to clear). Replace with a note that scores are derived live.

### Admin: UsersTable.tsx

- Replace `user_scores` query with a direct count from `predictions` for each user (predictions_made, predictions with points > 0)

### Admin: UserActivityDialog.tsx

- Replace `user_scores` history with predictions summary grouped by week

---

## 3. Technical Details

### Files Created
- None (all changes are modifications + DB migration)

### Files Modified
- **Database migration** (1 migration with trigger, 2 RPCs, table drops)
- `src/pages/LeaderboardDetail.tsx`
- `src/pages/Leaderboard.tsx`
- `src/pages/PoolLeaderboard.tsx`
- `src/pages/Pools.tsx`
- `src/hooks/useUserStats.ts`
- `src/components/admin/TestingCenter.tsx`
- `src/components/admin/UsersTable.tsx`
- `src/components/admin/UserActivityDialog.tsx`

### Trigger Design

```sql
CREATE OR REPLACE FUNCTION public.auto_score_fixture()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  -- uses same brags logic as calculate_prediction_points
BEGIN
  -- Only fire when scores change from NULL to a value
  IF (NEW.score_a IS NOT NULL AND NEW.score_b IS NOT NULL)
     AND (OLD.score_a IS NULL OR OLD.score_b IS NULL
          OR NEW.score_a != OLD.score_a OR NEW.score_b != OLD.score_b)
  THEN
    PERFORM calculate_prediction_points(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_score_fixture
AFTER UPDATE ON public.fixtures
FOR EACH ROW
EXECUTE FUNCTION public.auto_score_fixture();
```

### RPC: get_leaderboard_stats

```sql
CREATE OR REPLACE FUNCTION public.get_leaderboard_stats(
  p_season_year integer,
  p_school_id uuid DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid,
  total_brags bigint,
  picks_made bigint,
  picks_correct bigint,
  avg_efficiency numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.user_id,
    COALESCE(SUM(p.points_earned), 0) as total_brags,
    COUNT(*) as picks_made,
    COUNT(*) FILTER (WHERE p.points_earned >= 4) as picks_correct,
    CASE WHEN COUNT(*) > 0
      THEN ROUND(COALESCE(SUM(p.points_earned), 0)::numeric / COUNT(*), 2)
      ELSE 0
    END as avg_efficiency
  FROM predictions p
  JOIN fixtures f ON p.fixture_id = f.id
  WHERE f.year = p_season_year
    AND p.points_earned IS NOT NULL
    AND (p_school_id IS NULL OR p.user_id IN (
      SELECT id FROM profiles WHERE school_id = p_school_id
    ))
  GROUP BY p.user_id
  ORDER BY total_brags DESC, avg_efficiency DESC, picks_correct DESC
$$;
```

### Impact on Existing Data

- The 1 prediction currently in the database will continue to work -- its `points_earned` is already set
- The trigger ensures future fixture score entries automatically calculate brags
- No data migration needed since we're reading from `predictions` which already has the data

