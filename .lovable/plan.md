

## Add `match_date` Support to `update-fixture-score`

### Current State
The `update-fixture-score` endpoint accepts: `fixture_id`, `score_a`, `score_b`, `status`, `updated_at`. No `match_date` field.

### Change
**File: `supabase/functions/update-fixture-score/index.ts`**

1. Read optional `match_date` from the request body
2. If provided, validate it's a non-empty string (ISO timestamp format)
3. Include `match_date` in the `.update()` call alongside the existing fields

The field will be optional — if omitted, the update proceeds as before without touching `match_date`. If included, it updates the `match_date` column on the fixture row.

### Technical Detail
- Add `match_date` to the destructured body: `const { fixture_id, score_a, score_b, status, updated_at, match_date } = body;`
- Build the update object conditionally: always include `score_a`, `score_b`, `status`, `updated_at`; add `match_date` only if provided
- Validate `match_date` is a string if present

