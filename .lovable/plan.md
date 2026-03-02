

## Plan: Move Fixture Filtering to Database Query

### Problem
Lines 168-194 fetch 50 fixtures then filter client-side with `.filter()`. If the user's schools' fixtures fall beyond row 50, they're missed entirely.

### Solution

Replace the query (lines 170-190) with a conditional `.or()` filter when `allSchoolIds` has entries, and reduce `.limit()` to 10.

**Updated query logic:**

```typescript
const { data: upcomingFixtures = [], isLoading: upcomingLoading } = useQuery({
  queryKey: ["home-upcoming-fixtures", seasonYear, effectiveDateStr, sevenDaysStr, allSchoolIds],
  queryFn: async () => {
    const now = effectiveDate.toISOString();
    let query = supabase
      .from("fixtures")
      .select(FIXTURE_SELECT)
      .eq("is_visible", true)
      .eq("venue_type", "school")
      .eq("status", "upcoming")
      .eq("year", seasonYear)
      .gte("match_date", now)
      .lte("match_date", sevenDaysFromNow.toISOString());

    // Push filtering to database when user follows schools
    if (allSchoolIds.length > 0) {
      const orFilter = allSchoolIds
        .map(id => `school_a_id.eq.${id},school_b_id.eq.${id}`)
        .join(",");
      query = query.or(orFilter);
    }

    const { data, error } = await query
      .order("match_date", { ascending: true })
      .limit(10);

    if (error) { console.error("Error fetching upcoming fixtures:", error); return []; }
    return (data || []).map(mapFixture);
  },
  enabled: !!userId && profileLoaded,
  staleTime: CACHE_TIMES.DYNAMIC,
});
```

### Key changes
- Build a dynamic `.or()` clause from `allSchoolIds` so the database returns only relevant fixtures
- Reduce `.limit()` from 50 to 10 — the final desired count — saving bandwidth
- Remove client-side `.filter()` and `.slice(0, 10)` entirely
- When `allSchoolIds` is empty, no `.or()` is added, returning all upcoming fixtures (same fallback behavior as before)

### Files changed

| File | Change |
|---|---|
| `src/hooks/useHomeFixtures.ts` | Replace lines 168-194 with database-side `.or()` filter and `.limit(10)` |

