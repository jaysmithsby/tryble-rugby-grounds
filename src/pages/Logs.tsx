import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Trophy, CheckCircle2, XCircle, Share2, Flame, Target, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import GlobalHeader from "@/components/GlobalHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const Logs = () => {
  const navigate = useNavigate();

  // Auth check
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

  // Fetch user's scored predictions with fixture + school data
  const { data: predictions, isLoading: predictionsLoading } = useQuery({
    queryKey: ["user-predictions-log", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select(
          "*, fixture:fixtures(*, school_a:schools!fixtures_school_a_id_fkey(name), school_b:schools!fixtures_school_b_id_fkey(name))"
        )
        .eq("user_id", userId!)
        .not("points_earned", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Sort predictions by match_date DESC
  const sortedPredictions = useMemo(() => {
    if (!predictions) return [];
    return [...predictions].sort((a, b) => {
      const dateA = (a.fixture as any)?.match_date || "";
      const dateB = (b.fixture as any)?.match_date || "";
      return dateB.localeCompare(dateA);
    });
  }, [predictions]);

  // Get fixture IDs for community avg query
  const fixtureIds = useMemo(
    () => sortedPredictions.map((p) => p.fixture_id),
    [sortedPredictions]
  );

  // Fetch community averages
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

  // Analytics
  const analytics = useMemo(() => {
    if (!sortedPredictions.length)
      return { participation: 0, total: 0, efficiency: 0, streak: 0 };

    const scored = sortedPredictions.filter((p) => p.points_earned != null);
    const totalPoints = scored.reduce((s, p) => s + (p.points_earned ?? 0), 0);
    const efficiency = scored.length > 0 ? totalPoints / scored.length : 0;

    // Streak: consecutive with points >= 3 (correct winner)
    let streak = 0;
    for (const p of sortedPredictions) {
      if ((p.points_earned ?? 0) >= 3) {
        streak++;
      } else {
        break;
      }
    }

    return {
      participation: scored.length,
      total: scored.length, // we only have scored predictions
      efficiency: Math.round(efficiency * 10) / 10,
      streak,
    };
  }, [sortedPredictions]);

  // Form guide: last 8
  const formGuide = useMemo(
    () => sortedPredictions.slice(0, 8),
    [sortedPredictions]
  );

  const handleShare = async () => {
    const text = `🏉 My Trybal Stats: ${analytics.efficiency}/6.0 pts | 🔥 ${analytics.streak} Win Streak. Join the scrum at ${window.location.origin}!`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
      }
    } catch {
      // user cancelled share
    }
  };

  const getFormIcon = (points: number | null) => {
    if (points == null) return null;
    if (points >= 5)
      return <CheckCircle2 className="w-5 h-5 text-yellow-500" />;
    if (points >= 3)
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    return <XCircle className="w-5 h-5 text-destructive" />;
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <GlobalHeader />
        <div className="container mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <GlobalHeader />

      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-7 h-7 text-yellow-500" />
            <h1 className="text-2xl font-bold">Personal Logs</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>

        {predictionsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : sortedPredictions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No scored predictions yet. Start calling matches to see your
                stats here!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Analytics Grid */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <Target className="w-5 h-5 mx-auto text-primary mb-1" />
                  <p className="text-2xl font-bold">{analytics.participation}</p>
                  <p className="text-xs text-muted-foreground">Predictions</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <BarChart3 className="w-5 h-5 mx-auto text-primary mb-1" />
                  <p className="text-2xl font-bold">{analytics.efficiency}</p>
                  <p className="text-xs text-muted-foreground">Avg Pts / 6.0</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Flame className="w-5 h-5 mx-auto text-orange-500 mb-1" />
                  <p className="text-2xl font-bold">{analytics.streak}</p>
                  <p className="text-xs text-muted-foreground">Win Streak</p>
                </CardContent>
              </Card>
            </div>

            {/* Form Guide */}
            {formGuide.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Form Guide (Last {formGuide.length})
                  </p>
                  <div className="flex gap-2 justify-center">
                    {formGuide.map((p) => (
                      <div key={p.id} className="flex flex-col items-center">
                        {getFormIcon(p.points_earned)}
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {p.points_earned}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* History Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Matchup</TableHead>
                      <TableHead className="text-xs text-center">
                        Actual (Diff)
                      </TableHead>
                      <TableHead className="text-xs text-center">
                        Your Call
                      </TableHead>
                      <TableHead className="text-xs text-center">
                        Comm.
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPredictions.map((pred) => {
                      const fixture = pred.fixture as any;
                      if (!fixture) return null;
                      const schoolA = fixture.school_a?.name ?? "?";
                      const schoolB = fixture.school_b?.name ?? "?";
                      const hasScores =
                        fixture.score_a != null && fixture.score_b != null;
                      const actualDiff = hasScores
                        ? Math.abs(fixture.score_a - fixture.score_b)
                        : null;
                      const pts = pred.points_earned ?? 0;
                      const commAvg = communityMap[pred.fixture_id];

                      return (
                        <TableRow key={pred.id}>
                          <TableCell className="text-xs py-2 max-w-[120px]">
                            <span className="line-clamp-2">
                              {schoolA} vs {schoolB}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-center py-2">
                            {hasScores ? (
                              <>
                                {fixture.score_a}-{fixture.score_b}{" "}
                                <span className="text-muted-foreground">
                                  ({actualDiff})
                                </span>
                              </>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-center py-2">
                            <span
                              className={
                                pts >= 5
                                  ? "font-bold text-yellow-500"
                                  : pts >= 3
                                  ? "font-medium text-green-500"
                                  : "text-muted-foreground"
                              }
                            >
                              ±{pred.predicted_margin} → {pts}pts
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-center py-2 text-muted-foreground">
                            {commAvg != null ? `${commAvg}` : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Scoring Guide */}
            <Card className="border-dashed">
              <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground text-sm mb-1">
                  Scoring Guide
                </p>
                <p>🎯 Correct winner = 4 pts</p>
                <p>📏 + Margin within 7 = 5 pts</p>
                <p>💎 + Exact margin = 6 pts</p>
                <p>❌ Wrong winner, margin within 7 = 1 pt</p>
                <p>❌ Wrong winner, margin off = 0 pts</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Logs;
