/**
 * Fixture data parsers for various input formats
 */

import { FixtureRow, ParseContext, generateId } from './types';
import { normalizeSchoolName, fuzzyMatchSchool, fuzzyMatchTournament } from './fuzzyMatch';

/**
 * Parse markdown table format
 * Expected: | No | Date | Union | Opponent | Venue | Result | PF | PA | Notes |
 */
export function parseMarkdownTableData(text: string, context: ParseContext): FixtureRow[] {
  const { defaultYear, schools, tournaments } = context;
  const lines = text.split('\n').filter(line => line.trim());
  const parsedRows: FixtureRow[] = [];
  
  // Find header line
  let headerIndex = -1;
  let headers: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('|') && (line.toLowerCase().includes('date') || line.toLowerCase().includes('opponent'))) {
      headerIndex = i;
      headers = line.split('|').map(h => h.trim().toLowerCase()).filter(h => h);
      break;
    }
  }
  
  if (headerIndex === -1) return [];
  
  const colIndex = {
    no: headers.findIndex(h => h === 'no' || h === '#'),
    date: headers.findIndex(h => h === 'date'),
    union: headers.findIndex(h => h === 'union'),
    opponent: headers.findIndex(h => h === 'opponent'),
    venue: headers.findIndex(h => h === 'venue'),
    result: headers.findIndex(h => h === 'result'),
    pf: headers.findIndex(h => h === 'pf' || h === 'for' || h === 'points for'),
    pa: headers.findIndex(h => h === 'pa' || h === 'against' || h === 'points against'),
    notes: headers.findIndex(h => h === 'notes' || h === 'tournament'),
  };
  
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('--') || line.includes('---')) continue;
    if (!line.includes('|')) continue;
    
    const allValues = line.split('|').map(v => v.trim());
    if (allValues[0] === '') allValues.shift();
    if (allValues[allValues.length - 1] === '') allValues.pop();
    
    if (allValues.length < 4) continue;
    if (allValues[0].includes('-')) continue;
    
    // Parse date
    let matchDate = "";
    let year = defaultYear;
    const dateValue = colIndex.date >= 0 ? allValues[colIndex.date] : allValues[1];
    
    if (dateValue) {
      const dateMatch = dateValue.match(/(?:\w+\.)?(\d{1,2})([A-Za-z]{3})/);
      if (dateMatch) {
        const day = parseInt(dateMatch[1], 10);
        const monthStr = dateMatch[2].toLowerCase();
        const months: Record<string, number> = {
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };
        const month = months[monthStr];
        if (month !== undefined) {
          const parsedDate = new Date(parseInt(defaultYear), month, day, 14, 0, 0);
          if (!isNaN(parsedDate.getTime())) {
            matchDate = parsedDate.toISOString();
            year = defaultYear;
          }
        }
      }
    }
    
    const opponentName = colIndex.opponent >= 0 ? allValues[colIndex.opponent] : allValues[3];
    const matchedSchool = fuzzyMatchSchool(opponentName, schools);
    
    const venueValue = colIndex.venue >= 0 ? allValues[colIndex.venue] : allValues[4];
    let homeAway: "home" | "away" = "home";
    if (venueValue) {
      const v = venueValue.toUpperCase();
      if (v === 'A' || v === 'AWAY' || v === 'F' || v === 'FESTIVAL' || v === 'N' || v === 'NEUTRAL') {
        homeAway = "away";
      }
    }
    
    const resultValue = colIndex.result >= 0 ? allValues[colIndex.result] : allValues[5];
    const yearNum = parseInt(year);
    let result: "won" | "lost" | "drew" | "upcoming" = yearNum >= 2026 ? "upcoming" : "won";
    if (resultValue) {
      const r = resultValue.toLowerCase();
      if (r === 'lost' || r === 'l') result = "lost";
      else if (r === 'drew' || r === 'draw' || r === 'd') result = "drew";
      else if (r === 'upcoming' || r === 'u') result = "upcoming";
    }
    
    const pfValue = colIndex.pf >= 0 ? allValues[colIndex.pf] : allValues[6];
    const paValue = colIndex.pa >= 0 ? allValues[colIndex.pa] : allValues[7];
    const scoreFor = pfValue ? pfValue.replace(/\D/g, '') : "";
    const scoreAgainst = paValue ? paValue.replace(/\D/g, '') : "";
    
    const notesValue = colIndex.notes >= 0 ? allValues[colIndex.notes] : (allValues[8] || "");
    let tournamentId = "";
    if (notesValue) {
      const matchedTournament = fuzzyMatchTournament(notesValue, year, tournaments);
      if (matchedTournament) {
        tournamentId = matchedTournament.id;
      }
    }
    
    parsedRows.push({
      id: generateId(),
      year,
      matchDate,
      homeAway,
      opponentName: matchedSchool?.name || opponentName,
      opponentId: matchedSchool?.id || "",
      result,
      scoreFor,
      scoreAgainst,
      tournamentId,
    });
  }
  
  return parsedRows;
}

/**
 * Parse tab-separated data format
 */
export function parseTabSeparatedData(text: string, context: ParseContext): FixtureRow[] {
  const { primarySchoolId, primarySchoolName, defaultYear, schools, tournaments } = context;
  const lines = text.split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].toLowerCase().split('\t').map(h => h.trim());
  
  const colIndex = {
    matchDate: headers.findIndex(h => h.includes('match_date') || h.includes('date')),
    homeSchool: headers.findIndex(h => h.includes('home_school') || h === 'home'),
    awaySchool: headers.findIndex(h => h.includes('away_school') || h === 'away'),
    homeAway: headers.findIndex(h => h.includes('home_away') || h === 'h/a'),
    result: headers.findIndex(h => h === 'result'),
    pf: headers.findIndex(h => h === 'pf' || h === 'for'),
    pa: headers.findIndex(h => h === 'pa' || h === 'against'),
  };

  const parsedRows: FixtureRow[] = [];
  const normalizedPrimary = primarySchoolName.toLowerCase();

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t').map(v => v.trim());
    if (values.length < 2) continue;

    let matchDate = "";
    let year = defaultYear;
    if (colIndex.matchDate >= 0 && values[colIndex.matchDate]) {
      try {
        const parsedDate = new Date(values[colIndex.matchDate]);
        if (!isNaN(parsedDate.getTime())) {
          parsedDate.setHours(14, 0, 0, 0);
          matchDate = parsedDate.toISOString();
          year = parsedDate.getFullYear().toString();
        }
      } catch {
        // Keep defaults
      }
    }

    let homeAway: "home" | "away" = "home";
    let opponentName = "";
    
    if (colIndex.homeAway >= 0) {
      const haValue = values[colIndex.homeAway]?.toLowerCase() || "";
      homeAway = (haValue.includes('away') || haValue === 'a' || haValue === 'neutral') ? "away" : "home";
    }

    if (colIndex.homeSchool >= 0 && colIndex.awaySchool >= 0) {
      const homeSchoolName = values[colIndex.homeSchool] || "";
      const awaySchoolName = values[colIndex.awaySchool] || "";
      
      if (homeSchoolName.toLowerCase().includes(normalizedPrimary) || 
          normalizedPrimary.includes(homeSchoolName.toLowerCase())) {
        opponentName = awaySchoolName;
        homeAway = "home";
      } else if (awaySchoolName.toLowerCase().includes(normalizedPrimary) || 
                 normalizedPrimary.includes(awaySchoolName.toLowerCase())) {
        opponentName = homeSchoolName;
        homeAway = "away";
      } else {
        opponentName = homeAway === "home" ? awaySchoolName : homeSchoolName;
      }
    }

    const yearNum = parseInt(year);
    let result: "won" | "lost" | "drew" | "upcoming" = yearNum >= 2026 ? "upcoming" : "won";
    if (colIndex.result >= 0 && values[colIndex.result]) {
      const r = values[colIndex.result].toLowerCase();
      if (r === 'lost' || r === 'l') result = "lost";
      else if (r === 'drew' || r === 'draw' || r === 'd') result = "drew";
      else if (r === 'upcoming' || r === 'u') result = "upcoming";
    }

    const pfValue = colIndex.pf >= 0 ? values[colIndex.pf] : "";
    const paValue = colIndex.pa >= 0 ? values[colIndex.pa] : "";
    const scoreFor = pfValue ? pfValue.replace(/\D/g, '') : "";
    const scoreAgainst = paValue ? paValue.replace(/\D/g, '') : "";

    const matchedSchool = fuzzyMatchSchool(opponentName, schools, primarySchoolId);

    parsedRows.push({
      id: generateId(),
      year,
      matchDate,
      homeAway,
      opponentName: matchedSchool?.name || opponentName,
      opponentId: matchedSchool?.id || "",
      result,
      scoreFor,
      scoreAgainst,
      tournamentId: "",
    });
  }

  return parsedRows;
}

/**
 * Parse concatenated data (no tabs) using date patterns as anchors
 */
export function parseConcatenatedData(text: string, context: ParseContext): FixtureRow[] {
  const { primarySchoolId, primarySchoolName, defaultYear, schools } = context;
  const normalizedPrimary = normalizeSchoolName(primarySchoolName);
  
  let dataText = text;
  if (text.toLowerCase().includes('match_date')) {
    const firstDateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
    if (firstDateMatch && firstDateMatch.index !== undefined) {
      dataText = text.substring(firstDateMatch.index);
    }
  }
  
  const datePattern = /(\d{4}-\d{2}-\d{2})/g;
  const parts: string[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = datePattern.exec(dataText)) !== null) {
    if (match.index > lastIndex) {
      if (parts.length > 0) {
        parts[parts.length - 1] += dataText.substring(lastIndex, match.index);
      }
    }
    parts.push(match[1]);
    lastIndex = match.index + match[1].length;
  }
  if (parts.length > 0 && lastIndex < dataText.length) {
    parts[parts.length - 1] += dataText.substring(lastIndex);
  }
  
  const parsedRows: FixtureRow[] = [];
  
  for (const part of parts) {
    const dateMatch = part.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) continue;
    
    const dateStr = dateMatch[1];
    const remainder = part.substring(10);
    
    let matchDate = "";
    let year = defaultYear;
    try {
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        parsedDate.setHours(14, 0, 0, 0);
        matchDate = parsedDate.toISOString();
        year = parsedDate.getFullYear().toString();
      }
    } catch {
      // Keep defaults
    }
    
    const rugbyIndex = remainder.toLowerCase().indexOf('rugby');
    if (rugbyIndex === -1) continue;
    
    const schoolsSection = remainder.substring(0, rugbyIndex);
    const afterRugby = remainder.substring(rugbyIndex + 5);
    
    const haMatch = afterRugby.match(/(Home|Away|Neutral)/i);
    let homeAway: "home" | "away" = "home";
    
    if (haMatch) {
      const haValue = haMatch[1].toLowerCase();
      homeAway = (haValue === 'away' || haValue === 'neutral') ? "away" : "home";
    }
    
    let opponentName = "";
    const normalizedSchools = normalizeSchoolName(schoolsSection);
    
    if (normalizedSchools.includes(normalizedPrimary)) {
      const primaryIndex = normalizedSchools.indexOf(normalizedPrimary);
      const beforePrimary = schoolsSection.substring(0, primaryIndex).trim();
      const afterPrimary = schoolsSection.substring(primaryIndex + primarySchoolName.length).trim();
      opponentName = (beforePrimary || afterPrimary).trim();
    } else {
      let foundSchool1: { id: string; name: string } | null = null;
      
      for (const school of schools) {
        if (school.id === primarySchoolId) continue;
        const normalizedSchool = normalizeSchoolName(school.name);
        if (normalizedSchools.includes(normalizedSchool)) {
          if (!foundSchool1) {
            foundSchool1 = { id: school.id, name: school.name };
          }
        }
      }
      
      opponentName = foundSchool1?.name || schoolsSection.trim();
    }
    
    opponentName = opponentName.replace(/^\s*['"]?/, '').replace(/['"]?\s*$/, '').trim();
    const matchedSchool = fuzzyMatchSchool(opponentName, schools, primarySchoolId);
    
    parsedRows.push({
      id: generateId(),
      year,
      matchDate,
      homeAway,
      opponentName: matchedSchool?.name || opponentName,
      opponentId: matchedSchool?.id || "",
      result: "won",
      scoreFor: "",
      scoreAgainst: "",
      tournamentId: "",
    });
  }
  
  return parsedRows;
}

/**
 * Detect format and parse fixture data
 */
export function parseFixtureData(text: string, context: ParseContext): FixtureRow[] {
  const isMarkdownTable = text.includes('|') && 
    (text.toLowerCase().includes('opponent') || text.toLowerCase().includes('venue') || text.toLowerCase().includes('result'));
  
  if (isMarkdownTable) {
    return parseMarkdownTableData(text, context);
  } else if (text.includes('\t')) {
    return parseTabSeparatedData(text, context);
  } else {
    return parseConcatenatedData(text, context);
  }
}
