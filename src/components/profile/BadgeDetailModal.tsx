import { Badge } from "./BadgeGrid";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge as BadgeUI } from "@/components/ui/badge";
import { CheckCircle2, Lock, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface BadgeDetailModalProps {
  badge: Badge | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BadgeDetailModal = ({ badge, isOpen, onClose }: BadgeDetailModalProps) => {
  if (!badge) return null;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-accent/20 text-accent border-accent/30";
      case "medium":
        return "bg-primary/20 text-primary border-primary/30";
      case "hard":
        return "bg-destructive/20 text-destructive border-destructive/30";
      case "legendary":
        return "bg-accent/20 text-accent border-accent/30";
      default:
        return "bg-muted/20 text-muted-foreground border-muted/30";
    }
  };

  const progressPercentage = badge.progress
    ? (badge.progress.current / badge.progress.target) * 100
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center text-center mb-4">
            {/* Large icon */}
            <div className={`text-7xl mb-4 ${badge.earned ? "animate-scale-in" : "opacity-40"}`}>
              {badge.icon}
            </div>

            {/* Status indicator */}
            {badge.earned ? (
              <div className="flex items-center gap-2 text-primary mb-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Earned!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Lock className="w-5 h-5" />
                <span className="font-semibold">Locked</span>
              </div>
            )}

            <DialogTitle className="text-2xl mb-2">{badge.name}</DialogTitle>
            <DialogDescription className="text-base">
              {badge.description}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category and Difficulty */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <BadgeUI variant="outline" className="border-border/40">
              {badge.category}
            </BadgeUI>
            <BadgeUI className={getDifficultyColor(badge.difficulty)}>
              {badge.difficulty.charAt(0).toUpperCase() + badge.difficulty.slice(1)}
            </BadgeUI>
            <BadgeUI variant="secondary">
              {badge.points} points
            </BadgeUI>
          </div>

          {/* Criteria */}
          <div className="bg-muted/20 rounded-lg p-4 border border-border/30">
            <div className="flex items-start gap-2 mb-2">
              <Target className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">How to Earn</h4>
                <p className="text-sm text-muted-foreground">{badge.criteria}</p>
              </div>
            </div>
          </div>

          {/* Progress (if not earned and has progress data) */}
          {!badge.earned && badge.progress && (
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Your Progress</span>
                <span className="text-sm text-muted-foreground">
                  {badge.progress.current} / {badge.progress.target}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {badge.progress.target - badge.progress.current} more to go!
              </p>
            </div>
          )}

          {/* Earned message */}
          {badge.earned && (
            <div className="bg-primary/10 rounded-lg p-4 border border-primary/30 text-center">
              <p className="text-sm font-medium text-primary">
                🎉 Congratulations! You've earned this badge.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
