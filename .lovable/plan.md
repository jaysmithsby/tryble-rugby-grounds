

# Leaderboard Detail Page

## Overview
Create a new `LeaderboardDetail` page accessible from the Pools page leaderboard rows. It features a compact header, an SVG-based box-and-whisker accuracy distribution chart, a high-density ranking table (20 rows/page), and a sticky "Your Standings" footer bar.

## Changes

### 1. Create route in `src/components/AnimatedRoutes.tsx`

Add a lazy import and route for the new page:
- `const LeaderboardDetail = lazy(() => import("@/pages/LeaderboardDetail"));`
- Route: `<Route path="/leaderboard/:type/:id" element={<LeaderboardDetail />} />`

### 2. Update navigation in `src/pages/Pools.tsx`

Change the leaderboard row `onClick` handlers to navigate to the new detail route:
- Global: `navigate("/leaderboard/global/all")`
- Primary School: `navigate(`/leaderboard/school/${primarySchool.id}`)`
- Followed Schools: `navigate(`/leaderboard/school/${school.id}`)`

### 3. Create `src/pages/LeaderboardDetail.tsx`

**Page Header:**
- Dynamic title based on route params: "Global Leaderboard", or school name fetched from `schools` table
- Stats row: total player count + "Average Accuracy: X%" calculated from the fetched data
- Back button (ChevronLeft) to return to `/pools`

**Box-and-Whisker Visualization** ("Pool Performance Distribution"):
- A custom SVG component rendered above the table
- Horizontal line from min to max accuracy in the dataset (the "whisker")
- Filled rectangle from Q1 to Q3 (the "box", interquartile range)
- Vertical line at the median
- A distinct marker (triangle/arrow) showing the current user's accuracy position
- All values computed client-side from the fetched `accuracy_percentage` array using simple sorting

**Ranking Table:**
- Columns: Rank | User (avatar initials + display name) | Points | Accuracy % | Picks
- 20 rows per page with Prev/Next pagination
- Current user's row highlighted with `bg-primary/10`
- Data source: `user_scores` joined with `profiles_public`
  - If `type === "global"`: fetch all users ordered by `season_points DESC`
  - If `type === "school"`: fetch users whose profile `school_id` matches the `:id` param
- Accuracy calculated as: `predictions_correct / predictions_made * 100` (from `user_scores` columns)

**Sticky Footer Bar:**
- Only visible when the user's row is NOT on the current page
- Shows: "Your Standings: Rank #X | Y% Accuracy | Z pts"
- "Jump to My Page" button that calculates and navigates to the correct page number

### 4. Data Fetching Strategy

```text
// Step 1: Determine leaderboard type and fetch context
const { type, id } = useParams();  // type: "global" | "school", id: "all" | school UUID

// Step 2: If school type, fetch school name
if (type === "school") {
  const { data } = await supabase.from("schools")
    .select("name").eq("id", id).single();
}

// Step 3: Fetch all scores for this leaderboard (for box-whisker stats)
// Global: all user_scores for current year, latest week
// School: user_scores where user_id IN (profiles where school_id = id)
const currentYear = new Date().getFullYear();

// For school type, first get user IDs
let userFilter: string[] | null = null;
if (type === "school") {
  const { data: profiles } = await supabase.from("profiles")
    .select("id").eq("school_id", id);
  userFilter = profiles?.map(p => p.id) || [];
}

// Fetch scores
let query = supabase.from("user_scores")
  .select("user_id, season_points, weekly_points, predictions_made, predictions_correct, rank_global, rank_school")
  .eq("season_year", currentYear)
  .order("season_points", { ascending: false });

if (userFilter) {
  query = query.in("user_id", userFilter);
}

// Step 4: Fetch display names from profiles_public
const { data: profiles } = await supabase.from("profiles_public")
  .select("id, display_name, school_name")
  .in("id", userIds);

// Step 5: Compute box-whisker stats from accuracy values
const accuracies = scores.map(s => 
  s.predictions_made > 0 ? (s.predictions_correct / s.predictions_made) * 100 : 0
).sort((a, b) => a - b);

const min = accuracies[0];
const max = accuracies[accuracies.length - 1];
const q1 = accuracies[Math.floor(accuracies.length * 0.25)];
const median = accuracies[Math.floor(accuracies.length * 0.5)];
const q3 = accuracies[Math.floor(accuracies.length * 0.75)];
```

### 5. Box-and-Whisker SVG Component

Inline SVG rendered within the page (no separate file needed):
- Width: 100% of container, height: ~60px
- Light gray background bar (full width = 0-100% range)
- Thin horizontal line from `min` to `max` (whisker)
- Filled rectangle from `q1` to `q3` with `bg-primary/20` fill and `border-primary` stroke
- Vertical line at `median` position
- Small triangle marker at the user's accuracy position in a distinct accent color
- Labels: "Min", "Max", "You" positioned near their markers

### 6. Section Layout

```text
GlobalHeader
  Back button + Title (e.g., "Global Leaderboard")
  Stats: "{N} players . Avg Accuracy: {X}%"

  "Pool Performance Distribution" heading
  Box-and-Whisker SVG

  Ranking Table (20 rows/page)
    Rank | User | Points | Accuracy | Picks
  Pagination (Prev / Page X of Y / Next)

  Sticky Footer (when user not on current page):
    "Your Standings: Rank #14 | 88% | 950 pts" + "Jump" button
BottomNav
```

### Files modified/created
- `src/pages/LeaderboardDetail.tsx` -- new file
- `src/components/AnimatedRoutes.tsx` -- add route + lazy import
- `src/pages/Pools.tsx` -- update navigation targets for leaderboard rows
