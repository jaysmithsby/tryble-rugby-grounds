import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import GlobalHeader from "@/components/GlobalHeader";
import trybalLogo from "@/assets/trybal-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { HomeCarousel } from "@/components/home/HomeCarousel";
import { FixtureCard } from "@/components/fixtures/FixtureCard";
import { SchoolFixtureCard } from "@/components/home/SchoolFixtureCard";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useEffectiveDate } from "@/hooks/useEffectiveDate";
import { useHomeAuth } from "@/hooks/useHomeAuth";
import { useHomeFixtures } from "@/hooks/useHomeFixtures";

const Home = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { effectiveDate, weekendRange, seasonYear } = useEffectiveDate();
  const [localPredictions, setLocalPredictions] = useState<Record<string, { schoolId: string, margin: number }>>({});
  
  const {
    user,
    loading,
    profileLoaded,
    userSchoolName,
    userSchoolId,
    userDisplayName,
    handleSignOut,
  } = useHomeAuth();

  const {
    upcomingFixtures,
    recentFixtures,
    userSchoolFixture,
    hasNoPools,
    fixturesLoading,
    predictionsMap: dbPredictions,
  } = useHomeFixtures({
    userId: user?.id || null,
    userSchoolName, // Note: This parameter is unused in useHomeFixtures, but keeping it for now to match interface
    userSchoolId,
    effectiveDate,
    weekendStart: weekendRange.start,
    weekendEnd: weekendRange.end,
    seasonYear,
    profileLoaded,
  });

  const predictions = { ...dbPredictions, ...localPredictions };

  const handlePredictionMade = useCallback(async (matchId: string, schoolId: string, margin: number) => {
    if (!user?.id) return;

    const fixture = [...upcomingFixtures, userSchoolFixture].find(f => f?.id === matchId);
    const predictedTeam = fixture && schoolId === fixture.school_a.id ? "school_a" : "school_b";

    setLocalPredictions(prev => ({
      ...prev,
      [matchId]: { schoolId, margin }
    }));

    const { error } = await supabase
      .from("predictions")
      .upsert(
        {
          fixture_id: matchId,
          user_id: user.id,
          predicted_team: predictedTeam,
          predicted_margin: margin,
          predicted_school_id: schoolId,
        },
        { onConflict: "fixture_id,user_id" }
      );

    if (error) {
      console.error("Error saving prediction:", error);
      setLocalPredictions(prev => {
        const next = { ...prev };
        delete next[matchId];
        return next;
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ["home-predictions"] });
    }
  }, [user?.id, queryClient, upcomingFixtures, userSchoolFixture]);

  const formatMatchTime = (matchDate: string, status: string) => {
    const date = new Date(matchDate);
    const dayName = format(date, "EEE");
    const time = format(date, "HH:mm");
    if (status === "completed") {
      return `Completed - ${dayName} ${time}`;
    }
    return `${dayName} ${time}`;
  };

  const getShortName = (name: string) => {
    const words = name.split(" ");
    if (words.length >= 2) {
      return words.map(w => w[0]).join("").slice(0, 3).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const isDerbyWeek = userSchoolFixture?.is_derby === true;
  const hasSchoolFixture = !!userSchoolFixture;

  const getHeroHeadline = () => {
    if (isDerbyWeek) return "It's Derby Week.";
    if (hasSchoolFixture) return "This Saturday. It Matters.";
    return "For the Badge.";
  };

  const getHeroSubline = () => {
    if (hasSchoolFixture) return "Your school. Your rivals. Your prediction.";
    return "Back your school. Call the score.";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <img src={trybalLogo} alt="Trybal" className="h-16 mb-2" />
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <GlobalHeader>
        {(userDisplayName || userSchoolName) && (
          <div className="container mx-auto px-4 pb-3">
            {userSchoolName ? (
              <div className="space-y-0.5">
                <p className="text-base font-bold text-primary">{userSchoolName}</p>
                <p className="text-sm text-muted-foreground">
                  Hey {userDisplayName || 'Fan'}.{hasSchoolFixture ? " Your boys play Saturday." : ""}
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                <p className="text-base font-bold text-primary">For the Badge.</p>
                <p className="text-sm text-muted-foreground">
                  Hey {userDisplayName || 'Fan'}.
                </p>
              </div>
            )}
          </div>
        )}
      </GlobalHeader>

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-3xl md:text-4xl font-black text-foreground leading-tight">
            {getHeroHeadline()}
          </h1>
          <p className="text-base text-muted-foreground">
            {getHeroSubline()}
          </p>
          <p className="text-xs text-muted-foreground/70">
            No betting. Just bragging rights.
          </p>
        </div>

        <HomeCarousel unpickedFixturesCount={upcomingFixtures.filter(f => !predictions[f.id]).length} />

        {userSchoolFixture && userSchoolName && (
          <div className="space-y-2">
            <SchoolFixtureCard
              userSchool={userSchoolFixture.school_a.name === userSchoolName ? userSchoolFixture.school_a.name : userSchoolFixture.school_b.name}
              userSchoolShort={getShortName(userSchoolFixture.school_a.name === userSchoolName ? userSchoolFixture.school_a.name : userSchoolFixture.school_b.name)}
              userSchoolIcon={userSchoolFixture.school_a.name === userSchoolName ? userSchoolFixture.school_a.jersey_url : userSchoolFixture.school_b.jersey_url}
              userSchoolSlug={userSchoolFixture.school_a.name === userSchoolName ? userSchoolFixture.school_a.slug : userSchoolFixture.school_b.slug}
              opponentSchool={userSchoolFixture.school_a.name === userSchoolName ? userSchoolFixture.school_b.name : userSchoolFixture.school_a.name}
              opponentSchoolShort={getShortName(userSchoolFixture.school_a.name === userSchoolName ? userSchoolFixture.school_b.name : userSchoolFixture.school_a.name)}
              opponentSchoolIcon={userSchoolFixture.school_a.name === userSchoolName ? userSchoolFixture.school_b.jersey_url : userSchoolFixture.school_a.jersey_url}
              opponentSchoolSlug={userSchoolFixture.school_a.name === userSchoolName ? userSchoolFixture.school_b.slug : userSchoolFixture.school_a.slug}
              time={formatMatchTime(userSchoolFixture.match_date, userSchoolFixture.status)}
              matchDate={userSchoolFixture.match_date}
              venue={userSchoolFixture.venue}
              matchId={userSchoolFixture.id}
              priority
            />
            <p className="text-xs text-muted-foreground text-center">
              Prediction closes at kickoff.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-lg font-bold px-1">Upcoming Matches</h2>
          {fixturesLoading ? (
            <div className="text-center py-12 bg-gradient-card rounded-lg border border-border/40">
              <p className="text-muted-foreground">Loading fixtures...</p>
            </div>
          ) : upcomingFixtures.length > 0 ? (
            <div className="space-y-3">
              {upcomingFixtures.map((fixture, index) => (
                <FixtureCard 
                  key={fixture.id}
                  homeTeam={fixture.school_a.name}
                  awayTeam={fixture.school_b.name}
                  homeTeamShort={getShortName(fixture.school_a.name)}
                  awayTeamShort={getShortName(fixture.school_b.name)}
                  homeTeamIcon={fixture.school_a.jersey_url}
                  awayTeamIcon={fixture.school_b.jersey_url}
                  homeSchoolId={fixture.school_a.id}
                  awaySchoolId={fixture.school_b.id}
                  homeSchoolSlug={fixture.school_a.slug}
                  awaySchoolSlug={fixture.school_b.slug}
                  time={formatMatchTime(fixture.match_date, fixture.status)}
                  venue={fixture.venue}
                  matchDate={fixture.match_date}
                  tournamentName={fixture.tournament_name}
                  matchId={fixture.id}
                  priority={index < 2}
                  isPredicted={!!predictions[fixture.id]}
                  predictedSchoolId={predictions[fixture.id]?.schoolId}
                  predictedMargin={predictions[fixture.id]?.margin}
                  onPredictionMade={(schoolId, margin) => handlePredictionMade(fixture.id, schoolId, margin)}
                />
              ))}
            </div>
          ) : hasNoPools ? (
            <div className="text-center py-10 bg-gradient-card rounded-lg border border-border/40">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pools Yet</h3>
              <p className="text-muted-foreground mb-4 px-4">
                You're not in a pool yet. Join one to start predicting.
              </p>
              <Button 
                onClick={() => navigate("/leaderboard")} 
                className="bg-primary hover:bg-primary/90"
              >
                <Users className="h-4 w-4 mr-2" />
                Find a Pool
              </Button>
            </div>
          ) : (
            <div className="text-center py-12 bg-gradient-card rounded-lg border border-border/40">
              <p className="text-muted-foreground">No matches this week.</p>
            </div>
          )}
        </div>

        {/* MVP: Full Time score reporting, SchoolScoreSubmission, and scorekeeper card hidden */}
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;
