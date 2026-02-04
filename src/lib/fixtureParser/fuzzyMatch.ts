/**
 * Fuzzy matching utilities for schools and tournaments
 */

import type { School, Tournament, MatchResult } from './types';

/**
 * Normalize school name for better matching
 */
export function normalizeSchoolName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''`']/g, '') // Remove apostrophes
    .replace(/[^a-z0-9\s]/g, '') // Remove other punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Expand common abbreviations for better matching
 */
export function expandAbbreviations(name: string): string[] {
  const normalized = normalizeSchoolName(name);
  const variations = [normalized];
  
  const abbreviations: Record<string, string[]> = {
    'hs': ['high school', 'high'],
    'high school': ['hs'],
    'high': ['hs', 'high school'],
    'ps': ['primary school', 'primary'],
    'primary school': ['ps'],
    'vs': ['volkskool'],
    'volkskool': ['vs'],
    'coll': ['college'],
    'college': ['coll'],
    'tech': ['technical'],
    'technical': ['tech'],
    'hoer': ['hoërskool', 'hoerskool'],
    'hoerskool': ['hoer', 'hoërskool'],
    'laer': ['laerskool'],
    'laerskool': ['laer'],
  };
  
  for (const [abbr, expansions] of Object.entries(abbreviations)) {
    if (normalized.includes(abbr)) {
      for (const expansion of expansions) {
        variations.push(normalized.replace(abbr, expansion));
      }
    }
  }
  
  return variations;
}

/**
 * Fuzzy match school name to existing schools
 */
export function fuzzyMatchSchool(name: string, schools: School[], excludeId?: string): MatchResult | null {
  if (!name || !name.trim()) return null;
  
  const normalizedName = normalizeSchoolName(name);
  const nameVariations = expandAbbreviations(name);
  const filteredSchools = excludeId ? schools.filter(s => s.id !== excludeId) : schools;
  
  // Exact match on normalized names (including abbreviation expansions)
  for (const variation of nameVariations) {
    const exactMatch = filteredSchools.find(s => normalizeSchoolName(s.name) === variation);
    if (exactMatch) return { id: exactMatch.id, name: exactMatch.name };
  }
  
  // Check if any school's variations match our variations
  for (const school of filteredSchools) {
    const schoolVariations = expandAbbreviations(school.name);
    for (const nameVar of nameVariations) {
      for (const schoolVar of schoolVariations) {
        if (nameVar === schoolVar) {
          return { id: school.id, name: school.name };
        }
      }
    }
  }
  
  // Partial match (school name contains or is contained in search)
  for (const variation of nameVariations) {
    const partialMatch = filteredSchools.find(s => {
      const normalizedSchool = normalizeSchoolName(s.name);
      return normalizedSchool.includes(variation) || variation.includes(normalizedSchool);
    });
    if (partialMatch) return { id: partialMatch.id, name: partialMatch.name };
  }
  
  // Slug-based matching
  const inputSlug = normalizedName.replace(/\s+/g, '-');
  for (const school of filteredSchools) {
    const schoolSlug = normalizeSchoolName(school.name).replace(/\s+/g, '-');
    if (inputSlug.length >= 5 && schoolSlug.length >= 5) {
      if (schoolSlug.startsWith(inputSlug.substring(0, 5)) || 
          inputSlug.startsWith(schoolSlug.substring(0, 5))) {
        const inputWords = normalizedName.split(' ').filter(w => w.length > 2);
        const schoolWords = normalizeSchoolName(school.name).split(' ').filter(w => w.length > 2);
        const sharedWords = inputWords.filter(iw => 
          schoolWords.some(sw => sw === iw || sw.includes(iw) || iw.includes(sw))
        );
        if (sharedWords.length >= 1) {
          return { id: school.id, name: school.name };
        }
      }
    }
  }
  
  // Word-based scoring match
  const searchWords = normalizedName.split(' ').filter(w => w.length > 2);
  if (searchWords.length === 0) return null;
  
  let bestMatch: School | null = null;
  let bestScore = 0;
  
  for (const school of filteredSchools) {
    const schoolWords = normalizeSchoolName(school.name).split(' ');
    const matchingWords = searchWords.filter(sw => 
      schoolWords.some(scw => scw.includes(sw) || sw.includes(scw))
    );
    const score = matchingWords.length / searchWords.length;
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMatch = school;
    }
  }
  
  if (bestMatch) return { id: bestMatch.id, name: bestMatch.name };
  
  return null;
}

/**
 * Fuzzy match tournament name
 */
export function fuzzyMatchTournament(name: string, year: string, tournaments: Tournament[]): MatchResult | null {
  if (!name || !name.trim()) return null;
  
  const normalized = normalizeSchoolName(name);
  const yearSuffix = ` ${year}`;
  
  // Try to match with year suffix
  for (const tournament of tournaments) {
    const tournamentNorm = normalizeSchoolName(tournament.name);
    if (tournamentNorm === normalized || 
        tournamentNorm === normalized + yearSuffix.trim() ||
        tournamentNorm.replace(/ \d{4}$/, '') === normalized) {
      return { id: tournament.id, name: tournament.name };
    }
  }
  
  // Partial match
  for (const tournament of tournaments) {
    const tournamentNorm = normalizeSchoolName(tournament.name).replace(/ \d{4}$/, '');
    if (tournamentNorm.includes(normalized) || normalized.includes(tournamentNorm)) {
      return { id: tournament.id, name: tournament.name };
    }
  }
  
  return null;
}
