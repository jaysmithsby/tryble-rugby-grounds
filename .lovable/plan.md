

## Add Springboks Table and School Profile Integration

### Overview
Create a `springboks` database table, seed it with the CSV data (64 players), then add a collapsible Springboks list at the bottom of each school profile page. The Springboks count in the header becomes clickable -- tapping it scrolls to and opens the collapsible section.

### Step 1: Create the `springboks` table (migration)

```text
Columns:
  id          UUID  PK  default gen_random_uuid()
  cap_number  INTEGER  NOT NULL  (the "#" column)
  player_name TEXT  NOT NULL
  debut_year  INTEGER  NOT NULL
  high_school TEXT  NOT NULL  (display name, kept for players with no school_id)
  school_id   UUID  NULLABLE  FK -> schools(id)
  matric_year TEXT  NULLABLE  (some values like "2010-11")
  craven_week TEXT  NULLABLE
  sa_schools  TEXT  NULLABLE
  created_at  TIMESTAMPTZ  default now()

RLS:
  SELECT -> true (public data)
  INSERT/UPDATE/DELETE -> admin only
```

Matric, Craven Week, and SA Schools are stored as TEXT because some values contain ranges like "2010-11" or "N/A".

### Step 2: Seed the data (insert tool)

Insert all 64 rows from the CSV. Empty School ID values become NULL. "N/A" values for matric/craven_week/sa_schools are stored as NULL.

### Step 3: Create `SpringboksTable` component

New file: `src/components/school/SpringboksTable.tsx`

- Accepts `schoolId: string` prop
- Fetches from `springboks` table where `school_id = schoolId`, ordered by `cap_number DESC`
- Uses the same Table/TableBody/TableRow/TableCell components as `RecentResultsTable`
- 3-column layout: `Cap # | Player | Debut`
- Clean, compact rows matching the results table style
- Paginated at 5 per page using `usePagination`
- Shows empty state "No Springboks on record." if none

### Step 4: Update `SchoolProfile.tsx`

- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from the existing collapsible UI component
- Import `SpringboksTable`
- Add a `useRef` for the Springboks section and state `springboksOpen` (boolean, default false)
- Make the Trophy/Springboks count in the header a clickable button that:
  - Sets `springboksOpen(true)`
  - Scrolls the ref into view with smooth scrolling
- Add a new collapsible section at the bottom of `<main>` (after Recent Results):

```text
  [Collapsible]
    [CollapsibleTrigger] "Springboks (count)" with chevron
    [CollapsibleContent]
      <SpringboksTable schoolId={school.id} />
  [/Collapsible]
```

- The springboks_count in the header now comes from the actual count of rows in the springboks table (or falls back to `school.springboks_count` until loaded)

### Files

| File | Action |
|------|--------|
| Migration SQL | Create `springboks` table with RLS |
| Insert SQL | Seed 64 rows from CSV |
| `src/components/school/SpringboksTable.tsx` | New component |
| `src/pages/SchoolProfile.tsx` | Add collapsible section + clickable count |

