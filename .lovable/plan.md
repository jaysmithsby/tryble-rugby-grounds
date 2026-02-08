
# Pool Creation Flow & Pool Management Enhancement

This plan enhances the pool creation experience and pool detail page with admin management capabilities, member lists, and improved information architecture.

---

## Overview of Changes

| Area | Current State | Proposed State |
|------|---------------|----------------|
| After pool creation | Closes dialog, stays on Pools page | Navigates directly to the new pool's page |
| Pool detail page | Shows leaderboard + invite only | Full management hub with members, editing, info |
| Admin controls | None | Edit name/icon, manage members, add/remove schools |
| Member visibility | Count only | Full member list + pending invites (future) |
| Scoring info | No link | Link to "How Points Work" section |

---

## 1. Post-Creation Navigation

### Changes to `CreatePoolDialog.tsx`

After successful pool creation, instead of just calling `onPoolCreated()` and closing the dialog, navigate the user directly to their new pool.

**Current flow:**
```text
Create Pool → Success Toast → Dialog Closes → Stay on /pools
```

**New flow:**
```text
Create Pool → Success Toast → Navigate to /pool/{poolId}
```

This requires passing `useNavigate` into the dialog and navigating after the pool is created.

---

## 2. Enhanced Pool Detail Page

### Restructured `PoolLeaderboard.tsx` → Pool Hub

Transform the pool leaderboard page into a comprehensive pool management hub with the following sections:

```text
┌─────────────────────────────────────────┐
│  Header: Pool Name + Icon + Code        │
│  [Edit Pool] (admin only, if editable)  │
├─────────────────────────────────────────┤
│  Section: Members (X joined)            │
│  ┌─────────────────────────────────────┐│
│  │ Member 1 (Admin) ★                  ││
│  │ Member 2                            ││
│  │ Member 3                            ││
│  │ [Invite More Members]               ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  Section: Schools in Pool (5-10)        │
│  ┌─────────────────────────────────────┐│
│  │ School badges with icons            ││
│  │ [Edit Schools] (admin, if editable) ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  Section: Leaderboard                   │
│  [Weekly | Season toggle]               │
│  ┌─────────────────────────────────────┐│
│  │ Ranking entries                     ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  Link: How Points Work →                │
├─────────────────────────────────────────┤
│  Section: Invite Friends (Share Card)   │
└─────────────────────────────────────────┘
```

---

## 3. Admin Controls with Time-Based Lock

### Editing Window Logic

Pool admins (creators) can edit the pool up to **1 hour before the first fixture** involving any of the pool's schools for the current week.

**Calculation:**
1. Query fixtures where `home_school` or `away_school` matches any school in the pool
2. Filter to fixtures this weekend (Saturday/Sunday or upcoming weekday tournaments)
3. Find the earliest `match_date`
4. Lock editing at `earliest_match_date - 1 hour`

**Editable elements (before lock):**
- Pool name (with profanity filter)
- Pool icon (optional - can be emoji or school-based)
- Add/remove members (kick members)
- Add/remove schools (within 5-10 limit)

**After lock:**
- All editing disabled
- Show message: "Pool locked for this week's matches"

### Components to Create

**`EditPoolDialog.tsx`** - Modal for editing pool details:
- Name input (max 50 chars, profanity filtered)
- School selector (add/remove within limits)
- Lock status indicator with countdown if approaching

---

## 4. Member Management

### Member List Display

Show all current pool members with:
- Display name and school abbreviation
- Admin badge for pool creator
- Join date (optional subtle text)

### Admin Actions (Before Lock)

- **Remove Member**: Pool creator can remove members (except themselves)
- **Invite**: Share button (existing PoolInvite component)

### Data Structure

Uses existing `pool_members` table:
```sql
pool_members: pool_id, user_id, joined_at
```

Query with profile join:
```typescript
const { data: members } = await supabase
  .from("pool_members")
  .select(`
    user_id,
    joined_at,
    profiles_public (display_name, school_name)
  `)
  .eq("pool_id", poolId);
```

---

## 5. Schools Management

### Current Schools Display

Show pool's schools as badges with:
- School icon (if available)
- School name
- Remove button (X) for admin before lock

### Add Schools (Admin Before Lock)

- Search/select schools from available list
- Maximum 10 schools enforced
- Minimum 5 schools required
- Confirmation before removing

---

## 6. How Points Work Link

Add an info section linking to scoring explanation:

```text
┌─────────────────────────────────────────┐
│  ℹ️ How Points Work                     │
│  Correct winner: 10 pts                 │
│  Exact margin: +25 bonus                │
│  Within 3 pts: +15 bonus                │
│  Within 7 pts: +10 bonus                │
│  [Learn More →]                         │
└─────────────────────────────────────────┘
```

This links to an expanded page or modal explaining the full scoring system (referencing `calculate_prediction_points` function logic).

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/pools/EditPoolDialog.tsx` | Modal for editing pool name, icon, schools |
| `src/components/pools/PoolMembersList.tsx` | Display member list with admin actions |
| `src/components/pools/PoolSchoolsList.tsx` | Display/edit schools in pool |
| `src/components/pools/ScoringInfoCard.tsx` | Condensed scoring explanation with link |
| `src/pages/HowScoringWorks.tsx` | Full page explaining the scoring system |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/pools/CreatePoolDialog.tsx` | Add navigation to pool after creation |
| `src/pages/PoolLeaderboard.tsx` | Restructure into pool hub with new sections |
| `src/App.tsx` | Add route for `/how-scoring-works` |

---

## Database Changes

**No schema changes required.** All data needed is available:
- Pool details: `pools` table
- Members: `pool_members` table
- Profiles: `profiles_public` view
- Fixtures: `fixtures` table (for lock calculation)
- Schools: `schools` table

---

## UI/UX Considerations

### Member List Design
- Compact rows with avatar placeholder or initials
- School abbreviation as subtle badge
- Admin (creator) marked with star icon
- "Remove" action revealed on swipe (mobile) or hover (desktop)

### Lock State Communication
- Clear visual indicator when pool is locked
- Countdown timer if lock is approaching (within 2 hours)
- Explanation text: "Editing closes 1 hour before kickoff"

### Empty States
- No members yet (impossible - creator auto-joins)
- Pool just created: Welcome message + share prompt

### Accessibility
- All interactive elements keyboard navigable
- Screen reader friendly member list
- Clear focus states on edit buttons
