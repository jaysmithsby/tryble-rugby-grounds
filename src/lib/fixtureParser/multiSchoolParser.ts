/**
 * Multi-School Bulk Parser
 * 
 * Parses province-wide rugby results pasted as space-separated text.
 * Uses score-anchoring to split home team, scores, away team, and festival.
 */

import { FixtureRow, School, Tournament, generateId, UPCOMING_YEAR_THRESHOLD } from './types';
import { fuzzyMatchSchool, fuzzyMatchTournament, normalizeSchoolName } from './fuzzyMatch';
import { parseHeaderLine } from './provinceMap';

export interface BulkFixtureRow extends FixtureRow {
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: string;
  awayTeamId: string;
  festivalName: string;
  isCancelled: boolean;
  sectionSchoolName: string;
}

export interface SchoolSection {
  schoolName: string;
  schoolId: string;
  fixtures: BulkFixtureRow[];
}

export interface BulkParseResult {
  province: string;
  year: string;
  schoolSections: SchoolSection[];
  duplicates: number;
  unmatched: string[];
  totalFixtures: number;
}

const MONTHS: Record<string, number> = {
  'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
  'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11,
};

const COLUMN_HEADER_PATTERN = /^date\s+home\s+team\s+home\s+score/i;

/**
 * Check if a line is a column header row
 */
function isColumnHeader(line: string): boolean {
  return COLUMN_HEADER_PATTERN.test(line.trim());
}

/**
 * Check if a line looks like a fixture data row (starts with DD MMM pattern)
 */
function isFixtureLine(line: string): boolean {
  return /^\d{1,2}\s+[A-Za-z]{3}\s+/.test(line.trim());
}

/**
 * Extract a team name from tokens by progressively trimming trailing words
 * and fuzzy-matching against the schools database. This strips festival names
 * that appear after the actual school name (e.g., "St Andrews Graeme Rugby Festival" → "St Andrews").
 */
function extractTeamName(
  tokens: string[],
  schools: School[],
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

  // No match found — use full text, let user fix in review
  return { teamName: tokens.join(' '), matched: false };
}

/**
 * Parse a single fixture line using score-anchoring.
 * 
 * Format: "09 Mar Clifton 43 0 KZN Development"
 * or:     "13 Jul Durban HS x x Parktown Cancelled"
 * 
 * Algorithm:
 * 1. Extract date (DD MMM)
 * 2. Find two consecutive number tokens (or "x x") as score anchors
 * 3. Text between date and first score = Home Team
 * 4. Text after second score = Away Team + optional Festival
 */
function parseFixtureLine(
  line: string,
  year: string,
  sectionSchoolName: string,
  schools: School[],
  tournaments: Tournament[],
): BulkFixtureRow | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Extract date
  const dateMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+/);
  if (!dateMatch) return null;

  const day = parseInt(dateMatch[1], 10);
  const monthStr = dateMatch[2].toLowerCase();
  const month = MONTHS[monthStr];
  if (month === undefined) return null;

  const matchDate = new Date(parseInt(year), month, day, 14, 0, 0);
  const remainder = trimmed.substring(dateMatch[0].length);

  // Tokenize the remainder
  const tokens = remainder.split(/\s+/);

  // Find score anchors: two consecutive tokens that are both numbers or both "x"
  let scoreIndex = -1;
  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i];
    const b = tokens[i + 1];
    const aIsScore = /^\d+$/.test(a) || a.toLowerCase() === 'x';
    const bIsScore = /^\d+$/.test(b) || b.toLowerCase() === 'x';
    if (aIsScore && bIsScore) {
      scoreIndex = i;
      break;
    }
  }

  if (scoreIndex === -1) return null;

  const homeTeamTokens = tokens.slice(0, scoreIndex);
  const homeScoreStr = tokens[scoreIndex];
  const awayScoreStr = tokens[scoreIndex + 1];
  const afterScoreTokens = tokens.slice(scoreIndex + 2);

  // Extract home team using progressive trimming
  const { teamName: homeTeamName } = extractTeamName(homeTeamTokens, schools);
  const isCancelled = homeScoreStr.toLowerCase() === 'x' || awayScoreStr.toLowerCase() === 'x';
  const homeScore = isCancelled ? '' : homeScoreStr;
  const awayScore = isCancelled ? '' : awayScoreStr;

  // Extract away team using progressive trimming (strip festival text)
  let awayTeamName = '';
  const festivalName = '';

  if (afterScoreTokens.length > 0) {
    // Check for "Cancelled" at the end
    const lastToken = afterScoreTokens[afterScoreTokens.length - 1];
    const cleanedTokens = lastToken.toLowerCase() === 'cancelled'
      ? afterScoreTokens.slice(0, -1)
      : afterScoreTokens;

    const { teamName } = extractTeamName(cleanedTokens, schools);
    awayTeamName = teamName;
  }

  // Determine home/away relative to section school
  const normalizedSection = normalizeSchoolName(sectionSchoolName);
  const normalizedHome = normalizeSchoolName(homeTeamName);
  const normalizedAway = normalizeSchoolName(awayTeamName);
  
  const sectionIsHome = normalizedHome.includes(normalizedSection) || normalizedSection.includes(normalizedHome);
  const sectionIsAway = normalizedAway.includes(normalizedSection) || normalizedSection.includes(normalizedAway);
  
  const homeAway: "home" | "away" = sectionIsHome ? "home" : "away";

  // Determine result relative to section school
  let result: "won" | "lost" | "drew" | "upcoming";
  const yearNum = parseInt(year);
  
  if (isCancelled || yearNum >= UPCOMING_YEAR_THRESHOLD) {
    result = "upcoming";
  } else {
    const hScore = parseInt(homeScore);
    const aScore = parseInt(awayScore);
    if (isNaN(hScore) || isNaN(aScore)) {
      result = "upcoming";
    } else if (hScore === aScore) {
      result = "drew";
    } else if (sectionIsHome) {
      result = hScore > aScore ? "won" : "lost";
    } else {
      result = aScore > hScore ? "won" : "lost";
    }
  }

  // Scores relative to section school (scoreFor/scoreAgainst)
  const scoreFor = sectionIsHome ? homeScore : awayScore;
  const scoreAgainst = sectionIsHome ? awayScore : homeScore;

  // Fuzzy match teams
  const homeMatch = fuzzyMatchSchool(homeTeamName, schools);
  const awayMatch = fuzzyMatchSchool(awayTeamName, schools);

  // Festival/tournament matching removed — can be added later manually

  // The "opponent" from the section school's perspective
  const opponentName = sectionIsHome ? awayTeamName : homeTeamName;
  const opponentMatch = sectionIsHome ? awayMatch : homeMatch;

  return {
    id: generateId(),
    year,
    homeAway,
    opponentName: opponentMatch?.name || opponentName,
    opponentId: opponentMatch?.id || '',
    result,
    scoreFor,
    scoreAgainst,
    tournamentId: '',
    matchDate: matchDate.toISOString(),
    // Extended fields
    homeTeamName: homeMatch?.name || homeTeamName,
    awayTeamName: awayMatch?.name || awayTeamName,
    homeTeamId: homeMatch?.id || '',
    awayTeamId: awayMatch?.id || '',
    festivalName,
    isCancelled,
    sectionSchoolName,
  };
}

/**
 * Parse a multi-school bulk paste into structured sections.
 */
export function parseMultiSchoolData(
  text: string,
  schools: School[],
  tournaments: Tournament[],
): BulkParseResult {
  const lines = text.split('\n');
  
  // 1. Extract province and year from header
  let province = '';
  let year = new Date().getFullYear().toString();
  
  // Check first few non-empty lines for header
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const headerInfo = parseHeaderLine(line);
    if (headerInfo && headerInfo.year) {
      province = headerInfo.province;
      year = headerInfo.year;
      break;
    }
  }

  // 2. Split into school sections
  // A school section starts with a line that is NOT a fixture row, NOT a column header, 
  // NOT empty, and NOT the main header — followed by fixture rows
  const sections: { name: string; lines: string[] }[] = [];
  let currentSection: { name: string; lines: string[] } | null = null;
  let headerSkipped = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip the main header line
    if (!headerSkipped && parseHeaderLine(trimmed)?.year) {
      headerSkipped = true;
      continue;
    }

    // Skip column headers
    if (isColumnHeader(trimmed)) continue;

    // Check if this is a fixture data line
    if (isFixtureLine(trimmed)) {
      if (currentSection) {
        currentSection.lines.push(trimmed);
      }
      continue;
    }

    // Check if line contains "at" which indicates a venue note within a fixture (e.g., "at Kings Park")
    // These are typically part of the previous fixture line — skip
    if (trimmed.startsWith('at ') && currentSection && currentSection.lines.length > 0) {
      continue;
    }

    // This is a school name header
    currentSection = { name: trimmed, lines: [] };
    sections.push(currentSection);
  }

  // 3. Parse each section
  const schoolSections: SchoolSection[] = [];
  const unmatchedSet = new Set<string>();

  for (const section of sections) {
    if (section.lines.length === 0) continue;

    const schoolMatch = fuzzyMatchSchool(section.name, schools);
    const schoolId = schoolMatch?.id || '';
    const schoolName = schoolMatch?.name || section.name;

    if (!schoolId) {
      unmatchedSet.add(section.name);
    }

    const fixtures: BulkFixtureRow[] = [];
    for (const fixtureLine of section.lines) {
      const parsed = parseFixtureLine(fixtureLine, year, section.name, schools, tournaments);
      if (parsed) {
        fixtures.push(parsed);
      }
    }

    if (fixtures.length > 0) {
      schoolSections.push({
        schoolName,
        schoolId,
        fixtures,
      });
    }
  }

  // Also collect unmatched from fixture teams
  for (const section of schoolSections) {
    for (const fixture of section.fixtures) {
      if (!fixture.homeTeamId && fixture.homeTeamName) {
        // Check if it's already a known school or section school
        const isSection = schoolSections.some(s => 
          normalizeSchoolName(s.schoolName) === normalizeSchoolName(fixture.homeTeamName)
        );
        if (!isSection) unmatchedSet.add(fixture.homeTeamName);
      }
      if (!fixture.awayTeamId && fixture.awayTeamName) {
        const isSection = schoolSections.some(s => 
          normalizeSchoolName(s.schoolName) === normalizeSchoolName(fixture.awayTeamName)
        );
        if (!isSection) unmatchedSet.add(fixture.awayTeamName);
      }
    }
  }

  // 4. Deduplicate
  const seen = new Set<string>();
  let duplicates = 0;
  let totalFixtures = 0;

  for (const section of schoolSections) {
    const deduped: BulkFixtureRow[] = [];
    for (const fixture of section.fixtures) {
      const fingerprint = `${normalizeSchoolName(fixture.homeTeamName)}|${normalizeSchoolName(fixture.awayTeamName)}|${fixture.matchDate}`;
      if (!seen.has(fingerprint)) {
        seen.add(fingerprint);
        deduped.push(fixture);
        totalFixtures++;
      } else {
        duplicates++;
      }
    }
    section.fixtures = deduped;
  }

  return {
    province,
    year,
    schoolSections,
    duplicates,
    unmatched: Array.from(unmatchedSet),
    totalFixtures,
  };
}
