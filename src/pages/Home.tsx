import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { ScoreSubmission } from "@/components/scores/ScoreSubmission";
import { SchoolScoreSubmission } from "@/components/scores/SchoolScoreSubmission";
import { HomeCarousel } from "@/components/home/HomeCarousel";
import { WeeklySummaryWidget } from "@/components/home/WeeklySummaryWidget";
import { FixtureCard } from "@/components/home/FixtureCard";
import { RecentFixtureCard } from "@/components/home/RecentFixtureCard";
import { SchoolFixtureCard } from "@/components/home/SchoolFixtureCard";
import { TriviaCarousel } from "@/components/home/TriviaCarousel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Trophy, MessageCircle, Award, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { useEffectiveDate } from "@/hooks/useEffectiveDate";
import { useHomeAuth } from "@/hooks/useHomeAuth";
import { useHomeFixtures } from "@/hooks/useHomeFixtures";
import { buildWhatsAppUrl } from "@/lib/constants";

const Home = () => {
  const navigate = useNavigate();
  const { effectiveDate, weekendRange, seasonYear } = useEffectiveDate();
  const [predictions, setPredictions] = useState<Record<string, { team: "home" | "away", margin: number }>>({});
  
  // Auth and profile data
  const {
    user,
    loading,
    profileLoaded,
    userSchoolName,
    userDisplayName,
    handleSignOut,
  } = useHomeAuth();

  // Fixtures data
  const {
    upcomingFixtures,
    recentFixtures,
    userSchoolFixture,
    hasNoPools,
    fixturesLoading,
  } = useHomeFixtures({
    userId: user?.id || null,
    userSchoolName,
    effectiveDate,
    weekendStart: weekendRange.start,
    weekendEnd: weekendRange.end,
    seasonYear,
    profileLoaded,
  });

  // Handle prediction submission
  const handlePredictionMade = (matchId: string, team: "home" | "away", margin: number) => {
    setPredictions(prev => ({
      ...prev,
      [matchId]: { team, margin }
    }));
  };

  // Helper to format match time
  const formatMatchTime = (matchDate: string, status: string) => {
    const date = new Date(matchDate);
    const dayName = format(date, "EEE");
    const time = format(date, "HH:mm");
    if (status === "completed") {
      return `Completed - ${dayName} ${time}`;
    }
    return `${dayName} ${time}`;
  };

  // Helper to get short name (first 2 letters or abbreviation)
  const getShortName = (name: string) => {
    const words = name.split(" ");
    if (words.length >= 2) {
      return words.map(w => w[0]).join("").slice(0, 3).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary mb-2">Trybal</div>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            <span className="text-2xl font-bold text-primary">Trybal</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
        {/* User welcome banner */}
        {(userDisplayName || userSchoolName) && (
          <div className="container mx-auto px-4 pb-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Welcome,</span>
              <span className="font-semibold text-foreground">{userDisplayName || 'Fan'}</span>
              {userSchoolName && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-primary font-medium">{userSchoolName}</span>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Dynamic Carousel: Derbies, News, Ads */}
        <HomeCarousel unpickedFixturesCount={upcomingFixtures.filter(f => !predictions[f.id]).length} />

        {/* Weekly Summary Widget */}
        <WeeklySummaryWidget userId={user?.id} />

        {/* Your School's Fixture - Special Highlight */}
        {userSchoolFixture && userSchoolName && (
          <div className="space-y-3">
            <SchoolFixtureCard
              userSchool={userSchoolFixture.home_school.name === userSchoolName ? userSchoolFixture.home_school.name : userSchoolFixture.away_school.name}
              userSchoolShort={getShortName(userSchoolFixture.home_school.name === userSchoolName ? userSchoolFixture.home_school.name : userSchoolFixture.away_school.name)}
              userSchoolIcon={userSchoolFixture.home_school.name === userSchoolName ? userSchoolFixture.home_school.jersey_url : userSchoolFixture.away_school.jersey_url}
              userSchoolSlug={userSchoolFixture.home_school.name === userSchoolName ? userSchoolFixture.home_school.slug : userSchoolFixture.away_school.slug}
              opponentSchool={userSchoolFixture.home_school.name === userSchoolName ? userSchoolFixture.away_school.name : userSchoolFixture.home_school.name}
              opponentSchoolShort={getShortName(userSchoolFixture.home_school.name === userSchoolName ? userSchoolFixture.away_school.name : userSchoolFixture.home_school.name)}
              opponentSchoolIcon={userSchoolFixture.home_school.name === userSchoolName ? userSchoolFixture.away_school.jersey_url : userSchoolFixture.home_school.jersey_url}
              opponentSchoolSlug={userSchoolFixture.home_school.name === userSchoolName ? userSchoolFixture.away_school.slug : userSchoolFixture.home_school.slug}
              time={formatMatchTime(userSchoolFixture.match_date, userSchoolFixture.status)}
              matchDate={userSchoolFixture.match_date}
              venue={userSchoolFixture.venue}
              matchId={userSchoolFixture.id}
              priority
            />
          </div>
        )}

        {/* Upcoming Fixtures */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold px-1">Upcoming Fixtures</h2>
          {fixturesLoading ? (
            <div className="text-center py-12 bg-gradient-card rounded-lg border border-border/40">
              <p className="text-muted-foreground">Loading fixtures...</p>
            </div>
          ) : upcomingFixtures.length > 0 ? (
            <div className="space-y-3">
              {upcomingFixtures.map((fixture, index) => (
                <FixtureCard 
                  key={fixture.id}
                  homeTeam={fixture.home_school.name}
                  awayTeam={fixture.away_school.name}
                  homeTeamShort={getShortName(fixture.home_school.name)}
                  awayTeamShort={getShortName(fixture.away_school.name)}
                  homeTeamIcon={fixture.home_school.jersey_url}
                  awayTeamIcon={fixture.away_school.jersey_url}
                  homeSchoolSlug={fixture.home_school.slug}
                  awaySchoolSlug={fixture.away_school.slug}
                  time={formatMatchTime(fixture.match_date, fixture.status)}
                  venue={fixture.venue}
                  matchDate={fixture.match_date}
                  tournamentName={fixture.tournament_name}
                  matchId={fixture.id}
                  priority={index < 2}
                  isPredicted={!!predictions[fixture.id]}
                  predictedTeam={predictions[fixture.id]?.team}
                  predictedMargin={predictions[fixture.id]?.margin}
                  onPredictionMade={(team, margin) => handlePredictionMade(fixture.id, team, margin)}
                />
              ))}
            </div>
          ) : hasNoPools ? (
            <div className="text-center py-10 bg-gradient-card rounded-lg border border-border/40">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pools Yet</h3>
              <p className="text-muted-foreground mb-4 px-4">
                Join or create a pool to see fixtures you can predict on!
              </p>
              <Button 
                onClick={() => navigate("/leaderboard")} 
                className="bg-primary hover:bg-primary/90"
              >
                <Users className="h-4 w-4 mr-2" />
                Go to Pools
              </Button>
            </div>
          ) : (
            <div className="text-center py-12 bg-gradient-card rounded-lg border border-border/40">
              <p className="text-muted-foreground">No upcoming matches for your pools — check back soon!</p>
            </div>
          )}
        </div>

        {/* Recent Matches - Submit Score */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold px-1">Recent Matches – Submit Score</h2>
          {fixturesLoading ? (
            <div className="text-center py-8 bg-gradient-card rounded-lg border border-border/40">
              <p className="text-muted-foreground">Loading recent matches...</p>
            </div>
          ) : recentFixtures.length > 0 ? (
            <div className="space-y-3">
              {recentFixtures.map((fixture, index) => (
                <RecentFixtureCard
                  key={fixture.id}
                  homeTeam={fixture.home_school.name}
                  awayTeam={fixture.away_school.name}
                  homeTeamShort={getShortName(fixture.home_school.name)}
                  awayTeamShort={getShortName(fixture.away_school.name)}
                  homeTeamIcon={fixture.home_school.jersey_url}
                  awayTeamIcon={fixture.away_school.jersey_url}
                  homeSchoolSlug={fixture.home_school.slug}
                  awaySchoolSlug={fixture.away_school.slug}
                  completedTime={formatMatchTime(fixture.match_date, fixture.status)}
                  venue={fixture.venue}
                  matchDate={new Date(fixture.match_date)}
                  priority={index === 0}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gradient-card rounded-lg border border-border/40">
              <p className="text-muted-foreground">No recent matches to report.</p>
            </div>
          )}
        </div>

        {/* Trivia / News Carousel - removed for MVP */}

        {/* School-Specific Score Submission (Official Scorekeepers) */}
        {userSchoolName && (
          <SchoolScoreSubmission userSchoolName={userSchoolName} />
        )}

        {/* General Score Submission Section */}
        <ScoreSubmission />

        {/* Become an Official Scorekeeper CTA */}
        {userSchoolName && (
          <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-semibold text-foreground">Become an Official Scorekeeper for {userSchoolName}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Get a special badge and be the trusted source for {userSchoolName}'s first team scores. 
                      Official scorekeepers are verified and accepted by the Trybal team.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-primary/30 hover:bg-primary/10"
                    asChild
                  >
                    <a
                      href={buildWhatsAppUrl(`Hey Trybal! I want to be an official scorekeeper for ${userSchoolName}, I'll let you know what the final first team score is`)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Apply via WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Home;
