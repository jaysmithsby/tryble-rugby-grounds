

## Fix Pool Fixtures Not Loading

### Problem
The `loadFixturesData` query in `PoolLeaderboard.tsx` has an invalid join: `tournament:tournaments(id, name)`. The `fixtures.tournament_id` column references `tournament_editions`, not `tournaments`. This causes the entire query to fail silently, returning no fixtures at all.

### Fix

**`src/pages/PoolLeaderboard.tsx`** — `loadFixturesData` function:

1. Fix the join to go through `tournament_editions` → `tournaments` (matching the pattern used in `useHomeFixtures`):
   ```
   tournament_edition:tournament_editions!fixtures_tournament_id_fkey(
     id, tournament:tournaments!tournament_editions_tournament_id_fkey(name)
   )
   ```

2. Remove `.eq("venue_type", "school")` so tournament fixtures involving pool schools also appear (as previously discussed).

3. Update the venue resolution logic downstream to use the corrected join shape (`fixture.tournament_edition?.tournament?.name`).

### Files
- `src/pages/PoolLeaderboard.tsx` (single file, ~3 line changes in the query + venue mapping)

