

## Plan: Remove `predicted_team`, Use IDs Only for Predictions

### Problem
The `predicted_team` column ('school_a'/'school_b'/'draw') is redundant — the winner can be derived from `predicted_school_id` + the fixture's `school_a_id`/`school_b_id`. For draws, `predicted_school_id` should be NULL.

### Database Changes (migration)

1. **Make `predicted_school_id` nullable** — draws will store NULL
2. **Drop the `predicted_team` column**
3. **Update `auto_score_fixture()` trigger** to derive the predicted team:
   - If `predicted_school_id IS NULL` → predicted draw
   - If `predicted_school_id = school_a_id` → predicted school_a
   - If `predicted_school_id = school_b_id` → predicted school_b
4. **Update `calculate_prediction_points()` function** similarly
5. **Update `audit_prediction_update()` trigger** to remove references to `predicted_team`
6. **Migrate existing draw predictions**: `UPDATE predictions SET predicted_school_id = NULL WHERE predicted_team = 'draw'`

### Code Changes

**`src/pages/Home.tsx`** — Remove `predicted_team` from upsert, set `predicted_school_id` to null for draws:
```ts
const upsertData = {
  fixture_id: matchId,
  user_id: user.id,
  predicted_margin: margin,
  predicted_school_id: isDraw ? null : schoolId,
};
```

**`src/pages/Fixtures.tsx`** — Remove `predicted_team` from insert/update, handle draw (schoolId === 'draw' → null):
```ts
predicted_school_id: schoolId === 'draw' ? null : schoolId,
// remove predicted_team lines
```

**`src/hooks/useFixturesData.ts`** — Remove `predicted_team` from interface and select query.

**`src/hooks/useHomeFixtures.ts`** — Remove `predicted_team` from select query. For draw detection, check if `predicted_school_id` is null.

**`src/pages/PoolLeaderboard.tsx`, `src/pages/Tournament.tsx`, `src/pages/SchoolProfile.tsx`** — Already only use `predicted_school_id` and `predicted_margin` in selects; no changes needed beyond removing any `predicted_team` references.

### Scoring Logic (DB function update)

The key change in `auto_score_fixture()`:
```sql
-- Derive predicted team from predicted_school_id
IF prediction_record.predicted_school_id IS NULL THEN
  pred_team := 'draw';
ELSIF prediction_record.predicted_school_id = NEW.school_a_id THEN
  pred_team := 'school_a';
ELSE
  pred_team := 'school_b';
END IF;

IF pred_team = actual_winner THEN
  -- existing scoring logic
```

### Summary
- 1 migration: nullable column, drop column, update 3 functions, migrate data
- 5 code files updated to remove `predicted_team` references
- Draws stored as `predicted_school_id = NULL`, `predicted_margin = 0`

