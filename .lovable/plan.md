

## Remove Pool Lock Feature

### Summary
Remove the pool editing lock mechanism that prevents pool modifications 1 hour before match kickoff. Pools will always be editable; prediction restrictions will be handled by fixture state checks instead.

### Changes

**1. `src/pages/PoolLeaderboard.tsx`**
- Remove state: `isEditable`, `lockReason`, `lockCountdown`
- Remove the entire `checkEditableLock` function
- Remove `checkEditableLock` call from `loadPoolData`
- Remove `Lock` and `Clock` imports (if no longer used), remove `differenceInMinutes` and `format` imports if only used for lock logic
- Pass `isEditable={true}` (or remove the prop) from `EditPoolDialog`; remove `lockReason` prop
- Remove the two lock warning UI blocks (lines 451-463)

**2. `src/components/pools/EditPoolDialog.tsx`**
- Remove `isEditable` and `lockReason` props from the interface
- Remove the early return that renders a disabled "Locked" button
- Remove the `lockReason` warning banner inside the dialog
- Simplify: the dialog is always accessible

**3. `src/components/pools/PoolMembersList.tsx`**
- Remove `isEditable` from props interface
- Change `canRemove` logic to just `isAdmin && !isCreator && !isSelf`

**4. `src/components/pools/PoolSchoolsList.tsx`**
- Remove `isEditable` from props interface
- Change `canEdit` to just `isAdmin`

### Files
- `src/pages/PoolLeaderboard.tsx`
- `src/components/pools/EditPoolDialog.tsx`
- `src/components/pools/PoolMembersList.tsx`
- `src/components/pools/PoolSchoolsList.tsx`

