

# Refine PoolActionDialog: Single-View Create + Compact Join

## Overview
Flatten the Create tab from a multi-step wizard into a single dense form, replace the bulky icon selector with a popover triggered from a small circle button inline with the name input, remove voting mode entirely, and compact the Join tab inputs.

---

## Changes

### 1. Inline Icon Picker with Popover

Replace the large `PoolIconSelector` component usage with a compact inline layout:

- **Row layout**: `[32px circular icon button] [Pool Name Input (flex-1)]` on one line, no labels
- **Icon button**: Shows the currently selected icon in its selected color. Clicking opens a shadcn `Popover`.
- **Popover content**: Contains the 4x4 icon grid (reuse `POOL_ICON_OPTIONS` from `PoolIconSelector.tsx`) and a horizontal row of color circles below it. Same data, just rendered inside a `Popover` instead of inline.
- The `PoolIconSelector` component file stays unchanged (its exported helpers `getPoolIconComponent`, `getPoolColorValue`, `PoolIconConfig` are still used). We just stop rendering the full component and instead build a smaller inline version directly in the dialog.

### 2. Flatten Create Tab to Single View

Remove the two-step flow (`configure` -> `preview`). Everything happens in one scrollable view:

- **Top row**: Icon button + Name input (no label, placeholder "Enter pool name...")
- **Remove**: Voting mode toggle and all voting-related UI/logic
- **Remove**: Pool Packs / templates section (simplify)
- **School selection**: Keep as-is (search + scrollable list with badges for selected), but remove the "Confirm Schools" intermediate step
- **Create button**: At the bottom, directly calls `createPool()`. Validates inline (name + 5-10 schools). Shows `Loader2` spinner when creating.
- **Remove**: Preview step entirely. No more `step` state.

### 3. Compact Join Tab

- Reduce invite code input from `h-12 text-lg` to `h-9 text-sm` with tighter `tracking-wider` instead of `tracking-widest`
- Reduce Join button from `h-10` to `h-9`
- Reduce confirmation card padding from `p-4` to `p-3`
- Match dense typography used in Schools directory

### 4. Toast Updates

- Create success toast: "Pool '[Name]' created! Invite your friends."
- Keep join toast as-is

### 5. Code Cleanup

- Remove `step` state and `handleConfirmSchools` function
- Remove `votingMode` state and all voting-related logic
- Remove `poolTemplates` state and `loadTemplates` function
- Remove template-related UI
- Simplify `createPool` to always set `voting_mode: false`, `is_voting_finalized: true`, `schools: selectedSchools`
- Remove `loadTemplates` call from `useEffect`

---

## Technical Details

### Files Modified
- `src/components/pools/PoolActionDialog.tsx` -- major refactor of Create tab UI, compact Join tab

### No New Files Created

### Key UI Structure (Create Tab)
```text
[Icon Popover Trigger (32px circle)] [Name Input "Enter pool name..." (flex-1)]

Selected: [Badge] [Badge] [Badge x]

[Search schools input]
[Scrollable school list with toggle buttons]
{selectedSchools.length}/10 · min 5

[Create Pool button with spinner]
```

### Removed State/Logic
- `step` (no more multi-step)
- `votingMode` (removed feature)
- `poolTemplates`, `loadTemplates` (removed templates)
- `handleConfirmSchools` (replaced by direct validation in `createPool`)

### Components Added to Imports
- `Popover`, `PopoverTrigger`, `PopoverContent` from shadcn

### Validation
- Pool name: `sanitizePoolName()` check, min 3 chars
- Schools: 5-10 required
- Both validated when user clicks "Create Pool", with toast errors

