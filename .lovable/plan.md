

## Rename `home_school_id` / `away_school_id` to `school_a_id` / `school_b_id`

### Overview
Rename the database columns and all code references so that the two schools in a fixture are simply "School A" and "School B" -- removing any implication that column order determines venue or home advantage. The venue continues to be driven solely by `venue_type` and `venue_id`.

This also means renaming `home_score` / `away_score` to `score_a` / `score_b` for consistency, and updating the `predicted_team` values from `"home"` / `"away"` to `"school_a"` / `"school_b"`.

---

### Step 1: Database Migration

A single migration to:

1. Rename columns on `fixtures`:
   - `home_school_id` -> `school_a_id`
   - `away_school_id` -> `school_b_id`
   - `home_score` -> `score_a`
   - `away_score` -> `score_b`

2. Rename foreign key constraints:
   - Drop `fixtures_home_school_id_fkey` and `fixtures_away_school_id_fkey`
   - Create `fixtures_school_a_id_fkey` and `fixtures_school_b_id_fkey`

3. Recreate the mirror-pair index using the new column names.

4. Update `predictions` data: change `predicted_team` values from `'home'` -> `'school_a'` and `'away'` -> `'school_b'`.

---

### Step 2: Update All Source Files (~20 files)

Every reference to `home_school_id`, `away_school_id`, `home_school`, `away_school`, `home_score`, `away_score` in the context of fixtures needs to be renamed to `school_a_id`, `school_b_id`, `school_a`, `school_b`, `score_a`, `score_b`.

**Files to update:**

| File | Changes |
|------|---------|
| `src/components/fixtures/FixtureTable.tsx` | Rename `Fixture` interface fields, `sortSchoolsAlpha` references, search filter |
| `src/components/fixtures/FixtureListCard.tsx` | Rename interface fields, `getVenue` logic, `FixtureCard` props |
| `src/components/fixtures/MatchHistory.tsx` | Rename `HistoricalFixture` fields, query columns, score resolution logic |
| `src/hooks/useFixturesData.ts` | Rename interface, query select columns, foreign key aliases, filter logic |
| `src/hooks/useHomeFixtures.ts` | Rename `FixtureWithSchools` interface, query, transform function, filters |
| `src/hooks/usePrefetch.ts` | Rename query select columns and foreign key aliases |
| `src/pages/Fixtures.tsx` | Rename `predicted_team` derivation (`"home"`/`"away"` -> `"school_a"`/`"school_b"`) |
| `src/pages/Home.tsx` | Same `predicted_team` derivation rename |
| `src/pages/SchoolProfile.tsx` | Rename query columns, foreign key aliases, filter logic |
| `src/pages/Tournament.tsx` | Rename query columns and foreign key aliases |
| `src/pages/PoolLeaderboard.tsx` | Rename filter references |
| `src/components/admin/FixturesTable.tsx` | Rename column headers, sort mapping, search filter, display references |
| `src/components/admin/CreateFixtureDialog.tsx` | Rename fixture data fields, duplicate check query |
| `src/components/admin/EditFixtureDialog.tsx` | Rename all `home_school_id`/`away_school_id` references, venue logic |
| `src/components/admin/ImportFixturesButton.tsx` | Rename CSV column mapping and fixture object fields |
| `src/components/admin/BulkYearCorrectionDialog.tsx` | Rename `homeName`/`awayName` display fields |
| `src/components/scores/MatchScoreSubmission.tsx` | Rename interface, query, `isUserHomeTeam` -> `isUserSchoolA`, display |
| `src/components/scores/SchoolScoreSubmission.tsx` | Same as above |
| `src/components/home/HomeCarousel.tsx` | Rename derby query foreign key aliases |
| `src/components/home/DerbySlide.tsx` | Rename `home_school`/`away_school` prop references |
| `src/components/home/SchoolFixtureCard.tsx` | Rename fixture prop references |
| `src/components/auth/signup-steps/StepNextMatch.tsx` | Rename query and display references |

---

### Step 3: Update Admin Table Headers

In `FixturesTable.tsx`, rename the column headers:
- "Home" -> "School A"
- "Away" -> "School B"

The sort field type values `'home'` / `'away'` become `'school_a'` / `'school_b'` and map to `school_a_id` / `school_b_id`.

---

### Key Principle
- The venue is always determined by `venue_id` + `venue_type` -- never by which column a school is in
- `school_a` and `school_b` are interchangeable positions with no semantic meaning beyond "the two teams playing"
- Scores `score_a` and `score_b` correspond to the school in the respective column

