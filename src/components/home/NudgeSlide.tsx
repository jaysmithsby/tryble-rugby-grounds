import { Target, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface NudgeSlideProps {
  unpickedCount: number;
  onClick?: () => void;
}

export const NudgeSlide = ({ unpickedCount, onClick }: NudgeSlideProps) => {
  return (
    <Card className="relative overflow-hidden border-accent/30 bg-gradient-to-br from-accent/20 via-card to-card">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/5 to-transparent animate-pulse" />
      
      <div className="relative p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center">
            <Target className="w-7 h-7 text-accent" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Make Your Predictions!</h3>
            <p className="text-sm text-muted-foreground">
              {unpickedCount} {unpickedCount === 1 ? "match" : "matches"} awaiting your pick
            </p>
          </div>
        </div>
        
        <Button 
          onClick={onClick}
          variant="default" 
          size="sm"
          className="gap-1 shrink-0"
        >
          Pick Now
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};
