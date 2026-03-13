

## Investigation Result

The fixture `29c4ffa9` (2025 match, score 64-19) has `status = 'final'`, but the code that determines whether to show the history chevron on FixtureRow only checks for `status = 'completed'`.

**Root cause** — `src/components/fixtures/FixtureRow.tsx` line 230:
```ts
.eq("status", "completed")
```

This filters out fixtures with `status = 'final'`, so the count returns 0, and the expand chevron is hidden. The actual `MatchHistory` component correctly uses `.neq("status", "upcoming")` which would include both "completed" and "final" — but the user never sees it because the button to expand is hidden.

## Fix

**File: `src/components/fixtures/FixtureRow.tsx`** — Change the auto-detect history query (line 228-232) to match the same logic as `MatchHistory.tsx`: use `.neq("status", "upcoming")` instead of `.eq("status", "completed")`. This ensures fixtures with status "final" or "completed" are both counted.

Single line change:
```ts
// Before
.eq("status", "completed")

// After
.neq("status", "upcoming")
```

No database changes needed. No other files affected.

