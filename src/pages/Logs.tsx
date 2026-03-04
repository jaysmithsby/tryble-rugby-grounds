import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Trophy, CheckCircle2, XCircle, Share2, Flame, Target, BarChart3, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import GlobalHeader from "@/components/GlobalHeader";
import { Button } from "@/components/ui/button";
import { ScoringInfoCard } from "@/components/pools/ScoringInfoCard";
import { toast } from "sonner";

const INITIAL_COUNT = 5;
const MAX_COUNT = 20;

const Logs = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [showAll, setShowAll] = useState(false);

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  useEffect(() => {
    if (!sessionLoading && !session) {
      navigate("/auth");
    }
  }, [session, sessionLoading, navigate]);

  const userId = session?.user?.id;

  const { data: predictions, isLoading: predictionsLoading } = useQuery({
    queryKey: ["user-predictions-log", userId, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select(
          "*, fixture:fixtures(*, school_a:schools!fixtures_school_a_id_fkey(name), school_b:schools!fixtures_school_b_id_fkey(name))"
        )
        .eq("user_id", userId!)
        .not("points_earned", "is", null)
        .order("created_at", { ascending: false })
        .limit(MAX_COUNT);

      if (error) throw error;
      return (data ?? []).filter((p: any) => p.fixture?.year === currentYear);
    },
    enabled: !!userId,
  });

  const sortedPredictions = useMemo(() => {
    if (!predictions) return [];
    return [...predictions].sort((a, b) => {
      const dateA = (a.fixture as any)?.match_date || "";
      const dateB = (b.fixture as any)?.match_date || "";
      return dateB.localeCompare(dateA);
    });
  }, [predictions]);

  const visiblePredictions = useMemo(
    () => (showAll ? sortedPredictions : sortedPredictions.slice(0, INITIAL_COUNT)),
    [sortedPredictions, showAll]
  );

  const fixtureIds = useMemo(
    () => sortedPredictions.map((p) => p.fixture_id),
    [sortedPredictions]
  );

  const { data: communityAvgs } = useQuery({
    queryKey: ["community-avg", fixtureIds],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_community_avg_for_fixtures",
        { p_fixture_ids: fixtureIds }
      );
      if (error) throw error;
      return data as { fixture_id: string; avg_points: number; total_predictions: number }[];
    },
    enabled: fixtureIds.length > 0,
  });

  const communityMap = useMemo(() => {
    const map: Record<string, number> = {};
    communityAvgs?.forEach((c) => {
      map[c.fixture_id] = Number(c.avg_points);
    });
    return map;
  }, [communityAvgs]);

  const analytics = useMemo(() => {
    if (!sortedPredictions.length)
      return { participation: 0, efficiency: 0, streak: 0 };

    const scored = sortedPredictions.filter((p) => p.points_earned != null);
    const totalPoints = scored.reduce((s, p) => s + (p.points_earned ?? 0), 0);
    const efficiency = scored.length > 0 ? totalPoints / scored.length : 0;

    let streak = 0;
    for (const p of sortedPredictions) {
      if ((p.points_earned ?? 0) >= 3) streak++;
      else break;
    }

    return {
      participation: scored.length,
      efficiency: Math.round(efficiency * 10) / 10,
      streak,
    };
  }, [sortedPredictions]);

  const formGuide = useMemo(
    () => sortedPredictions.slice(0, 8),
    [sortedPredictions]
  );

  const handleShare = async () => {
    const text = `🏉 My Trybal Stats: ${analytics.efficiency}/6.0 pts | 🔥 ${analytics.streak} Win Streak. Join the scrum!`;
    const shareData = {
      title: "My Trybal Stats",
      text,
      url: window.location.origin,
    };
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${text} ${window.location.origin}`);
        toast.success("Copied to clipboard!");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        await navigator.clipboard.writeText(`${text} ${window.location.origin}`);
        toast.success("Copied to clipboard!");
      }
    }
  };

  const getFormIcon = (points: number | null) => {
    if (points == null) return null;
    if (points >= 5) return <CheckCircle2 className="w-4 h-4 text-yellow-500" />;
    if (points >= 3) return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    return <XCircle className="w-4 h-4 text-destructive" />;
  };

  if (sessionLoading || predictionsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading logs...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <GlobalHeader />

      <main className="container mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Personal Logs
          </h1>
          <Button variant="ghost" size="sm" onClick={handleShare} className="gap-1.5 text-xs">
            <Share2 className="w-3.5 h-3.5" />
            Share
          </Button>
        </div>

        {sortedPredictions.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold mb-1">No scored predictions yet</h3>
            <p className="text-sm text-muted-foreground">
              Start calling matches to see your stats here!
            </p>
          </div>
        ) : (
          <>
            {/* Analytics Row */}
            <div className="flex items-center justify-between py-3 border-y border-border/40">
              <div className="flex items-center gap-1.5 text-center">
                <Target className="w-4 h-4 text-primary" />
                <span className="font-mono text-sm font-bold">{analytics.participation}</span>
                <span className="text-xs text-muted-foreground">Picks</span>
              </div>
              <div className="flex items-center gap-1.5 text-center">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="font-mono text-sm font-bold">{analytics.efficiency}</span>
                <span className="text-xs text-muted-foreground">Avg/6</span>
              </div>
              <div className="flex items-center gap-1.5 text-center">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="font-mono text-sm font-bold">{analytics.streak}</span>
                <span className="text-xs text-muted-foreground">Streak</span>
              </div>
            </div>

            {/* Form Guide */}
            {formGuide.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-muted-foreground shrink-0">Form</span>
                <div className="flex gap-1.5">
                  {formGuide.map((p) => (
                    <div key={p.id} className="flex flex-col items-center">
                      {getFormIcon(p.points_earned)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Match History */}
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                Match History ({currentYear})
              </h2>
              <div className="divide-y divide-border/40">
                {visiblePredictions.map((pred) => {
                  const fixture = pred.fixture as any;
                  if (!fixture) return null;
                  const schoolA = fixture.school_a?.name ?? "?";
                  const schoolB = fixture.school_b?.name ?? "?";
                  const hasScores = fixture.score_a != null && fixture.score_b != null;
                  const actualDiff = hasScores ? Math.abs(fixture.score_a - fixture.score_b) : null;
                  const pts = pred.points_earned ?? 0;
                  const commAvg = communityMap[pred.fixture_id];

                  return (
                    <div key={pred.id} className="py-2.5 space-y-1">
                      <p className="text-xs font-medium truncate">
                        {schoolA} v {schoolB}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-mono">
                          {hasScores ? (
                            <>
                              {fixture.score_a}-{fixture.score_b}
                              <span className="ml-0.5">({actualDiff})</span>
                            </>
                          ) : "—"}
                        </span>
                        <span
                          className={`font-mono ${
                            pts >= 5
                              ? "font-bold text-yellow-500"
                              : pts >= 3
                              ? "font-medium text-green-500"
                              : ""
                          }`}
                        >
                          ±{pred.predicted_margin} → {pts}pts
                        </span>
                        <span className="font-mono">
                          Comm. {commAvg != null ? commAvg : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load More / Show Less */}
              {sortedPredictions.length > INITIAL_COUNT && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-xs gap-1.5"
                  onClick={() => setShowAll((prev) => !prev)}
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} />
                  {showAll ? "Show less" : `Show all ${sortedPredictions.length} matches`}
                </Button>
              )}
            </section>

            <ScoringInfoCard />
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Logs;
