

## Overview

Fix tournament fixture display by aligning the data model: use `tournament_id` (which references `tournament_editions.id`) consistently, drop the deprecated `festival_id` column, and auto-set date filters from edition dates.

## Changes

### 1. Database Migration: Drop `festival_id`

Create a migration to remove the `festival_id` column from the `fixtures` table. This column is unused -- all tournament linking now goes through `tournament_id` which references `tournament_editions.id`.

```sql
ALTER TABLE public.fixtures DROP COLUMN IF EXISTS festival_id;
```

### 2. Fix `Tournament.tsx` -- Fixture Query

**Problem**: `fetchFixtures` queries `tournament:tournaments(id, name)` (the parent tournaments table) and filters by `.eq("tournament_id", editionId)`. The join is wrong -- the FK points to `tournament_editions`, not `tournaments`.

**Fix** (lines 240-249): Remove the `tournament:tournaments(id, name)` join from the select statement entirely. The tournament name is already available via `tournamentName` state. The `.eq("tournament_id", editionId)` filter is correct since `fixtures.tournament_id` references `tournament_editions.id`.

```typescript
const { data, error } = await supabase
  .from("fixtures")
  .select(`
    id, match_date, venue_type, venue_id, school_a_id, school_b_id, status, is_derby, score_a, score_b,
    school_a:schools!fixtures_school_a_id_fkey(id, name, slug, jersey_url, province),
    school_b:schools!fixtures_school_b_id_fkey(id, name, slug, jersey_url, province)
  `)
  .eq("tournament_id", editionId)
  .order("match_date", { ascending: true });
```

### 3. Fix `Tournament.tsx` -- Auto-Set Date Range from Edition

**Problem**: `dateRange` is hardcoded to 2026 (line 71), hiding fixtures from other years.

**Fix**: Add a `useEffect` that updates `dateRange` whenever `selectedEdition` changes:
- If the edition has valid `start_date` and `end_date`, use those.
- Otherwise, default to Jan 1 -- Dec 31 of the edition's `year`.

```typescript
useEffect(() => {
  if (!selectedEdition) return;
  const start = new Date(selectedEdition.start_date);
  const end = new Date(selectedEdition.end_date);
  if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
    setDateRange({ from: start, to: end });
  } else {
    setDateRange({
      from: new Date(selectedEdition.year, 0, 1),
      to: endOfYear(new Date(selectedEdition.year, 0, 1)),
    });
  }
}, [selectedEdition]);
```

Also remove the hardcoded 2026 initial value, replacing it with a sensible default (current year).

### 4. Fix `useFixturesData.ts` -- Query and Types

**Problem**: The `FixtureWithSchools` interface references `tournament_edition` but the Supabase query joins as `tournament_edition:tournament_editions(id, tournament:tournaments(id, name))`. This is correct for the Fixtures page since it needs the tournament name. However, `festival_id` should not appear anywhere.

**Changes**:
- Confirm the existing query already uses `tournament_id` (it does via `.eq("tournament_id", ...)` implicitly through `tournament_editions`).
- No `festival_id` references exist in this file -- no changes needed here.

### 5. Fix `Fixtures.tsx` -- Tournament Name Mapping

**Problem**: The `FixtureListCard` receives `fixture.tournament_edition?.tournament` but this may be `null` if the join doesn't resolve.

**Fix**: The existing mapping on line 166 (`fixture.tournament_edition?.tournament ?? null`) is correct. No change needed -- the query in `useFixturesData` already fetches `tournament_edition:tournament_editions(id, tournament:tournaments(id, name))` which correctly traverses edition -> parent tournament.

### 6. Clean Up `ImportFixturesButton.tsx`

Remove `festival_id: null` from the insert payload (line 100) since the column will no longer exist after the migration.

### 7. Clean Up CSV Files

The CSV headers in `src/data/fixtures.csv` and `src/data/fixtures_rows.csv` contain `festival_id`. These are static data files -- update headers to remove the column.

## Files Modified

| File | Change |
|------|--------|
| `supabase/migrations/` | New migration: drop `festival_id` column |
| `src/pages/Tournament.tsx` | Remove tournament join from fixture query; auto-set dateRange from edition; fix hardcoded 2026 |
| `src/components/admin/ImportFixturesButton.tsx` | Remove `festival_id: null` from insert payload |
| `src/data/fixtures.csv` | Remove `festival_id` from header |
| `src/data/fixtures_rows.csv` | Remove `festival_id` from header |

