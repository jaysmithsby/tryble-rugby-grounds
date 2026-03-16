

## Create shared SchoolMultiSelectFilter component

### Problem
The school filtering pattern (popover with checkboxes) is implemented inline in Tournament.tsx, and the Fixtures page uses a plain text search instead. The user wants a single reusable component used everywhere.

### New Component: `src/components/ui/SchoolMultiSelectFilter.tsx`
A compact popover button with:
- Filter icon + label showing "All Schools" or "Schools (N/M)"
- Popover content: search input at top, scrollable checkbox list, "Clear all" link
- Props: `schools: string[]`, `selectedSchools: string[]`, `onSelectionChange: (schools: string[]) => void`, optional `label?: string`
- Matches the Tournament page's compact `h-8 text-xs` styling

### Changes to `src/components/fixtures/FixturesFilters.tsx`
- Replace the `<Input>` search field with the new `SchoolMultiSelectFilter`
- Add new props: `schools: string[]`, `selectedSchools: string[]`, `onSelectedSchoolsChange`
- Remove `searchQuery` / `onSearchQueryChange` props (filtering now done via multiselect, not text search)
- Keep the date selector and province filter as-is

### Changes to `src/pages/Fixtures.tsx`
- Pass available school names + selected schools state to `FixturesFilters`
- Replace text-based search filtering with `selectedSchools`-based filtering
- Derive school list from fixtures data

### Changes to `src/pages/Tournament.tsx`
- Replace the inline Popover+Checkbox block (~lines 467-494) with the shared `SchoolMultiSelectFilter` component
- Remove the `toggleSchoolFilter` function, use `setSelectedSchools` directly

### Changes to `src/components/pools/CreatePoolDialog.tsx` and `EditPoolDialog.tsx`
- These have different UX (max 10, badges, different layout) — leave as-is for now to avoid breaking pool creation flow

### Summary
One new file, three files modified. The shared component handles search-within-popover + multiselect checkboxes + clear all.

