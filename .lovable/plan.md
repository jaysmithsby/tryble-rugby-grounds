

## Plan: Mobile-friendly Prediction Dialog with Draw Support

### Changes

**1. `src/components/home/PredictionDialog.tsx`** — Redesign for mobile

- **Add "Draw" option**: Change `selectedTeam` state to `"home" | "away" | "draw"`. When draw is selected, margin is forced to 0 and disabled.
- **Compact team selection**: Reduce padding from `p-4` to `p-2`, use `size="md"` jerseys instead of `lg`. Add a centered "Draw" button/option between or below the two teams.
- **Remove slider**: Replace the slider + input combo with just a simple number input field. Remove the `max={50}` cap — allow any value >= 0. Min is 0 (draw auto-sets to 0).
- **Tighter spacing**: Reduce `space-y-6` to `space-y-4`, reduce `py-4` to `py-2`. Use `sm:max-w-sm` instead of `sm:max-w-md` for a smaller dialog.
- **Remove summary text** ("Selected margin: X points") — the input is self-explanatory.

**2. Handle draw in submit logic**:
- When draw is selected, pass a special marker (empty string or a "draw" schoolId convention) and margin 0.
- Update toast message: "Draw — bold call." instead of "X by 0".

**3. Upstream handling** — `src/pages/Home.tsx` and wherever `onPredictionMade` is consumed:
- A draw prediction with margin 0 and schoolId="" should be handled gracefully (the upsert already uses `predicted_school_id`; for a draw this would be null/empty and `predicted_margin` = 0).

### Summary of UX changes
- Smaller, tighter dialog on mobile
- Three-way pick: Home / Draw / Away
- Simple number input for margin (no slider, no max cap, min 0)
- Draw auto-locks margin to 0

