

## Overview

Clean up `Home.tsx` and its supporting hook by removing unused imports, dead code, and unnecessary dynamic logic. The page is already fairly stable — this is a pruning pass.

## Changes

### 1. Remove Unused Imports and Destructured Values in `Home.tsx`

The following are imported but never used in the rendered JSX:

| Import | Status |
|--------|--------|
| `MessageCircle`, `Award` from lucide-react | Unused — remove |
| `Card`, `CardContent` | Unused — remove |
| `RecentFixtureCard` | Imported but never rendered — remove |
| `SchoolScoreSubmission` | Imported but never rendered — remove |
| `buildWhatsAppUrl` | Unused — remove |
| `handleSignOut` (destructured from `useHomeAuth`) | Never called — stop destructuring it |

`Users` from lucide-react IS used (in the "No Pools" empty state), so it stays.

### 2. Make Hero Headlines Static

Replace the `getHeroHeadline()` / `getHeroSubline()` functions (which change based on `isDerbyWeek` and `hasSchoolFixture`) with a single static heading. This eliminates layout shifts as fixture data loads.

**Before**: Three possible headline states driven by fixture data.
**After**: A single static headline: "For the Badge." with subline "Back your school. Call the score."

Also remove `isDerbyWeek` and `hasSchoolFixture` variables since they only fed the hero functions.

### 3. Remove Unused Return Values from `useHomeFixtures`

In `src/hooks/useHomeFixtures.ts`:
- `recentFixtures` is returned but never consumed in `Home.tsx` — remove the query and return value.
- `tournamentFixtures` is returned but never consumed — remove from the return value (the data is still merged into `upcomingFixtures` internally, so keep the query).
- Remove `userSchoolName` from the `UseHomeFixturesParams` interface since it's noted as unused inside the hook.

### 4. Remove Unused Comment Block

Delete the `{/* MVP: Full Time score reporting... */}` comment that references hidden features.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Home.tsx` | Remove unused imports, static hero, remove dead destructuring |
| `src/hooks/useHomeFixtures.ts` | Remove `recentFixtures` query, trim unused params/returns |

