

## Add "Cleanup Duplicates" Button to Admin Panel

### Overview

Add a database RPC function, a service-layer wrapper, and a new admin button component to remove duplicate fixtures directly from the Admin panel.

### Step 1: Database RPC Function

Create a migration with a new `delete_duplicate_fixtures` function:

```sql
CREATE OR REPLACE FUNCTION public.delete_duplicate_fixtures()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  removed integer;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;

  WITH dupes AS (
    SELECT unnest(ids[2:]) AS dup_id
    FROM (
      SELECT array_agg(id ORDER BY
        CASE WHEN score_a IS NOT NULL AND score_b IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN tournament_id IS NOT NULL THEN 0 ELSE 1 END,
        created_at ASC
      ) AS ids
      FROM fixtures
      GROUP BY LEAST(school_a_id, school_b_id), GREATEST(school_a_id, school_b_id), match_date::date
      HAVING COUNT(*) > 1
    ) grouped
  )
  DELETE FROM fixtures WHERE id IN (SELECT dup_id FROM dupes);

  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;
```

This uses the same LEAST/GREATEST logic to catch mirror duplicates and the same priority ordering (scores > tournament > earliest created).

### Step 2: Service Layer

Add to `src/lib/fixtureImportService.ts`:

```typescript
export async function cleanupExistingDuplicates(): Promise<number> {
  const { data, error } = await supabase.rpc("delete_duplicate_fixtures");
  if (error) throw new Error(`Cleanup failed: ${error.message}`);
  return (data as number) ?? 0;
}
```

### Step 3: New Component

Create `src/components/admin/CleanupFixturesButton.tsx`:

- `Button` with `variant="outline"` and a `Trash2` icon
- `confirm()` dialog before running
- Loading state with `Loader2` spinner
- Toast on success showing count of removed duplicates
- Accepts `onSuccess` callback to refresh the fixtures table

### Step 4: Admin.tsx Integration

Place the button next to the existing `ImportFixturesButton` and `Historical Fixtures` button in the action bar.

### Files Changed

| File | Change |
|---|---|
| New migration | `delete_duplicate_fixtures` RPC function |
| `src/lib/fixtureImportService.ts` | Add `cleanupExistingDuplicates` export |
| `src/components/admin/CleanupFixturesButton.tsx` | New component |
| `src/pages/Admin.tsx` | Import and render `CleanupFixturesButton` |

