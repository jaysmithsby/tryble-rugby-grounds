

## Plan: Refactor Leaderboard to React Query + Optimized RPC

### 1. Database Migration: Replace `get_leaderboard_stats` with enhanced version

Add `p_limit integer DEFAULT 50` parameter and inline JOIN `profiles_public` + `profiles` to return `display_name`, `school_name`, `school_id` directly. Apply `LIMIT p_limit` at the end.

```sql
CREATE OR REPLACE FUNCTION public.get_leaderboard_stats(
  p_season_year integer,
  p_school_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  user_id uuid, total_brags bigint, picks_made bigint,
  picks_correct bigint, avg_efficiency numeric,
  display_name text, school_name text, school_id uuid
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    p.user_id,
    COALESCE(SUM(p.points_earned), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE p.points_earned >= 4),
    CASE WHEN COUNT(*) > 0
      THEN ROUND(COALESCE(SUM(p.points_earned), 0)::numeric / COUNT(*), 2)
      ELSE 0
    END,
    pp.display_name,
    pp.school_name,
    pr.school_id
  FROM predictions p
  JOIN fixtures f ON p.fixture_id = f.id
  LEFT JOIN profiles_public pp ON pp.id = p.user_id
  LEFT JOIN profiles pr ON pr.id = p.user_id
  WHERE f.year = p_season_year
    AND p.points_earned IS NOT NULL
    AND (p_school_id IS NULL OR pr.school_id = p_school_id)
  GROUP BY p.user_id, pp.display_name, pp.school_name, pr.school_id
  ORDER BY total_brags DESC, avg_efficiency DESC, picks_correct DESC
  LIMIT p_limit;
$$;
```

Since `p_limit` defaults to 50, **LeaderboardDetail.tsx** (line 60) calls `get_leaderboard_stats` without a third argument and will automatically get capped at 50 rows. LeaderboardDetail already paginates at 20 rows per page, so 50 rows (2.5 pages) is appropriate. If needed later, it can pass a higher limit explicitly.

### 2. Refactor `src/pages/Leaderboard.tsx`

**Remove**: `useState` for `globalLeaderboard`, `schoolLeaderboard`, `schoolSlugMap`, `loading`, and the `loadLeaderboardData` function. Remove `useEffect` that calls it.

**Add**: Import `useQuery` and `useQueryClient` from `@tanstack/react-query`. Import `DEFAULT_QUERY_OPTIONS` from `@/lib/queryConfig`.

Three `useQuery` hooks:

- **`schoolSlugsQuery`**: Fetches `schools` with `select("id, slug, name").limit(500)`. Uses `DEFAULT_QUERY_OPTIONS.static`. Derives `schoolSlugMap` via `useMemo`.

- **`leaderboardQuery`**: Calls `get_leaderboard_stats` RPC (no `p_limit` arg — defaults to 50). Uses `DEFAULT_QUERY_OPTIONS.dynamic`. Key: `["leaderboard-stats", currentYear]`. From the response, derive `globalLeaderboard` and `schoolLeaderboard` via `useMemo` (same aggregation logic, but now `display_name`/`school_name`/`school_id` come directly from the RPC — no separate profile fetches).

- **`userPoolsQuery`**: Wraps existing `loadUserPools` logic. Key: `["user-pools"]`. Uses `CACHE_TIMES.REFERENCE` for staleTime.

**Loading/Error states**: Replace `{loading ? ... : ...}` with `leaderboardQuery.isLoading` and `leaderboardQuery.isError`. Add a lightweight error state UI.

**Pool join invalidation**: After successful `joinPool`, call `queryClient.invalidateQueries({ queryKey: ["user-pools"] })` instead of imperative `loadUserPools()`. Pass `queryClient` for the `CreatePoolDialog` callback too.

### 3. Update `src/pages/LeaderboardDetail.tsx`

The RPC call on line 60 doesn't pass `p_limit`, so it defaults to 50 — correct behavior.

However, since the RPC now returns `display_name` inline, we can **remove the separate `profiles_public` fetch** (lines 78-88) and read `display_name` directly from `statsData`. This eliminates the second query waterfall in LeaderboardDetail too.

Replace lines 78-103:
```ts
const rows: ScoreRow[] = statsData.map((s: any) => {
  const made = Number(s.picks_made) || 0;
  const correct = Number(s.picks_correct) || 0;
  const pts = Number(s.total_brags) || 0;
  return {
    user_id: s.user_id,
    season_points: pts,
    predictions_made: made,
    predictions_correct: correct,
    display_name: s.display_name ?? null,
    accuracy: made > 0 ? (correct / made) * 100 : 0,
    efficiency: Number(s.avg_efficiency) || 0,
  };
});
```

### Files Changed

| File | Change |
|---|---|
| New migration | Replace `get_leaderboard_stats` with JOINs + LIMIT |
| `src/pages/Leaderboard.tsx` | Full refactor: useEffect → useQuery, remove profile fetches |
| `src/pages/LeaderboardDetail.tsx` | Remove profiles_public fetch, use inline display_name |

