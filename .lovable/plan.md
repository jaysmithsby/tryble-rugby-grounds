

## Update Scoring System: "Points" to "Brags" and New Point Values

### Overview
Replace the entire scoring system with a new "brags" currency and simplified tiers. This touches the database scoring function, UI pages, summary cards, leaderboards, and all "pts" / "points" text throughout the app.

---

### 1. Database: Update `calculate_prediction_points` function

**New migration SQL** to replace the scoring logic in `calculate_prediction_points`:

Old logic:
- Correct winner = 10
- Exact margin = +25
- Within 3 = +15
- Within 7 = +10
- Wrong winner = 0

New logic:
- Correct winner = 4 brags
- Correct winner + margin within 7 = 5 brags (4 + 1)
- Correct winner + exact margin = 6 brags (4 + 1 + 1 bonus)
- Wrong winner but margin within 7 = 1 bonus brag
- Wrong winner and margin off by more than 7 = 0 brags

The SQL function body changes from:
```sql
IF predicted_team = actual_winner THEN
  points := 10;
  IF exact margin THEN points := points + 25;
  ELSIF within 3 THEN points := points + 15;
  ELSIF within 7 THEN points := points + 10;
  END IF;
END IF;
```
To:
```sql
IF predicted_team = actual_winner THEN
  points := 4;
  IF ABS(predicted_margin - actual_margin) <= 7 THEN
    points := 5;
    IF predicted_margin = actual_margin THEN
      points := 6;
    END IF;
  END IF;
ELSE
  -- Wrong winner
  IF ABS(predicted_margin - actual_margin) <= 7 THEN
    points := 1;
  ELSE
    points := 0;
  END IF;
END IF;
```

---

### 2. "How Scoring Works" page (`src/pages/HowScoringWorks.tsx`)

Complete rewrite of all card content:
- **Overview card**: Update description to reference "brags" instead of "points"
- **Base section**: "Correct Winner = 4 brags"
- **Margin Bonuses**: Remove "Within 3" tier entirely. Show:
  - Within 7 points: 5 brags total (4 + 1)
  - Exact margin: 6 brags total (5 + 1 bonus)
  - Wrong winner, within 7: 1 bonus brag
- **Examples**: Replace all 3 examples + add Example 4:
  1. Perfect Prediction: 6 brags
  2. Close Prediction: 5 brags
  3. Wrong Winner, Close Margin: 1 brag
  4. Wrong Winner, Far Off: 0 brags
- **Pro Tips**: Update text to use "brags" instead of "points"
- All instances of "pts" become "brags"

---

### 3. Pool Scoring Info Card (`src/components/pools/ScoringInfoCard.tsx`)

Replace the list items:
- "Correct winner: **4 brags**"
- "Correct winner within 7 margin: **5 brags**"
- "Exact margin: **+1 bonus brag**"
- "Wrong winner within 7 margin: **1 bonus brag**"

Update heading from "How Points Work" to "How Brags Work"

---

### 4. Replace "pts" with "brags" across all UI files

Files requiring text replacement:

| File | Change |
|------|--------|
| `src/pages/PoolLeaderboard.tsx` | `{entry.points} pts` to `{entry.points} brags` (lines 364, 368, 514) |
| `src/pages/Leaderboard.tsx` | `{entry.points} pts` and `{entry.averagePoints} pts` to brags (lines 316, 343) |
| `src/pages/SchoolProfile.tsx` | `{user.points} pts` to brags (line 469) |
| `src/pages/Pools.tsx` | `{entry.points} pts` to brags (line 477) |
| `src/pages/Profile.tsx` | `{badge.points} pts` to brags (line 338) |
| `src/components/profile/BadgeGrid.tsx` | `{badge.points} pts` to brags (line 87) |
| `src/components/home/WeeklySummaryWidget.tsx` | "Points" label to "Brags" (line 65) |
| `src/components/admin/CreateSchoolDialog.tsx` | `+{weight} pts` to `+{weight} brags` (line 63) |

---

### 5. Badge data (optional/cosmetic)

`src/data/badgesData.ts` uses `points` as a property name in the badge objects. The property name stays as-is (it is internal), but the UI rendering of `{badge.points} pts` changes to `{badge.points} brags` (covered in step 4).

---

### Files Modified
- **New migration SQL** -- update `calculate_prediction_points` function
- `src/pages/HowScoringWorks.tsx` -- full content rewrite
- `src/components/pools/ScoringInfoCard.tsx` -- updated list
- `src/pages/PoolLeaderboard.tsx` -- "pts" to "brags"
- `src/pages/Leaderboard.tsx` -- "pts" to "brags"
- `src/pages/SchoolProfile.tsx` -- "pts" to "brags"
- `src/pages/Pools.tsx` -- "pts" to "brags"
- `src/pages/Profile.tsx` -- "pts" to "brags"
- `src/components/profile/BadgeGrid.tsx` -- "pts" to "brags"
- `src/components/home/WeeklySummaryWidget.tsx` -- "Points" to "Brags"
- `src/components/admin/CreateSchoolDialog.tsx` -- "pts" to "brags"

