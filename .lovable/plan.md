

## Fix: Strip Festival Text from Away Team Names in Bulk Parser

### The Problem

When festival parsing was removed, all text after the scores is treated as the away team name. For a line like:

```
16 Mar Brandwag EP 19 34 St Andrews Graeme Rugby Festival
```

The away team becomes **"St Andrews Graeme Rugby Festival"** instead of just **"St Andrews"**. This causes incorrect school matching, phantom school creation, and data quality issues.

### The Solution

Update the `parseFixtureLine` function in `multiSchoolParser.ts` to use **progressive trimming** when extracting the away team name:

1. Take all tokens after the scores (minus "Cancelled" if present)
2. Try fuzzy-matching the full string against the schools database
3. If no match, remove the last token and try again
4. Repeat until a match is found or only 1 token remains
5. If a match is found at a shorter length, use that as the away team name (the removed tokens were festival text)
6. If no match at any length, fall back to the full text (current behaviour -- lets the user fix it manually in the review UI)

This approach works because school names are typically 1-3 words, while festival names add 2-4 extra words at the end.

### Example Walkthrough

Input: `"St Andrews Graeme Rugby Festival"`

| Attempt | Text tried | Match? |
|---------|-----------|--------|
| 1 | "St Andrews Graeme Rugby Festival" | No |
| 2 | "St Andrews Graeme Rugby" | No |
| 3 | "St Andrews Graeme" | No |
| 4 | "St Andrews" | Yes -- use this |

The same logic is applied to the home team text (before scores) as well, since festival host names could appear there too, though this is rarer.

### Technical Details

**File changed:** `src/lib/fixtureParser/multiSchoolParser.ts`

**What changes (lines 120-131):**

Replace the simple token join with a progressive matching function:

```typescript
function extractTeamName(
  tokens: string[],
  schools: School[]
): { teamName: string; matched: boolean } {
  if (tokens.length === 0) return { teamName: '', matched: false };

  // Try progressively shorter prefixes
  for (let len = tokens.length; len >= 1; len--) {
    const candidate = tokens.slice(0, len).join(' ');
    const match = fuzzyMatchSchool(candidate, schools);
    if (match) {
      return { teamName: candidate, matched: true };
    }
  }

  // No match found -- use full text, let user fix in review
  return { teamName: tokens.join(' '), matched: false };
}
```

Then use it for the away team tokens (after removing "Cancelled"):

```typescript
const cleanedTokens = lastToken.toLowerCase() === 'cancelled'
  ? afterScoreTokens.slice(0, -1)
  : afterScoreTokens;

const { teamName: awayTeamName } = extractTeamName(cleanedTokens, schools);
```

No other files need to change. The review UI, submission logic, and school comboboxes all remain untouched.

