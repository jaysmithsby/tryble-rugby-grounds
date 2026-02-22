

## Consolidate School Tables into Single `schools` Table

This is a significant refactoring that touches the edge function, admin UI, user-facing request modal, and query hooks. The old `school_submissions` and `school_requests` tables have already been dropped, so all references must be updated.

### Database Migration

Add columns to `schools` that the request workflow previously stored in `school_requests`:

- `school_type` (text, nullable) -- boys/girls/co-ed
- `note_to_admin` (text, nullable)
- `submitted_by_user_id` (uuid, nullable)
- `request_logo_url` (text, nullable) -- logo uploaded during request

Also update the default status from `'verified'` to `'approved'` to match the new enum vocabulary:

```text
Status values: draft, pending_review, approved, rejected, archived
```

Update existing `'verified'` rows to `'approved'`.

### 1. Edge Function: `supabase/functions/school-onboarding/index.ts`

**`handleSubmitForm`** -- Change from inserting into `school_submissions` to inserting into `schools`:
- Generate slug from `full_official_name`
- Insert with `status: 'pending_review'`, `is_visible: false`
- Map fields using standardized names:
  - `school_motto` to `motto`
  - `number_of_springboks` to `springboks_count`
  - `school_trivia` to `trivia_fact`
  - `crest_image_url` to `emblem_url`
  - `primary_colour` / `secondary_colour` to `primary_color` / `secondary_color`
- Store `contact_name`, `contact_email`, `contact_phone`, `invitation_id`

**`handleUploadCrest`** -- No change needed (only touches `school_invitations` and storage).

### 2. User-Facing Request Modal: `SchoolRequestModal.tsx`

Change from inserting into `school_requests` to inserting into `schools`:
- Generate slug from school name
- Set `status: 'draft'`, `is_visible: false`
- Map `school_type`, `province`, `note_to_admin`, `submitted_by_user_id`
- Store logo as `request_logo_url`

### 3. Admin UI Updates

**`SchoolOnboardingTab.tsx`** -- No change needed (reads from `school_invitations`, which still exists).

**`ReviewSubmissionDialog.tsx`** -- Change to read from `schools` table:
- Fetch by `invitation_id` instead of from `school_submissions`
- Display using standardized column names (motto, springboks_count, trivia_fact, etc.)
- **Approve action**: Update status to `'approved'`, set `is_visible: true`
- **Reject action**: Update status to `'rejected'`
- Remove the old logic that created a new school row on approve (it already exists)

**`SchoolRequestsTable.tsx`** -- Change to read from `schools` table:
- Query `schools` where `status = 'draft'` (user-submitted requests)
- Adapt grouping logic to work with schools columns
- Map old column names to new ones

**`ReviewSchoolRequestDialog.tsx`** -- Update to work with `schools` table:
- Change decline action from updating `school_requests` to updating `schools.status = 'rejected'`
- Change approve flow: instead of creating a new school, just update status to `'approved'` and `is_visible: true`

**`CreateSchoolDialog.tsx`** -- Remove the block (lines 279-291) that updates `school_requests` on success.

**`AdminLayout.tsx`** -- No structural change, but the "Requests" tab now reads draft schools.

### 4. Query Hooks

**`useSchoolsQuery.ts`** -- Change `status: 'verified'` filter to `status: 'approved'`:
- Line 41: `.eq("status", "approved")`
- Line 74: `.eq("status", "approved")`

This ensures drafts, pending_review, and rejected schools are excluded from public-facing views.

**`fuzzyMatchSchool`** in `src/lib/fixtureParser/` -- Already works against the schools list provided by `useSchoolsQuery`, which will now only return approved schools. No change needed.

### 5. Cleanup

- Remove all `'school_submissions'` and `'school_requests'` string references across the codebase (7 files affected)
- The TypeScript types file (`types.ts`) will auto-regenerate after migration

### Files Changed Summary

| File | Change |
|------|--------|
| **Migration SQL** | Add columns, update status values |
| `supabase/functions/school-onboarding/index.ts` | Insert into `schools` instead of `school_submissions` |
| `src/components/auth/SchoolRequestModal.tsx` | Insert into `schools` instead of `school_requests` |
| `src/components/admin/ReviewSubmissionDialog.tsx` | Read from `schools`, simplify approve/reject |
| `src/components/admin/SchoolRequestsTable.tsx` | Query `schools` where status = 'draft' |
| `src/components/admin/ReviewSchoolRequestDialog.tsx` | Update `schools` status instead of `school_requests` |
| `src/components/admin/CreateSchoolDialog.tsx` | Remove `school_requests` update block |
| `src/hooks/useSchoolsQuery.ts` | Change 'verified' to 'approved' |

### Risk Mitigation

- The `SchoolRequestModal` needs RLS consideration: currently schools INSERT requires admin role. A new RLS policy will be needed to allow authenticated users to insert schools with `status = 'draft'`.
- The edge function uses service role key so it bypasses RLS -- no policy change needed there.
