

## Problem

When a minor without parental consent tries to predict on a fixture that doesn't involve their school, the prediction dialog opens and appears to work, but the prediction silently fails to save (RLS likely blocks it, or there's no client-side gate). There's no user-facing feedback explaining why.

## Solution

Add consent gating at the point where the prediction dialog would open. If the user is a minor needing consent and the fixture doesn't involve their school, show the existing `ConsentRequiredDialog` instead of the `PredictionDialog`.

## Changes

There are three places where predictions are initiated. All three need the same gate:

### 1. `src/components/fixtures/FixtureRow.tsx` (card click opens dialog)

Line 297 has the click handler: `onClick={() => !isPredicted && onPredictionMade && setDialogOpen(true)}`

- Import `useConsentStatus` and add a `consentDialogOpen` state
- In the click handler, check if the user is a minor needing consent AND neither `school_a_id` nor `school_b_id` matches the user's school. If so, open `ConsentRequiredDialog` instead of `PredictionDialog`.
- Need the user's `school_id` — pass it down as a prop or use `useConsentStatus` + a separate query. Since `useConsentStatus` already exists and the hook is lightweight, use it here. But it doesn't expose `school_id`. Two options:
  - Add `userSchoolId` to the hook's return
  - Pass `userSchoolId` as a prop from parent

Since `FixtureRow` is used across Home, Fixtures, Tournament, PoolLeaderboard, and SchoolProfile pages, passing a prop is cleaner than adding another query. But the simplest approach: use `useConsentStatus` (already has `needsConsent`) and add `userSchoolId` to its return value (it already queries `school_id` from profiles).

**Plan:**
- Update `useConsentStatus` to also return `userSchoolId` from the profile query
- In `FixtureRow`, import `useConsentStatus` and `ConsentRequiredDialog`
- Add `consentDialogOpen` state
- Before opening prediction dialog, check: if `needsConsent` AND fixture doesn't involve user's school → open consent dialog instead
- Render `ConsentRequiredDialog` in the component

### 2. `src/pages/Home.tsx` — `handlePredictionMade` callback

This is the callback that actually saves the prediction. Even if the dialog gate works, add a guard here too as defense-in-depth. If `needsConsent` and fixture doesn't involve user's school, return early.

### 3. `src/pages/Fixtures.tsx` — `handlePredictionSubmit` callback

Same defense-in-depth guard as Home.tsx.

### 4. `src/hooks/useConsentStatus.ts`

- Add `school_id` to the profile select query (line ~53)
- Return `userSchoolId` in the hook's return value

### Summary of files to edit:
1. **`src/hooks/useConsentStatus.ts`** — Add `userSchoolId` to returned data
2. **`src/components/fixtures/FixtureRow.tsx`** — Add consent gate before opening prediction dialog, render `ConsentRequiredDialog`
3. **`src/pages/Home.tsx`** — Add defense-in-depth guard in `handlePredictionMade`
4. **`src/pages/Fixtures.tsx`** — Add defense-in-depth guard in `handlePredictionSubmit`

