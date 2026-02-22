

## Drop `venue_legacy` and resolve venue from `venue_type` + `venue_id` / `tournament_id`

### Overview
Remove the `venue_legacy` column from fixtures. Keep `tournament_id`. The venue location displayed to users will be resolved dynamically:
- If `venue_type = 'tournament'`, the location name comes from the tournament joined via `tournament_id`
- If `venue_type = 'school'`, the location name comes from the school referenced by `venue_id`

This eliminates the redundant free-text `venue_legacy` column while keeping the `tournament_id` foreign key for direct tournament queries.

---

### Step 1: Database Migration

1. Backfill: For any fixture where `tournament_id IS NOT NULL` but `venue_type` is not `'tournament'`, update `venue_type = 'tournament'`.
2. Drop the `venue_legacy` column.

```text
UPDATE fixtures
SET venue_type = 'tournament'
WHERE tournament_id IS NOT NULL AND venue_type != 'tournament';

ALTER TABLE fixtures DROP COLUMN venue_legacy;
```

---

### Step 2: Create a shared venue resolution utility

Create `src/lib/venueUtils.ts` with a helper function:

```text
resolveVenueName(fixture):
  if venue_type === 'tournament' and tournament exists:
    return tournament.name
  if venue_type === 'school' and venue_id matches school_a or school_b:
    return that school's name
  return 'TBD'
```

This avoids duplicating venue resolution logic across many components.

---

### Step 3: Update all files referencing `venue_legacy`

**17 files** need updates to remove `venue_legacy` from interfaces, queries, and display logic, replacing it with the resolved venue name:

| File | Changes |
|------|---------|
| `src/hooks/useFixturesData.ts` | Remove `venue_legacy` from query select and interface |
| `src/hooks/useHomeFixtures.ts` | Remove `venue_legacy` from query; resolve venue from joined tournament/school data |
| `src/hooks/usePrefetch.ts` | Remove `venue_legacy` from query select |
| `src/components/fixtures/FixtureTable.tsx` | Remove `venue_legacy` from `Fixture` interface; display resolved venue name using tournament join or school_a/school_b match against venue_id |
| `src/components/fixtures/FixtureListCard.tsx` | Remove `venue_legacy` fallback from `getVenue()`; it already resolves from venue_type/venue_id |
| `src/components/home/HomeCarousel.tsx` | Remove `venue_legacy` from interface and query |
| `src/components/home/DerbySlide.tsx` | Remove `venue_legacy` from interface |
| `src/components/scores/MatchScoreSubmission.tsx` | Remove `venue_legacy` from interface and query; resolve venue from school data |
| `src/components/scores/SchoolScoreSubmission.tsx` | Remove `venue_legacy` from interface and query; resolve venue from school data |
| `src/components/auth/signup-steps/StepNextMatch.tsx` | Remove `venue_legacy` from interface and query; resolve venue from joined tournament or school |
| `src/pages/Fixtures.tsx` | Remove `venue_legacy` from fixture pass-through |
| `src/pages/SchoolProfile.tsx` | Remove `venue_legacy` from queries |
| `src/pages/Tournament.tsx` | Remove `venue_legacy` from display; resolve venue from tournament data (already available on the page) |
| `src/components/admin/FixturesTable.tsx` | Remove `venue_legacy` from search/display; resolve venue using the existing `schools` and `tournaments` maps |
| `src/components/admin/CreateFixtureDialog.tsx` | Remove `venue_legacy` / `venueLegacy` computation from insert data |
| `src/components/admin/EditFixtureDialog.tsx` | Remove `venue_legacy` / `venueLegacy` computation from update data |
| `src/components/admin/ImportFixturesButton.tsx` | Remove `venue_legacy` from fixture object |

---

### Step 4: Fix HistoricalFixturesUpload (bonus cleanup)

`src/components/admin/HistoricalFixturesUpload.tsx` still uses old column names (`home_school_id`, `away_school_id`, `venue`). Update to use `school_a_id`, `school_b_id`, `score_a`, `score_b`, and remove the `venue` field (was mapping to `venue_legacy`). Set `venue_type` and `venue_id` based on `tournament_id` presence.

---

### Key Principle
- `tournament_id` stays as a first-class FK for querying tournament fixtures
- `venue_type` determines where the location name comes from: `'tournament'` reads from the tournament join, `'school'` reads from `venue_id` matched against school data
- No more free-text venue field -- venue is always resolved from structured data

