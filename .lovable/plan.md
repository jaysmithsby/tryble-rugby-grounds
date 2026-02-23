

# Box-and-Whisker: Switch from Accuracy to Points Efficiency

## What Changes

The Box-and-Whisker chart on the **Leaderboard Detail** page will be updated to show **Points Efficiency** (average brags earned per prediction) instead of Accuracy percentage. The same chart will also be added to the **Pool Leaderboard** page.

---

## 1. Shared BoxWhiskerChart Component

Extract the chart into a reusable component at `src/components/ui/BoxWhiskerChart.tsx` so both pages can use it.

### Updated Data Model

- Rename `userAccuracy` to `userValue` in the stats type
- Add a `maxValue` field for dynamic axis scaling (instead of hardcoded 0-100%)
- Add a `unit` field (e.g., `"pts"`) for label formatting

### Dynamic Scaling

Currently the SVG maps values to positions assuming a 0-100 range. The new version will:
- Use `maxValue` from the dataset (the highest average points found) to scale the axis
- Position formula changes from `(value / 100) * 360` to `(value / maxValue) * 360`
- Labels show values like `2.4 pts` instead of `65%`

### Visual Elements (unchanged structure)

- Whiskers: min to max range
- IQR box: Q1 to Q3
- Median line
- "You" triangle marker
- Bottom legend: Min, Q1, Median, Q3, Max values

### Title and Subtext

- Title: **"Points Efficiency Distribution"**
- Subtext below title: *"Avg brags earned per pick. Higher = precise winner and margin picks."*

---

## 2. LeaderboardDetail.tsx Changes

### Data Calculation

The `ScoreRow` type gains a new field: `efficiency` (replacing the role of `accuracy` in the chart).

```
efficiency = season_points / predictions_made
```

This is already calculable from the existing `user_scores` data -- no new queries needed.

### BoxWhisker Stats Computation

- Build array of `efficiency` values from all rows
- Find current user's efficiency
- Pass to the shared `BoxWhiskerChart`

### Header Stat Update

Keep the "Avg Accuracy" stat in the header as-is (it remains useful metadata). The chart alone switches to efficiency.

---

## 3. PoolLeaderboard.tsx Changes

### Add the Chart

Import the shared `BoxWhiskerChart` component and render it in the Leaderboard view, between the season selector and the rankings table.

### Data Calculation

For pool members, compute efficiency from the existing leaderboard entries:

```
efficiency = entry.points / entry.picks  (where picks > 0)
```

Find current user's efficiency and pass to the chart.

---

## Technical Details

### Files Created

- **`src/components/ui/BoxWhiskerChart.tsx`** -- Extracted and updated chart component with dynamic scaling and "Points Efficiency" labeling

### Files Modified

- **`src/pages/LeaderboardDetail.tsx`**:
  - Remove inline `BoxWhiskerChart` and `BoxWhiskerStats` type
  - Import shared component
  - Add `efficiency` field to `ScoreRow`
  - Update `boxStats` computation to use efficiency values
  - Pass dynamic `maxValue` to chart

- **`src/pages/PoolLeaderboard.tsx`**:
  - Import shared `BoxWhiskerChart`
  - Compute efficiency stats from leaderboard entries
  - Render chart in Leaderboard view above the rankings table

### Component Props

```typescript
type BoxWhiskerStats = {
  min: number;
  max: number;
  q1: number;
  median: number;
  q3: number;
  userValue: number | null;  // renamed from userAccuracy
  maxValue: number;          // new: for dynamic axis scaling
};

// BoxWhiskerChart accepts { stats: BoxWhiskerStats }
```

### Scaling Logic

```typescript
const scale = stats.maxValue > 0 ? stats.maxValue : 1;
const toPos = (val: number) => 20 + (val / scale) * 360;
```

Labels formatted as `{value.toFixed(1)} pts` instead of `{value.toFixed(0)}%`.
