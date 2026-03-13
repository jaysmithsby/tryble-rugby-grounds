## Plan: Auto-match Jersey Images to Schools

### Problem

1. Uploaded PNG jerseys in the `school-jerseys` bucket aren't automatically linked to schools
2. The filename (e.g. `Bishops.png`, `Bellville.png`) needs to be matched to the school's name or any of the alias names (e.g. "Bishops Diocesan College", "Hoërskool Bellville")

### What Already Works

- The `SchoolJerseyImage` component already renders both SVG and PNG — no format restriction exists
- Schools like "Glenwood High School" already have `.png` jersey URLs working fine

### What Needs to Change

**1. Add "Auto-Match Jerseys" button to Admin Schools tab**

New component `src/components/admin/MatchJerseysButton.tsx`:

- Lists all files in the `school-jerseys` storage bucket
- Fetches all schools (with name, nickname, alias, current jersey_url)
- For each file, strips the extension and tries to match against:
  - School `name` (contains match, case-insensitive)
  - School `nickname` (exact match, case-insensitive)
  - School `alias` array entries
- Only updates schools where `jersey_url` is currently NULL (won't overwrite existing)
- Shows a preview dialog of proposed matches before applying
- Builds the full public URL: `https://{project}.supabase.co/storage/v1/object/public/school-jerseys/{filename}`

**2. Wire button into Admin page**

Add the button to the Schools management section toolbar area.

### Matching Logic (pseudocode)

```text
For each file in bucket (e.g. "Bishops.png"):
  stem = "Bishops" (remove extension)
  normalized = stem.replace(/_/g, " ")
  
  Find school where:
    - nickname === normalized (case-insensitive), OR
    - name contains normalized (case-insensitive), OR  
    - any alias entry matches normalized
    
  If school found AND school.jersey_url is NULL:
    → propose update jersey_url = public URL of file
```

### Example Matches


| File            | School Match             | Method                                                        |
| --------------- | ------------------------ | ------------------------------------------------------------- |
| `Bishops.png`   | Bishops Diocesan College | nickname="Bishops"                                            |
| `Bellville.png` | Hoërskool Bellville      | nickname="Bellies" — won't match, name contains "Bellville" ✓ |
| `Framesby.png`  | Hoërskool Framesby       | nickname="Framesby"                                           |
| `Glenwood.png`  | Glenwood High School     | name contains "Glenwood" (already has jersey_url, skip)       |


### Files to Create/Edit

- **Create**: `src/components/admin/MatchJerseysButton.tsx` — button + preview dialog with match results
- **Edit**: `src/pages/Admin.tsx` — add the button to the Schools tab toolbar