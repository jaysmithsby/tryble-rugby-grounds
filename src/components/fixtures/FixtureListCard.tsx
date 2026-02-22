import { FixtureCard } from "@/components/fixtures/FixtureCard";

interface FixtureSchool {
  id: string;
  name: string;
  slug: string;
  jersey_url: string | null;
}

interface FixtureListCardProps {
  fixture: {
    id: string;
    match_date: string;
    venue_type: string | null;
    venue_id: string | null;
    status: string;
    school_a: FixtureSchool;
    school_b: FixtureSchool;
    tournament?: { id: string; name: string } | null;
  };
  isPredicted?: boolean;
  userPrediction?: { schoolId: string; margin: number } | null;
  onPredictionSubmit?: (fixtureId: string, schoolId: string, margin: number) => void;
}

const getShortName = (name: string) => {
  const words = name.split(" ");
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  return words.map(w => w[0]).join("").substring(0, 3).toUpperCase();
};

const getVenue = (fixture: FixtureListCardProps["fixture"]) => {
  if (fixture.venue_type === "school" && fixture.venue_id) {
    return fixture.venue_id === fixture.school_a.id
      ? fixture.school_a.name
      : fixture.school_b.name;
  }
  if (fixture.venue_type === "tournament" && fixture.tournament) {
    return fixture.tournament.name;
  }
  return "TBD";
};

export const FixtureListCard = ({
  fixture,
  isPredicted = false,
  userPrediction,
  onPredictionSubmit,
}: FixtureListCardProps) => {
  const isUpcoming = fixture.status === "upcoming";

  return (
    <FixtureCard
      homeTeam={fixture.school_a.name}
      awayTeam={fixture.school_b.name}
      homeTeamShort={getShortName(fixture.school_a.name)}
      awayTeamShort={getShortName(fixture.school_b.name)}
      homeTeamIcon={fixture.school_a.jersey_url}
      awayTeamIcon={fixture.school_b.jersey_url}
      homeSchoolId={fixture.school_a.id}
      awaySchoolId={fixture.school_b.id}
      homeSchoolSlug={fixture.school_a.slug}
      awaySchoolSlug={fixture.school_b.slug}
      time=""
      venue={getVenue(fixture)}
      matchDate={fixture.match_date}
      tournamentName={fixture.tournament?.name}
      matchId={fixture.id}
      isPredicted={isPredicted}
      predictedSchoolId={userPrediction?.schoolId}
      predictedMargin={userPrediction?.margin}
      onPredictionMade={
        isUpcoming && onPredictionSubmit
          ? (schoolId, margin) => onPredictionSubmit(fixture.id, schoolId, margin)
          : undefined
      }
    />
  );
};
