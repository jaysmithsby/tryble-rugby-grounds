

## Refactor: Replace `school_name` with `school_id` Foreign Key on Profiles

This is a significant data integrity improvement that touches the database schema, the signup flow, profile management, public views, and multiple display components.

### 1. Database Migration

A single migration will:

- Add `school_id UUID` column to `profiles`, referencing `schools(id)` with `ON DELETE SET NULL`
- Rename `school_name` to `school_name_legacy` (preserves existing data)
- Backfill `school_id` by matching `school_name_legacy` against `schools.name`
- Update the `handle_new_user()` trigger to accept `school_id` from auth metadata (falling back to looking up by `school_name` for backward compatibility)
- Recreate `profiles_public` view to JOIN `schools` and expose `school_name` from the schools table (with fallback to `school_name_legacy`)

```sql
-- 1. Add school_id column
ALTER TABLE public.profiles
  ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

-- 2. Backfill school_id from existing school_name
UPDATE public.profiles p
SET school_id = s.id
FROM public.schools s
WHERE p.school_name = s.name
  AND s.is_archived = false;

-- 3. Rename school_name -> school_name_legacy
ALTER TABLE public.profiles
  RENAME COLUMN school_name TO school_name_legacy;

-- 4. Make school_name_legacy nullable (new users will use school_id)
ALTER TABLE public.profiles
  ALTER COLUMN school_name_legacy DROP NOT NULL;

-- 5. Update handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  insert into public.profiles (
    id, first_name, contact_method, contact_value,
    user_type, school_id, school_name_legacy
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'contact_method', 'email'),
    coalesce(new.raw_user_meta_data->>'contact_value', new.email),
    coalesce(new.raw_user_meta_data->>'user_type', 'fan'),
    (new.raw_user_meta_data->>'school_id')::uuid,
    coalesce(new.raw_user_meta_data->>'school_name', '')
  );
  return new;
end;
$$;

-- 6. Recreate profiles_public view with school join
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT
  p.id,
  p.display_name,
  p.username,
  COALESCE(s.name, p.school_name_legacy) AS school_name,
  p.province,
  p.country,
  p.created_at
FROM public.profiles p
LEFT JOIN public.schools s ON p.school_id = s.id;
```

### 2. Signup Flow Changes

**`src/components/auth/signup-steps/StepProfile.tsx`**
- Change `onNext` callback to include `schoolId: string` alongside `schoolName`
- When a school is selected from the combobox/drawer, capture both `school.id` and `school.name`
- Pass `schoolId` through the callback

**`src/components/auth/signup-steps/SchoolSearchDrawer.tsx`**
- Change `onSelectSchool` prop from `(school: string) => void` to `(school: { id: string; name: string }) => void`
- Return the full school object instead of just the name

**`src/components/auth/SignUpFlow.tsx`**
- Add `schoolId` to `OnboardingState` interface
- In `handleProfileComplete`, save `school_id` to the profile update call (instead of `school_name`)
- Keep `school_name_legacy` as a fallback write

### 3. Profile Management

**`src/pages/Profile.tsx`**
- Update the profile query to: `select("*, schools(name)")` to join the school name
- Display `profile.schools?.name || profile.school_name_legacy` for the school name
- Update `ProfileData` interface to include `schoolId`

**`src/components/profile/ChangeSchoolDialog.tsx`**
- Update `handleConfirmChange` to save `school_id` instead of `school_name`
- Set `school_name_legacy` to null or the new school name for backward compat

### 4. Components Using `profiles_public` View (No Code Changes Needed)

These components query `profiles_public.school_name` which the updated view will continue to expose via the JOIN:
- `src/pages/Leaderboard.tsx` -- no change needed
- `src/pages/PoolLeaderboard.tsx` -- no change needed  
- `src/pages/Pools.tsx` -- no change needed

### 5. Components Querying `profiles.school_name` Directly

These need updating to use the new column:

| File | Current Usage | Change |
|------|--------------|--------|
| `src/hooks/useFixturesData.ts` | Queries `profiles.school_name`, then looks up `schools.id` | Query `profiles.school_id` directly -- eliminates the extra lookup |
| `src/hooks/usePrefetch.ts` | Selects `school_name` from profiles | Select `school_id, school_name_legacy, schools(name)` |
| `src/hooks/useConsentStatus.ts` | Reads `school_name` | Read via join or legacy |
| `src/pages/SchoolProfile.tsx` | Joins `profiles.school_name` for leaderboard | Join via `school_id` instead |
| `src/components/scores/MatchScoreSubmission.tsx` | Receives `userSchoolName` prop | No change (prop is passed from Profile.tsx which we update) |
| `src/components/admin/UsersTable.tsx` | Displays `profile.school_name` | Read `school_name_legacy` + join schools for display |
| `src/components/admin/DeleteUserDialog.tsx` | Logs `school_name` in audit | Use legacy or joined name |

### 6. Backward Compatibility Strategy

- `school_name_legacy` is kept as a nullable column so old data is never lost
- The `profiles_public` view uses `COALESCE(s.name, p.school_name_legacy)` so all consumers see a school name regardless
- Components that query `profiles` directly will use a pattern like: `schools(name)` join + fallback to `school_name_legacy`
- The `handle_new_user` trigger writes both `school_id` and `school_name_legacy` for safety

### Files Changed Summary

| File | Type of Change |
|------|---------------|
| New migration SQL | Schema + trigger + view |
| `src/components/auth/SignUpFlow.tsx` | Add schoolId to state, save school_id |
| `src/components/auth/signup-steps/StepProfile.tsx` | Capture school ID from selection |
| `src/components/auth/signup-steps/SchoolSearchDrawer.tsx` | Return school object |
| `src/pages/Profile.tsx` | Join schools table in query |
| `src/components/profile/ChangeSchoolDialog.tsx` | Save school_id |
| `src/hooks/useFixturesData.ts` | Use school_id directly |
| `src/hooks/usePrefetch.ts` | Update select columns |
| `src/hooks/useConsentStatus.ts` | Update select columns |
| `src/pages/SchoolProfile.tsx` | Join by school_id |
| `src/components/admin/UsersTable.tsx` | Display via join/legacy |
| `src/components/admin/DeleteUserDialog.tsx` | Minor field rename |

