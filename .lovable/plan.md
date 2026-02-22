

## Add Polymorphic `venue_id` + `venue_type` to Fixtures

Replace the free-text `venue` column with a `venue_type` enum and a polymorphic `venue_id` UUID. The app resolves `venue_id` against either the `schools` or `tournaments` table based on `venue_type`.

### Database Migration

1. Add `venue_type` column (text, nullable, default `'home'`) with allowed values: `home`, `away`, `neutral`, `tournament`
2. Add `venue_id` column (UUID, nullable) -- no FK constraint since it's polymorphic
3. Backfill existing data: set `venue_type = 'home'` and `venue_id = home_school_id` for all rows (best guess)
4. Rename `venue` to `venue_legacy` to preserve data during migration (can be dropped later)

```text
New columns on fixtures:
  venue_type  text     DEFAULT 'home'  (home | away | neutral | tournament)
  venue_id    uuid     nullable
  venue_legacy text    (renamed from venue, kept for reference)
```

### 1. Bulk Parser: `src/lib/fixtureParser/multiSchoolParser.ts`

Update `BulkFixtureRow` interface:
- Add `venueType: "home" | "away" | "tournament"` and `venueId: string`

Update `parseFixtureLine`:
- If `homeAway === "home"`, set `venueType = "home"`, `venueId = homeTeamId`
- If `homeAway === "away"`, set `venueType = "away"`, `venueId = awayTeamId`
- If a tournament is detected, set `venueType = "tournament"`, `venueId = tournamentId`

### 2. Admin UI: `CreateFixtureDialog.tsx`

Replace the venue text input with a venue type selector:

- Add state: `venueType` (default `"home"`) and computed `venueId`
- Add a `ToggleGroup` with three options: **Home**, **Away**, **Tournament**
- When **Home** selected: `venueId` auto-set to `homeSchoolId`, display home school name (read-only)
- When **Away** selected: `venueId` auto-set to `awaySchoolId`, display away school name (read-only)
- When **Tournament** selected: show tournament combobox (already exists), `venueId` set to selected `tournamentId`
- On submit: include `venue_type` and `venue_id` in the fixture data; set `venue` to resolved name for backward compat or to `"TBD"` if not yet resolved

Remove the old venue text `<Input>` field.

### 3. Admin UI: `EditFixtureDialog.tsx`

Same changes as Create:
- Initialize `venueType` from `fixture.venue_type` (fall back to `"home"`)
- Add ToggleGroup for venue type selection
- Replace venue text input with auto-resolved display
- On submit: include `venue_type` and `venue_id`

### 4. Display: `FixtureListCard.tsx`

Update venue display logic:
- Accept `venue_type` and `venue_id` in the fixture interface (alongside `home_school` and `away_school`)
- If `venue_type === "home"`: show home school name
- If `venue_type === "away"`: show away school name
- If `venue_type === "tournament"` and tournament exists: show tournament name
- Fallback: show `venue_legacy` or "TBD"

### 5. Other Files Affected

| File | Change |
|------|--------|
| `src/hooks/useFixturesData.ts` | Add `venue_type, venue_id` to select; keep `venue` as `venue_legacy` if renamed |
| `src/hooks/usePrefetch.ts` | Add `venue_type, venue_id` to select |
| `src/components/admin/FixturesTable.tsx` | Update venue column display to resolve from `venue_type`/`venue_id` |
| `src/components/scores/SchoolScoreSubmission.tsx` | Update venue display |
| `src/components/home/FixtureCard.tsx` | Update venue display if it uses venue text |
| `src/components/home/SchoolFixtureCard.tsx` | Update venue display |
| `supabase/functions/seed-fixtures/index.ts` | Update to use `venue_type`/`venue_id` if it sets venue |

### Technical Notes

- The `venue` column rename to `venue_legacy` ensures no data loss. It can be dropped in a future migration once all data is verified.
- Since `venue_id` has no FK constraint, the app must handle cases where the referenced school/tournament is deleted (show "Unknown" or fallback).
- The `venue_type` column uses text (not a Postgres enum) to keep migrations simple and avoid enum-alter headaches.
- The ToggleGroup component already exists in `src/components/ui/toggle-group.tsx`.

