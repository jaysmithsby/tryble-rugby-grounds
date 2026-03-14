

## Comprehensive UI Color and Accessibility Overhaul

### What changes

**1. New background and nav bar colors**
- Page background: Pitch Grey `#F5F5F5` → HSL `0 0% 96%` (light mode)
- GlobalHeader: Grubber Green `#1B4332` → HSL `150 41% 18%` with white text/icons
- BottomNav: Match the dark green nav bar style for visual cohesion

**2. Light mode CSS variable updates** (`src/index.css`)
- `--background`: `0 0% 96%` (Pitch Grey instead of pure white)
- `--card`: `0 0% 100%` (white cards on grey bg for depth)
- `--muted`: `0 0% 92%` (slightly darker to maintain contrast on new bg)
- `--muted-foreground`: `0 0% 35%` (darken from 45% to pass WCAG AA 4.5:1 on Pitch Grey)
- Add new variable `--nav-bar`: `150 41% 18%` and `--nav-bar-foreground`: `0 0% 98%`

**3. GlobalHeader** (`src/components/GlobalHeader.tsx`)
- Replace `bg-background/95` with dark green `bg-[hsl(var(--nav-bar))]`
- All text/icons to white (`text-[hsl(var(--nav-bar-foreground))]`)
- Burger menu icon to white; border to transparent or green-tinted
- Logo should already be light-compatible (PNG with transparency)

**4. BottomNav** (`src/components/BottomNav.tsx`)
- Same dark green background as header
- Active icon: Rugby Gold accent (`text-accent`)
- Inactive icons: white at 70% opacity
- Active label: white, inactive label: white/70

**5. Cards get more lift** (`src/components/ui/card.tsx`)
- Add slightly stronger shadow on light mode for card-on-grey contrast
- Already `bg-card` which will now be pure white

**6. Button contrast fixes** (`src/components/ui/button.tsx`)
- `outline` variant: ensure border is visible on Pitch Grey bg
- `ghost` variant: hover state uses higher contrast

**7. Dark mode**
- Keep existing dark mode mostly unchanged (already good contrast)
- Add `--nav-bar` and `--nav-bar-foreground` dark equivalents

### Files to edit
- `src/index.css` — CSS variables
- `src/components/GlobalHeader.tsx` — dark green nav bar
- `src/components/BottomNav.tsx` — dark green bottom nav
- `src/components/ui/card.tsx` — shadow bump
- `tailwind.config.ts` — add `nav-bar` color tokens

### WCAG AA compliance notes
- All text on Pitch Grey background: foreground `0 0% 12%` on `0 0% 96%` = contrast ratio ~13:1 (passes)
- Muted text on Pitch Grey: `0 0% 35%` on `0 0% 96%` = ~5.5:1 (passes AA)
- White text on `#1B4332`: `#FAFAFA` on `#1B4332` = ~10:1 (passes AAA)
- Gold accent text on dark green: `#E5A800` on `#1B4332` = ~4.8:1 (passes AA for large text; icons are fine)
- Active green on white card: `#1B7A3D` on white = ~5.2:1 (passes AA)

