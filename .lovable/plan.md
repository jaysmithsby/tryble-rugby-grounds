
# Remove Dummy Data & Implement Real User Statistics

This plan addresses the critical issue of dummy/hardcoded data being displayed across the application. All statistics must be derived from real database data, with appropriate empty states when data doesn't exist.

---

## Issues Identified

| Location | Current Problem | Fix Required |
|----------|-----------------|--------------|
| **Profile.tsx** | `stats = { seasonPoints: 1450, accuracy: 63, currentStreak: 3 }` hardcoded | Fetch from `user_scores` and `predictions` tables |
| **Profile.tsx** | Display name shows "James S." (last char of first name) | Fix logic - display just "James" or use `display_name` field |
| **WeeklySummaryWidget.tsx** | All values hardcoded (`#47`, `328`, `2`) | Fetch from `user_scores` for current week |
| **Leaderboard.tsx** | Mock data array with "James S", "Zanele T", etc. | Query `user_scores` joined with `profiles_public` |
| **PoolLeaderboard.tsx** | "Hilux of the Week: James S (245 pts)" hardcoded | Calculate from real pool member scores |
| **PoolLeaderboard.tsx** | "Spud: Mike J (42 pts)" hardcoded | Calculate from real pool member scores |
| **Leaderboard.tsx** | "Top Climber: James S jumped 12 places!" hardcoded | Calculate from week-over-week rank changes |
| **Leaderboard.tsx** | "Best Accuracy: 80% this week!" hardcoded | Calculate from `predictions` data |

---

## Solution Overview

### 1. Fix Display Name Logic (Profile.tsx)

**Current Bug:**
```typescript
const lastInitial = profile.firstName.length > 1 
  ? profile.firstName[profile.firstName.length - 1].toUpperCase()  // Takes last char of first name!
  : "";
return `${profile.firstName} ${lastInitial}. — ${schoolCode}`;  // "James S." when name is "James"
```

**Fix:** Since there's no `last_name` field in the database, display just the first name or use the `display_name` field if set:
```typescript
const getDisplayName = () => {
  if (!profile) return "";
  const schoolCode = getSchoolCode(profile.schoolName);
  const name = profile.displayName || profile.firstName;
  return `${name} — ${schoolCode}`;  // "James — BLHS"
};
```

---

### 2. Create User Stats Hook (New File)

**New file: `src/hooks/useUserStats.ts`**

This hook will centralize all user statistics fetching:

```typescript
export const useUserStats = (userId: string | undefined) => {
  // Fetch from user_scores table for current week/season
  const { data: scores } = useQuery({
    queryKey: ["user-stats", userId],
    queryFn: async () => {
      const currentWeek = getISOWeek(new Date());
      const currentYear = new Date().getFullYear();
      
      const { data } = await supabase
        .from("user_scores")
        .select("*")
        .eq("user_id", userId)
        .eq("season_year", currentYear)
        .order("week_number", { ascending: false })
        .limit(1);
      
      return data?.[0] || null;
    },
    enabled: !!userId,
  });

  // Calculate current streak from predictions
  const { data: streakData } = useQuery({
    queryKey: ["user-streak", userId],
    queryFn: async () => {
      // Get predictions ordered by fixture date
      // Count consecutive wins from most recent
    },
    enabled: !!userId,
  });

  return {
    weeklyPoints: scores?.weekly_points ?? null,
    seasonPoints: scores?.season_points ?? null,
    accuracy: scores?.accuracy_percentage ?? null,
    schoolRank: scores?.rank_school ?? null,
    globalRank: scores?.rank_global ?? null,
    currentStreak: streakData?.streak ?? null,
    isLoading,
    hasData: !!scores,
  };
};
```

---

### 3. Update Profile Page Stats

**Replace hardcoded mock data with real queries:**

```typescript
// Before
const stats = {
  seasonPoints: 1450,
  accuracy: 63,
  currentStreak: 3
};

// After
const { seasonPoints, accuracy, currentStreak, hasData, isLoading } = useUserStats(user?.id);
```

**Add empty states for each stat card:**

| Stat | Empty State Message |
|------|---------------------|
| Season Points | "Make predictions to earn points!" |
| Accuracy | "Accuracy calculated after your first result" |
| Win Streak | "Build your streak by picking winners!" |

---

### 4. Update WeeklySummaryWidget

**File: `src/components/home/WeeklySummaryWidget.tsx`**

Pass `userId` prop and fetch real data:

```typescript
export const WeeklySummaryWidget = ({ userId }: { userId?: string }) => {
  const { weeklyPoints, schoolRank, hasData } = useUserStats(userId);
  const { data: badgeCount } = useBadgeCount(userId);  // New hook

  if (!hasData) {
    return (
      <Card className="...">
        <div className="text-center py-6">
          <p className="text-muted-foreground">Your weekly stats will appear here</p>
          <p className="text-sm text-muted-foreground mt-2">
            Make predictions on upcoming fixtures to get started!
          </p>
        </div>
      </Card>
    );
  }

  return (
    // Current UI with real values
  );
};
```

---

### 5. Real Leaderboard Data

**File: `src/pages/Leaderboard.tsx`**

Replace mock data with real queries:

```typescript
const loadLeaderboardData = async () => {
  const currentWeek = getISOWeek(new Date());
  const currentYear = new Date().getFullYear();

  // Global leaderboard from user_scores + profiles_public
  const { data: globalData } = await supabase
    .from("user_scores")
    .select(`
      user_id,
      weekly_points,
      season_points,
      rank_global,
      profiles_public!inner(display_name, school_name)
    `)
    .eq("season_year", currentYear)
    .eq("week_number", period === "weekly" ? currentWeek : currentWeek)
    .order(period === "weekly" ? "weekly_points" : "season_points", { ascending: false })
    .limit(50);

  // Transform to LeaderboardEntry format
  const entries = globalData?.map((item, index) => ({
    rank: index + 1,
    userId: item.user_id,
    nickname: item.profiles_public?.display_name || "Anonymous",
    schoolCode: getSchoolCode(item.profiles_public?.school_name || ""),
    points: period === "weekly" ? item.weekly_points : item.season_points,
    badges: [],  // TODO: fetch from user_badges table when implemented
  }));

  setGlobalLeaderboard(entries || []);
};
```

**Empty state for leaderboards:**
```tsx
{entries.length === 0 ? (
  <div className="text-center py-12">
    <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
    <h3 className="font-semibold mb-2">No rankings yet</h3>
    <p className="text-muted-foreground text-sm">
      Rankings will appear once the first predictions are scored.
      <br />Check back after the weekend's matches!
    </p>
  </div>
) : (
  <LeaderboardTable entries={entries} />
)}
```

---

### 6. Real Pool Leaderboard & Highlights

**File: `src/pages/PoolLeaderboard.tsx`**

Calculate "Hilux of the Week" (top scorer) and "Spud" (lowest scorer) from actual pool member data:

```typescript
const loadLeaderboardData = async () => {
  const currentWeek = getISOWeek(new Date());
  
  // Get pool members with their scores
  const { data: memberScores } = await supabase
    .from("pool_members")
    .select(`
      user_id,
      profiles_public(display_name),
      user_scores(weekly_points, season_points)
    `)
    .eq("pool_id", poolId);

  // Sort and extract top/bottom
  const sorted = memberScores?.sort((a, b) => 
    (b.user_scores?.[0]?.weekly_points || 0) - (a.user_scores?.[0]?.weekly_points || 0)
  );

  const hilux = sorted?.[0];  // Highest scorer
  const spud = sorted?.length > 1 ? sorted[sorted.length - 1] : null;  // Lowest scorer

  setHighlights({
    hilux: hilux ? { name: hilux.profiles_public?.display_name, points: hilux.user_scores?.[0]?.weekly_points } : null,
    spud: spud ? { name: spud.profiles_public?.display_name, points: spud.user_scores?.[0]?.weekly_points } : null,
  });
};
```

**Empty state for pool highlights:**
```tsx
{!highlights.hilux ? (
  <div className="text-sm text-muted-foreground text-center py-2">
    Weekly highlights appear after matches are scored
  </div>
) : (
  <>
    <span>🚙 <strong>Hilux of the Week:</strong> {highlights.hilux.name} ({highlights.hilux.points} pts)</span>
    {highlights.spud && (
      <span>🥔 <strong>Spud:</strong> {highlights.spud.name} ({highlights.spud.points} pts)</span>
    )}
  </>
)}
```

---

### 7. Weekly Highlights Banner (Leaderboard.tsx)

Replace hardcoded "Top Climber: James S jumped 12 places!" with real data:

```typescript
const { data: highlights } = useQuery({
  queryKey: ["weekly-highlights", period],
  queryFn: async () => {
    // Compare this week's ranks vs last week's
    // Find biggest rank improvement
    // Find best accuracy this week
    return {
      topClimber: { name: "...", spotsGained: 12 },
      bestAccuracy: { percentage: 80 }
    };
  }
});
```

**When no data:**
```tsx
<div className="text-center py-3 text-sm text-muted-foreground">
  Weekly highlights will appear after this weekend's matches
</div>
```

---

## Empty State Messages Summary

| Component | Message When No Data |
|-----------|---------------------|
| **Season Points** | "Make predictions to earn points!" |
| **Accuracy** | "Accuracy calculated after your first result" |
| **Win Streak** | "Build your streak by picking winners!" |
| **Weekly Rank** | "Your rank appears after your first scored prediction" |
| **Weekly Points** | "Points earned from predictions this week" |
| **Badges** | "Earn badges by making predictions and climbing leaderboards" |
| **Global Leaderboard** | "Rankings appear once the first predictions are scored" |
| **Pool Leaderboard** | "Pool rankings appear after matches are scored" |
| **Hilux/Spud** | "Weekly highlights appear after matches are scored" |
| **Top Climber** | "Climb highlights show week-over-week changes" |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useUserStats.ts` | **Create** - Centralized user stats hook |
| `src/pages/Profile.tsx` | Fix display name logic, use real stats, add empty states |
| `src/components/home/WeeklySummaryWidget.tsx` | Accept userId prop, fetch real data, add empty state |
| `src/pages/Home.tsx` | Pass userId to WeeklySummaryWidget |
| `src/pages/Leaderboard.tsx` | Replace mock data with real queries, add empty states |
| `src/pages/PoolLeaderboard.tsx` | Calculate real Hilux/Spud, add empty states |

---

## Database Considerations

The `user_scores` table already has the fields needed:
- `weekly_points` - Points for the current week
- `season_points` - Total season points
- `accuracy_percentage` - Calculated accuracy
- `rank_school` - Rank within school
- `rank_global` - Global rank
- `predictions_made` - Count of predictions
- `predictions_correct` - Correct predictions count

**Note:** Streak calculation will need to be derived from the `predictions` table by analyzing consecutive correct winners.

---

## Testing Checklist

After implementation:
- [ ] New user with no predictions sees appropriate empty states
- [ ] Profile page shows "Make predictions to earn points!" for new users
- [ ] WeeklySummaryWidget shows onboarding message for new users
- [ ] Global leaderboard shows "No rankings yet" when empty
- [ ] Pool leaderboard shows helpful message when no scores
- [ ] Display name shows correctly (no erroneous "S" suffix)
- [ ] User with predictions sees real stats from database
- [ ] Accuracy percentage calculates correctly from predictions
- [ ] Streak counts consecutive correct predictions
