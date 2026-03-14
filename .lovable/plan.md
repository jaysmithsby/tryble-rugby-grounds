

## Unify Fixture Card Styling

### Problem
The "card" variant (My Schools, Tournament pages) uses different styling than the "All Schools" mobile card — different background (`bg-gradient-card` vs `bg-card`), padding (`p-4` vs `p-3`), jersey size (`md` vs `sm`), and layout (flex vs grid).

### Changes

**Single file: `src/components/fixtures/FixtureRow.tsx`**

Update the card variant (lines 306-387) to match the table mobile row styling:

1. Replace `<Card className="bg-gradient-card ...">` with a plain `<div>` using `bg-card border border-border/40 rounded-lg p-3 shadow-card hover:shadow-glow`
2. Change jersey `size="md"` to `size="sm"` in the card variant's SchoolBlock
3. Replace the flex-based teams layout with the same `matchGrid("sm")` grid pattern (`grid-cols-[1fr_60px_1fr]`)
4. Pass `compact={true}` to `CenterArea` so score sizing matches
5. Remove the `<Card>` import if no longer needed

This makes the card variant visually identical to the All Schools mobile card while preserving all card-specific behavior (prediction dialogs, consent checks, click handlers).

### Files
- `src/components/fixtures/FixtureRow.tsx`

