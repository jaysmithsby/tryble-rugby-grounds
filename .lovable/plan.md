

## Home Page Copy and Design Revamp -- "For the Badge."

### What Changes

The entire Home page gets a tone and design overhaul anchored around the brand identity: **"For the Badge."** -- proud, competitive, authentic, community-driven, and clean. No functionality changes, no database changes. Pure copy, layout hierarchy, and visual polish.

---

### 1. Header -- School-First Identity

**Current:** Generic "Welcome, [Name] . [School]" text  
**New:** A bolder, school-anchored welcome that makes the user feel like they belong

- Replace "Welcome," with the user's school name as the primary anchor (larger, primary-coloured)
- User's display name becomes secondary underneath
- If no school, show "For the Badge." as the tagline instead

Example:
```
Michaelhouse              [logo]  [theme] [sign out]
Hey James. Your boys play Saturday.
```

---

### 2. Hero Section -- Emotional Headline Block (NEW)

A new lightweight section at the very top of the main content (before the carousel) that sets the emotional tone for the week.

- **Headline:** Dynamic based on context:
  - If user has a school fixture this week: **"This Saturday. It Matters."**
  - If it's derby week (user's school fixture is a derby): **"It's Derby Week."**
  - Default / no fixture: **"For the Badge."**
- **Subline:** 
  - With fixture: "Your school. Your rivals. Your prediction."
  - Default: "Back your school. Call the score."
- **Clean positioning line:** "No betting. Just bragging rights."
- Styled as large, bold text with a subtle gradient -- not a card, just typographic impact

---

### 3. Your School's Fixture Card -- Emotional Tension

**Current:** Generic "Your School" badge with stars  
**New copy changes:**

- Replace "Your School" badge text with **"Your Next Match"**
- CTA button text changes from "Predict Now" to **"Back Your Boys"**
- Add a subtle social proof line below the card: *"[X] supporters have already made their call."* (placeholder count for now, can be wired to real data later)
- Add "Prediction closes at kickoff." micro-text under the CTA

---

### 4. Upcoming Fixtures Section

**Current heading:** "Upcoming Fixtures"  
**New heading:** "This Week's Matches"

- CTA button on each fixture card changes from "Predict Now" to **"Make Your Call"**
- After prediction: "Prediction Made" stays, but the confirmation text changes from "You picked: X to win by Y" to **"Locked in. [School] by [margin]. Respect."**
- Empty state with no pools: Change copy from "Join or create a pool..." to **"You're not in a pool yet. Join one to start predicting."** Button text: **"Find a Pool"**
- Empty state with pools but no fixtures: **"No matches this week. Rest up -- next Saturday's coming."**

---

### 5. Prediction Nudge Slide (Carousel)

**Current:** "Make Your Predictions!" / "Pick Now"  
**New:** 
- Headline: **"Predictions Are Open"**
- Subline: "[X] matches awaiting your call"
- CTA: **"Call It"**

---

### 6. Derby Slide (Carousel)

**Current:** "This Week's Derby"  
**New:** **"Derby Week"** with subline: **"Pride on the line."**

---

### 7. Recent Matches Section

**Current heading:** "Recent Matches -- Submit Score"  
**New heading:** "Full Time -- Report the Score"

- Submission window closed text: **"Reporting window closed."**
- Pending review text: **"Score submitted. Pending verification."**

---

### 8. Weekly Summary Widget

**Current:** "Your Week" heading, "Brags" label  
**New:** 
- Heading: **"Your Week So Far"**
- Empty state: **"Make your first prediction to see your stats here."**

---

### 9. Scorekeeper CTA Card

**Current:** Long explanation paragraph  
**New (tighter copy):**
- Headline: **"Be the Voice of [School]"**
- Body: "Report first team scores. Earn your official scorekeeper badge."
- CTA: **"Apply via WhatsApp"** (unchanged)

---

### 10. Micro-Copy After Predictions (PredictionDialog)

- Dialog title: "Make Your Prediction" changes to **"Make Your Call"**
- "Select Winner" label changes to **"Who's taking this?"**
- Submit button: "Submit Prediction" changes to **"Lock It In"**
- Toast after submission: "[Winner] by [margin] points" changes to **"Locked in. [Winner] by [margin]. Let's go."**

---

### Visual / Design Tweaks

- The new hero headline block uses `text-3xl md:text-4xl font-black` with the primary gradient for emphasis
- The "No betting. Just bragging rights." line uses a muted, smaller font -- always visible, never shouty
- School fixture card gets a slightly warmer gradient (`from-primary/15`) to make it feel more like "yours"
- Section headings get a bolder weight (`font-bold text-lg`) and tighter spacing

---

### Files Modified

| File | Change |
|------|--------|
| `src/pages/Home.tsx` | New hero headline block, updated section headings, updated copy for empty states, scorekeeper CTA, social proof line |
| `src/components/home/FixtureCard.tsx` | CTA text "Make Your Call", locked-in confirmation copy |
| `src/components/home/SchoolFixtureCard.tsx` | "Your Next Match" badge, "Back Your Boys" CTA, kickoff micro-text |
| `src/components/home/NudgeSlide.tsx` | "Predictions Are Open" / "Call It" copy |
| `src/components/home/DerbySlide.tsx` | "Derby Week" / "Pride on the line." copy |
| `src/components/home/RecentFixtureCard.tsx` | Updated status copy |
| `src/components/home/WeeklySummaryWidget.tsx` | "Your Week So Far" heading, updated empty state |
| `src/components/home/PredictionDialog.tsx` | "Make Your Call" title, "Lock It In" CTA, updated toast |

### No Database or Backend Changes Required

