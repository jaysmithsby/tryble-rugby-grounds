

## Plan: Redefine Streak as Weekly Participation Streak

### What Changes

**Streak definition**: Count of consecutive weeks where the user predicted on ALL fixtures for schools they follow. Calculated week-by-week (week ends Sunday 23:59). Correctness doesn't matter — only that every eligible fixture has a prediction.

### Changes Required

#### 1. New/Updated Database Function — `get_user_season_stats`

Update the streak calculation in the existing `get_user_season_stats` function:

- For each week in the season (grouped by `date_trunc('week', match_date)`), find all fixtures where `school_a_id` or `school_b_id` is in the user's followed schools (`user_school_follows`).
- Check if the user has a prediction for every such fixture that week.
- Count consecutive complete weeks, starting from the most recent completed week (current or last Sunday), going backwards.
- A week with zero eligible fixtures is skipped (doesn't break or extend the streak).

#### 2. Update Client-Side Streak in `src/pages/Logs.tsx`

The Logs page currently calculates streak client-side from sorted predictions. This needs to be replaced:

- Fetch the streak from the `get_user_season_stats` RPC (already used in `useUserStats`), rather than calculating it locally.
- Remove the local streak calculation from the `analytics` memo.
- Display the server-provided streak value instead.

#### 3. Wire Up `useUserStats` Streak

The `useUserStats` hook already reads `current_streak` from the RPC. Once the DB function is updated, the Logs page just needs to consume it from that hook (or call the same RPC).

### Technical Detail

**DB function streak logic** (pseudocode):
```text
FOR each week in season (descending):
  IF week > current_week: SKIP
  eligible_fixtures = fixtures WHERE (school_a_id IN followed OR school_b_id IN followed) AND week(match_date) = this_week
  IF eligible_fixtures = 0: SKIP (no fixtures that week)
  user_predictions = predictions WHERE fixture_id IN eligible_fixtures AND user_id = p_user_id
  IF count(user_predictions) = count(eligible_fixtures): streak += 1
  ELSE: BREAK
```

### Files Affected
- `supabase` — migration to update `get_user_season_stats` function (streak portion)
- `src/pages/Logs.tsx` — remove client-side streak calc, use server value

