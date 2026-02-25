

## Add Two-Layer Duplicate Prevention to Fixture Import

### Overview

Add fingerprint-based deduplication to `fixtureImportService.ts` so that duplicate fixtures are caught both within a single CSV upload and against the existing database. No new files needed -- all changes are encapsulated in the service and the button component's toast message.

### Fingerprint Logic

A new helper function `getFixtureFingerprint`:

```typescript
function getFixtureFingerprint(schoolAId: string, schoolBId: string, matchDate: string): string {
  const [lo, hi] = [schoolAId, schoolBId].sort();
  const day = matchDate.substring(0, 10); // YYYY-MM-DD
  return `${lo}|${hi}|${day}`;
}
```

Sorting the two IDs ensures `A vs B` and `B vs A` produce the same fingerprint. Truncating to date ignores time differences.

### Layer 1: Intra-CSV Deduplication (in `runImport`)

- Maintain a `Map<string, number>` mapping fingerprint to the first row number that produced it.
- After `mapRow` succeeds, compute the fingerprint. If already in the map, skip the fixture and log: `"Row X: Duplicate of row Y within CSV (same schools and date)"`.
- Otherwise, add the fingerprint and keep the fixture.

### Layer 2: Database Deduplication (new `fetchExistingFingerprints`)

A new async function that:
1. Collects all unique `YYYY-MM-DD` date strings from the valid fixtures.
2. Queries `fixtures` using `LEAST(school_a_id, school_b_id)` / `GREATEST(school_a_id, school_b_id)` and `match_date::date = ANY($dates)` in a single query -- leveraging the existing `idx_fixtures_mirror_pair_date` index.
3. Returns a `Set<string>` of fingerprints already in the database.

This check runs after `runImport` produces valid fixtures but before the batch insert. Any fixture matching a DB fingerprint is filtered out and logged: `"Skipped: Fixture already exists in database (date YYYY-MM-DD)"`.

### Updated `ImportResult` Interface

```typescript
export interface ImportResult {
  inserted: number;
  skipped: number;    // NEW -- count of duplicates removed
  errors: ImportError[];
}
```

### Updated Toast in `ImportFixturesButton.tsx`

The `showResult` function will display the skipped count:

```
"Inserted 50, Skipped 5 (duplicates), 0 Errors"
```

### Execution Flow

```text
CSV rows
  │
  ▼
runImport()          ← Layer 1: intra-CSV dedup via fingerprint Set
  │
  ▼
validFixtures[]
  │
  ▼
fetchExistingFingerprints()   ← Layer 2: single DB query using LEAST/GREATEST
  │
  ▼
filter out DB duplicates
  │
  ▼
insertFixtures()     ← only truly new fixtures
  │
  ▼
ImportResult { inserted, skipped, errors }
```

### Files Changed

| File | Change |
|---|---|
| `src/lib/fixtureImportService.ts` | Add `getFixtureFingerprint`, intra-CSV dedup in `runImport`, new `fetchExistingFingerprints`, filter before insert, add `skipped` to `ImportResult` |
| `src/components/admin/ImportFixturesButton.tsx` | Update `showResult` to display skipped count in toast |

### No other files affected

The `SchoolMappingDialog`, `Admin.tsx`, and all other components remain unchanged. Deduplication is fully encapsulated in the service layer.

