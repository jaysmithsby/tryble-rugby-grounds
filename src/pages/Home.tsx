import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { BottomNav } from "@/components/BottomNav";
import { ScoreSubmission } from "@/components/scores/ScoreSubmission";
import { DerbyBanner } from "@/components/home/DerbyBanner";
import { WeeklySummaryWidget } from "@/components/home/WeeklySummaryWidget";
import { FixtureCard } from "@/components/home/FixtureCard";
import { TriviaCarousel } from "@/components/home/TriviaCarousel";
import { Trophy } from "lucide-react";

const Home = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary mb-2">Tryble</div>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  const dummyFixtures = [
    {
      homeTeam: "Blackrock College",
      awayTeam: "Belvedere College",
      homeTeamShort: "BC",
      awayTeamShort: "BEL",
      time: "Sat 15:00",
      venue: "RDS",
    },
    {
      homeTeam: "Terenure College",
      awayTeam: "St. Mary's",
      homeTeamShort: "TC",
      awayTeamShort: "STM",
      time: "Sat 13:00",
      venue: "Donnybrook",
    },
    {
      homeTeam: "Gonzaga College",
      awayTeam: "Cistercian",
      homeTeamShort: "GC",
      awayTeamShort: "CIS",
      time: "Sun 14:00",
      venue: "Energia Park",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            <span className="text-2xl font-bold text-primary">Tryble</span>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* This Week's Derby Banner */}
        <DerbyBanner />

        {/* Weekly Summary Widget */}
        <WeeklySummaryWidget />

        {/* Upcoming Fixtures */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold px-1">Upcoming Fixtures</h2>
          {dummyFixtures.length > 0 ? (
            <div className="space-y-3">
              {dummyFixtures.map((fixture, index) => (
                <FixtureCard key={index} {...fixture} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gradient-card rounded-lg border border-border/40">
              <p className="text-muted-foreground">No matches yet — check back soon!</p>
            </div>
          )}
        </div>

        {/* Trivia / News Carousel */}
        <TriviaCarousel />

        {/* Score Submission Section */}
        <ScoreSubmission />
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Home;
