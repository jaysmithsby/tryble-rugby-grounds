

## Add `create-fixture` Action to n8n-data-api

### What
Add a new `create-fixture` POST action to the existing `n8n-data-api` edge function that inserts a fixture into the `fixtures` table.

### File: `supabase/functions/n8n-data-api/index.ts`

Add a new `create-fixture` handler block (after the existing `create-school` block) that:

1. Reads and validates the POST body fields:
   - **Required**: `school_a_id` (UUID), `school_b_id` (UUID), `match_date` (ISO string), `season` (string), `year` (integer)
   - **Optional**: `sport` (default `"Rugby"`), `is_derby` (default `false`), `is_visible` (default `true`), `venue_type` (default `"school"`), `score_a`, `score_b`, `status` (default `"upcoming"`), `tournament_id` (UUID), `edition_id` (UUID — mapped to the `tournament_id` column in the fixtures table per the edition-based architecture)

2. Validates UUIDs with the existing `UUID_RE` regex, validates `status` against the existing `VALID_STATUSES` array, and checks `year` is an integer.

3. Performs **mirror-duplicate detection** — queries fixtures where `LEAST(school_a_id, school_b_id)` and `GREATEST(school_a_id, school_b_id)` match the input pair on the same `match_date::date`. If a match exists, returns `409 Conflict` with the existing fixture ID.

4. Inserts into `fixtures` and returns `{ success: true, data: <inserted row> }` with status `201`.

### Technical Details
- The `edition_id` parameter maps to the `tournament_id` column on the `fixtures` table (since `fixtures.tournament_id` references `tournament_editions.id`, not `tournaments.id`).
- Uses the service role client (already instantiated) to bypass RLS.
- Follows the same validation, error handling, and CORS pattern as `create-school`.
- Update the error message listing known actions to include `create-fixture`.

