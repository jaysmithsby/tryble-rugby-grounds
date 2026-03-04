

## Plan: Fix Streak Logic and Form Guide Colors

All changes in `src/pages/Logs.tsx`:

1. **Filter out cancelled fixtures** — exclude predictions where `fixture.status === 'cancelled'` from analytics, form guide, and streak calculations.

2. **Fix `getFormIcon` thresholds**:
   - `points > 4` → green CheckCircle2
   - `points === 4` → yellow CheckCircle2
   - `points < 4` → red XCircle

3. **Fix streak logic** — count consecutive predictions (most recent first) with `points_earned >= 4`. Break on the first prediction with `< 4`.

4. **Fix match history row coloring** — same thresholds: `>4` green, `=4` yellow, `<4` default.

