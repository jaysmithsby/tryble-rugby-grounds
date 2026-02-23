

# Unified Discovery Page: Schools + Tournaments

## Overview
Refactor the Schools page into a dual-mode Discovery page with a toggle to switch between browsing Schools and Tournaments. The tournament list reuses the same high-density row layout and includes a follow-star system using `user_tournament_follows`.

---

## Changes

### 1. Rename Schools Page to Discovery (`src/pages/Schools.tsx`)

Transform in-place (keep the same file to minimize routing changes):

- **Mode toggle**: Add a two-button toggle (`Schools` | `Tournaments`) at the top of the sticky filter bar, styled identically to the `FixturesFilters` toggle (two `Button` components, `variant="default"` for active, `variant="outline"` for inactive, each `flex-1`, `size="sm"`).
- **Header icon/title**: Changes based on mode -- `School` icon + "Schools" vs `Trophy` icon + "Tournaments".
- **Province filter**: Visible in both modes (tournaments also have a `province` column).
- **Search placeholder**: Dynamically changes -- "Search schools..." / "Search tournaments...".

When mode is `"schools"`, render the existing school list (unchanged).

When mode is `"tournaments"`, render the new tournament list.

### 2. Tournament List View (within Schools.tsx)

A list of tournaments fetched from the `tournaments` table with the same `divide-y` row pattern as schools:

**Row layout per tournament:**
- **Left**: 28px `Trophy` icon in a muted circle (matching school avatar sizing)
- **Middle**: Tournament name (bold, truncated) on line 1, venue + date info on line 2 (`text-xs text-muted-foreground`)
  - Date line: "Starts Mar 12" for upcoming, "Ended Feb 8" for past
- **Right**: Follow star (same pattern as school stars, using `user_tournament_follows`)
- **Entire row clickable**: navigates to `/tournament/:id`

**Sorting logic:**
- Primary: Tournaments where `start_date >= today` OR `end_date >= today` (active/upcoming) come first, ordered by `start_date` ascending
- Secondary: Past tournaments (`end_date < today`) at the bottom, ordered by `end_date` descending
- This sorting is done client-side after fetching all active tournaments

**Follow system:**
- Query `user_tournament_follows` for the current user
- Star click opens the same `AlertDialog` pattern as school follows
- Follow/unfollow inserts/deletes from `user_tournament_follows`
- Toast feedback: "Now following [Tournament Name]" / "Unfollowed [Tournament Name]"

**Pagination:** Same `usePagination` hook, 20 per page

### 3. Update Bottom Nav Label (`src/components/BottomNav.tsx`)

- Change the last nav item label from "Schools" to "Discover"
- Keep the `School` icon (or optionally switch to `Compass` -- keeping `School` for now to be minimal)
- Route stays `/schools` to avoid breaking links

### 4. Update AnimatedRoutes Keep-Alive (`src/components/AnimatedRoutes.tsx`)

No changes needed -- the `/schools` route is already in the keep-alive list and renders the same `Schools` component.

### 5. Home Feed Integration (already done)

The `useHomeFixtures` hook already:
- Fetches `user_tournament_follows` for the current user
- Queries fixtures matching those tournament IDs within a 7-day window
- Merges them into `upcomingFixtures` with deduplication
- These fixtures are interactive with the prediction dialog

No changes needed to the home page or `useHomeFixtures`.

---

## Technical Details

### Files Modified
- `src/pages/Schools.tsx` -- Add mode toggle state, tournament fetching query, tournament list rendering, tournament follow logic
- `src/components/BottomNav.tsx` -- Change label from "Schools" to "Discover"

### No New Files Created

### Tournament Query
```text
supabase.from("tournaments")
  .select("id, name, venue, province, start_date, end_date, is_active, logo_url")
  .eq("is_active", true)
  .order("start_date", { ascending: true })
```

### Client-Side Sorting
```text
const now = new Date();
const upcoming = tournaments.filter(t => new Date(t.end_date) >= now)
  .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
const past = tournaments.filter(t => new Date(t.end_date) < now)
  .sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
const sorted = [...upcoming, ...past];
```

### Tournament Follow Queries
```text
// Fetch follows
supabase.from("user_tournament_follows")
  .select("tournament_id")
  .eq("user_id", userId)

// Follow
supabase.from("user_tournament_follows")
  .insert({ user_id, tournament_id })

// Unfollow
supabase.from("user_tournament_follows")
  .delete()
  .eq("user_id", userId)
  .eq("tournament_id", tournamentId)
```

### State Additions to Schools.tsx
- `mode: "schools" | "tournaments"` (default: "schools")
- Tournament data query (React Query)
- Tournament follows query (React Query)
- `dialogTournament` state for follow/unfollow confirmation (reuses the same AlertDialog, extended to handle both schools and tournaments)

### Shared AlertDialog
The existing `AlertDialog` will be generalized to handle both types:
- `dialogTarget: { type: "school" | "tournament"; id: string; name: string; isFollowed: boolean } | null`
- `handleConfirmFollow` branches on `dialogTarget.type` to call the correct table

