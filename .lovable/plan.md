

## Multi-School Historical Fixtures Bulk Upload

### The Problem

The current Historical Fixtures Upload only handles one school at a time -- you select a "Primary School", paste its fixtures, submit, then repeat for every school. With province-wide data covering 10+ schools, this is painfully slow.

### The Solution

A new **Bulk Upload** mode that accepts an entire province's results in one paste, auto-parses all schools and their fixtures, auto-fills scores/results/home-away/festivals, and presents everything in a grouped, reviewable table before submission.

### Recommended Input Format

Your example data is already in a great format. The ideal structure is:

```
[Province] Schoolboy Rugby Results [Year]

[School Name]

Date Home Team Home Score Away Score Away Team Festival
09 Mar Clifton 43 0 KZN Development
16 Mar Maritzburg College 83 10 Clifton
...

[Next School Name]

Date Home Team Home Score Away Score Away Team Festival
...
```

**Tips for best results:**
- Keep the header line with province and year (auto-extracts both)
- Each school section starts with the school name on its own line
- The column header row ("Date Home Team Home Score...") can appear once per school or be omitted after the first -- the parser will handle both
- Scores (two consecutive numbers) act as anchors to split home/away team names
- Festival column is optional -- leave blank for regular season matches
- For cancelled matches, use "x x" for scores (will be flagged for review)

---

### What Gets Built

#### 1. New Multi-School Parser (`src/lib/fixtureParser/multiSchoolParser.ts`)

A new parser that:
- Extracts province and year from the header line (e.g., "KZN Schoolboy Rugby Results 2025" -> province: "KwaZulu-Natal", year: "2025")
- Splits the text into school sections using school name headers
- For each fixture row, uses the two consecutive numbers (scores) as anchors to determine: home team name (text before first score), home score, away score, away team name (text after second score, before festival)
- Auto-determines result: compares home score vs away score relative to the section's school -> won/lost/drew
- Auto-determines home/away: if section school matches home team -> "home", else -> "away"
- Fuzzy-matches all school names against the database
- Fuzzy-matches festival names against tournaments in the database
- Handles edge cases: "x x" scores (cancelled), festivals with multi-word names
- Deduplicates fixtures that appear in multiple school sections (e.g., Clifton vs Glenwood appears under both)

**Output type:**
```typescript
interface BulkParseResult {
  province: string;
  year: string;
  schoolSections: {
    schoolName: string;
    schoolId: string;  // matched from DB or empty
    fixtures: FixtureRow[];  // extended with homeTeam/awayTeam info
  }[];
  duplicates: number;  // count of deduplicated fixtures
  unmatched: string[];  // school names not found in DB
}
```

#### 2. Updated HistoricalFixturesUpload Component

**New UI flow:**

**Step 1 -- Paste & Parse:**
- Remove the mandatory "Primary School" selector for bulk mode
- Add a toggle: "Single School" (current) | "Bulk Upload" (new)
- In Bulk mode, the textarea is larger and the placeholder shows the expected format
- Province and Year are auto-detected from the header but can be overridden
- "Parse Data" button processes the paste

**Step 2 -- Review by School:**
- After parsing, fixtures are displayed grouped by school in collapsible sections
- Each section header shows: School name, match count, matched/unmatched status
- Unmatched schools are highlighted with an option to create them or map to existing
- Each fixture row shows: Date, Home Team, Score, Away Team, Result (auto-filled as won/lost/drew), Festival
- Result cells are colour-coded (green/red/orange) and auto-filled but editable
- Cancelled matches ("x x") are flagged in amber for review
- A summary bar shows: Total fixtures, duplicates removed, schools matched, schools to create

**Step 3 -- Submit:**
- "Upload All" button submits all fixtures across all schools at once
- Deduplication: if fixture X appears under both Clifton and Glenwood sections, only one database record is created (matched by home_school + away_school + date)
- New schools are auto-created with province set from the header
- New festivals are auto-created with year suffix

#### 3. Province Abbreviation Mapping

A small utility to map province abbreviations from the header:
- "KZN" -> "KwaZulu-Natal"
- "WC" -> "Western Cape"
- "GP" -> "Gauteng"
- etc.

This ensures new schools created during bulk upload get the correct province set automatically.

---

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/lib/fixtureParser/multiSchoolParser.ts` | Create | New parser for multi-school bulk format |
| `src/lib/fixtureParser/provinceMap.ts` | Create | Province abbreviation mapping utility |
| `src/lib/fixtureParser/types.ts` | Modify | Add BulkParseResult and extended types |
| `src/lib/fixtureParser/index.ts` | Modify | Export new modules |
| `src/components/admin/HistoricalFixturesUpload.tsx` | Modify | Add bulk upload mode with school-grouped review UI |

### No Database or Backend Changes Required

All parsing happens client-side. Fixture insertion uses the existing `fixtures` table insert. New schools use the existing school creation logic (already in the component).

---

### Technical Details: Parsing Algorithm

The space-separated format is parsed using score-anchoring:

```
09 Mar Clifton 43 0 KZN Development
```

1. Extract date: first token matching `DD MMM` pattern -> "09 Mar"
2. Find the two consecutive numeric tokens (scores): `43` and `0`
3. Everything between the date and first score = Home Team: "Clifton"
4. Everything after second score until end or festival match = Away Team: "KZN Development"
5. If remaining text matches a known festival -> assign tournament

For the festival column, the parser checks if trailing text after the away team matches any tournament in the database (fuzzy match).

### Deduplication Logic

Each fixture is fingerprinted as `{homeTeam}|{awayTeam}|{date}`. When the same fixture appears in multiple school sections (which it always will -- every match has two teams), only the first occurrence is kept. The review UI shows the deduplicated count.

