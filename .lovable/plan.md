

# Fix: Status dropdown in EditSchoolDialog

## Problem
The Status `<Select>` (lines 627-630) only has "verified" and "pending". The database constraint allows 7 values. Schools with status "approved" can't be represented, causing a constraint violation on save.

## Fix

**File: `src/components/admin/EditSchoolDialog.tsx`** (lines 627-630)

Replace the two `<SelectItem>` options with all seven valid statuses:

```tsx
<SelectContent>
  <SelectItem value="draft">Draft</SelectItem>
  <SelectItem value="pending">Pending</SelectItem>
  <SelectItem value="pending_review">Pending Review</SelectItem>
  <SelectItem value="approved">Approved</SelectItem>
  <SelectItem value="rejected">Rejected</SelectItem>
  <SelectItem value="archived">Archived</SelectItem>
  <SelectItem value="verified">Verified</SelectItem>
</SelectContent>
```

The form state is already correctly hydrated -- `formData.status` is initialized from `school.status` and the `<Select>` uses `value={formData.status}`, so it will correctly show the current status once all options are present.

No shared status type/enum exists in the codebase, so this is a straightforward inline change. Single file, 5 lines replaced, no database migration.

