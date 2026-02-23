import { FixtureRow } from "./FixtureRow";
import type { Fixture, FixtureSchool } from "./FixtureRow";

interface FixtureCardProps {
  homeTeam: string;
  awayTeam: string;
  homeTeamShort: string;
  awayTeamShort: string;
  homeTeamIcon?: string | null;
  awayTeamIcon?: string | null;
  homeSchoolId?: string;
  awaySchoolId?: string;
  homeSchoolSlug?: string;
  awaySchoolSlug?: string;
  time: string;
  venue: string;
  matchDate?: string;
  tournamentName?: string;
  matchId?: string;
  appliesTo?: string[];
  isPredicted?: boolean;
  predictedSchoolId?: string;
  predictedMargin?: number;
  onPredictionMade?: (schoolId: string, margin: number) => void;
  priority?: boolean;
  hasHistory?: boolean;
}

export const FixtureCard = ({
  homeTeam,
  awayTeam,
  homeTeamIcon,
  awayTeamIcon,
  homeSchoolId,
  awaySchoolId,
  homeSchoolSlug,
  awaySchoolSlug,
  venue,
  matchDate,
  tournamentName,
  matchId,
  appliesTo = [],
  isPredicted = false,
  predictedSchoolId,
  predictedMargin,
  onPredictionMade,
  priority = false,
  hasHistory,
}: FixtureCardProps) => {
  const fixture: Fixture = {
    id: matchId || "",
    match_date: matchDate || new Date().toISOString(),
    venue_type: null,
    venue_id: null,
    school_a_id: homeSchoolId || "",
    school_b_id: awaySchoolId || "",
    school_a: {
      id: homeSchoolId || "",
      name: homeTeam,
      slug: homeSchoolSlug || "",
      jersey_url: homeTeamIcon || null,
      province: null,
    } as FixtureSchool,
    school_b: {
      id: awaySchoolId || "",
      name: awayTeam,
      slug: awaySchoolSlug || "",
      jersey_url: awayTeamIcon || null,
      province: null,
    } as FixtureSchool,
    tournament: tournamentName ? { id: "", name: tournamentName } : null,
  };

  return (
    <FixtureRow
      fixture={fixture}
      variant="card"
      isPredicted={isPredicted}
      predictedSchoolId={predictedSchoolId}
      predictedMargin={predictedMargin}
      onPredictionMade={onPredictionMade}
      matchId={matchId}
      appliesTo={appliesTo}
      hasHistory={hasHistory}
      priority={priority}
      venueOverride={venue}
    />
  );
};
