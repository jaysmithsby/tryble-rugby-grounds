

## Add Match Dates to Fixture Cards and Deduplicate Upcoming Fixtures

### Problem
1. Fixture cards don't show the match date -- users can't tell when games are
2. The "Upcoming Fixtures" section shows multiple fixtures per school instead of just the next one per school
3. Tournament fixtures within 6 days should still appear but be clearly marked

### Changes

#### 1. Add `matchDate` and `tournamentName` to FixtureCard

**File: `src/components/home/FixtureCard.tsx`**
- Add `matchDate?: string` and `tournamentName?: string` props
- Display the formatted date (e.g. "Sat 22 Feb") prominently in the card header alongside the venue, but without showing a time
- If `tournamentName` is provided, show a small badge/tag (e.g. a pill with a trophy icon) below the date indicating the tournament name

#### 2. Add `tournament_id` and tournament name to the data model

**File: `src/hooks/useHomeFixtures.ts`**
- Update the `FixtureWithSchools` interface to include `tournament_id: string | null` and `tournament_name: string | null`
- Update all three fixture queries (upcoming, tournament, recent) to also select `tournament_id` and the related tournament name via a join: `tournament:tournaments!fixtures_tournament_id_fkey(name)`
- Map the tournament name into the returned fixture objects

#### 3. Deduplicate upcoming fixtures: one next game per school

**File: `src/hooks/useHomeFixtures.ts`** (in the `mergedUpcomingFixtures` useMemo)

After merging and sorting chronologically:
- Track a `Set` of school IDs already represented
- Walk through the sorted fixtures; for each fixture, check if either the home or away school already has a fixture in the result set
- If both schools are already represented, skip the fixture
- **Exception**: if a fixture's date is within 6 days of an already-included fixture for that school AND it has a `tournament_id`, still include it and mark it as a tournament fixture
- Add the school IDs from each included fixture to the set
- This ensures each school appears at most once (their next game), unless a tournament fixture falls within the 6-day window

#### 4. Pass date and tournament info from Home.tsx to FixtureCard

**File: `src/pages/Home.tsx`**
- Pass `matchDate={fixture.match_date}` and `tournamentName={fixture.tournament_name}` to each `FixtureCard`
- Remove the time portion from `formatMatchTime` usage for upcoming fixtures (the card itself will handle date display)

#### 5. Also add date to SchoolFixtureCard

**File: `src/components/home/SchoolFixtureCard.tsx`**
- Add `matchDate?: string` prop and display the formatted date (day + date, no time) in the card

---

### Technical Details

**Date formatting** (using `date-fns`):
```
format(new Date(matchDate), "EEE d MMM")  // e.g. "Sat 22 Feb"
```

**Deduplication logic** (pseudo-code):
```text
sorted fixtures (chronological)
seenSchools = Map<schoolId, earliestMatchDate>
result = []

for each fixture:
  homeId = fixture.home_school.id
  awayId = fixture.away_school.id
  homeSeen = seenSchools.has(homeId)
  awaySeen = seenSchools.has(awayId)

  if not homeSeen or not awaySeen:
    include fixture, record both school IDs with this date
  else if fixture has tournament_id:
    homeEarliest = seenSchools.get(homeId)
    awayEarliest = seenSchools.get(awayId)
    if within 6 days of the earliest for either school:
      include fixture (tournament exception)
  // else skip
```

**Tournament badge in FixtureCard**: A small pill/tag rendered conditionally:
```tsx
{tournamentName && (
  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
    {tournamentName}
  </span>
)}
```

### Files Modified
- `src/hooks/useHomeFixtures.ts` -- add tournament fields, dedup logic
- `src/components/home/FixtureCard.tsx` -- add date display, tournament badge
- `src/components/home/SchoolFixtureCard.tsx` -- add date display
- `src/pages/Home.tsx` -- pass new props

