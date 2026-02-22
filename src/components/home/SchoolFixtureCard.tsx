import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { PredictionDialog } from "./PredictionDialog";
import { SchoolJerseyImage } from "@/components/ui/SchoolJerseyImage";
import { format } from "date-fns";

interface SchoolFixtureCardProps {
  userSchool: string;
  userSchoolShort: string;
  userSchoolIcon?: string | null;
  opponentSchool: string;
  opponentSchoolShort: string;
  opponentSchoolIcon?: string | null;
  userSchoolSlug?: string;
  opponentSchoolSlug?: string;
  time: string;
  venue: string;
  matchDate?: string;
  matchId?: string;
  isPredicted?: boolean;
  predictedTeam?: "home" | "away" | "school_a" | "school_b"; // added school_a/school_b
  predictedMargin?: number;
  onPredictionMade?: (team: "home" | "away", margin: number) => void;
  priority?: boolean;
  homeSchoolId?: string; // added
  awaySchoolId?: string; // added
}

export const SchoolFixtureCard = ({
  userSchool,
  userSchoolShort,
  userSchoolIcon,
  opponentSchool,
  opponentSchoolShort,
  opponentSchoolIcon,
  userSchoolSlug,
  opponentSchoolSlug,
  time,
  venue,
  matchDate,
  matchId,
  isPredicted = false,
  predictedTeam,
  predictedMargin,
  onPredictionMade,
  priority = false,
  homeSchoolId,
  awaySchoolId
}: SchoolFixtureCardProps) => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handlePredictionSubmit = (team: "home" | "away", margin: number) => {
    onPredictionMade?.(team, margin);
  };

  const predictedTeamName = predictedTeam === "home" || predictedTeam === "school_a" ? userSchool : opponentSchool;

  return (
    <>
      <PredictionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        homeTeam={userSchool}
        awayTeam={opponentSchool}
        homeTeamShort={userSchoolShort}
        awayTeamShort={opponentSchoolShort}
        homeTeamIcon={userSchoolIcon}
        awayTeamIcon={opponentSchoolIcon}
        matchId={matchId}
        onPredictionSubmit={handlePredictionSubmit}
      />
      <Card className="bg-gradient-to-br from-primary/15 via-accent/5 to-background border-2 border-primary/30 shadow-glow">
        <div className="p-5 space-y-4">
          {/* Your School Badge */}
          <div className="flex items-center justify-center gap-2 pb-2 border-b border-border/40">
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-bold text-primary">Your Next Match</span>
            <Star className="w-4 h-4 text-primary fill-primary" />
          </div>

        <div className="flex items-center justify-between">
          {matchDate && (
            <span className="text-sm font-semibold text-foreground">
              {format(new Date(matchDate), "EEE d MMM")}
            </span>
          )}
          <span className="text-sm font-medium text-muted-foreground">{venue}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center gap-2 flex-1">
            <SchoolJerseyImage
              src={userSchoolIcon}
              alt={`${userSchool} crest`}
              fallbackText={userSchoolShort}
              size="lg"
              variant="primary"
              priority={priority}
              onClick={userSchoolSlug ? (e) => {
                e.stopPropagation();
                navigate(`/school/${userSchoolSlug}`);
              } : undefined}
            />
            <span className="text-sm font-bold text-center line-clamp-2">{userSchool}</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-muted-foreground">VS</span>
          </div>

          <div className="flex flex-col items-center gap-2 flex-1">
            <SchoolJerseyImage
              src={opponentSchoolIcon}
              alt={`${opponentSchool} crest`}
              fallbackText={opponentSchoolShort}
              size="lg"
              variant="accent"
              priority={priority}
              onClick={opponentSchoolSlug ? (e) => {
                e.stopPropagation();
                navigate(`/school/${opponentSchoolSlug}`);
              } : undefined}
            />
            <span className="text-sm font-bold text-center line-clamp-2">{opponentSchool}</span>
          </div>
        </div>

        {isPredicted && (
          <div className="pt-2 border-t border-border/40">
            <p className="text-xs text-primary font-medium text-center">
              Locked in. {predictedTeamName} by {predictedMargin}. Respect.
            </p>
          </div>
        )}

        <Button 
          onClick={() => setDialogOpen(true)}
          disabled={isPredicted}
          className={`w-full h-12 font-bold text-base shadow-lg ${
            isPredicted 
              ? "bg-muted text-muted-foreground cursor-not-allowed" 
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
          }`}
        >
          {isPredicted ? "Prediction Made" : "Back Your Boys"}
        </Button>
        </div>
      </Card>
    </>
  );
};
