

## Overview

The current flow is broken: the Discover page lists tournaments and navigates to `/tournament/{tournaments.id}`, but the Tournament profile page expects an edition ID. We need to introduce a year-based edition selector so users can browse editions of a tournament.

## Changes

### 1. Discover Page (`src/pages/Schools.tsx`)

**Current**: Clicking a tournament navigates to `/tournament/{tournament.id}` (the parent tournament ID).

**Change**: Keep this navigation as-is. The Tournament page will handle resolving editions.

### 2. Tournament Profile Page (`src/pages/Tournament.tsx`)

**Current**: Accepts a single ID param, tries it as edition first, then tournament. Queries fixtures with that ID directly.

**New behavior**:
- When the URL contains a `tournaments.id` (parent), fetch all editions for that tournament and display a **year selector** (e.g., tabs or dropdown showing 2024, 2025, 2026).
- Default to the most recent/active edition.
- When a year is selected, load that edition's metadata (venue, host, sponsors, participating schools) and its fixtures (where `fixtures.tournament_id = edition.id`).
- When the URL contains a `tournament_editions.id` directly (e.g., from a deep link), resolve the parent tournament, load all editions, and pre-select the matching year.

**Specific code changes**:
- Add state for `editions` (array of all editions for this tournament) and `selectedEditionId`.
- In `fetchTournament`:
  - First try as edition ID; if found, fetch sibling editions via `tournament_id`.
  - If not found as edition, treat as parent tournament ID and fetch all editions.
  - Default-select the most recent active edition (or latest by year).
- Add a year selector UI (compact pill/tab bar) below the tournament name.
- `fetchFixtures` uses the selected `edition.id` as the `tournament_id` filter.

### 3. Year Selector UI

A compact row of year pills (e.g., `2025 | 2026`) displayed below the tournament header. Selecting a year swaps the edition metadata and reloads fixtures for that edition.

### 4. Follows

Follows remain on `tournaments.id` (the parent), not edition-specific. No change needed here since the `user_tournament_follows` table already references `tournament_id` (parent).

## Technical Details

### Files to modify

| File | Change |
|------|--------|
| `src/pages/Tournament.tsx` | Add editions state, year selector, edition-aware data loading |
| `src/pages/Schools.tsx` | No changes needed (already navigates with parent tournament ID) |

### Data flow

```text
/tournament/:id
       |
       v
  Is it an edition ID?
  YES --> get tournament_id from edition, fetch all editions
  NO  --> treat as tournament ID, fetch all editions
       |
       v
  Show year selector with all editions
  Default to latest active edition
       |
       v
  Load selected edition metadata + fixtures
```

### Edition query
```typescript
const { data: editions } = await supabase
  .from("tournament_editions")
  .select("*")
  .eq("tournament_id", parentTournamentId)
  .order("year", { ascending: false });
```

### Fixture query (unchanged logic, but uses edition ID)
```typescript
.eq("tournament_id", selectedEditionId)
```

