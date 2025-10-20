import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { BadgeGrid } from "@/components/profile/BadgeGrid";
import { allBadges } from "@/data/badgesData";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Badges = () => {
  const navigate = useNavigate();

  const earnedCount = allBadges.filter(b => b.earned).length;
  const totalCount = allBadges.length;

  // Group badges by category
  const badgesByCategory = allBadges.reduce((acc, badge) => {
    if (!acc[badge.category]) {
      acc[badge.category] = [];
    }
    acc[badge.category].push(badge);
    return acc;
  }, {} as Record<string, typeof allBadges>);

  // Define category order and emoji icons
  const categoryConfig: Record<string, { icon: string; order: number }> = {
    "Accuracy": { icon: "🎯", order: 1 },
    "Streak": { icon: "🔥", order: 2 },
    "Leaderboard": { icon: "🏆", order: 3 },
    "Season": { icon: "📅", order: 4 },
    "Rivalry": { icon: "⚔️", order: 5 },
    "Social": { icon: "👥", order: 6 },
    "Special": { icon: "⭐", order: 7 },
  };

  // Sort categories by defined order
  const sortedCategories = Object.keys(badgesByCategory).sort(
    (a, b) => (categoryConfig[a]?.order || 999) - (categoryConfig[b]?.order || 999)
  );

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

        {/* Badges by Category */}
        <div className="space-y-8">
          {sortedCategories.map((category) => {
            const categoryBadges = badgesByCategory[category];
            const earnedInCategory = categoryBadges.filter(b => b.earned).length;
            
            return (
              <div key={category} className="animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <span>{categoryConfig[category]?.icon || "📌"}</span>
                    {category}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {earnedInCategory} / {categoryBadges.length}
                  </span>
                </div>
                <BadgeGrid badges={categoryBadges} />
              </div>
            );
          })}
        </div>

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
