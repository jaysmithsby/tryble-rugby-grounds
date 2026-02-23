

# Pool Page Refactor -- High-Density Professional Layout

## Overview

Refactor `PoolLeaderboard.tsx` to match the compact, professional header style used on School Profile and Tournament pages. Replace the current card-heavy layout with a unified header, a Leaderboard/Fixtures mode toggle, scoped scoring, and season filtering.

---

## 1. Compact Header (matching SchoolProfile / Tournament pattern)

Replace the current large icon + card-based header with the same `px-4 pt-4 pb-2 space-y-1` layout used on those pages:

- **Row 1**: `[32px pool icon circle] [Pool Name (text-lg font-bold)] [Share2 icon button] [Pen/Edit icon button if creator]`
  - Share icon triggers `PoolInvite` dialog (reuse existing component but change trigger from button to icon)
  - Edit icon triggers `EditPoolDialog` (change trigger from "Edit Pool" button to a small pen icon)
- **Row 2 (metadata)**: `pl-11 text-xs text-muted-foreground` -- "Code: {invite_code} (copyable) . {members.length} Participants"
  - Invite code has a tiny copy-to-clipboard action on click
- **Collapsible "Schools in Pool"**: A `Collapsible` component below the metadata showing the pool's schools as a flex-wrapped list of `Badge` components. Collapsed by default with a `ChevronDown` trigger labeled "Schools in Pool ({count})".

Remove the separate Members card, Invite Friends card, and Pool Schools card from the main content area -- their functionality is absorbed into the header and collapsible.

---

## 2. Mode Toggle: Leaderboard | Fixtures

Add a two-button toggle row (similar to the existing weekly/season toggle) directly below the header:

```
[Leaderboard] [Fixtures]
```

- Default view: **Leaderboard**
- State: `activeView: "leaderboard" | "fixtures"`

---

## 3. Scoped Leaderboard View

### Season Selector
- Add a year selector (simple dropdown or button group: 2025, 2026) above the leaderboard table. Default to current year (2026).
- State: `selectedSeason: number`

### Scoped Points Calculation
The critical change: instead of reading from `user_scores` (which tracks global points), compute pool-scoped points client-side:

1. Resolve pool school names to school IDs via `schools` table
2. Fetch all `fixtures` where both `school_a_id` and `school_b_id` are in the pool's school set, filtered by `year = selectedSeason`
3. Fetch `predictions` for those fixture IDs, filtered to pool member user IDs
4. Sum `points_earned` per user to get scoped points
5. Compute accuracy as `(predictions with points_earned > 0) / total predictions * 100`
6. Compute picks count per user

### Table Layout
High-density table rows (not cards):

| Rank | User | Pts | Acc% | Picks |
|------|------|-----|------|-------|

- Current user row highlighted with `bg-primary/10`
- Top 3 ranks get subtle gradient backgrounds (reuse existing `getRankStyle`)
- Pagination: 20 rows per page (matching LeaderboardDetail)

### Sticky Footer
A fixed bottom bar (above BottomNav) showing the current user's rank, points, accuracy, and a "Jump to My Page" button if their row isn't visible.

---

## 4. Pool Fixtures View

When the "Fixtures" tab is active:

- **FixturesDateSelector** for date range filtering (reuse existing component, default to 2026 season)
- Fetch all fixtures involving the pool's schools (where `school_a_id` OR `school_b_id` is in pool school set)
- Render using `FixtureCard` component (card variant of `FixtureRow`, with prediction interactivity enabled)
- Pagination: 8 fixtures per page (matching School/Tournament pages)
- Include navigation controls with page indicators

---

## 5. Highlights Banner

Keep the existing Hilux/Spud banner but scope it to pool-scoped data from the leaderboard calculation. Move it below the mode toggle so it only shows when in Leaderboard view.

---

## Technical Details

### Files Modified

**`src/pages/PoolLeaderboard.tsx`** -- Major rewrite:
- Replace header with compact layout matching SchoolProfile
- Add `activeView` state for Leaderboard/Fixtures toggle
- Add `selectedSeason` state for year filtering
- Replace `loadPoolData` scoring logic with scoped calculation:
  - Resolve school names to IDs
  - Query fixtures where BOTH teams are pool schools
  - Query predictions for those fixtures and pool members
  - Aggregate points, accuracy, picks per user
- Add fixtures loading and rendering section
- Add sticky user footer bar
- Remove separate Members, Invite, Schools cards

**`src/components/pools/EditPoolDialog.tsx`** -- Minor:
- Export a variant that accepts an external trigger (icon button) instead of rendering its own trigger, OR accept a `triggerElement` prop

**`src/components/pools/PoolInvite.tsx`** -- Minor:
- Accept an optional `triggerElement` prop so the Pool page can use an icon button as trigger instead of the default "Share Pool" button

### Data Flow

```text
Pool Page Load
  |
  +-- Fetch pool (name, schools, invite_code, icon, color, creator_id)
  +-- Fetch pool_members (user_ids + profiles)
  +-- Resolve school names -> school IDs
  |
  [Leaderboard View]
  |  +-- Fetch fixtures WHERE school_a_id IN pool_schools AND school_b_id IN pool_schools AND year = season
  |  +-- Fetch predictions WHERE fixture_id IN those fixtures AND user_id IN member_ids
  |  +-- Client-side aggregation: sum points, compute accuracy, rank
  |
  [Fixtures View]
     +-- Fetch fixtures WHERE school_a_id IN pool_schools OR school_b_id IN pool_schools
     +-- Filter by date range
     +-- Paginate at 8/page
     +-- Render FixtureCard with prediction interactivity
```

### Key Constraints
- Pool-scoped leaderboard only counts fixtures where BOTH teams are pool schools (not just one)
- The `predictions` table has RLS restricting users to their own predictions, but admins can see all -- so the scoped aggregation query needs to use `user_scores` or a different approach. Since users can only read their own predictions, the leaderboard will need to rely on `user_scores` data filtered by week, OR the page computes only the current user's scoped stats and shows other users from `user_scores`. This is a practical limitation of RLS.
- Given the RLS constraint, the initial implementation will use `user_scores` for other members (global points) and display a note that scoped scoring requires a backend function. A follow-up migration can add a `pool_user_scores` materialized view or edge function for true scoping.

