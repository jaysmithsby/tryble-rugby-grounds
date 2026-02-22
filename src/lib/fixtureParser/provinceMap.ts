/**
 * Province abbreviation mapping for South African provinces.
 * Maps common abbreviations found in rugby results headers to full province names.
 */

const PROVINCE_ABBREVIATIONS: Record<string, string> = {
  'kzn': 'KwaZulu-Natal',
  'kwazulu-natal': 'KwaZulu-Natal',
  'kwazulu natal': 'KwaZulu-Natal',
  'wc': 'Western Cape',
  'western cape': 'Western Cape',
  'gp': 'Gauteng',
  'gauteng': 'Gauteng',
  'ec': 'Eastern Cape',
  'eastern cape': 'Eastern Cape',
  'fs': 'Free State',
  'free state': 'Free State',
  'lp': 'Limpopo',
  'limpopo': 'Limpopo',
  'mp': 'Mpumalanga',
  'mpumalanga': 'Mpumalanga',
  'nw': 'North West',
  'north west': 'North West',
  'nc': 'Northern Cape',
  'northern cape': 'Northern Cape',
};

/**
 * Resolve a province abbreviation or name to the full province name.
 * Returns the input as-is if no mapping is found.
 */
export function resolveProvince(input: string): string {
  const normalized = input.trim().toLowerCase();
  return PROVINCE_ABBREVIATIONS[normalized] || input.trim();
}

/**
 * Extract province and year from a header line like "KZN Schoolboy Rugby Results 2025"
 */
export function parseHeaderLine(line: string): { province: string; year: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Extract year (4-digit number)
  const yearMatch = trimmed.match(/\b(20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : '';

  // Try to extract province abbreviation from the beginning of the line
  // Common patterns: "KZN Schoolboy Rugby Results 2025", "WC Schools Rugby 2025"
  const words = trimmed.split(/\s+/);
  
  // Try first word as abbreviation
  const firstWord = words[0];
  const resolved = resolveProvince(firstWord);
  if (resolved !== firstWord) {
    return { province: resolved, year };
  }

  // Try first two words
  if (words.length >= 2) {
    const twoWords = `${words[0]} ${words[1]}`;
    const resolved2 = resolveProvince(twoWords);
    if (resolved2 !== twoWords) {
      return { province: resolved2, year };
    }
  }

  // If we found a year but no province, still return with empty province
  if (year) {
    return { province: '', year };
  }

  return null;
}
