

## Update "This Week's Matches" to "Upcoming Matches" (next 5)

### Changes

**1. `src/pages/Home.tsx`**
- Change the heading from `"This Week's Matches"` to `"Upcoming Matches"`
- Change the empty-state message from `"No matches this week..."` to `"No upcoming matches yet."`

**2. `src/hooks/useHomeFixtures.ts`**
- In the `mergedUpcomingFixtures` memo, change the final `.slice(0, 10)` to `.slice(0, 5)` so only 5 fixtures are returned
- No changes to the query itself -- it already fetches all upcoming fixtures (not just this week's)

That is the full scope -- two small edits.

