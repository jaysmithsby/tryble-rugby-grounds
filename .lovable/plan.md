

## Multi-School Following System

### Overview

Create a `user_school_follows` table that powers the home feed and school interactions. Users automatically follow their primary school and can follow additional schools from school profile pages.

### 1. Database Migration

Create table `public.user_school_follows`:
- `id` UUID primary key
- `user_id` UUID references `profiles(id)` ON DELETE CASCADE
- `school_id` UUID references `schools(id)` ON DELETE CASCADE
- `created_at` TIMESTAMPTZ default `now()`
- UNIQUE constraint on `(user_id, school_id)`

RLS policies:
- SELECT: any authenticated user can view follows (needed for leaderboard context)
- INSERT: users can only insert their own (`auth.uid() = user_id`)
- DELETE: users can only delete their own (`auth.uid() = user_id`)
- No UPDATE needed

Data migration: backfill from existing profiles:
```sql
INSERT INTO user_school_follows (user_id, school_id)
SELECT id, school_id FROM profiles
WHERE school_id IS NOT NULL
ON CONFLICT DO NOTHING;
```

### 2. Update Home Feed (`src/hooks/useHomeFixtures.ts`)

Replace the current `userSchoolName`-based school fixture lookup with a query against `user_school_follows`:
- New query: fetch all `school_id` values from `user_school_follows` for the current user
- Use these IDs to filter upcoming fixtures (home or away school matches any followed school)
- This replaces the separate "user school fixture" query and the pool-only school filtering
- The `userSchoolFixture` concept becomes redundant since all followed schools' fixtures appear in the main feed

Update `useHomeAuth.ts` to also return `userSchoolId` (the primary school from profile) so the UI can still highlight "your school's match."

### 3. School Profile Follow Button (`src/pages/SchoolProfile.tsx`)

Add a Follow/Unfollow button in the school header area:
- Query `user_school_follows` to check if the user already follows this school
- If the school matches the user's `profile.school_id`, show a disabled "Primary School" badge instead
- Follow: insert into `user_school_follows`
- Unfollow: delete from `user_school_follows`
- Use `sonner` toast: "Now following [School Name]" / "Unfollowed [School Name]"
- Button placed next to the school name in the hero section

### 4. Signup Flow Auto-Follow (`src/components/auth/SignUpFlow.tsx`)

After `handleProfileComplete` saves the profile with `school_id`, insert a matching record into `user_school_follows`:
```ts
if (data.schoolId) {
  await supabase.from("user_school_follows").insert({
    user_id: state.userId,
    school_id: data.schoolId,
  });
}
```

### 5. "Following" Section on Profile Page (`src/pages/Profile.tsx`)

Add a new card below "Your Pools" showing schools the user follows:
- Query `user_school_follows` joined with `schools(name, slug, emblem_url)` for the current user
- Display each school with its name/emblem
- Mark the primary school (matching `profile.school_id`) with a "Primary" badge
- Each school row links to `/school/{slug}`
- Non-primary schools show an "Unfollow" button

### 6. Fixtures Page Integration (`src/hooks/useFixturesData.ts`)

Update the "My Schools" view mode to use `user_school_follows` instead of the current complex logic that queries profile + pools + tournament follows separately. This simplifies the code significantly:
- Query `user_school_follows` for the user's followed school IDs
- Use those IDs directly in the fixture filter

### Technical Details

| File | Change |
|------|--------|
| New migration SQL | Create table, RLS, backfill |
| `src/hooks/useHomeFixtures.ts` | Replace school name lookup with follows-based query |
| `src/hooks/useHomeAuth.ts` | Add `userSchoolId` to return value |
| `src/pages/SchoolProfile.tsx` | Add Follow/Unfollow button |
| `src/components/auth/SignUpFlow.tsx` | Auto-insert follow on profile creation |
| `src/pages/Profile.tsx` | Add "Following" section |
| `src/hooks/useFixturesData.ts` | Simplify "My Schools" with follows table |

