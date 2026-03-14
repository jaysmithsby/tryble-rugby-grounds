## Auto-sync Tournament Edition Dates from Fixtures

### Approach

Use a **database trigger** (not an edge function) since this needs to fire automatically on every fixture INSERT/UPDATE/DELETE. A trigger is more reliable and has zero latency compared to an edge function that would need to be called manually.

### Changes

**1. Database migration — create trigger function + trigger**

Create `update_edition_dates_from_fixtures()` that:

- Fires AFTER INSERT, UPDATE, DELETE on `fixtures`
- When a fixture's `tournament_id or match_date` changes or is set/cleared, recalculates dates for both the old and new edition
- Sets `start_date = MIN(match_date)` and `end_date = MAX(match_date)` from all fixtures linked to that edition
- If no fixtures remain, sets both dates to the edition's `created_at` (fallback)

```sql
CREATE OR REPLACE FUNCTION update_edition_dates_from_fixtures()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ ... $$;

CREATE TRIGGER trg_sync_edition_dates
AFTER INSERT OR UPDATE OR DELETE ON fixtures
FOR EACH ROW EXECUTE FUNCTION update_edition_dates_from_fixtures();
```

**2. `CreateEditionDialog.tsx` — remove date fields from form**

- Remove `start_date` and `end_date` from the zod schema and form fields
- Set default values for `start_date`/`end_date` to `now()` in the insert call (the trigger will overwrite once fixtures are assigned)
- Add a note: "Dates are set automatically from linked fixtures"

**3. `EditEditionDialog.tsx` — make dates read-only**

- Remove `start_date` and `end_date` from the form schema
- Display the current dates as read-only text (not editable inputs)
- Remove them from the `onSubmit` update payload
- Add a note: "Dates are set automatically from linked fixtures"

**4. `TournamentsTable.tsx` — no changes needed**

The table already reads `start_date`/`end_date` from the edition data; it will reflect the auto-computed values.

### Files

- New migration SQL (trigger + function)
- `src/components/admin/CreateEditionDialog.tsx`
- `src/components/admin/EditEditionDialog.tsx`