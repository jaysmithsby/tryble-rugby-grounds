

## Add "Predictions are open" CTA when >3 matches

### Change: `src/pages/Home.tsx`

In the "Upcoming Matches" section (around line 162), replace the static `<h2>` with a heading block that conditionally shows a subtitle + CTA when `upcomingFixtures.length > 3`:

```tsx
<div className="space-y-4">
  <div className="flex items-baseline justify-between px-1">
    <h2 className="text-lg font-bold">Upcoming Matches</h2>
    {upcomingFixtures.length > 3 && (
      <button
        onClick={() => navigate("/fixtures")}
        className="text-xs font-medium text-primary hover:underline"
      >
        Make your call →
      </button>
    )}
  </div>
  {upcomingFixtures.length > 3 && (
    <p className="text-xs text-muted-foreground px-1 -mt-2">
      Predictions are open
    </p>
  )}
  ...existing fixture list (show only first 3)...
</div>
```

Also limit the rendered fixtures to `upcomingFixtures.slice(0, 3)` so the home feed stays compact on mobile — the CTA directs users to the full Fixtures tab for the rest.

### Files Changed

| File | Change |
|---|---|
| `src/pages/Home.tsx` | Add conditional CTA row + limit displayed fixtures to 3 |

