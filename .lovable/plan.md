

## Problem

The global QueryClient is configured with `refetchOnMount: false`, which prevents queries from refetching when the Home component remounts after navigation. The `home-followed-schools` and `home-tournament-follows` queries in `useHomeFixtures` use `staleTime: CACHE_TIMES.REFERENCE` (5 minutes), so stale cached data is served without a network request when the user navigates back to Home.

This means if a user follows a new school or tournament on the Discover page, then navigates back to Home, the old cached follow list is used and the new fixtures/tournaments don't appear until a manual pull-to-refresh or the 5-minute stale window expires.

## Solution

Override `refetchOnMount` to `"always"` on the two follow-related queries in `useHomeFixtures`. This ensures that every time the Home page mounts, the user's followed schools and tournaments are re-fetched, which then cascades into refreshing the fixtures and tournament lists with the updated school/tournament IDs.

## Changes

**File: `src/hooks/useHomeFixtures.ts`**

Two queries need `refetchOnMount: "always"` added:

1. **`home-followed-schools` query** (~line 113) — add `refetchOnMount: "always"` so that when the user returns to Home, followed school IDs are refreshed. Since the upstream fixtures query depends on `followedData`, it will automatically re-run with the new school IDs.

2. **`home-tournament-follows` query** (~line 155) — same change. Ensures newly followed tournaments appear immediately on return.

No other files need changes. The fixtures and tournament-detail queries downstream already depend on the follow data, so they will automatically refetch when the follow lists change (different query keys or `enabled` re-evaluation).

