
# Refactor Pools Page to High-Density List Format

## Overview
Replace the large PoolCard grid on the Pools page with a compact, table-like row layout matching the Schools directory style. Each pool becomes a single clickable row with icon, name, member count, and rank.

---

## Changes

### 1. Create Pool List Row Component (`src/components/pools/PoolListRow.tsx`)

A new compact row component:

- **Left**: 32px circular icon using `getPoolIconComponent` and `getPoolColorValue` (same as current PoolCard)
- **Middle**: Pool name (bold, truncated) on one line
- **Right side, two data columns**:
  - Members: small `Users` icon + count number
  - Rank: small `Trophy` icon + position number (or "--" if no rank data available yet)
- **Entire row clickable** navigating to `/pool/:poolId`
- **Hover state**: `hover:bg-muted/50` matching the Schools list rows
- Divider lines between rows via parent `divide-y`

Props: `pool` object (id, name, icon_id, color_id, member count) + optional `userRank`

### 2. Refactor Pools Page (`src/pages/Pools.tsx`)

**Simplify the page significantly:**

- **Remove**: Tournaments section, Leaderboard preview section, and all their associated state/data fetching (these are accessible elsewhere -- tournaments from Fixtures, leaderboard from the Leaderboard tab)
- **Keep**: GlobalHeader, BottomNav, pool data fetching, join code flow, CreatePoolDialog
- **Sticky header** with:
  - "Your Pools" title with Trophy icon
  - Row containing: search input (debounced, filters pools by name) + Create Pool button (compact)
  - Join code input row (existing pattern, kept compact)
- **Pool list**: Vertical stack of `PoolListRow` components with `divide-y` dividers
- **Empty state**: Clean centered message with Users icon, "No pools yet" heading, and two CTAs: "Create a Pool" and join code input

**Data changes:**
- Pool rank: Currently no per-pool rank data exists in the database schema. The rank column will show "--" as a placeholder. This can be wired up later when pool-level scoring is implemented.
- Member count: Already available from the existing `pool_members(count)` join

### 3. Visual Consistency

- Row height, typography, and spacing will match the Schools directory list items
- Same `divide-y divide-border/40` pattern
- Same `-mx-4 px-4` full-bleed hover pattern
- Same `text-sm font-medium` for names, `text-xs text-muted-foreground` for secondary info

---

## Technical Details

### Files Created
- `src/components/pools/PoolListRow.tsx` -- compact row component

### Files Modified
- `src/pages/Pools.tsx` -- major simplification: remove tournaments/leaderboard sections, replace PoolCard grid with PoolListRow stack, add search filter

### Existing Components Reused
- `getPoolIconComponent`, `getPoolColorValue` from `PoolIconSelector`
- `CreatePoolDialog` for pool creation
- `useDebounce` for search filtering
- `Input`, `Button` from shadcn
- `Users`, `Trophy` icons from lucide-react

### What Gets Removed from Pools.tsx
- Tournament section and `user_tournament_follows` query
- Leaderboard preview section and `user_scores` / `profiles_public` queries
- `Tabs`, `TabsList`, `TabsTrigger` imports
- `leaderboardTab`, `leaderboardPeriod`, `leaderboardData`, `userSchool`, `userProvince`, tournament state
- `loadLeaderboardPreview` function
- `PoolCard` import (replaced by `PoolListRow`)
