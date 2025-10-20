import { useState } from "react";
import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeDetailModal } from "./BadgeDetailModal";

export interface Badge {
  id: string;
  category: string;
  name: string;
  description: string;
  criteria: string;
  icon: string;
  points: number;
  difficulty: "easy" | "medium" | "hard" | "legendary";
  earned: boolean;
  progress?: {
    current: number;
    target: number;
  };
}

interface BadgeGridProps {
  badges: Badge[];
}

export const BadgeGrid = ({ badges }: BadgeGridProps) => {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "text-accent";
      case "medium":
        return "text-primary";
      case "hard":
        return "text-destructive";
      case "legendary":
        return "text-accent";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <>
      <Card className="bg-gradient-card border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🏅 Your Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {badges.map((badge) => (
              <button
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                className={`relative p-4 rounded-lg border transition-all duration-300 hover:scale-105 group ${
                  badge.earned
                    ? "bg-primary/10 border-primary/30 hover:bg-primary/20 hover:border-primary/50"
                    : "bg-muted/5 border-muted/20 hover:bg-muted/10 hover:border-muted/30"
                }`}
              >
                {/* Lock overlay for unearned badges */}
                {!badge.earned && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg backdrop-blur-sm">
                    <Lock className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}

                {/* Badge content */}
                <div className={`flex flex-col items-center text-center ${!badge.earned ? "opacity-40" : ""}`}>
                  {/* Icon */}
                  <div className={`text-4xl mb-2 transition-transform group-hover:scale-110 ${
                    badge.earned ? "animate-fade-in" : ""
                  }`}>
                    {badge.icon}
                  </div>

                  {/* Name */}
                  <div className="font-semibold text-sm mb-1 line-clamp-2">
                    {badge.name}
                  </div>

                  {/* Points */}
                  <div className={`text-xs font-medium ${getDifficultyColor(badge.difficulty)}`}>
                    {badge.points} pts
                  </div>

                  {/* Progress bar for unearned badges with progress */}
                  {!badge.earned && badge.progress && (
                    <div className="w-full mt-2">
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-500"
                          style={{
                            width: `${(badge.progress.current / badge.progress.target) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {badge.progress.current}/{badge.progress.target}
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Badge Detail Modal */}
      <BadgeDetailModal
        badge={selectedBadge}
        isOpen={selectedBadge !== null}
        onClose={() => setSelectedBadge(null)}
      />
    </>
  );
};
