

# Add Permanent Delete Button to Admin Schools Table

## Changes

**File: `src/components/admin/SchoolsTable.tsx`**

1. Add `Trash2` icon import from lucide-react (line 30)
2. Add `deleteId` state alongside `archiveId`/`restoreId` (around line 88)
3. Add `handleDelete` function that calls `supabase.from("schools").delete().eq("id", id)` — the existing RLS policy already allows admin deletes
4. Add a red trash button next to the archive/edit buttons in the actions column (around line 501)
5. Add a destructive confirmation AlertDialog with a strong warning: "This action is permanent and cannot be undone. The school and all associated data references will be removed."

The delete button will appear for all schools (archived or active). The confirmation dialog will display the school name for clarity.

No database changes needed — the `Admins can delete schools` RLS policy already exists on the schools table.

