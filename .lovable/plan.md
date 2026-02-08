
# Replace Fixtures Tab with Pools Tab

This plan restructures the bottom navigation to replace the "Fixtures" tab with a "Pools" tab, making pools the primary focus with leaderboards accessible as a secondary section within that tab.

---

## Current State

| Tab | Route | Focus |
|-----|-------|-------|
| Home | `/home` | Feed, predictions |
| **Leaderboards** | `/leaderboard` | Global/School/Province rankings + Pools section |
| **Fixtures** | `/fixtures` | Calendar of all matches |
| Profile | `/profile` | User stats, settings |

---

## Proposed State

| Tab | Route | Focus |
|-----|-------|-------|
| Home | `/home` | Feed, predictions |
| **Pools** | `/pools` | User's pools + tournaments + leaderboards section |
| Profile | `/profile` | User stats, settings |

---

## Architecture Changes

### 1. Create New Pools Page

**New file: `src/pages/Pools.tsx`**

A dedicated page with two main sections:

```text
┌─────────────────────────────────────────┐
│  Header: My Pools                       │
├─────────────────────────────────────────┤
│  [Create Pool]    [Join Pool]           │
├─────────────────────────────────────────┤
│  Section: Your Pools                    │
│  ┌─────────────────────────────────────┐│
│  │ Pool Card 1 (with View Leaderboard) ││
│  │ Pool Card 2                         ││
│  │ Pool Card 3                         ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  Section: Tournaments You Follow        │
│  ┌─────────────────────────────────────┐│
│  │ Tournament Card 1                   ││
│  │ Tournament Card 2                   ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  Section: Leaderboards                  │
│  ┌─────────────────────────────────────┐│
│  │ [Global] [School] [Province]        ││
│  │ Top 5 preview with "View All" link  ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

**Key Features:**
- User's pools displayed prominently at top
- Each pool card has "View Leaderboard" button leading to `/pool/:poolId`
- Tournaments the user follows (from `user_tournament_follows` table)
- Condensed leaderboards section with Global/School/Province tabs showing top 5 entries
- "View Full Leaderboard" link for each category

### 2. Update Bottom Navigation

**File: `src/components/BottomNav.tsx`**

| Change | Before | After |
|--------|--------|-------|
| Icon | `CalendarDays` | `Users` |
| Label | "Fixtures" | "Pools" |
| Route | `/fixtures` | `/pools` |
| Active check | `/fixtures` | `/pools` or `/pool/*` or `/leaderboard` |

```typescript
// New nav item replacing Fixtures
<button
  onClick={() => navigate("/pools")}
  onMouseEnter={handlePrefetch("/pools")}
  onFocus={handlePrefetch("/pools")}
  className={`flex flex-col items-center gap-1 transition-colors ${
    isActive("/pools") || 
    location.pathname.startsWith("/pool/") || 
    location.pathname === "/leaderboard"
      ? "text-primary"
      : "text-muted-foreground hover:text-foreground"
  }`}
>
  <Users className="w-5 h-5" />
  <span className="text-xs font-medium">Pools</span>
</button>
```

### 3. Update App Routes

**File: `src/App.tsx`**

Add new route and keep leaderboard accessible:

```typescript
<Route path="/pools" element={<Pools />} />
<Route path="/leaderboard" element={<Leaderboard />} />  // Keep for deep linking
<Route path="/fixtures" element={<Fixtures />} />  // Keep for deep linking from Home cards
```

### 4. Update Prefetch Hook

**File: `src/hooks/usePrefetch.ts`**

Add `/pools` route prefetching:

```typescript
case "/pools":
  prefetchUserPools();
  prefetchSchools();  // For leaderboard preview
  break;
```

---

## Pools Page Structure

### Header Section
- Title: "My Pools"
- Quick actions: Create Pool + Join Pool buttons

### Your Pools Section
- List of user's pools using existing `PoolCard` component
- Each card shows pool name, invite code, member count
- "View Leaderboard" button on each card
- Empty state: "Create or join a pool to compete with friends!"

### Tournaments You Follow Section
- Query `user_tournament_follows` joined with `tournaments`
- Display tournament name and school count
- Link to `/tournament/:tournamentId`
- Empty state: "Follow tournaments to see them here"

### Leaderboards Section
- Condensed view with tabs: Global | School | Province
- Show top 5 entries only (preview)
- Weekly/Season toggle
- "View Full Rankings" button linking to `/leaderboard`

---

## Data Queries

### User Pools Query (existing)
```typescript
const { data: pools } = await supabase
  .from("pool_members")
  .select(`
    pool_id,
    pools (id, name, invite_code, schools, voting_mode, pool_members(count))
  `)
  .eq("user_id", user.id);
```

### User Tournament Follows Query (new)
```typescript
const { data: followedTournaments } = await supabase
  .from("user_tournament_follows")
  .select(`
    tournament_id,
    tournaments (id, name, year, start_date, end_date)
  `)
  .eq("user_id", user.id);
```

### Leaderboard Preview Query
```typescript
const { data: topUsers } = await supabase
  .from("user_scores")
  .select("user_id, weekly_points, season_points")
  .eq("season_year", currentYear)
  .eq("week_number", currentWeek)
  .order("weekly_points", { ascending: false })
  .limit(5);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Pools.tsx` | **Create** - New pools-focused page |
| `src/components/BottomNav.tsx` | Replace Fixtures with Pools tab |
| `src/App.tsx` | Add `/pools` route |
| `src/hooks/usePrefetch.ts` | Add prefetch for `/pools` route |
| `src/pages/PoolLeaderboard.tsx` | Update back button to go to `/pools` instead of `/leaderboard` |

---

## Navigation Flow

```text
Home Feed
    │
    ├── Fixture Card → (still works, deep links to fixtures)
    │
    └── Bottom Nav: "Pools" → /pools
                                  │
                                  ├── Pool Card → /pool/:poolId (leaderboard)
                                  │                    │
                                  │                    └── Back → /pools
                                  │
                                  ├── Tournament Card → /tournament/:id
                                  │
                                  └── "View Full Rankings" → /leaderboard
                                                               │
                                                               └── Back → /pools
```

---

## Empty States

| Section | Message |
|---------|---------|
| No Pools | "You haven't joined any pools yet. Create a pool to compete with friends or enter a pool code to join an existing one." |
| No Tournaments | "You're not following any tournaments yet. Follow tournaments from the Fixtures page to see them here." |
| No Leaderboard Data | "Rankings appear once predictions are scored. Check back after the weekend's matches!" |

---

## Technical Considerations

1. **Fixtures Access**: Fixtures page remains accessible via direct URL and from Home feed fixture cards - it's just removed from bottom nav
2. **Deep Links**: All existing routes (`/leaderboard`, `/pool/:id`, `/fixtures`) continue to work
3. **Cache Strategy**: Pools page shares cached data with existing queries (pools, schools)
4. **Active State**: Pools tab highlights for `/pools`, `/pool/*`, and `/leaderboard` routes

