

## Scope Home Feed to Next 7 Days

### What Changes

The "Upcoming Matches" feed currently fetches all future fixtures and applies complex deduplication logic. This update narrows it to only show fixtures within the **next 7 days** from the effective date, for schools the user follows or has in pools. Tournament fixtures from followed tournaments are also scoped to the same 7-day window.

### Changes

**`src/hooks/useHomeFixtures.ts`**:

1. **Upcoming fixtures query** (line ~168-198): Add an upper bound filter `.lte("match_date", sevenDaysFromNow)` alongside the existing `.gte("match_date", now)`. This limits results to the next 7 days.

2. **Tournament fixtures query** (line ~279-305): Apply the same 7-day upper bound filter.

3. **Remove complex deduplication** (line ~308-356): Replace the "one next game per school + 6-day tournament exception" logic with a simple merge, deduplicate by ID, and sort chronologically. No need for per-school deduplication or the `.slice(0, 5)` cap since the 7-day window naturally limits volume.

4. **Add `sevenDaysFromNow` date string** for query keys to ensure proper cache invalidation.

**`src/pages/Home.tsx`**:

5. **Update empty-state copy** (line ~244-246): Change "No upcoming matches yet." to "No matches this week."

### No Database Changes Required

This is purely a query filter and display logic change.
