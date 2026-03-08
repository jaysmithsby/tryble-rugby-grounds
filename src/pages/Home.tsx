import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import GlobalHeader from "@/components/GlobalHeader";
import trybalLogo from "@/assets/trybal-logo.png";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";

import { supabase } from "@/integrations/supabase/client";
import { useConsentStatus } from "@/hooks/useConsentStatus";
import { FixtureCard } from "@/components/fixtures/FixtureCard";
import { SwipeableFixtureCard } from "@/components/fixtures/SwipeableFixtureCard";
import { Trophy, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useEffectiveDate } from "@/hooks/useEffectiveDate";
import { useHomeAuth } from "@/hooks/useHomeAuth";
import { useHomeFixtures } from "@/hooks/useHomeFixtures";

const Home = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { effectiveDate, seasonYear } = useEffectiveDate();
  const [localPredictions, setLocalPredictions] = useState<Record<string, { schoolId: string; margin: number }>>({});
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const { user, loading, profileLoaded } = useHomeAuth();

  const {
    upcomingFixtures,
    fixturesLoading,
    predictionsMap: dbPredictions,
    upcomingTournaments,
  } = useHomeFixtures({
    userId: user?.id || null,
    effectiveDate,
    seasonYear,
    profileLoaded,
  });

  const predictions = { ...dbPredictions, ...localPredictions };

  const handlePredictionMade = useCallback(
    async (matchId: string, schoolId: string, margin: number) => {
      if (!user?.id) return;

      const isDraw = schoolId === "draw";

      setLocalPredictions((prev) => ({
        ...prev,
        [matchId]: { schoolId: isDraw ? "draw" : schoolId, margin },
      }));

      const upsertData: Record<string, unknown> = {
        fixture_id: matchId,
        user_id: user.id,
        predicted_margin: margin,
        predicted_school_id: isDraw ? null : schoolId,
      };

      const { error } = await supabase.from("predictions").upsert(
        upsertData as any,
        { onConflict: "fixture_id,user_id" }
      );

      if (error) {
        console.error("Error saving prediction:", error);
        setLocalPredictions((prev) => {
          const next = { ...prev };
          delete next[matchId];
          return next;
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["home-predictions"] });
      }
    },
    [user?.id, queryClient, upcomingFixtures]
  );

  const formatMatchTime = (matchDate: string, status: string) => {
    const date = new Date(matchDate);
    const dayName = format(date, "EEE");
    const time = format(date, "HH:mm");
    if (status === "completed") return `Completed - ${dayName} ${time}`;
    return `${dayName} ${time}`;
  };

  const getShortName = (name: string) => {
    const words = name.split(" ");
    if (words.length >= 2) return words.map((w) => w[0]).join("").slice(0, 3).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handleRefresh = useCallback(async () => {
    setDismissedIds(new Set());
    await queryClient.invalidateQueries({ queryKey: ["home-upcoming-fixtures"] });
    await queryClient.invalidateQueries({ queryKey: ["home-predictions"] });
    await queryClient.invalidateQueries({ queryKey: ["home-upcoming-tournaments"] });
  }, [queryClient]);

  const { containerRef, pullDistance, isRefreshing } = usePullToRefresh({ onRefresh: handleRefresh });

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
    <div ref={containerRef} className="min-h-screen bg-background pb-20 overflow-auto">
      <GlobalHeader />
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-3xl md:text-4xl font-black text-foreground leading-tight">
            For the Badge.
          </h1>
          <p className="text-base text-muted-foreground">
            Back your school. Call the score.
          </p>
          <p className="text-xs text-muted-foreground/70">
            No betting. Just bragging rights.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-lg font-bold">Upcoming Matches</h2>
            {upcomingFixtures.length > 3 && (
              <button
                onClick={() => navigate("/fixtures")}
                className="text-xs font-medium text-primary hover:underline"
              >
                Make your call →
              </button>
            )}
          </div>
          {upcomingFixtures.length > 3 && (
            <p className="text-xs text-muted-foreground px-1 -mt-2">
              Predictions are open
            </p>
          )}
          {fixturesLoading || !profileLoaded ? (
            <div className="text-center py-12 bg-gradient-card rounded-lg border border-border/40">
              <p className="text-muted-foreground">Loading fixtures...</p>
            </div>
          ) : upcomingFixtures.length > 0 ? (
            <div className="space-y-3">
              {upcomingFixtures
                .filter((f) => !dismissedIds.has(f.id))
                .slice(0, 3)
                .map((fixture, index) => (
                <SwipeableFixtureCard
                  key={fixture.id}
                  fixtureId={fixture.id}
                  onDismiss={(id) => setDismissedIds(prev => new Set(prev).add(id))}
                >
                  <FixtureCard
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
                    onPredictionMade={(schoolId, margin) =>
                      handlePredictionMade(fixture.id, schoolId, margin)
                    }
                  />
                </SwipeableFixtureCard>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gradient-card rounded-lg border border-border/40">
              <p className="text-lg font-semibold mb-1">No Predictions Open</p>
              <p className="text-sm text-muted-foreground">Check back closer to match day.</p>
            </div>
          )}
        </div>

        {upcomingTournaments.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-lg font-bold px-1">Upcoming Tournaments</h2>
            <div className="divide-y divide-border/40">
              {upcomingTournaments.map((t) => (
                <button
                  key={t.id}
                  onClick={() => navigate(`/tournament/${t.id}`)}
                  className="w-full flex items-center gap-3 py-3 px-1 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <Trophy className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.startDate) <= new Date()
                        ? "Live"
                        : `Starts ${format(new Date(t.startDate), "EEE d MMM")}`}
                      {t.venue ? ` · ${t.venue}` : t.province ? ` · ${t.province}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;
