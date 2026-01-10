import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { BottomNav } from "@/components/BottomNav";
import { ScoreSubmission } from "@/components/scores/ScoreSubmission";
import { DerbyBanner } from "@/components/home/DerbyBanner";
import { WeeklySummaryWidget } from "@/components/home/WeeklySummaryWidget";
import { FixtureCard } from "@/components/home/FixtureCard";
import { RecentFixtureCard } from "@/components/home/RecentFixtureCard";
import { SchoolFixtureCard } from "@/components/home/SchoolFixtureCard";
import { TriviaCarousel } from "@/components/home/TriviaCarousel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Trophy } from "lucide-react";
import paarlGimJersey from "@/assets/jerseys/paarl_gim.png";
import paulRoosJersey from "@/assets/jerseys/paul_roos.png";
import glenwoodJersey from "@/assets/jerseys/glenwood.png";
import maritzburgJersey from "@/assets/jerseys/maritzburg.png";

const Home = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<Record<string, { team: "home" | "away", margin: number }>>({});
  const navigate = useNavigate();

  // Handle prediction submission
  const handlePredictionMade = (matchId: string, team: "home" | "away", margin: number) => {
    setPredictions(prev => ({
      ...prev,
      [matchId]: { team, margin }
    }));
  };

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

  // User's school (simulated)
  const userSchool = "Paul Roos";
  const userSchoolShort = "PR";

  // Simulated followed teams
  const followedTeams = ["Paul Roos", "Paarl Gimnasium", "Glenwood", "Maritzburg College"];

  // Simulated pools the user belongs to
  const userPools = [
    { name: "School Friends", teams: ["Paul Roos", "Paarl Gimnasium", "Glenwood"] },
    { name: "League A", teams: ["Maritzburg College", "Glenwood", "Paul Roos"] },
    { name: "Rugby Pros", teams: ["Paul Roos", "Paarl Gimnasium", "Maritzburg College"] }
  ];

  // Get all teams from user's pools
  const poolTeams = [...new Set(userPools.flatMap(pool => pool.teams))];

  // Helper function to check if fixture should be shown
  const shouldShowFixture = (homeTeam: string, awayTeam: string) => {
    return followedTeams.includes(homeTeam) || followedTeams.includes(awayTeam) ||
           poolTeams.includes(homeTeam) || poolTeams.includes(awayTeam);
  };

  // Helper function to get pools a fixture applies to
  const getApplicablePools = (homeTeam: string, awayTeam: string) => {
    return userPools
      .filter(pool => pool.teams.includes(homeTeam) || pool.teams.includes(awayTeam))
      .map(pool => pool.name);
  };

  // User's school fixture (can be upcoming or completed)
  const schoolFixture = {
    userSchool: "Paul Roos",
    userSchoolShort: "PR",
    userSchoolIcon: paulRoosJersey,
    userSchoolSlug: "paul-roos",
    opponentSchool: "Paarl Gimnasium",
    opponentSchoolShort: "PG",
    opponentSchoolIcon: paarlGimJersey,
    opponentSchoolSlug: "paarl-gim",
    time: "Completed - Sat 15:00",
    venue: "RDS",
    isCompleted: true,
    matchDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
  };

  const allFixtures = [
    {
      homeTeam: "Glenwood",
      awayTeam: "Maritzburg College",
      homeTeamShort: "GW",
      awayTeamShort: "MC",
      homeTeamIcon: glenwoodJersey,
      awayTeamIcon: maritzburgJersey,
      homeSchoolSlug: "glenwood",
      awaySchoolSlug: "maritzburg-college",
      time: "Sat 13:00",
      venue: "Goldstones",
      matchId: "match-1"
    },
    {
      homeTeam: "Paul Roos",
      awayTeam: "Paarl Gimnasium",
      homeTeamShort: "PR",
      awayTeamShort: "PG",
      homeTeamIcon: paulRoosJersey,
      awayTeamIcon: paarlGimJersey,
      homeSchoolSlug: "paul-roos",
      awaySchoolSlug: "paarl-gim",
      time: "Sun 14:00",
      venue: "Markötter",
      matchId: "match-2"
    },
    {
      homeTeam: "Glenwood",
      awayTeam: "Paul Roos",
      homeTeamShort: "GW",
      awayTeamShort: "PR",
      homeTeamIcon: glenwoodJersey,
      awayTeamIcon: paulRoosJersey,
      homeSchoolSlug: "glenwood",
      awaySchoolSlug: "paul-roos",
      time: "Sun 16:00",
      venue: "Goldstones",
      matchId: "match-3"
    },
    {
      homeTeam: "Maritzburg College",
      awayTeam: "Paarl Gimnasium",
      homeTeamShort: "MC",
      awayTeamShort: "PG",
      homeTeamIcon: maritzburgJersey,
      awayTeamIcon: paarlGimJersey,
      homeSchoolSlug: "maritzburg-college",
      awaySchoolSlug: "paarl-gim",
      time: "Mon 15:00",
      venue: "Goldstones",
      matchId: "match-4"
    }
  ];

  // Filter fixtures based on followed teams and pools
  const dummyFixtures = allFixtures
    .filter(f => shouldShowFixture(f.homeTeam, f.awayTeam))
    .map(fixture => ({
      ...fixture,
      appliesTo: getApplicablePools(fixture.homeTeam, fixture.awayTeam)
    }));

  const allRecentFixtures = [
    {
      homeTeam: "St. Mary's College",
      awayTeam: "Newbridge College",
      homeTeamShort: "SMC",
      awayTeamShort: "NC",
      completedTime: "Completed - Fri 18:00",
      venue: "Templeville Road",
      matchDate: new Date(Date.now() - 36 * 60 * 60 * 1000), // 36 hours ago (within 48hr window)
    },
    {
      homeTeam: "Castleknock College",
      awayTeam: "Presentation College",
      homeTeamShort: "CC",
      awayTeamShort: "PC",
      completedTime: "Completed - Fri 16:00",
      venue: "Somerton Park",
      matchDate: new Date(Date.now() - 40 * 60 * 60 * 1000), // 40 hours ago (within 48hr window)
    },
    {
      homeTeam: "Roscrea College",
      awayTeam: "CBC Cork",
      homeTeamShort: "RC",
      awayTeamShort: "CBC",
      completedTime: "Completed - Thu 15:00",
      venue: "Roscrea",
      matchDate: new Date(Date.now() - 60 * 60 * 60 * 1000), // 60 hours ago (outside window)
    },
  ];

  // Filter recent fixtures based on followed teams and pools
  const recentFixtures = allRecentFixtures.filter(f => 
    shouldShowFixture(f.homeTeam, f.awayTeam)
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            <span className="text-2xl font-bold text-primary">Tryble</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* This Week's Derby Banner */}
        <DerbyBanner />

        {/* Weekly Summary Widget */}
        <WeeklySummaryWidget />

        {/* Your School's Fixture - Special Highlight */}
        <div className="space-y-3">
          <SchoolFixtureCard {...schoolFixture} priority />
        </div>

        {/* Upcoming Fixtures */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold px-1">Upcoming Fixtures</h2>
          {dummyFixtures.length > 0 ? (
            <div className="space-y-3">
              {dummyFixtures.map((fixture, index) => (
                <FixtureCard 
                  key={index} 
                  {...fixture}
                  priority={index < 2}
                  isPredicted={!!predictions[fixture.matchId]}
                  predictedTeam={predictions[fixture.matchId]?.team}
                  predictedMargin={predictions[fixture.matchId]?.margin}
                  onPredictionMade={(team, margin) => handlePredictionMade(fixture.matchId, team, margin)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gradient-card rounded-lg border border-border/40">
              <p className="text-muted-foreground">No matches yet — check back soon!</p>
            </div>
          )}
        </div>

        {/* Recent Matches - Submit Score */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold px-1">Recent Matches – Submit Score</h2>
          {recentFixtures.length > 0 ? (
            <div className="space-y-3">
              {recentFixtures.map((fixture, index) => (
                <RecentFixtureCard key={index} {...fixture} priority={index === 0} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gradient-card rounded-lg border border-border/40">
              <p className="text-muted-foreground">No recent matches to report.</p>
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
