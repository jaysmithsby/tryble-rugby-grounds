import { TrendingUp, Trophy, Award } from "lucide-react";
import { Card } from "@/components/ui/card";

export const WeeklySummaryWidget = () => {
  return (
    <Card className="bg-gradient-card border-border/40 shadow-card">
      <div className="p-4">
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Your Week</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-1.5 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-lg font-bold text-primary">#47</span>
            <span className="text-xs text-muted-foreground">School Rank</span>
          </div>
          
          <div className="flex flex-col items-center gap-1.5 p-3 bg-accent/10 rounded-lg border border-accent/20">
            <Trophy className="w-4 h-4 text-accent" />
            <span className="text-lg font-bold text-accent">328</span>
            <span className="text-xs text-muted-foreground">Points</span>
          </div>
          
          <div className="flex flex-col items-center gap-1.5 p-3 bg-secondary rounded-lg border border-border">
            <Award className="w-4 h-4 text-foreground" />
            <span className="text-lg font-bold">2</span>
            <span className="text-xs text-muted-foreground">Badges</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
