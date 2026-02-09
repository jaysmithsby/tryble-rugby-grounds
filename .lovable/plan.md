

# "Learn More" Page with Podcast & App Overview

Create a new public-facing "Learn More" page accessible from the landing page header, designed to educate visitors about Trybal with an embedded podcast, app visuals, and safety information.

---

## Changes Overview

| Area | What Changes |
|------|-------------|
| Landing header (`Hero.tsx`) | Add "Learn More" button next to "Sign In" |
| New page (`/learn-more`) | Full informational page with podcast, visuals, safety info |
| Routing (`App.tsx`) | Register `/learn-more` route |

---

## Page Structure

```text
+--------------------------------------------------+
|  Header: Back to Home | Trybal | Theme Toggle     |
+--------------------------------------------------+
|                                                    |
|  Section 1: PODCAST (Hero area)                    |
|  "Hear Our Story" heading                          |
|  Embedded audio player for uploaded podcast         |
|  Brief description of what listeners will learn    |
|                                                    |
+--------------------------------------------------+
|                                                    |
|  Section 2: WHAT IS TRYBAL?                        |
|  The game explained simply:                        |
|  - Pick your school                                |
|  - Predict match outcomes                          |
|  - Earn points, climb ranks                        |
|  - Compete in pools with friends                   |
|                                                    |
+--------------------------------------------------+
|                                                    |
|  Section 3: WHY TRYBAL EXISTS                      |
|  The story and mission behind the platform         |
|  - Born from school rugby passion                  |
|  - Community over competition                      |
|  - No gambling, no betting, just bragging rights   |
|                                                    |
+--------------------------------------------------+
|                                                    |
|  Section 4: APP PREVIEW                            |
|  Screenshots of the app interfaces                 |
|  (reusing existing fixture + leaderboard images)   |
|  - Fixtures screen                                 |
|  - Leaderboard screen                              |
|  Brief captions explaining each                    |
|                                                    |
+--------------------------------------------------+
|                                                    |
|  Section 5: SAFE & SECURE                          |
|  Cards for key audiences:                          |
|  - For Students: What you can do, how it works     |
|  - For Parents: No gambling, parental consent,     |
|    data protection, age verification               |
|  - For Schools: IP protection, moderation,         |
|    transparency, partnership info                  |
|  Links to /for-parents, /for-schools,              |
|  /for-players, /privacy-policy                     |
|                                                    |
+--------------------------------------------------+
|                                                    |
|  Section 6: HOW POINTS WORK                        |
|  Condensed scoring summary                         |
|  Link to /how-scoring-works for full details       |
|                                                    |
+--------------------------------------------------+
|                                                    |
|  Section 7: CTA                                    |
|  "Ready to join?" with Get Started button           |
|                                                    |
+--------------------------------------------------+
|  Footer                                            |
+--------------------------------------------------+
```

---

## 1. Header Update (`Hero.tsx`)

Add a "Learn More" button in the header between the ThemeToggle and "Sign In" button:

```tsx
<Button
  variant="ghost"
  onClick={() => navigate("/learn-more")}
  className="text-muted-foreground hover:text-foreground"
>
  Learn More
</Button>
```

This keeps the header clean -- just "Learn More" and "Sign In" alongside the theme toggle.

---

## 2. New Learn More Page

**File: `src/pages/LearnMore.tsx`**

### Podcast Section (Top Priority)
- Large heading: "Hear the Trybal Story"
- HTML5 `<audio>` player with controls for the uploaded podcast file
- Podcast stored in `public/audio/` directory for direct access
- Description text explaining what listeners will learn
- Note: The user will upload the actual podcast file in a follow-up message; a placeholder audio element will be added with a note

### What Is Trybal Section
- Step-by-step visual explanation:
  1. Pick your school
  2. Browse upcoming fixtures
  3. Predict match outcomes and margins
  4. Earn points and climb leaderboards
  5. Compete in pools with friends
- Clean iconography using existing Lucide icons

### Why Trybal Exists Section
- Storytelling format -- the passion behind school rugby
- Key differentiators: no gambling, no odds, community-first
- Quote from a school principal (from existing Safety component)

### App Preview Section
- Reuse existing `app-fixtures.jpg` and `app-leaderboard.jpg` assets
- Side-by-side phone mockup style display
- Brief captions: "Browse and predict fixtures" / "Track your rankings"

### Safe and Secure Section
- Three audience cards with icons:
  - **Students**: How the game works, what to expect
  - **Parents**: No gambling, parental consent system, data protection, links to /for-parents and /privacy-policy
  - **Schools**: IP protection, moderation tools, transparency, link to /for-schools
- Each card links to the dedicated audience page for deeper info

### How Points Work Section
- Condensed version of the scoring system (correct winner: 10pts, margin bonuses)
- "View Full Scoring Details" link to `/how-scoring-works`

### CTA Section
- "Ready to join the community?" with "Get Started" button linking to `/auth`

---

## 3. Routing (`App.tsx`)

Add the new route (publicly accessible, no auth required):

```tsx
import LearnMore from "./pages/LearnMore";
// ...
<Route path="/learn-more" element={<LearnMore />} />
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/LearnMore.tsx` | Full "Learn More" informational page |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/Hero.tsx` | Add "Learn More" button to header |
| `src/App.tsx` | Register `/learn-more` route |

---

## Podcast Handling

The page will include an audio player section ready for the podcast file. Since the podcast hasn't been uploaded yet:
- The audio element will be set up pointing to `/audio/trybal-podcast.mp3`
- A `public/audio/` directory placeholder will be created
- When you upload the podcast file, it will be placed at that path and work immediately

---

## Technical Notes

- No authentication required -- fully public page
- Reuses existing image assets from `src/assets/` (no new images needed)
- Links to existing pages (`/for-parents`, `/for-schools`, `/for-players`, `/privacy-policy`, `/how-scoring-works`)
- Mobile-responsive layout with stacked sections
- Follows existing design patterns (gradient cards, border styling, Lucide icons)
