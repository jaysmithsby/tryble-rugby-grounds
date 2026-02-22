import { FixtureCard } from "@/components/home/FixtureCard";

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
    venue_legacy: string;
    venue_type: string | null;
    venue_id: string | null;
    status: string;
    home_school: FixtureSchool;
    away_school: FixtureSchool;
    tournament?: { id: string; name: string } | null;
  };
  isPredicted?: boolean;
  userPrediction?: { team: "home" | "away"; margin: number } | null;
  onPredictionSubmit?: (fixtureId: string, team: "home" | "away", margin: number) => void;
}

const getShortName = (name: string) => {
  const words = name.split(" ");
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  return words.map(w => w[0]).join("").substring(0, 3).toUpperCase();
};

const getVenue = (fixture: FixtureListCardProps["fixture"]) => {
  if (fixture.venue_type === "school" && fixture.venue_id) {
    return fixture.venue_id === fixture.home_school.id
      ? fixture.home_school.name
      : fixture.away_school.name;
  }
  if (fixture.venue_type === "tournament" && fixture.tournament) {
    return fixture.tournament.name;
  }
  return fixture.venue_legacy || "TBD";
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
      homeTeam={fixture.home_school.name}
      awayTeam={fixture.away_school.name}
      homeTeamShort={getShortName(fixture.home_school.name)}
      awayTeamShort={getShortName(fixture.away_school.name)}
      homeTeamIcon={fixture.home_school.jersey_url}
      awayTeamIcon={fixture.away_school.jersey_url}
      homeSchoolSlug={fixture.home_school.slug}
      awaySchoolSlug={fixture.away_school.slug}
      time=""
      venue={getVenue(fixture)}
      matchDate={fixture.match_date}
      tournamentName={fixture.tournament?.name}
      matchId={fixture.id}
      isPredicted={isPredicted}
      predictedTeam={userPrediction?.team}
      predictedMargin={userPrediction?.margin}
      onPredictionMade={
        isUpcoming && onPredictionSubmit
          ? (team, margin) => onPredictionSubmit(fixture.id, team, margin)
          : undefined
      }
    />
  );
};
