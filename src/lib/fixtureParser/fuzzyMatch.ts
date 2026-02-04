/**
 * Fuzzy Matching Utilities for School Names
 * 
 * This module provides fuzzy matching capabilities for South African school names,
 * handling common variations, abbreviations, and typos that occur during data entry.
 * 
 * ## Matching Strategy (in priority order):
 * 1. **Exact match** - Direct normalized string comparison
 * 2. **Abbreviation expansion** - Handles "HS" → "High School", "VS" → "Volkskool", etc.
 * 3. **Partial match** - One name contains the other
 * 4. **Slug-based match** - First 5 chars of hyphenated slug + shared words
 * 5. **Word-based scoring** - 50%+ of significant words must match
 * 
 * ## South African School Abbreviations Handled:
 * - HS / High School / High
 * - PS / Primary School / Primary
 * - VS / Volkskool (Afrikaans)
 * - Hoër / Hoërskool / Hoerskool (Afrikaans high school)
 * - Laer / Laerskool (Afrikaans primary school)
 * - Coll / College
 * - Tech / Technical
 * 
 * @example
 * // These will all match "Glenwood High School":
 * fuzzyMatchSchool("Glenwood HS", schools)
 * fuzzyMatchSchool("glenwood high", schools)
 * fuzzyMatchSchool("GLENWOOD HIGH SCHOOL", schools)
 */

import type { School, Tournament, MatchResult } from './types';

/**
 * Normalize a school name for consistent comparison.
 * 
 * Transformations applied:
 * - Convert to lowercase
 * - Remove all apostrophes (handles O'Brien, St John's, etc.)
 * - Remove non-alphanumeric characters except spaces
 * - Collapse multiple spaces to single space
 * - Trim leading/trailing whitespace
 * 
 * @param name - Raw school name input
 * @returns Normalized string for comparison
 * 
 * @example
 * normalizeSchoolName("St John's College") // "st johns college"
 * normalizeSchoolName("Grey H.S.") // "grey hs"
 */
export function normalizeSchoolName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''`']/g, '') // Remove apostrophes (curly and straight)
    .replace(/[^a-z0-9\s]/g, '') // Remove other punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate name variations by expanding common SA school abbreviations.
 * 
 * This handles the common pattern where schools are referred to by
 * abbreviated names in conversation or data entry. For example,
 * "Maritzburg College" might be entered as "Maritzburg Coll".
 * 
 * @param name - Raw school name to expand
 * @returns Array of all possible variations (normalized)
 * 
 * @example
 * expandAbbreviations("Glenwood HS")
 * // Returns: ["glenwood hs", "glenwood high school", "glenwood high"]
 */
export function expandAbbreviations(name: string): string[] {
  const normalized = normalizeSchoolName(name);
  const variations = [normalized];
  
  // Map of abbreviations to their expansions
  // Note: Includes reverse mappings for bidirectional matching
  const abbreviations: Record<string, string[]> = {
    'hs': ['high school', 'high'],
    'high school': ['hs'],
    'high': ['hs', 'high school'],
    'ps': ['primary school', 'primary'],
    'primary school': ['ps'],
    'vs': ['volkskool'],           // Afrikaans: Volkskool → VS
    'volkskool': ['vs'],
    'coll': ['college'],
    'college': ['coll'],
    'tech': ['technical'],
    'technical': ['tech'],
    'hoer': ['hoërskool', 'hoerskool'],  // Afrikaans high school
    'hoerskool': ['hoer', 'hoërskool'],
    'laer': ['laerskool'],               // Afrikaans primary school
    'laerskool': ['laer'],
  };
  
  // Generate variations by replacing each found abbreviation
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
 * Find the best matching school from a list using fuzzy matching.
 * 
 * Matching is attempted in order of confidence (highest first):
 * 
 * 1. **Exact Match**: Direct comparison after normalization
 *    - "Glenwood High School" === "glenwood high school"
 * 
 * 2. **Abbreviation Match**: Expands abbreviations on both sides
 *    - "Glenwood HS" matches "Glenwood High School"
 * 
 * 3. **Partial Match**: One name contains the other
 *    - "Glenwood" matches "Glenwood High School"
 * 
 * 4. **Slug Match**: First 5 chars match + shared significant words
 *    - "Glenwd High" might match "Glenwood High School"
 * 
 * 5. **Word Scoring**: 50%+ of words match
 *    - "Maritzburg Boys College" matches "Maritzburg College"
 * 
 * @param name - The school name to search for
 * @param schools - Array of school records to search within
 * @param excludeId - Optional school ID to exclude (for opponent matching)
 * @returns MatchResult with id and name, or null if no match found
 * 
 * @example
 * const match = fuzzyMatchSchool("Glenwood HS", schools);
 * if (match) {
 *   console.log(`Matched: ${match.name} (${match.id})`);
 * }
 */
export function fuzzyMatchSchool(name: string, schools: School[], excludeId?: string): MatchResult | null {
  if (!name || !name.trim()) return null;
  
  const normalizedName = normalizeSchoolName(name);
  const nameVariations = expandAbbreviations(name);
  const filteredSchools = excludeId ? schools.filter(s => s.id !== excludeId) : schools;
  
  // === PRIORITY 1: Exact match on normalized names ===
  // Including all abbreviation expansions
  for (const variation of nameVariations) {
    const exactMatch = filteredSchools.find(s => normalizeSchoolName(s.name) === variation);
    if (exactMatch) return { id: exactMatch.id, name: exactMatch.name };
  }
  
  // === PRIORITY 2: Cross-product abbreviation matching ===
  // Check if any of our variations match any of the school's variations
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
  
  // === PRIORITY 3: Partial/substring matching ===
  // Useful when one name is a shortened version of the other
  for (const variation of nameVariations) {
    const partialMatch = filteredSchools.find(s => {
      const normalizedSchool = normalizeSchoolName(s.name);
      return normalizedSchool.includes(variation) || variation.includes(normalizedSchool);
    });
    if (partialMatch) return { id: partialMatch.id, name: partialMatch.name };
  }
  
  // === PRIORITY 4: Slug-based matching with word overlap ===
  // Handles typos in first few characters if significant words overlap
  const inputSlug = normalizedName.replace(/\s+/g, '-');
  for (const school of filteredSchools) {
    const schoolSlug = normalizeSchoolName(school.name).replace(/\s+/g, '-');
    
    // Only attempt if both slugs are long enough (5+ chars)
    if (inputSlug.length >= 5 && schoolSlug.length >= 5) {
      // Check if first 5 characters match
      if (schoolSlug.startsWith(inputSlug.substring(0, 5)) || 
          inputSlug.startsWith(schoolSlug.substring(0, 5))) {
        // Verify with word overlap (ignore short words like "of", "the")
        const inputWords = normalizedName.split(' ').filter(w => w.length > 2);
        const schoolWords = normalizeSchoolName(school.name).split(' ').filter(w => w.length > 2);
        const sharedWords = inputWords.filter(iw => 
          schoolWords.some(sw => sw === iw || sw.includes(iw) || iw.includes(sw))
        );
        
        // Require at least 1 shared significant word
        if (sharedWords.length >= 1) {
          return { id: school.id, name: school.name };
        }
      }
    }
  }
  
  // === PRIORITY 5: Word-based scoring (lowest confidence) ===
  // Useful for heavily abbreviated or partial names
  const searchWords = normalizedName.split(' ').filter(w => w.length > 2);
  if (searchWords.length === 0) return null;
  
  let bestMatch: School | null = null;
  let bestScore = 0;
  
  for (const school of filteredSchools) {
    const schoolWords = normalizeSchoolName(school.name).split(' ');
    const matchingWords = searchWords.filter(sw => 
      schoolWords.some(scw => scw.includes(sw) || sw.includes(scw))
    );
    
    // Score = percentage of search words that matched
    const score = matchingWords.length / searchWords.length;
    
    // Require 50%+ word match for confidence
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
