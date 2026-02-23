
# Replace Recent Results with RecentResultsTable

## Overview
Replace the `FixtureTable` in the "Recent Results" section of SchoolProfile with a new, text-only, high-density table component that prioritizes score alignment.

## New File: `src/components/fixtures/RecentResultsTable.tsx`

### Props
- `schoolId: string` -- the school whose results to display

### Data Fetching
- Uses `useState` + `useEffect` to query the `fixtures` table directly from Supabase
- Filters: `status = 'completed'`, `school_a_id` or `school_b_id` matches `schoolId`, `score_a` and `score_b` are not null
- Joins `school_a` and `school_b` for names
- Orders by `match_date DESC`
- Uses `usePagination(1, 10)` for 10 results per page with Supabase `.range(from, to)`
- Fetches total count with `{ count: 'exact', head: true }` in a parallel query

### Winner/Loser Logic (frontend)
For each fixture row:
- If `score_a > score_b`: winner = school_a, loser = school_b, winner score = score_a, loser score = score_b
- If `score_b > score_a`: winner = school_b, loser = school_a, winner score = score_b, loser score = score_a
- If `score_a === score_b` (draw): winner column = school_a (home), loser column = school_b (away), show a subtle "Draw" badge

### Table Layout
Uses shadcn `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`.

Four columns:
1. **Date** -- left-aligned, formatted `d MMM yyyy`, `text-xs text-muted-foreground`
2. **Winner** -- right-aligned school name, `text-xs font-medium text-right`
3. **Score** -- center-aligned, `text-center font-mono w-20` displaying `{winnerScore} - {loserScore}`. The fixed `w-20` + monospace font ensures the dash is perfectly aligned across all rows.
4. **Loser** -- left-aligned school name, `text-xs text-muted-foreground text-left`

For draws, a small `(D)` or muted "Draw" text appears next to the score.

### Pagination
- Renders a simplified pagination footer below the table (not the full admin `PaginationControls`)
- Shows "Page X of Y" with left/right chevron buttons
- Only appears when `totalPages > 1`

### Empty State
- Shows "No results yet." centered text when no completed fixtures exist

## Modified File: `src/pages/SchoolProfile.tsx`

### Changes
1. Remove `recentResults` state, its fetch logic from `loadSchoolData`, and its inclusion in `loadMatchHistory`
2. Replace the "Recent Results" section (lines 338-344) with:
   ```
   <section>
     <h2 className="text-sm font-semibold text-muted-foreground mb-3">Recent Results</h2>
     <RecentResultsTable schoolId={school.id} />
   </section>
   ```
3. The section always renders (the component handles its own empty state internally)
4. Remove the `FixtureTable` import if it's no longer used elsewhere on this page (it's still used for upcoming fixtures for non-followers, so it stays)

---

## Technical Details

### RecentResultsTable internal structure

```text
RecentResultsTable({ schoolId })
  |
  +-- usePagination(1, 10)
  +-- useState: results[], loading, totalCount
  +-- useEffect([schoolId, page]): fetch fixtures + count
  |
  +-- Table
  |     TableHeader: Date | Winner | Score | Loser
  |     TableBody: map results to rows
  |       - determine winner/loser from score_a vs score_b
  |       - Date cell: format(match_date, "d MMM yyyy")
  |       - Winner cell: text-right font-medium
  |       - Score cell: font-mono w-20 text-center "{high} - {low}"
  |       - Loser cell: text-left text-muted-foreground
  |       - Draw: append subtle "(D)" in score cell
  |
  +-- Pagination footer (if totalPages > 1)
        Page X of Y + prev/next buttons
```

### Score column alignment approach
- `TableHead` and `TableCell` for score column get `className="w-20 text-center"`
- Score text uses `font-mono` so digits are equal width
- Format: `{winnerScore} - {loserScore}` with an actual dash character, not an en-dash

### Supabase query structure
```text
supabase
  .from("fixtures")
  .select(`
    id, match_date, score_a, score_b, school_a_id, school_b_id,
    school_a:schools!fixtures_school_a_id_fkey(id, name),
    school_b:schools!fixtures_school_b_id_fkey(id, name)
  `)
  .or(`school_a_id.eq.${schoolId},school_b_id.eq.${schoolId}`)
  .eq("status", "completed")
  .not("score_a", "is", null)
  .not("score_b", "is", null)
  .order("match_date", { ascending: false })
  .range(from, to)
```
