
## Jersey Carousel on Landing Page

### What You'll Get
A smooth, continuously scrolling ribbon of school jerseys with names underneath, placed between the Hero and "How It Works" sections on the landing page. It will automatically include any new jersey added to the storage -- no code changes needed when schools are added.

### How It Works
- The carousel fetches all schools that have a `jersey_url` from the database
- Each jersey is displayed inside the same circular container used elsewhere in the app (the `SchoolJerseyImage` component at "lg" size), giving visual consistency
- The school name shown underneath uses **nickname first, falling back to full name** -- this is controlled by a single helper function so you can easily change the logic later
- The scroll is a smooth CSS animation (not a snap-based carousel), so it flows continuously from right to left with no jumping or resetting
- The jersey list is duplicated in the DOM to create a seamless infinite loop effect

### Visual Design
- Light section background matching the gradient between Hero and How It Works
- Each jersey in a circular container with a subtle light border/shadow ring for differentiation
- School name centered below each jersey in a clean, muted font
- Comfortable horizontal spacing between items
- Fully responsive -- works on mobile and desktop

### Technical Details

**New file: `src/components/JerseyMarquee.tsx`**
- Queries the `schools` table for all rows where `jersey_url IS NOT NULL` and `is_archived = false`
- Uses `@tanstack/react-query` for caching (follows existing patterns)
- Renders a CSS `@keyframes` marquee animation on a flex row, duplicated for seamless looping
- Uses the existing `SchoolJerseyImage` component at `lg` size for each jersey
- A helper function `getDisplayName(school)` returns `nickname || name` -- easy one-line edit to change priority
- Shows nothing if no jerseys exist yet (graceful empty state)
- Animation speed scales with the number of jerseys so it always feels smooth

**Modified file: `src/pages/Index.tsx`**
- Import and place `<JerseyMarquee />` between `<Hero />` and `<HowItWorks />`

**No database or backend changes needed** -- this reads from the existing `schools` table and `school-jerseys` storage bucket.
