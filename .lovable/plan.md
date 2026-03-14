

## Block Predictions on Past/Today Matches in Tournament Page

### Problem
The Tournament page passes `onPredictionMade` to every fixture when the user follows the tournament, regardless of whether the match date is today or in the past.

### Fix
**Single file: `src/pages/Tournament.tsx` (line 530)**

Add a date check before passing `onPredictionMade`:

```typescript
const matchDay = new Date(f.match_date);
matchDay.setHours(0, 0, 0, 0);
const today = new Date();
today.setHours(0, 0, 0, 0);
const isFuture = matchDay > today;

// Then in the JSX:
onPredictionMade={isFollowing && isFuture ? (schoolId, margin) => { ... } : undefined}
isPredicted={isFollowing && isFuture ? !!pred : isFollowing ? !!pred : undefined}
```

This ensures:
- Past and same-day matches show scores/history but no "Pick needed" prompt
- Future matches remain interactive for predictions
- Match history expansion continues to work for all matches

