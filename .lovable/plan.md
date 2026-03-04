

## Plan: Remove Participating Schools Column & Auto-Create Tournament Editions from Fixture Imports

### Overview

Three interconnected changes: (1) drop the manual `participating_schools` column and infer participating schools from fixtures at query time, (2) auto-create tournament editions during CSV import when a tournament name matches but no edition exists for that year, (3) simplify admin forms by removing school-selection widgets from edition dialogs.

### Database Changes

**Migration: Drop `participating_schools` column from `tournament_editions`**

```sql
ALTER TABLE tournament_editions DROP COLUMN IF EXISTS participating_schools;
```

This column becomes unnecessary since participating schools will be inferred from fixtures linked to each edition.

### File Changes

#### 1. `src/lib/fixtureImportService.ts` — Auto-create editions

In `mapRow()` (lines 166-179), when `venue_type === "tournament"` and a tournament name matches a parent tournament but no edition exists for that year:

- Instead of pushing an error, auto-create the tournament edition via `supabase.from("tournament_editions").insert(...)` with minimal data: `tournament_id`, `year`, `start_date` (from the fixture's match_date), `end_date` (same date as placeholder), `is_active: true`.
- Cache the new edition ID in `maps.editionMap` so subsequent rows in the same import reuse it.
- This requires making `mapRow` async, and updating `runImport` to be async as well.

Also apply this same logic for non-tournament venue types (lines 181-193) — if `tournament_name` is provided in the CSV, resolve it regardless of `venue_type`, auto-creating editions as needed.

#### 2. `src/components/admin/CreateEditionDialog.tsx` — Remove participating schools

- Remove the `participating_schools` field from the form schema (line 34), default values, and the entire `<FormField>` block for participating schools (lines 227-262).
- Remove `schools` state, `fetchSchools()`, `filteredSchools`, `searchQuery` state, and imports for `Checkbox`, `Badge`, `X`, `ScrollArea` that are only used for that field.
- Remove `participating_schools` from the insert payload (line 119).

#### 3. `src/components/admin/EditEditionDialog.tsx` — Remove participating schools

- Same removal as CreateEditionDialog: drop the form field, schema entry, fetch/filter logic, and update payload (line 123).

#### 4. `src/components/admin/TournamentsTable.tsx` — Show inferred school count

- In the expanded edition row (around line 185), instead of showing `edition.participating_schools.length` schools, fetch the count of distinct schools from fixtures linked to each edition.
- Add a small query (or use a `useMemo` from fixtures data) to count distinct `school_a_id` + `school_b_id` per edition.
- Display as "N schools" (inferred from fixtures).

#### 5. `src/pages/Tournament.tsx` — Infer participating schools from fixtures

- Remove references to `selectedEdition?.participating_schools` (line 329).
- Derive `participatingSchools` from `allFixtures` using a `useMemo`:
  ```typescript
  const participatingSchools = useMemo(() => {
    const names = new Set<string>();
    allFixtures.forEach(f => {
      if (f.school_a?.name) names.add(f.school_a.name);
      if (f.school_b?.name) names.add(f.school_b.name);
    });
    return [...names].sort();
  }, [allFixtures]);
  ```
- The school count in the header (line 402) and the filter popover (lines 455-473) will automatically use this derived list.
- Remove `participating_schools` from the `Edition` interface (line 35).

#### 6. `src/integrations/supabase/types.ts` — Auto-updated

Will be regenerated after the migration drops the column.

### Summary of Simplifications

| Before | After |
|---|---|
| Manual checkbox list to select participating schools per edition | Schools inferred automatically from linked fixtures |
| CSV import fails if no matching edition exists | Edition auto-created with minimal data when tournament name matches |
| `participating_schools` text array column on `tournament_editions` | Column dropped entirely |

