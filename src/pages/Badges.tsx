import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { BadgeGrid } from "@/components/profile/BadgeGrid";
import { allBadges } from "@/data/badgesData";
import { BottomNav } from "@/components/BottomNav";

const Badges = () => {
  const navigate = useNavigate();

  const earnedCount = allBadges.filter(b => b.earned).length;
  const totalCount = allBadges.length;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/profile")} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
          <h2 className="text-2xl font-bold text-primary">All Badges</h2>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Progress Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">🏅 Achievement Badges</h1>
          <p className="text-muted-foreground text-lg">
            You've earned <span className="text-primary font-semibold">{earnedCount}</span> out of{" "}
            <span className="font-semibold">{totalCount}</span> badges
          </p>
          <div className="mt-4 max-w-md mx-auto">
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${(earnedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Badge Grid */}
        <BadgeGrid badges={allBadges} />

        {/* Info Section */}
        <div className="mt-8 p-6 bg-muted/10 rounded-lg border border-border/30 text-center">
          <p className="text-sm text-muted-foreground">
            💡 Click on any badge to see detailed requirements and track your progress
          </p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Badges;
