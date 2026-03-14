

## Add UUID-based matching to Match Jerseys

### Change

In `src/components/admin/MatchJerseysButton.tsx`, add a UUID extraction step **before** the existing nickname/name/alias matching loop. If the filename contains a valid UUID pattern (e.g. `1d0665d0-4d4c-4ccc-9498-3131f581474c (Fish Hoek).png`), match directly by school ID — highest priority, skipping name-based matching.

### Implementation (single file)

**`src/components/admin/MatchJerseysButton.tsx`** — inside the `for (const file of jerseyFiles)` loop, before the school loop:

1. Extract UUID from filename using regex: `/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i`
2. If found, look up the school by ID in the fetched schools array
3. If school exists and has no `jersey_url`, propose the match with method `id="${uuid}"`
4. Set `matched = true` and skip the name-based loop entirely

This is ~10 lines inserted at line 70, before the existing `for (const school of schools)` loop.

