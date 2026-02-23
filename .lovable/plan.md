

# Past Fixture Scoreline in FixtureRow

## Overview
Update the `FixtureRow` component so that when a fixture's date has passed, the center "VS" is replaced by a scoreline (`24 - 17`) or placeholders (`? - ?`), with optional prediction text underneath.

## Changes

### 1. Extend the `Fixture` interface (`FixtureRow.tsx`)

Add optional `score_a` and `score_b` fields to the existing `Fixture` interface so the component can receive score data:

```typescript
export interface Fixture {
  // ...existing fields...
  score_a?: number | null;
  score_b?: number | null;
}
```

### 2. Update the `CenterArea` sub-component

Add new props and logic to handle past-fixture states. The priority order becomes:

1. **Scores exist** (past match with `score_a` and `score_b` populated): Show `{leftScore} - {rightScore}` in `font-mono font-bold`
2. **Past, no score, user predicted**: Show `? - ?` with prediction text underneath in `text-[10px]`
3. **Past, no score, no prediction**: Show `? - ?`
4. **Future, prediction locked**: Show lock icon + prediction (existing behavior)
5. **Future, pick needed**: Show alert icon (existing behavior)
6. **Future, no prediction context**: Show "VS" (existing behavior)

New props for `CenterArea`:
- `isPast: boolean` -- whether `match_date < now()`
- `scoreLeft: number | null` -- left school's score (mapped from fixture after alpha-sort)
- `scoreRight: number | null` -- right school's score

The scoreline rendering uses:
- `font-mono` for uniform digit width
- Same `font-semibold` weight and `text-sm` (compact) / `text-xl` (card) sizing as the existing "VS"
- A centered dash (`-`) matching the `MatchHistory` alignment pattern: `grid-cols-3` with center-aligned dash
- Fixed `min-h` remains unchanged so no layout shift occurs in card variant

### 3. Wire up in the main component body

Compute `isPast` from the fixture's `match_date`:

```typescript
const isPast = new Date(fixture.match_date) < new Date();
```

Map scores to left/right based on the alpha-sort:

```typescript
const leftScore = leftIsA ? fixture.score_a : fixture.score_b;
const rightScore = leftIsA ? fixture.score_b : fixture.score_a;
```

Pass these into `CenterArea` alongside existing props.

### 4. Ensure callers include scores in their queries

Check and update fixture queries in parent components (e.g., `useFixturesData`, `useHomeFixtures`, fixture pages) to include `score_a, score_b` in their `.select()` calls if not already present.

### Files modified
- `src/components/fixtures/FixtureRow.tsx` -- extend interface, update CenterArea, wire props
- Potentially `src/hooks/useFixturesData.ts` and `src/hooks/useHomeFixtures.ts` -- ensure `score_a, score_b` are selected
