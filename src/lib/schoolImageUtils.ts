/**
 * Utility function to get the display image for a school
 * Priority: emblem_url > jersey_url > icon_url (legacy)
 */
export function getSchoolDisplayImage(school: {
  emblem_url?: string | null;
  jersey_url?: string | null;
  icon_url?: string | null;
}): string | null {
  return school.emblem_url || school.jersey_url || school.icon_url || null;
}

/**
 * Get school image with fallback to initials
 * Returns either the image URL or null if no image available
 */
export function getSchoolImageOrNull(school: {
  emblem_url?: string | null;
  jersey_url?: string | null;
  icon_url?: string | null;
} | null | undefined): string | null {
  if (!school) return null;
  return getSchoolDisplayImage(school);
}