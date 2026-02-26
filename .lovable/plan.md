

## Filter Out Tournament Fixtures from Non-Tournament Views

### Problem
Currently, tournament fixtures (where `venue_type = 'tournament'` or `tournament_id IS NOT NULL`) appear alongside regular school fixtures in the Home page, Fixtures hub, School profile, and Pool fixtures views. They should only appear when viewing a specific tournament page.

### Approach
Add `.eq("venue_type", "school")` (or equivalently, filter out fixtures with a non-null `tournament_id`) to every fixture query except the Tournament page. Using `venue_type = 'school'` is the cleanest filter since it's already set correctly during import.

### Changes

#### 1. Home Page — `src/hooks/useHomeFixtures.ts`
- **Upcoming fixtures query** (line ~175): Add `.eq("venue_type", "school")` to the query builder
- **User school fixture query** (line ~201): Add `.eq("venue_type", "school")`
- **Remove tournament fixtures merge**: The `rawTournamentFixtures` query (lines 233-265) fetches tournament fixtures and merges them into the home feed — remove this entire query and the merge logic (lines 307-314). Tournament fixtures should only show on tournament pages.
- Keep the `upcomingTournaments` query (lines 269-305) as-is since that powers the "Upcoming Tournaments" section (showing tournament cards, not fixture cards)
- Update the return to use `upcomingFixtures` directly instead of `mergedUpcomingFixtures`
- Remove the `tournamentLoading` from `fixturesLoading`

#### 2. Fixtures Hub — `src/hooks/useFixturesData.ts`
- **Main fixtures query** (line ~75): Add `.eq("venue_type", "school")` to the query builder, after the `.eq("is_visible", true)` line

#### 3. School Profile — `src/pages/SchoolProfile.tsx`
- **Upcoming fixtures query** (line ~192): Add `.eq("venue_type", "school")` after `.eq("is_visible", true)`

#### 4. Pool Leaderboard — `src/pages/PoolLeaderboard.tsx`
- **Pool fixtures query** (line ~284): Add `.eq("venue_type", "school")` to the query builder. Also add `.eq("is_visible", true)` which is currently missing.

### Files Changed

| File | Change |
|---|---|
| `src/hooks/useHomeFixtures.ts` | Add `venue_type = 'school'` filter; remove tournament fixture merge |
| `src/hooks/useFixturesData.ts` | Add `venue_type = 'school'` filter |
| `src/pages/SchoolProfile.tsx` | Add `venue_type = 'school'` filter |
| `src/pages/PoolLeaderboard.tsx` | Add `venue_type = 'school'` and `is_visible = true` filters |

### Not Changed
- `src/pages/Tournament.tsx` — This page should continue showing tournament fixtures as-is

