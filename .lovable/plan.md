
# Onboarding Flow Enhancements: Tournaments, Pools & Fixtures

This plan addresses three interconnected improvements to the onboarding and home screen experience.

---

## Requirements Summary

| # | Requirement | Current Behavior | Target Behavior |
|---|-------------|------------------|-----------------|
| 1 | Tournament fixtures on home screen | Tournament fixtures are not included in the home feed | Merge tournament fixtures chronologically with school/pool fixtures |
| 2 | Pool creation during onboarding | Currently restricts pool schools to just the user's school | Allow full 5-10 school selection like the main CreatePoolDialog |
| 3 | User-type-based pool naming | Default is `{SchoolName} Predictions` | Suggest names like `{SchoolName} Old Boys`, `{SchoolName} Parents` based on user type |

---

## Solution Overview

### 1. Tournament Fixtures in Home Feed

**Current Implementation:**
- `useHomeFixtures.ts` fetches fixtures from pools and the user's school
- Tournament follows are stored in `user_tournament_follows` table
- Fixtures have a `tournament_id` field linking them to tournaments

**Changes Required:**
- Modify `useHomeFixtures.ts` to also fetch fixtures from followed tournaments
- Merge all fixture sources (school, pools, tournaments) into a single chronologically-sorted list
- Deduplicate fixtures that appear in multiple sources (e.g., a fixture that's both in a pool and a tournament)

**Data Flow:**
```text
User's School Fixture
        +
Pool School Fixtures
        +
Tournament Fixtures (NEW)
        ↓
Deduplicate by fixture ID
        ↓
Sort chronologically by match_date
        ↓
Display in Home feed
```

---

### 2. Full Pool Creation During Onboarding

**Current Implementation (StepPool.tsx):**
- When creating a pool, it auto-sets `schools: [schoolName]` (just one school)
- Pool name defaults to `{schoolName} Predictions`
- No school selection interface

**Changes Required:**
- Add the same school selection UI from `CreatePoolDialog.tsx` to `StepPool.tsx`
- Include Pool Packs/templates for quick selection
- Enforce 5-10 school minimum/maximum
- Pre-select the user's school by default
- Search and filter schools from the database

**New UI Flow for "Create a Pool" mode:**
```text
1. Pool Name input (with smart default based on user type)
2. School selection interface:
   - User's school pre-selected
   - Pool Packs for quick selection
   - Search to add more schools
   - 5-10 school requirement shown
3. Create Pool button (enabled when valid)
```

---

### 3. Smart Pool Name Suggestions

**User Type to Pool Name Mapping:**

| User Type | Pool Name Suggestion |
|-----------|---------------------|
| `scholar` | `{SchoolName} Predictions` |
| `alumni` | `{SchoolName} Old Boys` |
| `parent` | `{SchoolName} Parents` |
| `fan` | `{SchoolName} Fans` |

**Implementation:**
- Pass `userType` from SignUpFlow state to StepPool
- Generate smart default pool name based on user type and school
- User can still edit the name freely

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useHomeFixtures.ts` | Add tournament fixture fetching, merge and deduplicate all sources |
| `src/components/auth/signup-steps/StepPool.tsx` | Add full school selection UI, Pool Packs, smart naming |
| `src/components/auth/SignUpFlow.tsx` | Pass `userType` to StepPool component |

---

## Technical Implementation Details

### 1. useHomeFixtures.ts Changes

Add a new query to fetch fixtures from followed tournaments:

```typescript
// Fetch user's followed tournament IDs
const { data: tournamentData } = useQuery({
  queryKey: ["home-tournament-follows", userId],
  queryFn: async () => {
    if (!userId) return { tournamentIds: [] };

    const { data: follows } = await supabase
      .from("user_tournament_follows")
      .select("tournament_id")
      .eq("user_id", userId);

    return {
      tournamentIds: follows?.map(f => f.tournament_id) || []
    };
  },
  enabled: !!userId && profileLoaded,
});

// Fetch fixtures for followed tournaments
const { data: tournamentFixtures = [] } = useQuery({
  queryKey: ["home-tournament-fixtures", seasonYear, effectiveDateStr, tournamentData?.tournamentIds],
  queryFn: async () => {
    const tournamentIds = tournamentData?.tournamentIds || [];
    if (tournamentIds.length === 0) return [];

    const { data } = await supabase
      .from("fixtures")
      .select(`...same as upcomingFixtures...`)
      .eq("is_visible", true)
      .eq("status", "upcoming")
      .eq("year", seasonYear)
      .in("tournament_id", tournamentIds)
      .gte("match_date", effectiveDate.toISOString())
      .order("match_date", { ascending: true })
      .limit(20);

    return data || [];
  },
  enabled: (tournamentData?.tournamentIds?.length ?? 0) > 0,
});
```

Then merge all fixtures:
```typescript
// Merge and deduplicate fixtures from all sources
const mergedFixtures = useMemo(() => {
  const allFixtures = [
    ...upcomingFixtures,
    ...tournamentFixtures.filter(tf => 
      !upcomingFixtures.some(uf => uf.id === tf.id)
    ),
  ];
  
  // Sort chronologically
  return allFixtures.sort((a, b) => 
    new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  ).slice(0, 10);
}, [upcomingFixtures, tournamentFixtures]);
```

### 2. StepPool.tsx Enhancement

Add school selection with these new state variables:
```typescript
const [selectedSchools, setSelectedSchools] = useState<string[]>([schoolName]);
const [poolTemplates, setPoolTemplates] = useState<PoolTemplate[]>([]);
const [searchQuery, setSearchQuery] = useState("");
const [availableSchools, setAvailableSchools] = useState<School[]>([]);
```

Generate smart pool name:
```typescript
const getDefaultPoolName = (schoolName: string, userType: string): string => {
  switch (userType) {
    case "alumni":
      return `${schoolName} Old Boys`;
    case "parent":
      return `${schoolName} Parents`;
    case "fan":
      return `${schoolName} Fans`;
    case "scholar":
    default:
      return `${schoolName} Predictions`;
  }
};
```

Add Pool Packs and school search UI similar to CreatePoolDialog.

### 3. SignUpFlow.tsx Update

Pass `userType` to StepPool:
```tsx
case 7:
  return (
    <StepPool
      schoolName={state.schoolName}
      userType={state.userType || "fan"}  // NEW PROP
      userId={state.userId || ""}
      onComplete={handleOnboardingComplete}
      onSkip={handleOnboardingComplete}
    />
  );
```

---

## Edge Cases Handled

1. **Duplicate Fixtures**: When a fixture appears in both a pool and a tournament, it's deduplicated by ID
2. **Empty Tournament Follows**: If user skips tournament step, no tournament fixtures are fetched
3. **User's School Pre-selected**: When creating a pool, the user's school is always pre-selected
4. **Minimum Schools**: If user only has their school, they need to select 4 more (5 minimum)
5. **Pool Name Validation**: Uses existing `sanitizePoolName` for profanity filtering

---

## Testing Checklist

After implementation:
- [ ] Follow a tournament during onboarding
- [ ] Verify tournament fixtures appear in home feed
- [ ] Confirm fixtures are sorted chronologically (school/pool fixtures first if sooner)
- [ ] Create a pool during onboarding with full school selection
- [ ] Verify user's school is pre-selected
- [ ] Check Pool Packs appear and work correctly
- [ ] Test pool name suggestions for each user type (scholar, alumni, parent, fan)
- [ ] Complete full flow on mobile
