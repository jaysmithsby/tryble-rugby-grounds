/**
 * Type definitions for historical fixture parsing
 */

export interface FixtureRow {
  id: string;
  year: string;
  homeAway: "home" | "away";
  opponentName: string;
  opponentId: string;
  result: "won" | "lost" | "drew" | "upcoming";
  scoreFor: string;
  scoreAgainst: string;
  tournamentId: string;
  matchDate: string;
}

export interface School {
  id: string;
  name: string;
  province: string | null;
}

export interface Tournament {
  id: string;
  name: string;
}

export interface ParseContext {
  primarySchoolId: string;
  primarySchoolName: string;
  defaultYear: string;
  schools: School[];
  tournaments: Tournament[];
}

export interface MatchResult {
  id: string;
  name: string;
}

export const RESULT_OPTIONS = [
  { value: "won", label: "Won", color: "text-green-600" },
  { value: "lost", label: "Lost", color: "text-red-600" },
  { value: "drew", label: "Drew", color: "text-orange-500" },
  { value: "upcoming", label: "Upcoming", color: "text-blue-500" },
] as const;

export const currentYear = new Date().getFullYear();
export const YEARS = Array.from({ length: 30 }, (_, i) => (currentYear - i).toString());

/**
 * Year threshold for determining default fixture status.
 * Fixtures in this year or later default to "upcoming" status.
 * Update this when moving to a new season.
 */
export const UPCOMING_YEAR_THRESHOLD = 2026;

export const generateId = () => Math.random().toString(36).substring(2, 9);
