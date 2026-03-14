

## Fix: Fixtures Page Scroll Getting Stuck on Mobile

### Root Cause

The Fixtures page (and Home page) use `overflow-auto` on their container div to create a nested scrollable element. This is required by the `usePullToRefresh` hook, which checks `el.scrollTop` to decide when to activate.

The problem: on mobile, this nested scroll container creates a **scroll trap**. When the user reaches the bottom, iOS/Android momentum scrolling stops at the boundary. The pull-to-refresh `touchmove` handler (registered with `passive: false`) then calls `e.preventDefault()` when `scrollTop === 0` and the user swipes down even slightly — which **blocks normal upward scroll recovery**.

Additionally, the Table component's own `overflow-auto` wrapper (in `table.tsx`) creates a second nested scroll context on desktop, though on mobile the table view is hidden.

### Fix

**1. Refactor `usePullToRefresh` to use `window.scrollY` instead of `el.scrollTop`** (`src/hooks/usePullToRefresh.ts`)
- Remove the requirement for the container to be `overflow-auto`
- Check `window.scrollY === 0` (or `document.documentElement.scrollTop === 0`) to decide if pull-to-refresh should activate
- Attach touch listeners to the container element but use window scroll position for the scroll-top check
- This lets the page use natural body scrolling

**2. Remove `overflow-auto` from page containers** (`src/pages/Fixtures.tsx`, `src/pages/Home.tsx`)
- Change `overflow-auto` to `overflow-visible` or remove it entirely
- The body/viewport handles scrolling natively, eliminating the scroll trap

**3. Keep Table `overflow-auto` for horizontal scroll on desktop only** (`src/components/ui/table.tsx`)
- No change needed — this is already hidden on mobile via `hidden sm:block`

### Files to edit
- `src/hooks/usePullToRefresh.ts` — use `window.scrollY` instead of `el.scrollTop`
- `src/pages/Fixtures.tsx` — remove `overflow-auto`
- `src/pages/Home.tsx` — remove `overflow-auto`

