

## Plan: Replace N+1 Match History Queries with Batch RPC

### Problem
`loadMatchHistory` fires one query per fixture (N+1). A school with 30 upcoming fixtures = 30 round-trips.

### Solution

**1. Database Migration: Create `get_match_history_batch` RPC**

A function that accepts an array of fixture IDs, looks up completed historical fixtures for each pair, and returns which fixture IDs have history.

```sql
CREATE OR REPLACE FUNCTION public.get_match_history_batch(p_fixture_ids uuid[])
RETURNS TABLE(fixture_id uuid, has_history boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    f.id AS fixture_id,
    EXISTS (
      SELECT 1 FROM fixtures h
      WHERE h.status = 'completed'
        AND h.id != f.id
        AND LEAST(h.school_a_id, h.school_b_id) = LEAST(f.school_a_id, f.school_b_id)
        AND GREATEST(h.school_a_id, h.school_b_id) = GREATEST(f.school_a_id, f.school_b_id)
    ) AS has_history
  FROM unnest(p_fixture_ids) AS input_id
  JOIN fixtures f ON f.id = input_id;
$$;
```

Key design choice: uses `LEAST/GREATEST` to normalize the pair regardless of home/away order, and uses a lateral `EXISTS` subquery which short-circuits per row. Single round-trip, no loop.

**2. Update `src/pages/SchoolProfile.tsx`**

Replace the `loadMatchHistory` callback (lines 134-149) with:

```ts
const loadMatchHistory = useCallback(async (fixtures: any[]) => {
  if (fixtures.length === 0) return;
  const { data, error } = await supabase.rpc("get_match_history_batch", {
    p_fixture_ids: fixtures.map(f => f.id),
  });
  if (error || !data) { setHasHistoryMap({}); return; }
  const map: Record<string, boolean> = {};
  data.forEach((row: { fixture_id: string; has_history: boolean }) => {
    map[row.fixture_id] = row.has_history;
  });
  setHasHistoryMap(map);
}, []);
```

No other files need changes — `hasHistory` prop on `FixtureCard` continues to work identically.

### Files Changed

| File | Change |
|---|---|
| New migration | Create `get_match_history_batch` function |
| `src/pages/SchoolProfile.tsx` | Replace N+1 loop with single `supabase.rpc()` call |

