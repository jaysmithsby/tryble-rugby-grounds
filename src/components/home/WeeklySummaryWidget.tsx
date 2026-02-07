import { TrendingUp, Trophy, Award, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useUserStats } from "@/hooks/useUserStats";
import { Skeleton } from "@/components/ui/skeleton";

interface WeeklySummaryWidgetProps {
  userId?: string;
}

export const WeeklySummaryWidget = ({ userId }: WeeklySummaryWidgetProps) => {
  const { weeklyPoints, schoolRank, badgeCount, isLoading, hasData } = useUserStats(userId);

  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-border/40 shadow-card">
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Your Week</h3>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 p-3 bg-secondary rounded-lg border border-border">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="w-8 h-6 rounded" />
                <Skeleton className="w-12 h-3 rounded" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // Show empty state when user has no data yet
  if (!hasData) {
    return (
      <Card className="bg-gradient-card border-border/40 shadow-card">
        <div className="p-6 text-center">
          <Target className="w-8 h-8 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground font-medium">Your weekly stats will appear here</p>
          <p className="text-sm text-muted-foreground mt-2">
            Make predictions on upcoming fixtures to get started!
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border/40 shadow-card">
      <div className="p-4">
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Your Week</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-1.5 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-lg font-bold text-primary">
              {schoolRank !== null ? `#${schoolRank}` : "—"}
            </span>
            <span className="text-xs text-muted-foreground">School Rank</span>
          </div>
          
          <div className="flex flex-col items-center gap-1.5 p-3 bg-accent/10 rounded-lg border border-accent/20">
            <Trophy className="w-4 h-4 text-accent" />
            <span className="text-lg font-bold text-accent">
              {weeklyPoints !== null ? weeklyPoints : "0"}
            </span>
            <span className="text-xs text-muted-foreground">Points</span>
          </div>
          
          <div className="flex flex-col items-center gap-1.5 p-3 bg-secondary rounded-lg border border-border">
            <Award className="w-4 h-4 text-foreground" />
            <span className="text-lg font-bold">{badgeCount}</span>
            <span className="text-xs text-muted-foreground">Badges</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
