

# Consolidate FixtureCard + FixtureTable into FixtureRow

## Overview
Create a single `FixtureRow` component that replaces both `FixtureCard` and `FixtureTable`'s internal row components. This eliminates logic drift by centralizing alphabetical sorting, history detection, prediction states, and collapsible expansion in one place. Two visual variants (`card` and `table`) cover all use cases.

## New File: `src/components/fixtures/FixtureRow.tsx`

A unified component with these responsibilities:

### Props (FixtureRowProps)
- `fixture`: A `Fixture` object (reuse the existing interface from FixtureTable -- `id`, `match_date`, `venue_type`, `venue_id`, `school_a_id`, `school_b_id`, `school_a`, `school_b`, `tournament`)
- `variant`: `'card' | 'table'` (default `'table'`)
- `isPredicted?`: boolean
- `predictedSchoolId?`: string
- `predictedMargin?`: number
- `onPredictionMade?`: `(schoolId: string, margin: number) => void`
- `matchId?`: string
- `appliesTo?`: string[]
- `hasHistory?`: boolean (pre-computed override)
- `priority?`: boolean (for image loading priority in card variant)

### Core Logic (shared across both variants)
1. **Alphabetical sorting** via `sortSchoolsAlpha` -- always display schools A-Z regardless of DB order
2. **History auto-detection** via a single `useEffect` querying completed fixtures (skip if `hasHistory` prop provided)
3. **canExpand** computed from `hasHistory` prop or `autoHasHistory` state
4. **Prediction state**: derive `predictedSchoolName` from `predictedSchoolId` matching left/right school
5. **PredictionDialog** rendered only when `onPredictionMade` is provided; card click opens dialog when `!isPredicted`
6. **School navigation** via `navigate(/school/{slug})` on jersey click with `e.stopPropagation()`
7. **Date format**: `format(new Date(fixture.match_date), "EEE d MMM")`
8. **Venue**: `resolveVenueName(fixture)`

### Variant: `table` (high-density row)
- Desktop: renders a `TableRow` with three cells (Date+venue, Match grid, Chevron)
- Mobile: renders a compact bordered card (same as current `MobileFixtureCard`)
- Center "vs" area shows: "vs" (default), "Pick needed" (if `onPredictionMade && !isPredicted`), or Lock + prediction summary (if `isPredicted`)
- Chevron only shown when `canExpand` is true
- Collapsible wraps the row; expanded content is a `MatchHistory` in `bg-muted/30`

### Variant: `card` (gradient card)
- Wrapped in `Card` with `bg-gradient-card` styling
- Header row: date + venue left, chevron or lock icon right
- Tournament badge if applicable
- Teams row with `size="md"` jerseys
- Center area: VS / Pick needed / Locked prediction
- `CollapsibleContent` below card with `MatchHistory`

## Modified File: `src/components/fixtures/FixtureTable.tsx`
- Remove `FixtureTableRow`, `MobileFixtureCard`, `SchoolBlock`, and `sortSchoolsAlpha` internal components
- Import `FixtureRow` from `./FixtureRow`
- Keep `FixtureTable` as the outer container that handles search filtering, the desktop `Table` wrapper with header, and the mobile list
- Desktop: map filtered fixtures to `<FixtureRow variant="table" fixture={f} hasHistory={hasHistoryMap?.[f.id]} />`
- Mobile: same but rendered in a `div` wrapper instead of table body
- Export the `Fixture` and `FixtureSchool` interfaces from this file (or from FixtureRow)

## Modified File: `src/components/fixtures/FixtureCard.tsx`
- Convert to a thin wrapper that maps the existing flat props into a `Fixture`-shaped object and renders `<FixtureRow variant="card" ... />`
- This preserves backward compatibility so `Home.tsx`, `Tournament.tsx`, `SchoolProfile.tsx`, and `FixtureListCard.tsx` don't need immediate refactoring
- All logic (history detection, prediction, collapsible) is delegated to `FixtureRow`

## Modified File: `src/components/fixtures/FixtureListCard.tsx`
- No changes needed -- it already wraps `FixtureCard` which will delegate to `FixtureRow`

## Consumer Pages (no changes needed)
- `Home.tsx`, `Tournament.tsx`, `SchoolProfile.tsx`, `Fixtures.tsx` -- all continue using `FixtureCard` or `FixtureTable` with the same props; the consolidation is internal

---

## Technical Details

### FixtureRow internal structure

```text
FixtureRow
  |
  +-- sortSchoolsAlpha(fixture) --> [left, right, leftIsA]
  +-- useEffect: auto-detect history (query completed fixtures)
  +-- canExpand = hasHistory ?? autoHasHistory
  +-- predictedSchoolName = match predictedSchoolId to left/right
  |
  +-- if variant === 'card':
  |     PredictionDialog (conditional)
  |     Collapsible > Card > header + teams + center state
  |     CollapsibleContent > MatchHistory
  |
  +-- if variant === 'table':
  |     Desktop: Collapsible > TableRow > cells + center state
  |              CollapsibleContent > tr > td > MatchHistory
  |     Mobile:  Collapsible > div card > header + teams + center state
  |              CollapsibleContent > MatchHistory
```

### SchoolBlock sub-component
Extracted as a shared internal component in `FixtureRow.tsx`, accepting `school`, `isHome`, `onNavigate`, and `size` ('sm' for table, 'md' for card).

### Center area rendering (shared function)
A helper renders the center VS/prediction area based on `isPredicted`, `onPredictionMade`, `predictedSchoolName`, and `predictedMargin` -- used by both variants.

### FixtureCard wrapper mapping
The wrapper constructs a `Fixture` object from flat props:
```text
fixture = {
  id: matchId,
  match_date: matchDate,
  venue_type: null,
  venue_id: null,
  school_a_id: homeSchoolId,
  school_b_id: awaySchoolId,
  school_a: { id, name, slug, jersey_url, province: null },
  school_b: { id, name, slug, jersey_url, province: null },
  tournament: tournamentName ? { id: '', name: tournamentName } : null
}
```
The venue is passed separately since the card variant receives a pre-resolved venue string.

