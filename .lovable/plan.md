

## Fix: Normalize school names during comparison

### Problem
The filename `Hoerskool_Jan_van_Riebeeck.png` is normalized to `"hoerskool jan van riebeeck"`, but the school name `"Hoërskool Jan van Riebeeck"` keeps its `ë`. The `includes()` comparison fails because `"hoërskool"` does not contain `"hoerskool"`.

### Solution
In `src/components/admin/MatchJerseysButton.tsx`, apply the same `ë` → `e` normalization to school names, nicknames, and aliases before comparing.

### Changes
**Edit `src/components/admin/MatchJerseysButton.tsx`** — in the matching loop, normalize each school field:
- `school.name.toLowerCase().replace(/ë/g, "e")` for name comparison
- `school.nickname.toLowerCase().replace(/ë/g, "e")` for nickname comparison  
- Same for alias entries

This is a ~3-line change inside the existing matching loop.

