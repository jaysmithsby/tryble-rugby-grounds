
# Add Collapsible Head-to-Head History to FixtureCard

## Overview
Add a chevron and expandable `MatchHistory` section to `FixtureCard`, using the same conditional logic as `FixtureTable` -- only show the chevron and allow expansion when historical match data exists between the two schools.

## Changes

### File: `src/components/fixtures/FixtureCard.tsx`

**New props:**
- `hasHistory?: boolean` -- optional pre-computed flag (from parent like SchoolProfile). When omitted, the component auto-detects by querying completed fixtures between the two school IDs (same pattern as `FixtureTableRow`).

**New imports:**
- `useEffect` added to existing `useState` import
- `ChevronDown` from lucide-react
- `MatchHistory` from `./MatchHistory`
- `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`
- `supabase` from `@/integrations/supabase/client`
- `cn` from `@/lib/utils`

**New state:**
- `historyOpen: boolean` (default false) -- controls collapsible
- `autoHasHistory: boolean | null` (default null) -- auto-detected history existence

**New `useEffect`** (same pattern as `FixtureTable`):
- Skip if `hasHistory` prop is provided
- Query `fixtures` table for completed matches between `homeSchoolId` and `awaySchoolId`
- Set `autoHasHistory` based on count > 0

**Computed value:**
- `canExpand = hasHistory !== undefined ? hasHistory : autoHasHistory === true`

**UI changes:**
- Wrap the `Card` in a `Collapsible` component (controlled by `historyOpen`)
- Add a chevron row at the bottom of the card (inside the card, below the teams row): a centered `ChevronDown` icon that rotates 180 degrees when open, only rendered when `canExpand` is true
- Chevron click calls `e.stopPropagation()` to avoid triggering the prediction dialog
- Below the `Card`, render `CollapsibleContent` containing `MatchHistory` with `leftSchoolId={homeSchoolId}` and `rightSchoolId={awaySchoolId}`, styled with `bg-muted/30 rounded-b-lg border border-t-0 border-border/40 -mt-1` (matching the mobile fixture card pattern from `FixtureTable`)

### No other files modified
The `FixtureCard` already receives `homeSchoolId` and `awaySchoolId` props, so parents don't need changes.
