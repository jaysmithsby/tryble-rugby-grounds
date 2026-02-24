

## Add Upcoming Tournaments Below Upcoming Matches

### What it does
When you follow a tournament and it has an edition starting within the next 14 days, a simple list of tournament names appears below the "Upcoming Matches" section. Tapping a tournament navigates to its profile page. No cards — just clean rows matching the style of the fixtures section heading.

### Changes

**1. `src/hooks/useHomeFixtures.ts`** — Add query and return value

- Add `UpcomingTournament` interface: `{ id: string; name: string; startDate: string; venue: string | null; province: string | null }`
- Add a new `useQuery` that depends on the existing `tournamentData.tournamentIds`, fetching `tournament_editions` with `start_date` in the next 14 days, joined to `tournaments` for the name
- Add `upcomingTournaments: UpcomingTournament[]` to `UseHomeFixturesResult` and the return object

**2. `src/pages/Home.tsx`** — Render list below Upcoming Matches

- Import `Trophy` and `ChevronRight` from lucide-react
- Destructure `upcomingTournaments` from the hook
- After the "Upcoming Matches" `div` (after line 236), render:

```text
Upcoming Tournaments        (h2, same style as "Upcoming Matches")

  Trophy icon  Tournament Name           >
               Starts Sat 8 Mar · Venue
  ─────────────────────────────────────
  Trophy icon  Another Tournament        >
               Starts Sun 9 Mar · Province
```

- Each row is a simple flex row with `onClick={() => navigate(\`/tournament/\${t.id}\`)}` and a cursor-pointer
- Trophy icon (h-4 w-4 text-primary), name in font-semibold, date + venue in text-xs text-muted-foreground, chevron-right on the far side
- Rows separated by a subtle border-b, no card wrapper
- Section only renders when `upcomingTournaments.length > 0`

### Files modified

| File | Change |
|------|--------|
| `src/hooks/useHomeFixtures.ts` | New query for upcoming editions, new interface, new return field |
| `src/pages/Home.tsx` | Import Trophy/ChevronRight, render tournament list section |

