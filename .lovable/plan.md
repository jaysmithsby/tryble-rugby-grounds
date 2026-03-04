

## Personal Prediction Logs Page

### Overview
New "Logs" page accessible via a 5th bottom nav tab, showing the user's prediction history, performance analytics, form guide, and community comparison.

### Files to Create/Modify

**1. `src/pages/Logs.tsx`** (new)
- Mobile-first layout matching existing page patterns (`pb-24`, `GlobalHeader`, `BottomNav`)
- Auth check: redirect to `/auth` if not logged in
- Three sections:

**Header + Share**: "Personal Logs" title with yellow Trophy icon. "Share Performance" button using `navigator.share` with clipboard fallback.

**Analytics Grid** (3 cards in a responsive grid):
- **Participation**: predictions made vs total completed fixtures the user follows (query completed fixtures for user's school + followed schools, compare to prediction count)
- **Efficiency**: average `points_earned` per scored prediction (out of 6.0 max)
- **Current Streak**: consecutive matches with `points_earned >= 3` (reuse logic from `get_user_season_stats` RPC which already computes `current_streak` with `> 0` threshold — but for this page we query raw predictions to use `>= 3` threshold for "correct winner" streak)

**Form Guide Bar**: Last 8 scored predictions rendered as colored icons:
- Gold `CheckCircle2` for 5+ pts (perfect/near-perfect)
- Green `CheckCircle2` for 3-4 pts (correct winner)
- Red `XCircle` for 0-2 pts (wrong)

**Personal History Table**: All scored predictions joined with fixtures + school names:
- Columns: Matchup, Actual (Diff), Personal Call (margin + points, gold highlight for 5+), Community Avg
- Community avg: fetched via a single query grouping `AVG(points_earned)` by `fixture_id` for all fixture IDs the user predicted on
- Sorted by `match_date DESC`

**Data fetching**: Two `useQuery` calls:
1. User's predictions joined with fixtures and schools (using `.select('*, fixture:fixtures(*, school_a:schools!school_a_id(name), school_b:schools!school_b_id(name))')` pattern)
2. Community averages: separate query selecting `fixture_id, avg(points_earned)` — since we can't do aggregations directly via the JS client, we'll compute this client-side by fetching all predictions for the relevant fixture IDs (or create a small DB function)

Actually, fetching ALL predictions for community avg would be too heavy. Better approach: **create a DB function** `get_community_avg_for_fixtures(fixture_ids uuid[])` that returns `fixture_id, avg_points` rows.

**Scoring Guide footer**: Static card explaining the scoring system.

**2. `src/components/BottomNav.tsx`** — Add 5th "Logs" tab with `Trophy` icon between Pools and Discover.

**3. `src/components/AnimatedRoutes.tsx`** — Add `/logs` to `KEEP_ALIVE_ROUTES` (eagerly loaded like other nav pages). Import `Logs` at the top.

**4. Database migration** — Create `get_community_avg_for_fixtures` function:
```sql
CREATE OR REPLACE FUNCTION public.get_community_avg_for_fixtures(p_fixture_ids uuid[])
RETURNS TABLE(fixture_id uuid, avg_points numeric, total_predictions bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT p.fixture_id, ROUND(AVG(p.points_earned)::numeric, 1), COUNT(*)
  FROM predictions p
  WHERE p.fixture_id = ANY(p_fixture_ids)
    AND p.points_earned IS NOT NULL
  GROUP BY p.fixture_id;
$$;
```

### Technical Notes
- The page follows the same pattern as `Badges.tsx` / `Home.tsx` (GlobalHeader, BottomNav, container layout)
- Uses existing Supabase types for predictions and fixtures
- Form guide uses the last 8 predictions ordered by fixture match_date DESC
- Community avg function avoids fetching all prediction rows client-side
- `pb-24` prevents bottom nav overlap

