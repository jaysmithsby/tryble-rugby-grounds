

# SchoolProfile Refactor: High-Density Professional Layout

## Overview
Replace the large hero banner with a compact inline header, add follower/Springbok stat cards, and conditionally render interactive `FixtureCard` (for followers) vs read-only `FixtureTable` (for non-followers). Make fixture row expansion conditional on existing match history.

---

## Changes

### 1. Header Refactor (SchoolProfile.tsx)

Remove the entire 72-line hero banner (`h-72` gradient block with rotated diamond logo, large title, etc.) and replace with a compact layout:

**Row 1**: `[32px circular logo] [School Name (font-bold text-lg, truncate)] [Follow Star button]`
- Logo: circular `w-8 h-8` showing `emblem_url || jersey_url || icon_url`, or 2-letter fallback
- Follow star: reuses `Star` icon (filled when following, outline when not), same toggle logic as current follow button
- If primary school: filled star with tooltip "Primary School" (non-interactive)

**Row 2 (motto)**: `text-xs italic text-muted-foreground` -- only renders if `school.motto` exists

**Row 3 (metadata)**: Inline `text-xs text-muted-foreground` -- province and established year separated by a dot
- Example: "Western Cape . Est. 1905"

### 2. Impact Stats Section

Below the header, a `grid grid-cols-2 gap-4` section with two stat blocks:

- **Followers**: Large number + "Followers" label. Count fetched via `user_school_follows` aggregate query.
- **Springboks**: Large number + "Springboks" label. From `school.springboks_count`.

Styling: Each block is a `rounded-lg bg-muted/30 border border-border/40 p-4 text-center` with the number in `text-3xl font-bold text-primary` and label in `text-xs text-muted-foreground`.

### 3. Conditional Fixture Display

**New state**: `followerCount` (number), already have `isFollowing`.

**If user follows this school (or it's their primary school)**:
- Render upcoming fixtures using `FixtureCard` components (interactive, with prediction dialog)
- Map fixture data to `FixtureCard` props (homeTeam, awayTeam, jerseys, matchId, etc.)

**If user does NOT follow**:
- Render upcoming fixtures using `FixtureTable` (read-only, informational rows)

### 4. Expandable Row Conditional on Match History

Modify `FixtureTable.tsx` to accept an optional `hasHistoryMap` prop:
- Type: `Record<string, boolean>` mapping fixture ID to whether match history exists
- When provided, rows with `hasHistoryMap[fixture.id] === false` disable the collapsible trigger (no chevron, no click handler)
- Default behavior (no prop): all rows are expandable as before (backward compatible)

**Data fetching**: In `SchoolProfile.tsx`, after fetching upcoming fixtures, run a batch query to check for historical matches between each pair of schools. Build the `hasHistoryMap` and pass it to `FixtureTable`.

### 5. Remove Derby Banner & Top Users Card

Remove the large "Derby Match Alert!" card and the "Top Trybal Users" card to keep the page focused and clean. The derby indicator can be a small `Flame` badge on the fixture row instead.

Remove the "Recent Results" card wrapper -- render recent results directly using `FixtureTable` with a section heading.

---

## Technical Details

### Files Modified
- `src/pages/SchoolProfile.tsx` -- Complete layout overhaul (header, stats, conditional fixtures)
- `src/components/fixtures/FixtureTable.tsx` -- Add optional `hasHistoryMap` prop for conditional expansion

### Follower Count Query
```text
supabase.from("user_school_follows")
  .select("id", { count: "exact", head: true })
  .eq("school_id", schoolId)
```
Returns the count in the response `count` field without fetching rows.

### Match History Existence Check
For each upcoming fixture, query completed fixtures between the two school IDs:
```text
// Batch: for each fixture pair (school_a_id, school_b_id)
supabase.from("fixtures")
  .select("id", { count: "exact", head: true })
  .eq("status", "completed")
  .or(`and(school_a_id.eq.${aId},school_b_id.eq.${bId}),and(school_a_id.eq.${bId},school_b_id.eq.${aId})`)
```
Build `hasHistoryMap[fixtureId] = count > 0`.

### FixtureTable Changes
```text
interface FixtureTableProps {
  fixtures: Fixture[];
  searchQuery?: string;
  hasHistoryMap?: Record<string, boolean>;  // NEW optional prop
}
```
In `FixtureTableRow` and `MobileFixtureCard`:
- If `hasHistoryMap` is provided and `hasHistoryMap[fixture.id] === false`, render without `Collapsible` wrapper (or disable the trigger)
- Hide the chevron icon for non-expandable rows

### FixtureCard Mapping (for followed school fixtures)
Each upcoming fixture maps to a `FixtureCard` with:
- `homeTeam` / `awayTeam` from `fixture.school_a.name` / `fixture.school_b.name`
- `homeTeamShort` / `awayTeamShort` from first 3 chars
- `homeTeamIcon` / `awayTeamIcon` from jersey_url
- `homeSchoolId` / `awaySchoolId` from school IDs
- `homeSchoolSlug` / `awaySchoolSlug` from slugs
- `matchDate` from `fixture.match_date`
- `venue` resolved via `resolveVenueName`
- `tournamentName` from `fixture.tournament?.name`
- `matchId` from `fixture.id`
- Prediction state fetched from user's existing predictions for these fixture IDs

### New State in SchoolProfile
- `followerCount: number` (default 0)
- `hasHistoryMap: Record<string, boolean>` (default {})
- `userPredictions: Record<string, { predictedSchoolId: string; predictedMargin: number }>` (for FixtureCard prediction state)

### Sections Removed
- Hero banner (72-line gradient + diamond logo + large title)
- Derby Match Alert card
- Top Trybal Users card
- Card wrapper around Recent Results

### Final Page Structure
```text
[GlobalHeader]
[Compact Header Row: Logo + Name + Star]
[Motto line]
[Metadata line: Province . Est. Year]
[Stats Grid: Followers | Springboks]
[Section: "Upcoming Fixtures"]
  [FixtureCard (if following) OR FixtureTable (if not)]
[Section: "Recent Results"]
  [FixtureTable with hasHistoryMap]
[BottomNav]
```
