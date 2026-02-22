

## Simplify `venue_type` to `school` | `tournament`

### Rationale

With deduplicated fixtures, each row already has `home_school_id` and `away_school_id`. The "home/away" concept is captured by those columns. The venue only needs to indicate **what kind of place** the match is at:

- **school** -- played at a school's ground (`venue_id` references `schools.id`)
- **tournament** -- played at a tournament/festival venue (`venue_id` references `tournaments.id`)

### Database Migration

```sql
-- Update venue_type values: home/away -> school
UPDATE public.fixtures
SET venue_type = 'school'
WHERE venue_type IN ('home', 'away');

-- Update default
ALTER TABLE public.fixtures
ALTER COLUMN venue_type SET DEFAULT 'school';
```

No new columns needed -- `venue_type` and `venue_id` already exist from the previous migration.

### Code Changes

**1. `CreateFixtureDialog.tsx` and `EditFixtureDialog.tsx`**

- Change ToggleGroup options from **Home / Away / Tournament** to **Home Ground / Away Ground / Tournament**
- "Home Ground" sets `venue_type = 'school'`, `venue_id = homeSchoolId`
- "Away Ground" sets `venue_type = 'school'`, `venue_id = awaySchoolId`
- "Tournament" sets `venue_type = 'tournament'`, `venue_id = tournamentId`
- The UI still offers three choices for user convenience, but the stored `venue_type` is only `school` or `tournament`

**2. `FixtureListCard.tsx` and other display components**

- Update venue resolution logic:
  - If `venue_type === 'school'`: compare `venue_id` against `home_school.id` and `away_school.id` to show the correct school name
  - If `venue_type === 'tournament'`: show tournament name
  - Fallback: show `venue_legacy` or "TBD"

**3. `multiSchoolParser.ts`**

- Change `venueType` type from `"home" | "away" | "tournament"` to `"school" | "tournament"`
- Both home and away fixtures set `venueType = "school"` with the appropriate school ID

**4. All other files referencing `venue_type`**

Update any comparisons from `=== 'home'` / `=== 'away'` to `=== 'school'`, and resolve which school by comparing `venue_id` to `home_school_id` / `away_school_id`.

### Files Affected

| File | Change |
|------|--------|
| `src/components/admin/CreateFixtureDialog.tsx` | ToggleGroup labels + stored value |
| `src/components/admin/EditFixtureDialog.tsx` | Same as Create |
| `src/components/fixtures/FixtureListCard.tsx` | Venue display logic |
| `src/components/admin/FixturesTable.tsx` | Venue column display |
| `src/components/scores/MatchScoreSubmission.tsx` | Venue display |
| `src/components/scores/SchoolScoreSubmission.tsx` | Venue display |
| `src/components/home/FixtureCard.tsx` | Venue display |
| `src/components/home/SchoolFixtureCard.tsx` | Venue display |
| `src/lib/fixtureParser/multiSchoolParser.ts` | venueType type + logic |
| `src/hooks/useFixturesData.ts` | No change (already selects venue_type/venue_id) |
| `src/hooks/usePrefetch.ts` | No change |

### Technical Notes

- The admin UI still presents three options (Home Ground, Away Ground, Tournament) for UX clarity, but only two values are stored in the database (`school`, `tournament`).
- To determine which school's ground a match is at, compare `venue_id` to `home_school_id` and `away_school_id` -- no extra column needed.
- A `neutral` type could be added later if needed for matches at venues unrelated to either school or a tournament.
