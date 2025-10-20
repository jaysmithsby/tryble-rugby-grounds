import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, CheckCircle2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RecentFixtureCardProps {
  homeTeam: string;
  awayTeam: string;
  homeTeamShort: string;
  awayTeamShort: string;
  completedTime: string;
  venue: string;
  matchDate: Date;
}

export const RecentFixtureCard = ({
  homeTeam,
  awayTeam,
  homeTeamShort,
  awayTeamShort,
  completedTime,
  venue,
  matchDate,
}: RecentFixtureCardProps) => {
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  // Check if within 48-hour submission window
  const now = new Date();
  const hoursSinceMatch = (now.getTime() - matchDate.getTime()) / (1000 * 60 * 60);
  const canSubmit = hoursSinceMatch <= 48 && !submitted;

  const handleSubmit = () => {
    if (!homeScore || !awayScore) {
      toast({
        title: "Invalid Score",
        description: "Please enter scores for both teams",
        variant: "destructive",
      });
      return;
    }

    // Simulate submission
    setSubmitted(true);
    toast({
      title: "Score Submitted!",
      description: "Your score submission is pending review.",
    });
  };

  return (
    <Card className="bg-gradient-card border-border/40 shadow-card">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{completedTime}</span>
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

          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-bold text-muted-foreground">Final</span>
            {canSubmit && !submitted && (
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  min="0"
                  max="999"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  className="w-12 h-10 text-center text-lg font-bold"
                  placeholder="0"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="number"
                  min="0"
                  max="999"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  className="w-12 h-10 text-center text-lg font-bold"
                  placeholder="0"
                />
              </div>
            )}
            {submitted && (
              <div className="flex gap-2 items-center text-lg font-bold">
                <span>{homeScore}</span>
                <span>-</span>
                <span>{awayScore}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="w-12 h-12 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center border border-border">
              <span className="text-lg font-bold text-accent">{awayTeamShort}</span>
            </div>
            <span className="text-xs font-medium text-center">{awayTeam}</span>
          </div>
        </div>

        {canSubmit && !submitted && (
          <Button
            onClick={handleSubmit}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-lg"
          >
            Submit Score
          </Button>
        )}

        {submitted && (
          <div className="flex items-center justify-center gap-2 py-2 px-4 bg-primary/10 rounded-md">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Pending Review</span>
          </div>
        )}

        {!canSubmit && !submitted && (
          <div className="flex items-center justify-center gap-2 py-2 px-4 bg-muted rounded-md">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Submission window closed</span>
          </div>
        )}
      </div>
    </Card>
  );
};
