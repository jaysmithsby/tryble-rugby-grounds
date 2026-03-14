

## Fix Tournament Scores and Match History

### Problem
Two bugs on the Tournament profile page:
1. **Scores not displaying** for past matches — the DB query fetches `score_a`, `score_b`, and `status`, but `FixtureCard` doesn't accept or forward these props to `FixtureRow`, so they're always `undefined`.
2. **Match history check is too narrow** — `loadMatchHistory` only checks for `status = "completed"`, missing matches with `status = "final"` (which is the correct status for past matches with scores per the fixture status rules).

### Changes

**1. `src/components/fixtures/FixtureCard.tsx`**
- Add `scoreA`, `scoreB`, and `status` optional props to the interface
- Include them in the constructed `Fixture` object passed to `FixtureRow`

**2. `src/pages/Tournament.tsx`**
- Pass `score_a`, `score_b`, and `status` from fixture data through to `FixtureCard` as the new props
- Fix `loadMatchHistory`: change `.eq("status", "completed")` to `.neq("status", "upcoming")` so it catches both `"completed"` and `"final"` statuses (matching what `MatchHistory` component already does)

### Files to edit
- `src/components/fixtures/FixtureCard.tsx` — add score/status props and pass to fixture object
- `src/pages/Tournament.tsx` — pass score/status props + fix history status filter

