import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { PredictionDialog } from "./PredictionDialog";

interface FixtureCardProps {
  homeTeam: string;
  awayTeam: string;
  homeTeamShort: string;
  awayTeamShort: string;
  time: string;
  venue: string;
  matchId?: string;
  appliesTo?: string[]; // Pool names this fixture appears in
}

export const FixtureCard = ({ 
  homeTeam, 
  awayTeam, 
  homeTeamShort, 
  awayTeamShort, 
  time, 
  venue,
  matchId,
  appliesTo = []
}: FixtureCardProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);

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
      />
    <Card className="bg-gradient-card border-border/40 shadow-card hover:shadow-glow transition-all duration-300">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{time}</span>
          </div>
          <span className="text-xs text-muted-foreground">{venue}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="w-12 h-12 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center border border-border">
              <span className="text-lg font-bold text-primary">{homeTeamShort}</span>
            </div>
            <span className="text-xs font-medium text-center">{homeTeam}</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-muted-foreground">VS</span>
          </div>

          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="w-12 h-12 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center border border-border">
              <span className="text-lg font-bold text-accent">{awayTeamShort}</span>
            </div>
            <span className="text-xs font-medium text-center">{awayTeam}</span>
          </div>
        </div>

        <Button 
          onClick={() => setDialogOpen(true)}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-lg"
        >
          Predict Now
        </Button>
      </div>
    </Card>
    </>
  );
};
