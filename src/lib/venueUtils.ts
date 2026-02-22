/**
 * Shared venue resolution utility.
 * Resolves a display-friendly venue name from venue_type + venue_id / tournament.
 */

interface VenueFixture {
  venue_type?: string | null;
  venue_id?: string | null;
  tournament?: { id?: string; name: string } | null;
  school_a?: { id: string; name: string } | null;
  school_b?: { id: string; name: string } | null;
}

/**
 * Resolve the venue display name for a fixture.
 * - If venue_type is 'tournament', returns tournament name (from joined data).
 * - If venue_type is 'school', matches venue_id against school_a or school_b.
 * - Falls back to 'TBD'.
 */
export function resolveVenueName(fixture: VenueFixture): string {
  if (fixture.venue_type === "tournament" && fixture.tournament?.name) {
    return fixture.tournament.name;
  }

  if (fixture.venue_type === "school" && fixture.venue_id) {
    if (fixture.school_a && fixture.venue_id === fixture.school_a.id) {
      return fixture.school_a.name;
    }
    if (fixture.school_b && fixture.venue_id === fixture.school_b.id) {
      return fixture.school_b.name;
    }
  }

  return "TBD";
}

/**
 * Resolve venue name using lookup maps (for admin tables that don't join).
 */
export function resolveVenueFromMaps(
  fixture: { venue_type?: string | null; venue_id?: string | null; tournament_id?: string | null },
  schools: Map<string, string>,
  tournaments: Map<string, string>
): string {
  if (fixture.venue_type === "tournament") {
    const tournamentId = fixture.tournament_id || fixture.venue_id;
    if (tournamentId) {
      return tournaments.get(tournamentId) || "Tournament";
    }
  }

  if (fixture.venue_type === "school" && fixture.venue_id) {
    return schools.get(fixture.venue_id) || "TBD";
  }

  return "TBD";
}
