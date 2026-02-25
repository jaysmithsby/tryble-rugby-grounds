

## Rewrite Fixture CSV Import: Clean, Modular Implementation

### Overview
Delete the existing monolithic import logic in `ImportFixturesButton.tsx` and replace it with a dedicated service module plus a streamlined UI component. The new system uses the exact CSV headers specified, pre-fetches lookup data into maps, auto-derives derby/status/venue logic, and collects errors for display.

### Architecture

```text
src/
  lib/
    fixtureImportService.ts   ← NEW: all mapping/validation/insert logic
  components/admin/
    ImportFixturesButton.tsx   ← REWRITE: thin UI shell calling the service
```

### File 1: `src/lib/fixtureImportService.ts` (new)

**TypeScript interfaces:**

```typescript
// Expected CSV row shape
interface CsvFixtureRow {
  index: string;
  school_a_name: string;
  school_b_name: string;
  date_time: string;
  score_a: string;
  score_b: string;
  venue_type: string;       // 'school' | 'tournament'
  venue_school: string;     // school name when venue_type = 'school'
  tournament_name: string;
  season: string;
  status: string;           // optional override
  source_url: string;
}

// Shape inserted into fixtures table
interface FixtureInsert {
  school_a_id: string;
  school_b_id: string;
  match_date: string;
  score_a: number | null;
  score_b: number | null;
  venue_type: string;
  venue_id: string | null;
  tournament_id: string | null;
  season: string;
  year: number;
  status: string;
  source_url: string | null;
  is_derby: boolean;
  sport: string;
  is_visible: boolean;
}

interface ImportError {
  row: number;
  message: string;
}

interface ImportResult {
  inserted: number;
  errors: ImportError[];
}
```

**Lookup maps (pre-fetched once):**

```typescript
interface LookupMaps {
  schoolNameToId: Map<string, string>;    // lowercase name → UUID
  schoolIdToRival: Map<string, string>;   // school UUID → main_rival (name)
  schoolNameSet: Set<string>;             // all lowercase names for validation
  tournamentNameToId: Map<string, string>;  // lowercase name → tournament UUID
  editionMap: Map<string, string>;         // `${tournamentId}_${year}` → edition UUID
}
```

- Fetch `schools` with `id, name, main_rival`
- Fetch `tournaments` with `id, name`
- Fetch `tournament_editions` with `id, tournament_id, year`
- Build all maps in a single `prefetchLookups()` function

**Core mapping function** `mapRow(row: CsvFixtureRow, rowIndex: number, maps: LookupMaps)`:

1. Resolve `school_a_id` and `school_b_id` from name maps (case-insensitive, trimmed)
2. If either missing, push to errors array and skip
3. **Derby logic**: check if `schoolIdToRival.get(schoolAId)` matches school B's name (or vice versa) → `is_derby = true`
4. **Venue logic**:
   - If `venue_type === 'tournament'`: look up tournament by name → get edition by `tournamentId_year` → set `tournament_id = editionId`, `venue_id = null`
   - If `venue_type === 'school'`: resolve `venue_school` name to UUID → set `venue_id`, `tournament_id = null`
5. **Status computation**:
   - Parse `date_time` as Date
   - If date is in the future → `'upcoming'`
   - If date is in the past and both scores present → `'completed'`
   - If date is in the past and scores missing → `'final'`
   - CSV `status` column can override if explicitly provided
6. **Year**: `parseInt(row.season)` for the `year` column
7. **Sport**: always `'Rugby'`

**Insert function** `insertFixtures(fixtures: FixtureInsert[])`:
- Batch insert in groups of 50
- Return count of inserted rows

**Top-level export** `importFixturesFromCsv(rows: CsvFixtureRow[]): Promise<ImportResult>`:
1. Call `prefetchLookups()`
2. Map each row, collecting errors
3. Insert valid fixtures
4. Return `{ inserted, errors }`

### File 2: `src/components/admin/ImportFixturesButton.tsx` (rewrite)

The component becomes a thin UI shell:
- File input + PapaParse to get `CsvFixtureRow[]`
- Calls `importFixturesFromCsv(rows)`
- Shows toast with inserted count
- If errors exist, shows a detailed toast or alert listing each error (row number + message)
- Resets file input after import
- Calls `onSuccess` callback

### Business Rules Summary

| CSV Column | Fixture Column | Logic |
|---|---|---|
| `school_a_name` | `school_a_id` | Name → UUID lookup |
| `school_b_name` | `school_b_id` | Name → UUID lookup |
| `date_time` | `match_date` | Direct timestamptz |
| `score_a` | `score_a` | Parse int or null |
| `score_b` | `score_b` | Parse int or null |
| `venue_type` | `venue_type` | Direct |
| `venue_school` | `venue_id` | Name → UUID (when school) |
| `tournament_name` | `tournament_id` | Name → tournament → edition UUID |
| `season` | `season` | Direct text |
| `season` | `year` | Extract integer |
| `source_url` | `source_url` | Direct |
| (derived) | `is_derby` | Rival check from schools table |
| (derived) | `status` | Date + score logic |
| (static) | `sport` | Always `'Rugby'` |

### Error Handling

Errors are collected (not thrown) into an `ImportError[]` array with the CSV row number and a human-readable message:
- "Row 5: School 'XYZ Academy' not found in database"
- "Row 12: Tournament 'ABC Cup' not found"
- "Row 12: No edition found for 'ABC Cup' in season 2025"
- "Row 8: Missing required field school_a_name"

After import, a summary toast shows inserted count and error count. If errors exist, they are logged to console and shown in a secondary toast.

### No Database Changes Required

All tables (`fixtures`, `schools`, `tournaments`, `tournament_editions`) already exist with the needed columns.

