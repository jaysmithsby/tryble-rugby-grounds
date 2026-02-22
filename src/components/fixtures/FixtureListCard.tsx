import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { MapPin, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SchoolJerseyImage } from "@/components/ui/SchoolJerseyImage";
import { PredictionDialog } from "@/components/home/PredictionDialog";
import { cn } from "@/lib/utils";

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

export const FixtureListCard = ({
  fixture,
  isPredicted = false,
  userPrediction,
  onPredictionSubmit,
}: FixtureListCardProps) => {
  const navigate = useNavigate();
  const [predictionOpen, setPredictionOpen] = useState(false);

  const isUpcoming = fixture.status === "upcoming";

  const handleSchoolClick = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/school/${slug}`);
  };

  const handlePredictionSubmit = (team: "home" | "away", margin: number) => {
    onPredictionSubmit?.(fixture.id, team, margin);
  };

  const getShortName = (name: string) => {
    const words = name.split(" ");
    if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
    return words.map(w => w[0]).join("").substring(0, 3).toUpperCase();
  };

  return (
    <>
      <Card className="bg-card border-border/40 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          {/* Tournament Badge */}
          {fixture.tournament && (
            <Badge 
              variant="secondary" 
              className="mb-3 text-xs bg-muted/50"
            >
              {fixture.tournament.name}
            </Badge>
          )}

          {/* Teams Row */}
          <div className="flex items-center justify-between gap-2 mb-3">
            {/* Home Team */}
            <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
              <SchoolJerseyImage
                src={fixture.home_school.jersey_url}
                alt={fixture.home_school.name}
                fallbackText={getShortName(fixture.home_school.name)}
                size="md"
                variant="primary"
                onClick={(e) => handleSchoolClick(fixture.home_school.slug, e)}
              />
              <span 
                className={cn(
                  "text-xs font-semibold text-center leading-tight line-clamp-2 cursor-pointer hover:text-primary transition-colors",
                  userPrediction?.team === "home" && "text-primary"
                )}
                onClick={(e) => handleSchoolClick(fixture.home_school.slug, e)}
              >
                {fixture.home_school.name}
              </span>
            </div>

            {/* VS / Score */}
            <div className="flex flex-col items-center px-2">
            <span className="text-lg font-bold text-muted-foreground">vs</span>
            </div>

            {/* Away Team */}
            <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
              <SchoolJerseyImage
                src={fixture.away_school.jersey_url}
                alt={fixture.away_school.name}
                fallbackText={getShortName(fixture.away_school.name)}
                size="md"
                variant="accent"
                onClick={(e) => handleSchoolClick(fixture.away_school.slug, e)}
              />
              <span 
                className={cn(
                  "text-xs font-semibold text-center leading-tight line-clamp-2 cursor-pointer hover:text-primary transition-colors",
                  userPrediction?.team === "away" && "text-accent"
                )}
                onClick={(e) => handleSchoolClick(fixture.away_school.slug, e)}
              >
                {fixture.away_school.name}
              </span>
            </div>
          </div>

          {/* Venue */}
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-3">
            <MapPin className="h-3 w-3" />
            <span className="truncate">
              {fixture.venue_type === "school" && fixture.venue_id
                ? (fixture.venue_id === fixture.home_school.id ? fixture.home_school.name : fixture.away_school.name)
                : fixture.venue_type === "tournament" && fixture.tournament
                ? fixture.tournament.name
                : fixture.venue_legacy || "TBD"}
            </span>
          </div>

          {/* Prediction Button */}
          {isUpcoming && (
            <Button
              onClick={() => setPredictionOpen(true)}
              variant={isPredicted ? "secondary" : "default"}
              size="sm"
              className="w-full"
            >
              {isPredicted ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Predicted ({userPrediction?.team === "home" ? fixture.home_school.name : fixture.away_school.name} by {userPrediction?.margin})
                </>
              ) : (
                "Predict Now"
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      <PredictionDialog
        open={predictionOpen}
        onOpenChange={setPredictionOpen}
        homeTeam={fixture.home_school.name}
        awayTeam={fixture.away_school.name}
        homeTeamShort={getShortName(fixture.home_school.name)}
        awayTeamShort={getShortName(fixture.away_school.name)}
        homeTeamIcon={fixture.home_school.jersey_url}
        awayTeamIcon={fixture.away_school.jersey_url}
        matchId={fixture.id}
        onPredictionSubmit={handlePredictionSubmit}
      />
    </>
  );
};
