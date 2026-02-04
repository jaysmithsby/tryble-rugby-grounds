
# Fixtures Hub Implementation Plan

## Overview

This plan adds a dedicated "Fixtures" page to the bottom navigation bar, positioned between Leaderboards and Profile. The page will serve as a centralized hub for all South African schoolboy rugby fixtures, styled after the World Rugby website's chronological fixture presentation.

---

## Design Reference Analysis (World Rugby Style)

Based on the uploaded screenshots, the key design elements to implement:

1. **Month Navigation Bar**: Horizontal scrollable month selector (Jan, Feb, Mar, etc.) with year navigation
2. **Date Grouping**: Fixtures grouped by date with clear date headers (e.g., "Thursday 5 February")
3. **Match Counter**: Badge showing number of matches on each date
4. **Fixture Cards**: Clean cards showing both teams with crests, tournament name, and venue
5. **Chronological Order**: All fixtures in date order, not grouped by school
6. **Calendar Sidebar** (desktop): Optional mini-calendar with fixture dots (lower priority for mobile-first)

---

## Technical Architecture

### New Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Fixtures.tsx` | Main fixtures hub page |
| `src/components/fixtures/FixturesMonthNav.tsx` | Horizontal month/year navigation |
| `src/components/fixtures/FixtureDateGroup.tsx` | Date header with fixture count badge |
| `src/components/fixtures/FixtureListCard.tsx` | World Rugby-style fixture card |
| `src/components/fixtures/FixturesFilters.tsx` | Filter drawer for school search, province |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/BottomNav.tsx` | Add "Fixtures" tab between Leaderboards and Profile |
| `src/App.tsx` | Add route for `/fixtures` page |

---

## UI/UX Design

### Bottom Navigation Update

```text
[ Home ] [ Leaderboards ] [ Fixtures ] [ Profile ]
   🏠          🏆            📅          👤
```

- Icon: `CalendarDays` from lucide-react (matches rugby fixtures context)
- Active state: primary color when on `/fixtures`

### Page Layout (Mobile-First)

```text
┌─────────────────────────────────────────┐
│ HEADER: "Fixtures"                      │
│ [My Schools ▼] [All Schools ▼] 🔍       │
├─────────────────────────────────────────┤
│ < 2025  |  2026  |  2027 >              │
│ Jan Feb [Mar] Apr May Jun Jul Aug Sep   │
├─────────────────────────────────────────┤
│ Friday 14 February        ○ 1 Match     │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ GREY COLLEGE   🏛️  vs  🏛️   PAARL GIM │ │
│ │         Grey College, Bloemfontein  │ │
│ │ [Predict Now]                       │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ Thursday 27 February      ○ 1 Match     │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ HILTON COLLEGE  🏛️ vs 🏛️  MARITZBURG │ │
│ │           Hilton College            │ │
│ │ [Predict Now]                       │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Key UX Decisions

1. **Default View**: "My Schools" - shows fixtures for:
   - User's selected school
   - Schools from pools the user has joined
   - Schools the user explicitly follows (via tournaments)

2. **"All Schools" View**: Browse all fixtures with filters:
   - Search by school name (autocomplete)
   - Filter by province dropdown
   - Filter by tournament (if applicable)

3. **Chronological Order**: Fixtures sorted by date ascending, grouped by date header

4. **No Pagination (Infinite Scroll)**: Load fixtures in batches as user scrolls

---

## Component Specifications

### 1. FixturesMonthNav.tsx

**Features:**
- Year selector with arrows: `< 2025 | 2026 | 2027 >`
- Horizontal scrollable month pills: Jan through Dec
- Selected month highlighted in primary color
- Auto-scroll to current month on load

**Props:**
```typescript
interface FixturesMonthNavProps {
  selectedYear: number;
  selectedMonth: number; // 0-11
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}
```

### 2. FixtureDateGroup.tsx

**Features:**
- Date header: "Friday 14 February" format
- Match count badge: "○ 3 Matches" 
- Collapsible (optional, for many fixtures on same day)

**Props:**
```typescript
interface FixtureDateGroupProps {
  date: Date;
  fixtureCount: number;
  children: React.ReactNode;
}
```

### 3. FixtureListCard.tsx

**Features (World Rugby inspired):**
- Horizontal layout: `[Home Crest] HOME vs AWAY [Away Crest]`
- School names in bold, uppercase
- Venue displayed below
- Tournament badge (if applicable)
- Prediction CTA button
- Tap on crest → navigate to school profile

**Props:**
```typescript
interface FixtureListCardProps {
  fixture: {
    id: string;
    match_date: string;
    venue: string;
    status: string;
    home_school: { id: string; name: string; slug: string; jersey_url: string | null; };
    away_school: { id: string; name: string; slug: string; jersey_url: string | null; };
    tournament?: { id: string; name: string; } | null;
  };
  isPredicted?: boolean;
  onPredictionMade?: (fixtureId: string, team: "home" | "away", margin: number) => void;
}
```

### 4. FixturesFilters.tsx

**Features:**
- View toggle: "My Schools" / "All Schools"
- School search input with autocomplete
- Province filter dropdown (from `saProvinces.ts`)
- Clear filters button

**Props:**
```typescript
interface FixturesFiltersProps {
  viewMode: "my-schools" | "all-schools";
  onViewModeChange: (mode: "my-schools" | "all-schools") => void;
  selectedSchoolId?: string;
  onSchoolChange: (schoolId: string | undefined) => void;
  selectedProvince?: string;
  onProvinceChange: (province: string | undefined) => void;
}
```

---

## Data Fetching Strategy

### Fixtures Query

```typescript
// Fetch fixtures for a specific month
const fetchFixturesForMonth = async (year: number, month: number, filters: Filters) => {
  const startOfMonth = new Date(year, month, 1).toISOString();
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  let query = supabase
    .from("fixtures")
    .select(`
      id,
      match_date,
      venue,
      status,
      home_school_id,
      away_school_id,
      home_school:schools!fixtures_home_school_id_fkey(id, name, slug, jersey_url, province),
      away_school:schools!fixtures_away_school_id_fkey(id, name, slug, jersey_url, province),
      tournament:tournaments(id, name)
    `)
    .eq("is_visible", true)
    .gte("match_date", startOfMonth)
    .lte("match_date", endOfMonth)
    .order("match_date", { ascending: true });

  // Apply filters
  if (filters.schoolId) {
    query = query.or(`home_school_id.eq.${filters.schoolId},away_school_id.eq.${filters.schoolId}`);
  }
  if (filters.province) {
    // Need to filter by school province
    query = query.or(`home_school.province.eq.${filters.province},away_school.province.eq.${filters.province}`);
  }

  return query;
};
```

### "My Schools" Logic

For the default "My Schools" view:
1. Get user's `school_name` from profiles
2. Get schools from user's pool memberships
3. Get schools from `user_tournament_follows` (tournaments the user follows)
4. Filter fixtures to only those involving these schools

---

## State Management

```typescript
interface FixturesPageState {
  // Navigation
  selectedYear: number;
  selectedMonth: number;
  
  // Filters
  viewMode: "my-schools" | "all-schools";
  searchQuery: string;
  selectedSchoolId?: string;
  selectedProvince?: string;
  
  // Data
  fixtures: FixtureWithSchools[];
  loading: boolean;
  
  // Predictions
  predictions: Record<string, { team: "home" | "away"; margin: number }>;
}
```

---

## Implementation Sequence

### Phase 1: Core Infrastructure
1. Create `Fixtures.tsx` page skeleton
2. Update `BottomNav.tsx` to add Fixtures tab
3. Update `App.tsx` to add `/fixtures` route

### Phase 2: Month Navigation
1. Create `FixturesMonthNav.tsx` component
2. Implement year/month selection logic
3. Style to match World Rugby horizontal scrolling

### Phase 3: Fixture Display
1. Create `FixtureDateGroup.tsx` for date headers
2. Create `FixtureListCard.tsx` for individual fixtures
3. Implement chronological grouping logic

### Phase 4: Filtering
1. Create `FixturesFilters.tsx` component
2. Implement "My Schools" default filtering
3. Add school search autocomplete
4. Add province filter dropdown

### Phase 5: Predictions Integration
1. Connect `PredictionDialog` to fixture cards
2. Track prediction state
3. Show "Predicted" status on cards

---

## Styling Notes

- Use existing Trybal design tokens (primary, accent, muted colors)
- Cards: `bg-gradient-card border-border/40 shadow-card`
- Month nav: horizontal scroll with `overflow-x-auto scrollbar-hide`
- Date headers: `text-lg font-bold` with subtle separator
- Match count badges: `rounded-full bg-primary/20 text-primary`

---

## Empty States

1. **No fixtures for selected month**: 
   "No fixtures scheduled for [Month Year]. Try browsing other months."

2. **No fixtures matching filters**:
   "No fixtures found for [School Name] in [Province]. Clear filters to see all fixtures."

3. **No followed schools** (My Schools mode with no pools/school):
   "Join a pool or follow schools to see personalized fixtures here."

---

## Performance Considerations

1. **Lazy Load Fixture Cards**: Only render visible cards using intersection observer
2. **Image Preloading**: Use existing `usePreloadJerseyImages` hook for visible fixtures
3. **Memoization**: Memoize date grouping computation with `useMemo`
4. **Query Caching**: Use React Query for fixture data caching

---

## Success Criteria

After implementation:
1. Users can access Fixtures from bottom nav
2. Default view shows personalized fixtures from followed schools
3. All Schools view shows complete fixture calendar
4. Fixtures are displayed chronologically by date
5. Users can filter by school name and province
6. Month/year navigation works smoothly
7. Prediction flow works from fixture cards
8. School crests are clickable and navigate to school profiles
