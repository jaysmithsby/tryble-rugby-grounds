

## Fixture Import with School Alias Learning

### Overview

Replace the current fixture import with a two-phase system: first detect unknown school names and let the admin map them via a modal, then persist those mappings as aliases in the database and proceed with the import. This eliminates guesswork and teaches the system permanently.

### Phase 1: Database Migration

Add an `alias` column to the `schools` table:

```sql
ALTER TABLE public.schools ADD COLUMN alias jsonb DEFAULT '[]'::jsonb;
```

No RLS changes needed -- the existing admin UPDATE policy covers writing to this column.

### Phase 2: Service Rewrite -- `src/lib/fixtureImportService.ts`

**Updated lookup prefetch:**
- Fetch `schools` with `id, name, main_rival, alias`
- Build `schoolNameToId` map that indexes BOTH `name` AND every string in the `alias` array (all lowercase/trimmed)
- Keep existing tournament/edition map logic unchanged

**New two-step public API:**

```typescript
// Step 1: Parse CSV and identify unknown schools
export async function analyzeFixturesCsv(rows: CsvFixtureRow[]): Promise<AnalysisResult>
// Returns: { unknownSchools: string[], allSchools: SchoolOption[], maps: LookupMaps, rows: CsvFixtureRow[] }

// Step 2: Apply mappings then import
export async function applyMappingsAndImport(
  mappings: Record<string, string>,  // unknownName → schoolId
  maps: LookupMaps,
  rows: CsvFixtureRow[]
): Promise<ImportResult>
```

**`analyzeFixturesCsv`:**
1. Pre-fetch lookups (including alias)
2. Scan all rows, collect every unique school name (from `school_a_name`, `school_b_name`, `venue_school`) not found in the map
3. If no unknowns, proceed directly to mapping and import, return result
4. If unknowns exist, return the list plus the full school roster for dropdown population

**`applyMappingsAndImport`:**
1. For each mapping entry, UPDATE the school's `alias` column: `alias = alias || '["Unknown Name"]'::jsonb`
2. Refresh the lookup maps (re-add the new aliases to `schoolNameToId`)
3. Run the existing `mapRow` logic for all rows
4. Batch insert valid fixtures
5. Return `{ inserted, errors }`

**Existing logic preserved:** `mapRow`, `insertFixtures`, derby logic, venue logic, status computation, tournament edition resolution -- all unchanged.

### Phase 3: New Modal Component -- `src/components/admin/SchoolMappingDialog.tsx`

A dialog that:
- Receives `unknownSchools: string[]` and `allSchools: { id: string; name: string }[]`
- Renders a scrollable list, each row showing the unknown CSV name and a searchable Combobox (using existing `cmdk` / Command component) to pick a school
- "Confirm Mapping" button is disabled until all unknowns are mapped
- On confirm, calls the parent callback with the mapping `Record<string, string>`

```text
┌─────────────────────────────────────────────┐
│  Map Unknown Schools                        │
│                                             │
│  "St John's College"  → [Search school ▼]   │
│  "Maritzburg Coll"    → [Search school ▼]   │
│  "DHS"                → [Search school ▼]   │
│                                             │
│              [Cancel]  [Confirm Mapping]    │
└─────────────────────────────────────────────┘
```

### Phase 4: Rewrite `ImportFixturesButton.tsx`

The component orchestrates the flow:

1. User selects CSV file → PapaParse extracts rows
2. Call `analyzeFixturesCsv(rows)`
3. If unknowns found → open `SchoolMappingDialog`, pass unknowns + school list
4. On confirm mapping → call `applyMappingsAndImport(mappings, maps, rows)`
5. If no unknowns → import proceeds immediately
6. Show success/error toasts with counts

State managed: `loading`, `mappingDialogOpen`, `unknownSchools`, `allSchools`, `pendingMaps`, `pendingRows`

### Files Changed

| File | Action |
|---|---|
| Database: `schools.alias` column | Migration (ADD COLUMN) |
| `src/lib/fixtureImportService.ts` | Rewrite with alias support + two-step API |
| `src/components/admin/SchoolMappingDialog.tsx` | New file |
| `src/components/admin/ImportFixturesButton.tsx` | Rewrite to orchestrate analysis → mapping → import |

### No Other Files Affected

The `Admin.tsx` page already renders `<ImportFixturesButton onSuccess={handleFixtureChange} />` -- no changes needed there.

