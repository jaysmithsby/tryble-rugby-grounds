

## Handle Archived Schools in Fixtures and Profiles

### Problem
Archived schools disappear from fixtures (creating gaps) and their profile pages remain accessible. The desired behavior:
- Archived schools **should still appear** in fixture lists (already works -- no `is_archived` filter on fixtures query)
- Archived schools **should not** appear in Discover > Schools list (already works -- `useSchoolsQuery` filters `is_archived: false`)
- Archived schools **should not** have navigable profile pages
- School names in fixtures should **not be clickable** when the school is archived

### Changes

**1. Add `is_archived` to fixture school data** (`src/hooks/useFixturesData.ts`)
- Add `is_archived` to the school select in the fixtures query: `school_a:schools!...(id, name, slug, jersey_url, province, is_archived)`
- Add `is_archived` to the `FixtureSchool` interface

**2. Update `FixtureSchool` interface and `SchoolBlock`** (`src/components/fixtures/FixtureRow.tsx`)
- Add `is_archived?: boolean` to `FixtureSchool` interface
- In `SchoolBlock`, skip navigation if `school.is_archived` is true (render a `<div>` instead of a `<button>`, or make `onNavigate` a no-op)

**3. Block archived school profile pages** (`src/pages/SchoolProfile.tsx`)
- After loading school data, if `schoolData.is_archived === true`, show a "School not found" or redirect to `/schools` instead of rendering the profile

**4. Fixture card passthrough** (`src/components/fixtures/FixtureListCard.tsx`, `src/components/fixtures/FixtureCard.tsx`)
- Pass `is_archived` through to the school objects so `FixtureRow` receives it

**5. Jersey marquee** (`src/components/JerseyMarquee.tsx`)
- Already filters `is_archived: false` -- no change needed

**6. School profile page queries** (`src/pages/SchoolProfile.tsx`)
- The `loadSchoolData` function currently loads any school by slug without checking `is_archived`. Add a check: if the school is archived, set `school` to `null` and show a not-found state.

### Files to edit
- `src/hooks/useFixturesData.ts` — add `is_archived` to school select
- `src/components/fixtures/FixtureRow.tsx` — update interface + disable nav for archived
- `src/pages/SchoolProfile.tsx` — block archived school profiles
- `src/components/fixtures/FixtureListCard.tsx` — pass `is_archived` through (if needed)

