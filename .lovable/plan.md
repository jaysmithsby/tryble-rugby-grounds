## Update Fixture Card Center Area Text and Icons

### Changes — single file: `src/components/fixtures/FixtureRow.tsx`

**1. CenterArea component**

- Add `isCancelled` boolean prop
- Add a new priority case at the top: if `isCancelled`, show `Ban` icon + "Cancelled" text in `text-foreground` (same color as scores) — no `? - ?`
- Change "Pick needed" → "Make Pick", replace `AlertCircle` with `LockOpen` icon
- isCancelled uses same icon and text fields as Make Pick
- Import `LockOpen` from lucide-react

**2. Remove Cancelled badge from date/venue headers**

- Remove the 3 instances of the red `<Badge variant="destructive">` cancelled label from the card variant, desktop row, and mobile row date lines

**3. Pass `isCancelled` to CenterArea**

- In the `centerArea` const and all inline usages, pass `isCancelled` prop

### Files

- `src/components/fixtures/FixtureRow.tsx`