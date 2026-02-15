import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Trophy } from "lucide-react";
import { PredictionDialog } from "./PredictionDialog";
import { SchoolJerseyImage } from "@/components/ui/SchoolJerseyImage";
import { format } from "date-fns";

interface FixtureCardProps {
  homeTeam: string;
  awayTeam: string;
  homeTeamShort: string;
  awayTeamShort: string;
  homeTeamIcon?: string | null;
  awayTeamIcon?: string | null;
  homeSchoolSlug?: string;
  awaySchoolSlug?: string;
  time: string;
  venue: string;
  matchDate?: string;
  tournamentName?: string;
  matchId?: string;
  appliesTo?: string[];
  isPredicted?: boolean;
  predictedTeam?: "home" | "away";
  predictedMargin?: number;
  onPredictionMade?: (team: "home" | "away", margin: number) => void;
  priority?: boolean;
}

export const FixtureCard = ({ 
  homeTeam, 
  awayTeam, 
  homeTeamShort, 
  awayTeamShort,
  homeTeamIcon,
  awayTeamIcon,
  homeSchoolSlug,
  awaySchoolSlug,
  time,
  venue,
  matchDate,
  tournamentName,
  matchId,
  appliesTo = [],
  isPredicted = false,
  predictedTeam,
  predictedMargin,
  onPredictionMade,
  priority = false
}: FixtureCardProps) => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handlePredictionSubmit = (team: "home" | "away", margin: number) => {
    onPredictionMade?.(team, margin);
  };

  const predictedTeamName = predictedTeam === "home" ? homeTeam : awayTeam;

  return (
    <>
      <PredictionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        homeTeamShort={homeTeamShort}
        awayTeamShort={awayTeamShort}
        homeTeamIcon={homeTeamIcon}
        awayTeamIcon={awayTeamIcon}
        matchId={matchId}
        appliesTo={appliesTo}
        onPredictionSubmit={handlePredictionSubmit}
      />
    <Card className="bg-gradient-card border-border/40 shadow-card hover:shadow-glow transition-all duration-300">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {matchDate && (
              <span className="text-xs font-semibold text-foreground">
                {format(new Date(matchDate), "EEE d MMM")}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{venue}</span>
          </div>
          {isPredicted && (
            <Lock className="w-4 h-4 text-primary" aria-label="Prediction Locked" />
          )}
        </div>

        {tournamentName && (
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3 h-3 text-primary" />
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
              {tournamentName}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center gap-2 flex-1">
            <SchoolJerseyImage
              src={homeTeamIcon}
              alt={`${homeTeam} crest`}
              fallbackText={homeTeamShort}
              size="md"
              variant="primary"
              priority={priority}
              onClick={homeSchoolSlug ? (e) => {
                e.stopPropagation();
                navigate(`/school/${homeSchoolSlug}`);
              } : undefined}
              containerClassName="border-border"
            />
            <span className="text-xs font-medium text-center line-clamp-2">{homeTeam}</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-muted-foreground">VS</span>
          </div>

          <div className="flex flex-col items-center gap-2 flex-1">
            <SchoolJerseyImage
              src={awayTeamIcon}
              alt={`${awayTeam} crest`}
              fallbackText={awayTeamShort}
              size="md"
              variant="accent"
              priority={priority}
              onClick={awaySchoolSlug ? (e) => {
                e.stopPropagation();
                navigate(`/school/${awaySchoolSlug}`);
              } : undefined}
              containerClassName="border-border"
            />
            <span className="text-xs font-medium text-center line-clamp-2">{awayTeam}</span>
          </div>
        </div>

        {isPredicted && (
          <div className="pt-2 border-t border-border/40">
            <p className="text-xs text-primary font-medium text-center">
              You picked: {predictedTeamName} to win by {predictedMargin}
            </p>
          </div>
        )}

        <Button 
          onClick={() => setDialogOpen(true)}
          disabled={isPredicted}
          className={`w-full font-bold shadow-lg ${
            isPredicted 
              ? "bg-muted text-muted-foreground cursor-not-allowed" 
              : "bg-accent hover:bg-accent/90 text-accent-foreground"
          }`}
        >
          {isPredicted ? "Prediction Made" : "Predict Now"}
        </Button>
      </div>
    </Card>
    </>
  );
};
