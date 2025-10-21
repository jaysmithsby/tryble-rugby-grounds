import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Lock } from "lucide-react";
import { PredictionDialog } from "./PredictionDialog";

interface FixtureCardProps {
  homeTeam: string;
  awayTeam: string;
  homeTeamShort: string;
  awayTeamShort: string;
  homeTeamIcon?: string | null;
  awayTeamIcon?: string | null;
  time: string;
  venue: string;
  matchId?: string;
  appliesTo?: string[]; // Pool names this fixture appears in
  isPredicted?: boolean;
  predictedTeam?: "home" | "away";
  predictedMargin?: number;
  onPredictionMade?: (team: "home" | "away", margin: number) => void;
}

export const FixtureCard = ({ 
  homeTeam, 
  awayTeam, 
  homeTeamShort, 
  awayTeamShort,
  homeTeamIcon,
  awayTeamIcon,
  time, 
  venue,
  matchId,
  appliesTo = [],
  isPredicted = false,
  predictedTeam,
  predictedMargin,
  onPredictionMade
}: FixtureCardProps) => {
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
        matchId={matchId}
        appliesTo={appliesTo}
        onPredictionSubmit={handlePredictionSubmit}
      />
    <Card className="bg-gradient-card border-border/40 shadow-card hover:shadow-glow transition-all duration-300">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{time}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{venue}</span>
            {isPredicted && (
              <Lock className="w-4 h-4 text-primary" aria-label="Prediction Locked" />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="w-12 h-12 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center border border-border overflow-hidden">
              {homeTeamIcon ? (
                <img 
                  src={homeTeamIcon} 
                  alt={`${homeTeam} jersey`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-primary">{homeTeamShort}</span>
              )}
            </div>
            <span className="text-xs font-medium text-center">{homeTeam}</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-muted-foreground">VS</span>
          </div>

          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="w-12 h-12 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center border border-border overflow-hidden">
              {awayTeamIcon ? (
                <img 
                  src={awayTeamIcon} 
                  alt={`${awayTeam} jersey`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-accent">{awayTeamShort}</span>
              )}
            </div>
            <span className="text-xs font-medium text-center">{awayTeam}</span>
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
