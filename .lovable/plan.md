
## Store School ID Instead of "home"/"away" in Predictions

### Problem

Currently the `predictions` table stores `predicted_team` as a text field with values `"home"` or `"away"`. This is fragile -- it doesn't directly reference which school was picked. The request is to store the actual `school_id` instead.

### Database Migration

Alter the `predictions` table:
- Add column `predicted_school_id` (UUID, nullable initially for backfill, references `schools(id)`)
- Backfill existing records by joining with `fixtures`:
  ```sql
  UPDATE predictions p
  SET predicted_school_id = CASE 
    WHEN p.predicted_team = 'home' THEN f.home_school_id
    WHEN p.predicted_team = 'away' THEN f.away_school_id
  END
  FROM fixtures f WHERE f.id = p.fixture_id;
  ```
- After backfill, set `predicted_school_id` to NOT NULL
- Keep `predicted_team` column for now (the scoring function and display logic still reference it) -- no removal

### Code Changes

| File | Change |
|------|--------|
| `src/pages/Fixtures.tsx` | Update `handlePredictionSubmit` to resolve `school_id` from `team` + fixture data and include `predicted_school_id` in insert/update |
| `src/hooks/useHomeFixtures.ts` | Same -- resolve school ID when saving predictions |
| `src/components/home/PredictionDialog.tsx` | Update `onPredictionSubmit` callback signature to also pass `schoolId` |
| `src/components/home/FixtureCard.tsx` | Pass home/away school IDs to PredictionDialog so it can return the selected school ID |
| `src/hooks/useFixturesData.ts` | Include `predicted_school_id` in prediction select query and map |

### How It Works

1. PredictionDialog still lets the user pick "home" or "away" visually
2. When submitting, the calling code resolves the selected team to the actual `school_id` (e.g., if `team === "home"`, use `fixture.home_school_id`)
3. Both `predicted_team` ("home"/"away") and `predicted_school_id` (UUID) are saved
4. Display logic continues to use `predicted_team` for determining which side was picked
