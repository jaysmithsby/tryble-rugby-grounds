

# Tournament Editions: Splitting Recurring Tournaments from Yearly Instances

## Overview

Currently the `tournaments` table mixes the permanent identity of a tournament (name, host, venue, province, sponsor) with year-specific data (dates, participating schools, active status). This means the "Kearsney Easter Festival" gets re-created every year as a separate row.

The fix: split into two tables so the tournament entity persists and each year gets its own "edition" row with that year's specific dates and schools.

---

## 1. New Data Model

### `tournaments` table (stays, but simplified)

Holds the permanent identity of each tournament. Fields that stay:

- `id`, `name`, `host_school`, `venue`, `province`, `format_notes`
- `logo_url`, `sponsor_name`, `sponsor_logo_url`
- `created_at`, `updated_at`

Fields removed (moved to editions):

- `start_date`, `end_date` -- these are per-edition
- `participating_schools` -- varies year to year
- `is_active` -- replaced by whether an edition exists for the current year

### New table: `tournament_editions`

One row per tournament per year.

```
tournament_editions
  id                    uuid (PK, default gen_random_uuid())
  tournament_id         uuid (FK -> tournaments.id, NOT NULL)
  year                  integer (NOT NULL)
  start_date            timestamptz (NOT NULL)
  end_date              timestamptz (NOT NULL)
  participating_schools text[] (default '{}')
  is_active             boolean (default true)
  created_at            timestamptz (default now())
  updated_at            timestamptz (default now())

  UNIQUE(tournament_id, year)
```

### Fixtures FK change

The `fixtures.tournament_id` currently points to `tournaments.id`. It will be changed to point to `tournament_editions.id` instead, since a fixture belongs to a specific year's edition, not the abstract tournament.

### User follows

`user_tournament_follows.tournament_id` stays pointing to `tournaments.id` -- users follow the tournament itself, not a specific edition. This means they automatically see all editions.

---

## 2. Database Migration

This migration will be presented for your manual review and approval before execution.

### Step-by-step:

1. Create `tournament_editions` table with RLS policies (same pattern as tournaments: admins CRUD, everyone can SELECT)
2. Migrate existing data: for each row in `tournaments`, create a corresponding `tournament_editions` row carrying over `start_date`, `end_date`, `participating_schools`, and `is_active`
3. Update `fixtures.tournament_id` FK: drop old FK, add new FK pointing to `tournament_editions.id`, update existing fixture rows to reference the new edition IDs
4. Drop the moved columns (`start_date`, `end_date`, `participating_schools`, `is_active`) from `tournaments`
5. Add `updated_at` trigger on `tournament_editions`

---

## 3. Frontend Changes

### Admin: TournamentsTable.tsx

- The main table shows **tournaments** (the permanent entity)
- Expandable row or sub-table shows editions for each tournament
- Each edition row shows: year, dates, school count, active status
- "New Tournament" creates the entity; "Add Edition" creates a yearly instance under it

### Admin: CreateTournamentDialog.tsx

- Split into two dialogs:
  - **CreateTournamentDialog**: Name, host school, venue, province, format notes, sponsor info (permanent fields only)
  - **CreateEditionDialog**: Year, start date, end date, participating schools, active status

### Admin: EditTournamentDialog.tsx

- Similarly split: editing the tournament entity vs editing a specific edition

### Admin: CreateFixtureDialog.tsx / EditFixtureDialog.tsx

- Tournament selector now shows editions (e.g., "Kearsney Easter Festival 2026") instead of raw tournament names
- The `tournament_id` written to fixtures references the edition ID

### Tournament.tsx (public profile page)

- Route stays `/tournament/:id` but the `id` now refers to a `tournament_editions` row
- Header pulls tournament name/sponsor from the parent `tournaments` row via join
- Dates and participating schools come from the edition
- Could add a year selector to browse past editions

### StepTournament.tsx (signup flow)

- Queries `tournaments` table (the entity) for the follow action -- unchanged conceptually
- Shows edition info (dates, schools) from the current year's edition for display

### Schools.tsx

- Tournament listing pulls from `tournaments` joined with current year's edition for dates/schools

### useHomeFixtures.ts / venueUtils.ts

- The fixture join `tournament:tournaments(id, name)` changes to `tournament_edition:tournament_editions(id, tournament:tournaments(id, name))` or similar nested join to get the tournament name through the edition

---

## 4. Technical Details

### Files Modified

- **Database migration** (1 migration: new table, data migration, FK update, column drops)
- `src/components/admin/TournamentsTable.tsx` -- show tournaments + editions
- `src/components/admin/CreateTournamentDialog.tsx` -- entity-only fields
- `src/components/admin/EditTournamentDialog.tsx` -- entity-only fields
- New: `src/components/admin/CreateEditionDialog.tsx`
- New: `src/components/admin/EditEditionDialog.tsx`
- `src/components/admin/CreateFixtureDialog.tsx` -- edition selector
- `src/components/admin/EditFixtureDialog.tsx` -- edition selector
- `src/pages/Tournament.tsx` -- join through edition to tournament
- `src/components/auth/signup-steps/StepTournament.tsx` -- query adjustment
- `src/pages/Schools.tsx` -- query adjustment
- `src/hooks/useHomeFixtures.ts` -- join adjustment
- `src/lib/venueUtils.ts` -- minor adjustment
- `src/components/admin/HistoricalFixturesUpload.tsx` -- edition reference

### Data Integrity

- All existing tournament data is preserved via the migration
- Existing fixtures maintain their links (IDs are remapped to edition IDs)
- User follows remain on the tournament entity level

