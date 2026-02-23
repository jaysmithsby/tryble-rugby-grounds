

# Tournament Page Refactor: High-Density Professional Style

## Overview
Refactor `src/pages/Tournament.tsx` to match the compact, high-density style of `SchoolProfile.tsx`, replacing the current spacious card-based layout with an inline header, school filtering, paginated fixtures using `FixtureRow`, and follow-to-predict logic.

## Changes

### 1. Modify `src/pages/Tournament.tsx`

**Compact Header (matching SchoolProfile pattern):**
- Row 1: Trophy icon (or `logo_url` if set) + Tournament Name + Follow Star (using `user_tournament_follows` table)
- Row 2: Venue + "Hosted by {host_school}" in `text-xs italic text-muted-foreground`
- Row 3: Date range formatted as "Mar 15 - Mar 18, 2026" + bullet + "{N} Schools" with Users icon
- Sponsor banner (if present) rendered compactly below the header, not as a full-width card

**New state variables:**
- `isFollowing` / `followLoading` for tournament follow state (querying `user_tournament_follows`)
- `currentUserId` for the logged-in user
- `selectedSchools` (string array) for the multi-school filter
- `searchQuery` (string) for opponent/school search
- `dateRange` (from/to) defaulting to full year 2026
- `fixturesPage` (number) for pagination
- `userPredictions` (map) and `hasHistoryMap` (map) for prediction/history state

**Data fetching updates:**
- Tournament query: `select("*")` stays the same (host_school is already a text field)
- Fixtures query: same join pattern as SchoolProfile, fetching `school_a`, `school_b` with `id, name, slug, jersey_url, province`

**Multi-school filter:**
- A `Popover` containing checkboxes for each school in `tournament.participating_schools`
- Button label shows count: "Filter Schools (3/16)" or "All Schools"
- When schools are selected, filter fixtures where `school_a.name` or `school_b.name` is in the selected set

**Search + Date + Pagination (reusing existing components):**
- Inline search bar (same pattern as SchoolProfile) to search by school name within tournament fixtures
- `FixturesDateSelector` for date filtering (hidden when searching)
- Pagination at 8 fixtures per page with Prev/Next controls

**Follow-to-Predict Logic:**
- Query `user_tournament_follows` to check if user follows this tournament
- If following: pass prediction props (`isPredicted`, `predictedSchoolId`, `predictedMargin`, `onPredictionMade`) to `FixtureCard`
- If not following: render standard "VS" cards without prediction interactivity
- Follow/unfollow via Star button in header (insert/delete from `user_tournament_follows`)

**Fixture rendering:**
- Use `FixtureCard` component (which wraps `FixtureRow` with `variant="card"`)
- Same pattern as SchoolProfile for rendering interactive vs non-interactive cards

### 2. Section Layout Order

```
GlobalHeader
  Header block (trophy/logo + name + star)
  Venue / host line
  Metadata line (dates, school count)
  Sponsor banner (compact, if present)

  Format Notes (collapsible, if present)

  Fixtures section:
    School filter dropdown + Search bar + Date selector (inline row)
    Fixture cards (paginated, 8 per page)
    Pagination controls

  Participating Schools grid (compact)
  
  Sponsor footer (compact, if present)
BottomNav
```

### 3. Filtering Logic (useMemo)

```text
const filteredFixtures = useMemo(() => {
  let list = allFixtures;

  // Multi-school filter
  if (selectedSchools.length > 0) {
    list = list.filter(f =>
      selectedSchools.includes(f.school_a?.name) ||
      selectedSchools.includes(f.school_b?.name)
    );
  }

  // Search filter (overrides date)
  if (debouncedSearch) {
    return list.filter(f =>
      f.school_a?.name?.toLowerCase().includes(q) ||
      f.school_b?.name?.toLowerCase().includes(q)
    );
  }

  // Date range filter
  return list.filter(f => {
    const d = new Date(f.match_date);
    return d >= dateRange.from && d <= dateRange.to;
  });
}, [allFixtures, selectedSchools, debouncedSearch, dateRange]);
```

## Technical Details

### Imports to add
- `Star, Search, X, ChevronLeft, ChevronRight` from `lucide-react`
- `Input` from `@/components/ui/input`
- `Popover, PopoverContent, PopoverTrigger` from `@/components/ui/popover`
- `Checkbox` from `@/components/ui/checkbox`
- `FixturesDateSelector` from `@/components/fixtures/FixturesDateSelector`
- `FixtureCard` from `@/components/fixtures/FixtureCard` (already imported)
- `useDebounce` from `@/hooks/use-debounce`
- `resolveVenueName` from `@/lib/venueUtils`
- `startOfYear, endOfYear` from `date-fns`
- `Tooltip, TooltipProvider, TooltipContent, TooltipTrigger` from `@/components/ui/tooltip`

### Follow toggle handler
```text
const handleToggleFollow = async () => {
  if (!currentUserId || !tournament) return;
  if (isFollowing) {
    await supabase.from("user_tournament_follows")
      .delete().eq("user_id", currentUserId).eq("tournament_id", tournament.id);
    setIsFollowing(false);
  } else {
    await supabase.from("user_tournament_follows")
      .insert({ user_id: currentUserId, tournament_id: tournament.id });
    setIsFollowing(true);
  }
};
```

### Prediction loading (same pattern as SchoolProfile)
```text
const loadPredictions = async (fixtureIds: string[], userId: string) => {
  const { data } = await supabase.from("predictions")
    .select("fixture_id, predicted_school_id, predicted_margin")
    .eq("user_id", userId).in("fixture_id", fixtureIds);
  // Map to userPredictions state
};
```

### Files modified
- `src/pages/Tournament.tsx` -- complete refactor (single file)

No new files or database changes needed. All required tables (`user_tournament_follows`, `predictions`, `fixtures`, `tournaments`) already exist with correct RLS policies.

