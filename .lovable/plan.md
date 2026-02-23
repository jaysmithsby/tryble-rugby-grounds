
# School Profile: Upcoming Fixtures with Search and Month Navigation

## Overview
Replace the current limited upcoming fixtures section with a full-featured section that includes a search bar, month/year navigation, and the ability to browse all upcoming fixtures -- not just the next 5.

## Changes

### 1. Modify `src/pages/SchoolProfile.tsx`

**New state variables:**
- `searchQuery` (string) for opponent search
- `selectedYear` / `selectedMonth` (number) for month nav, defaulting to current year/month
- `allUpcomingFixtures` (array) -- all upcoming fixtures fetched without a limit
- Remove the current `.limit(5)` constraint on the upcoming query; fetch all upcoming/holding fixtures for this school

**New filtering logic (useMemo):**
- If `searchQuery` is non-empty (debounced via `useDebounce`), filter the entire `allUpcomingFixtures` list by matching the opponent school name (case-insensitive), ignoring month selection
- If `searchQuery` is empty, filter to only fixtures whose `match_date` falls within the `selectedYear`/`selectedMonth`
- The opponent is whichever school is NOT the profile school (`school_a` or `school_b`)

**Data fetching changes:**
- Remove the `.gte("match_date", ...)` and `.limit(5)` from the upcoming query so all future fixtures load
- Keep the existing `loadMatchHistory` and `loadPredictions` calls but apply them to the filtered subset (or all fixtures)

**New imports:**
- `FixturesMonthNav` from `@/components/fixtures/FixturesMonthNav`
- `useDebounce` from `@/hooks/use-debounce`
- `Search`, `X` from `lucide-react`
- `Input` from `@/components/ui/input`

### 2. UI Layout in SchoolProfile

The Upcoming Fixtures section will be restructured as:

```
<section>
  <h2>Upcoming Fixtures</h2>

  <!-- Compact search bar (inline, not FixturesFilters) -->
  <div> Search input with icon + clear button </div>

  <!-- Month/Year nav (only visible when search is empty) -->
  {!searchQuery && <FixturesMonthNav ... />}

  <!-- Fixture cards or empty state -->
  {filteredFixtures.length > 0 ? (
    <div className="space-y-3">
      {filteredFixtures.map(...) => <FixtureCard ... />}
    </div>
  ) : (
    <p>No fixtures found for '{query}' / No fixtures in {month}</p>
  )}
</section>
```

**Why not reuse `FixturesFilters` directly?**
The `FixturesFilters` component includes view-mode toggles (My Schools / All Schools), province selectors, and a date range picker that aren't relevant on a single-school profile. Instead, we'll use only the search input pattern (same styling) and the `FixturesMonthNav` component directly.

### 3. Search Behavior
- When typing, `FixturesMonthNav` hides (or dims) to signal that search spans all months
- Clearing search restores month-based filtering
- Search matches opponent school name only (the profile school is implicit)

### 4. Prediction Logic (unchanged pattern)
- If `showInteractive` (following or primary school): pass prediction props to `FixtureCard`
- Otherwise: render without prediction interactivity (standard "VS" row)

### 5. Section Order
1. School header (logo, name, star, motto, metadata, stats)
2. **Upcoming Fixtures** (search + month nav + cards)
3. **Recent Results** (existing `RecentResultsTable`)

---

## Technical Details

### Search input (inline in SchoolProfile)
```text
<div className="relative">
  <Search icon left />
  <Input placeholder="Search opponent..." value={searchQuery} onChange={...} className="pl-7 h-8 text-xs" />
  {searchQuery && <X clear button right />}
</div>
```

### Filtering useMemo
```text
const debouncedSearch = useDebounce(searchQuery, 300);

const filteredFixtures = useMemo(() => {
  if (debouncedSearch) {
    return allUpcomingFixtures.filter(f => {
      const opponent = f.school_a_id === school.id ? f.school_b : f.school_a;
      return opponent?.name?.toLowerCase().includes(debouncedSearch.toLowerCase());
    });
  }
  // Filter by selected month/year
  return allUpcomingFixtures.filter(f => {
    const d = new Date(f.match_date);
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
  });
}, [allUpcomingFixtures, debouncedSearch, selectedYear, selectedMonth, school?.id]);
```

### Data query change
```text
// Remove .gte("match_date", ...) and .limit(5)
// Keep .in("status", ["upcoming", "holding"])
// Keep .order("match_date", { ascending: true })
```

### Files modified
- `src/pages/SchoolProfile.tsx` -- main changes (state, filtering, UI restructure)

No new files need to be created. The existing `FixturesMonthNav` and `FixtureCard` components are reused as-is.
