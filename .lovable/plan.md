
# Replace Profile Tab with Schools Directory

## Overview
Replace the "Profile" tab in the bottom navigation with a "Schools" directory page. Users can browse, search, filter by province, and follow/unfollow schools with confirmation dialogs. Profile remains accessible via the GlobalHeader burger menu (already linked there).

---

## Changes

### 1. Create Schools Directory Page (`src/pages/Schools.tsx`)

A new mobile-first page with:

- **Sticky filter bar**: Debounced search input + province dropdown (reusing `saProvinces` data and existing filter patterns from Fixtures)
- **School list**: Fetched via `useSchoolsQuery` with `select: "id, name, slug, province, emblem_url, jersey_url, icon_url"`, paginated at 20 per page using `usePagination`
- **Client-side filtering**: Search by name and filter by province applied to the fetched list (schools are static data, so client-side filtering is efficient)
- **Each list row**:
  - 28px circular avatar using `getSchoolDisplayImage()` with initials fallback
  - School name as a clickable link to `/school/:slug`
  - Province in muted smaller text
  - Star icon (filled yellow if followed, outline if not)
- **Follow/unfollow logic**:
  - Fetch `user_school_follows` for the current user on mount
  - Fetch user's `school_id` from profile for primary school detection
  - Clicking star opens an `AlertDialog` with contextual message
  - Primary school star is filled but disabled with a `Tooltip` showing "Primary School"
  - On confirm: insert/delete from `user_school_follows`, show sonner toast
- **Pagination controls** at the bottom using existing `PaginationControls` pattern (Previous/Next buttons with item count display)

### 2. Update Bottom Navigation (`src/components/BottomNav.tsx`)

- Replace the Profile button: change icon from `User` to `School` (from lucide-react), label from "Profile" to "Schools", route from `/profile` to `/schools`
- Update `isActive` check to match `/schools`
- Update prefetch handler to prefetch schools data for `/schools`

### 3. Update Routing (`src/components/AnimatedRoutes.tsx`)

- Import the new `Schools` page eagerly (core nav page)
- Add `/schools` to the `KEEP_ALIVE_ROUTES` array for cached navigation
- Keep `/profile` as a secondary animated route (still accessible, just not in bottom nav)

### 4. Update Prefetch Hook (`src/hooks/usePrefetch.ts`)

- Add a `/schools` case to `prefetchForRoute` that calls `prefetchSchools()` and `prefetchProfile()` (profile needed for follow state)

---

## Technical Details

### Data Fetching Strategy
- Schools list: Use `useSchoolsQuery` with `CACHE_TIMES.STATIC` (already configured)
- User follows: Separate `useQuery` fetching all `user_school_follows` for the current user, keyed as `["user-school-follows", userId]` with `CACHE_TIMES.REFERENCE`
- User profile `school_id`: Reuse existing profile query pattern

### Files Created
- `src/pages/Schools.tsx` -- the full directory page

### Files Modified
- `src/components/BottomNav.tsx` -- swap Profile for Schools
- `src/components/AnimatedRoutes.tsx` -- add Schools to keep-alive routes, move Profile to secondary routes
- `src/hooks/usePrefetch.ts` -- add `/schools` prefetch case

### Components Used (existing)
- `AlertDialog` (shadcn) for follow/unfollow confirmation
- `Tooltip` for primary school indicator
- `Select` for province filter
- `Input` with search icon for search bar
- `Skeleton` for loading states
- `getSchoolDisplayImage` from `schoolImageUtils`
- `saProvinces` for province filter options
- `useDebounce` for search input
- `usePagination` for page state
- `toast` from sonner for success feedback
