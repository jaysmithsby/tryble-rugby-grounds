

## Update CenterArea States for Completed (No Score) and Upcoming (No Prediction Context)

### Changes — `src/components/fixtures/FixtureRow.tsx`

**1. Import `TicketCheck` and `Ticket` from lucide-react**

**2. Update CenterArea priority cases:**

- **Priority 2 (Past, no score):** Replace the `? - ?` display with `TicketCheck` icon + "Scoring" text, using `text-muted-foreground` (same pattern as Cancelled/Make Pick). Keep the prediction summary line if `isPredicted`.

- **Priority 6 (Future, no prediction context):** Replace the plain "VS" text with `Ticket` icon + "VS" text, using `text-muted-foreground` (same icon+label pattern).

### Files
- `src/components/fixtures/FixtureRow.tsx`

