

# Unified Pool Action Dialog

## Overview
Replace the separate "Create Pool" button and "Join Code" input on the Pools page with a single `+` icon button in the header that opens a tabbed dialog containing both actions.

---

## Changes

### 1. Create Unified Modal (`src/components/pools/PoolActionDialog.tsx`)

A new component using shadcn `Dialog` + `Tabs`:

- **Trigger**: Accepts an `open`/`onOpenChange` prop pair (controlled from parent) -- no built-in trigger button
- **Tab 1 -- "Create"**: Embeds the full existing `CreatePoolDialog` form logic (pool name, icon selector, voting mode toggle, school selection, preview step). This is essentially the current `CreatePoolDialog` content moved into a tab panel.
- **Tab 2 -- "Join"**: A simple form with:
  - A 6-character uppercase mono input for the invite code
  - Auto-verification: when exactly 6 characters are entered, call `get_pool_by_invite_code` RPC
  - **Valid code**: Show a confirmation card with the pool name and a "Join Pool" button
  - **Invalid code**: Show inline error text ("Pool not found")
  - **Already a member**: Show message and redirect link
  - Join logic reuses the existing `handleJoinPool` pattern from `Pools.tsx`
- Uses `sonner` toasts for success feedback on both create and join
- Single-column layout, mobile-friendly, max height 85vh with scroll

### 2. Update Pools Page Header (`src/pages/Pools.tsx`)

- **Remove**: The inline `CreatePoolDialog` component usage and the "Join Code" input row
- **Add**: A `+` icon button (using lucide `Plus` icon, already imported) in the header row next to the search bar
- **Header layout**: `[Search Input (flex-1)] [+ Button]` -- search spans remaining width, plus button is fixed size
- The `+` button controls the `open` state of `PoolActionDialog`
- `PoolActionDialog` receives `onPoolCreated={loadData}` callback to refresh the pool list after create or join

### 3. Remove Old CreatePoolDialog Usage

- `CreatePoolDialog` component file (`src/components/pools/CreatePoolDialog.tsx`) will no longer be imported from `Pools.tsx`
- The file itself can remain (it may be used elsewhere or can be cleaned up later), but all its logic will be duplicated into the Create tab of `PoolActionDialog`

---

## Technical Details

### Files Created
- `src/components/pools/PoolActionDialog.tsx` -- unified tabbed dialog with Create and Join tabs

### Files Modified
- `src/pages/Pools.tsx` -- remove inline join code input and CreatePoolDialog, add `+` button triggering PoolActionDialog

### Join Tab Auto-Verification Logic
```text
User types code -> length === 6 -> call get_pool_by_invite_code RPC
  -> found: show pool name + "Join" button
  -> not found: show "Pool not found" error
  -> on join: insert pool_members, toast, close dialog, refresh list
```

### Components Reused
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from shadcn
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from shadcn
- `Input`, `Button`, `Label`, `Switch`, `Badge`, `ScrollArea` from shadcn
- `PoolIconSelector` for the create form
- `useSchoolsQuery` for school selection
- `sanitizePoolName` for name validation
- `toast` from sonner for success/error feedback
- `Plus`, `Users`, `UserPlus` icons from lucide-react

