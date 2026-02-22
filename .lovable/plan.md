
## Make FixtureTable a Global Component and Reuse on School Profile

### Overview
The `FixtureTable` component (with its collapsible match history) will be made into a reusable global component. The School Profile page will then use this same component for both "Upcoming Fixtures" and "Recent Results" sections, replacing the current custom inline markup.

### Changes

**1. Update `FixtureTable` props to support optional search**

- Make `searchQuery` optional (default to `""`) so the component can be used without a search input (e.g., on the School Profile page).

**2. Replace School Profile fixture sections with `FixtureTable`**

- **Upcoming Fixtures card** (lines 373-459): Replace the custom fixture rendering with `<FixtureTable fixtures={upcomingFixtures} />`. Remove the inline home/away school buttons, VS label, venue text, status badges, and derby badges -- the `FixtureTable` component already handles date, venue, tournament, jerseys, school navigation, and collapsible match history.

- **Recent Results card** (lines 461-538): Replace with `<FixtureTable fixtures={recentResults} />`. The recent results already have `home_score`/`away_score` but the current `FixtureTable` treats all rows identically (upcoming style with "vs"). This is acceptable since match history is accessible via the collapsible expand, and keeping one unified component is the goal.

**3. Ensure data shape compatibility**

The School Profile currently fetches fixture data with `select("*")` and manually joins schools via a `schoolsMap`. The `FixtureTable` expects each fixture to have `home_school` and `away_school` objects with `{ id, name, slug, jersey_url, province }`. The current join in `SchoolProfile` already attaches full school objects, so these fields are present. We just need to ensure `tournament` is also fetched -- add `tournament_id` to the fixture query and join tournament data, or simply leave it as `null` (tournaments will just not show if not fetched). For completeness, we'll update the fixture query to also fetch the linked tournament name.

### Technical Details

**`src/components/fixtures/FixtureTable.tsx`**
- Change interface: `searchQuery` becomes optional with default `""`
- Export the `Fixture` and `FixtureSchool` interfaces so they can be imported elsewhere

**`src/pages/SchoolProfile.tsx`**
- Import `FixtureTable` from `@/components/fixtures/FixtureTable`
- Replace the Upcoming Fixtures card content (lines 383-456) with: `<FixtureTable fixtures={upcomingFixtures} />`
- Replace the Recent Results card content (lines 471-535) with: `<FixtureTable fixtures={recentResults} />`
- Update the fixture queries to also select tournament data (join `tournaments` table via `tournament_id`) so tournament names appear in brackets after the date
- Remove unused imports that were only needed for the old inline fixture rendering (e.g., `Flame` if no longer used elsewhere, inline school button markup)
