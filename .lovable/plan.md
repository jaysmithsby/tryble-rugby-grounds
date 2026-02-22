

## Refactor "All Schools" View into Searchable Table with Match History

### Overview
Replace the card-based fixture layout in the "All Schools" view with a searchable, collapsible table. Users can browse fixtures, click school names/logos to navigate to school profiles, and expand rows to see head-to-head match history. No prediction CTAs in this view.

### New Files

**1. `src/components/fixtures/MatchHistory.tsx`**
- Accepts `homeSchoolId` and `awaySchoolId` props
- Uses a React Query to fetch the last 5 completed fixtures between those two schools (matching both directions: A vs B and B vs A)
- Query: fixtures where status is not "upcoming", ordered by match_date descending, limit 5
- Selects: match_date, home_score, away_score, home_school(name), away_school(name)
- Displays each result as a row: date, school names, scoreline (e.g. "24 - 10"), with the winner's name bolded
- Shows a "No previous matches" message if empty
- Loading skeleton while fetching

**2. `src/components/fixtures/FixtureTable.tsx`**
- Accepts `fixtures` (the flat array from useFixturesData), `searchQuery` string
- Client-side filters fixtures by `searchQuery` (matches against home or away school name)
- Renders a shadcn `<Table>` with columns: Date, Teams, Venue
- Each row is wrapped in a `<Collapsible>` -- clicking the row (outside school links) toggles the collapsible content
- **Teams column**: Shows jersey icons + school names as clickable links navigating to `/school/${slug}`
- **Expanded content**: Renders `<MatchHistory>` with the fixture's home/away school IDs, styled with `bg-muted/30`
- No prediction buttons or CTAs anywhere
- Mobile responsive: on small screens, the table uses a stacked card-like layout via CSS (hiding table headers, stacking cells)

### Modified Files

**3. `src/pages/Fixtures.tsx`**
- Add `searchQuery` state (`useState("")`)
- Add a search `<Input>` in the header area (visible in "all-schools" mode) with real-time filtering
- Conditional rendering in the content area:
  - `viewMode === "my-schools"`: keep existing `FixtureDateGroup` + `FixtureListCard` layout with predictions
  - `viewMode === "all-schools"`: render the new `<FixtureTable>` component, passing flat fixtures array and searchQuery
- The existing school/province dropdown filters in `FixturesFilters` remain functional alongside the new search input

**4. `src/hooks/useFixturesData.ts`**
- No changes needed. The hook already returns `home_school_id`, `away_school_id`, and the flat `fixtures` array alongside `groupedFixtures`. The `FixtureWithSchools` interface already has these fields.

### Technical Details

**MatchHistory query:**
```text
SELECT id, match_date, home_score, away_score,
  home_school:schools!fixtures_home_school_id_fkey(name),
  away_school:schools!fixtures_away_school_id_fkey(name)
FROM fixtures
WHERE status != 'upcoming'
  AND is_visible = true
  AND (
    (home_school_id = :schoolA AND away_school_id = :schoolB)
    OR (home_school_id = :schoolB AND away_school_id = :schoolA)
  )
ORDER BY match_date DESC
LIMIT 5
```

**FixtureTable row structure:**
```text
<Collapsible>
  <TableRow as CollapsibleTrigger>
    | Date (formatted) | [jersey] SchoolA link  vs  [jersey] SchoolB link | Venue |
  </TableRow>
  <CollapsibleContent>
    <TableRow with bg-muted/30 spanning full width>
      <MatchHistory homeSchoolId=... awaySchoolId=... />
    </TableRow>
  </CollapsibleContent>
</Collapsible>
```

**Mobile approach:** On screens < 640px, hide `<TableHeader>` and style each `<TableRow>` as a stacked card using Tailwind responsive utilities. The date and venue appear as small labels above/below the teams row.

**Search filtering:** Pure client-side filter on the already-fetched fixtures array -- no additional DB queries. Filters where either `home_school.name` or `away_school.name` includes the search string (case-insensitive).
