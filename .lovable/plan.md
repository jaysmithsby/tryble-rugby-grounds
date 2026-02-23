
# Leaderboard Rows on Pools Page

## Overview
Add a "Leaderboards" section below the "Your Pools" list on the Pools page, using rows that visually match `PoolListRow`. Each row links to a specific leaderboard view, showing participant count and the user's rank.

## Changes

### 1. Create `src/components/pools/LeaderboardRow.tsx`

A new component mirroring `PoolListRow` layout:
- **Left**: 32px circular icon area (Lucide icon or school emblem image) + leaderboard name
- **Middle**: Participant count with Users icon (e.g., "1,240")
- **Right**: User rank with Trophy icon (e.g., "#14" or "--")
- **Click**: Navigates to `/leaderboard` (for global) or `/school/:slug` (for school leaderboards)
- Uses the same `-mx-4 px-4 flex items-center justify-between py-3 hover:bg-muted/50 cursor-pointer` classes

Props: `icon` (ReactNode for the 32px circle), `name` (string), `memberCount` (number), `userRank` (number | null), `onClick` (function)

### 2. Update `src/pages/Pools.tsx`

**New data fetching** (inside `loadData`, after pools are loaded):
- Get `currentUserId` from the auth call (already available as `user.id`)
- **Profile query**: Fetch the user's `school_id` from `profiles`
- **Primary school query**: If `school_id` exists, fetch the school's `name`, `slug`, `emblem_url`, `jersey_url` from `schools`
- **Followed schools query**: Fetch from `user_school_follows` joined with `schools` (name, slug, emblem_url, jersey_url), excluding the primary school
- **Global rank**: Query `user_scores` for the current user, current week/year, to get `rank_global`
- **Global user count**: Query `profiles` with `select("*", { count: "exact", head: true })`
- **Primary school rank**: Query `user_scores` for the user to get `rank_school`; count profiles with matching `school_id`
- **Followed school ranks**: For each followed school, count followers from `user_school_follows`; rank is not directly stored, so display "--" initially (or derive from `user_scores` if available)

**New state**:
- `currentUserId: string | null`
- `primarySchool: { name, slug, emblem_url, jersey_url } | null`
- `followedSchools: Array<{ id, name, slug, emblem_url, jersey_url, followerCount }>`
- `globalRank: number | null`
- `globalUserCount: number`
- `schoolRank: number | null`
- `primarySchoolMemberCount: number`

**New section in JSX** (after the pool list div, before `PoolActionDialog`):
```
<section>
  <h2 className="text-sm font-semibold text-muted-foreground mb-3">Leaderboards</h2>
  <div className="divide-y divide-border/40">
    <LeaderboardRow ... /> {/* Global */}
    <LeaderboardRow ... /> {/* Primary School */}
    {followedSchools.map(school => <LeaderboardRow ... />)}
  </div>
</section>
```

The leaderboard rows use the same `divide-y` styling as the pool list for visual continuity.

### 3. Navigation Targets

- **Global**: `navigate("/leaderboard")` -- existing page
- **School rows**: `navigate(`/school/${slug}`)` -- existing school profile page

No new routes needed.

## Technical Details

### LeaderboardRow component structure
```text
<div className="-mx-4 px-4 flex items-center justify-between py-3 hover:bg-muted/50 cursor-pointer transition-colors" onClick={onClick}>
  <div className="flex items-center gap-3 min-w-0 flex-1">
    {/* 32px icon circle */}
    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-primary/10">
      {icon}  {/* Either <Trophy /> or <img src={emblem} /> */}
    </div>
    <span className="text-sm font-medium truncate">{name}</span>
  </div>
  <div className="flex items-center gap-5 shrink-0">
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Users className="w-3 h-3" />
      <span>{memberCount.toLocaleString()}</span>
    </div>
    <div className="flex items-center gap-1 text-xs text-muted-foreground w-8 justify-end">
      <Trophy className="w-3 h-3" />
      <span>{userRank ? `#${userRank}` : "--"}</span>
    </div>
  </div>
</div>
```

### Data queries in Pools.tsx loadData
```text
// Profile + school
const { data: profile } = await supabase
  .from("profiles").select("school_id").eq("id", user.id).single();

// Primary school details
if (profile?.school_id) {
  const { data: school } = await supabase
    .from("schools").select("id, name, slug, emblem_url, jersey_url")
    .eq("id", profile.school_id).single();
}

// Followed schools (excluding primary)
const { data: follows } = await supabase
  .from("user_school_follows")
  .select("school_id, schools(id, name, slug, emblem_url, jersey_url)")
  .eq("user_id", user.id);
// Filter out primary school_id

// User scores for ranks
const { data: scores } = await supabase
  .from("user_scores").select("rank_global, rank_school")
  .eq("user_id", user.id).eq("season_year", currentYear)
  .order("week_number", { ascending: false }).limit(1);

// Global user count
const { count: globalCount } = await supabase
  .from("profiles").select("*", { count: "exact", head: true });

// Primary school member count
const { count: schoolCount } = await supabase
  .from("profiles").select("*", { count: "exact", head: true })
  .eq("school_id", profile.school_id);

// Followed school follower counts
for (const school of followedSchools) {
  const { count } = await supabase
    .from("user_school_follows").select("*", { count: "exact", head: true })
    .eq("school_id", school.id);
}
```

### School emblem in icon circle
For school rows, use `getSchoolDisplayImage()` from `@/lib/schoolImageUtils` to resolve the emblem URL. If an image exists, render `<img>` inside the circle; otherwise fall back to school initials.

### Files modified
- `src/components/pools/LeaderboardRow.tsx` -- new file
- `src/pages/Pools.tsx` -- add leaderboard section with data fetching
