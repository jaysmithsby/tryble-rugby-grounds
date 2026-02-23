import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Users, Trophy, Target, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import GlobalHeader from "@/components/GlobalHeader";
import { BottomNav } from "@/components/BottomNav";

const ROWS_PER_PAGE = 20;

type ScoreRow = {
  user_id: string;
  season_points: number;
  predictions_made: number;
  predictions_correct: number;
  rank_global: number | null;
  rank_school: number | null;
  display_name: string | null;
  accuracy: number;
};

type BoxWhiskerStats = {
  min: number;
  max: number;
  q1: number;
  median: number;
  q3: number;
  userAccuracy: number | null;
};

function computeBoxWhisker(accuracies: number[], userAcc: number | null): BoxWhiskerStats | null {
  if (accuracies.length === 0) return null;
  const sorted = [...accuracies].sort((a, b) => a - b);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    q1: sorted[Math.floor(sorted.length * 0.25)],
    median: sorted[Math.floor(sorted.length * 0.5)],
    q3: sorted[Math.floor(sorted.length * 0.75)],
    userAccuracy: userAcc,
  };
}

function BoxWhiskerChart({ stats }: { stats: BoxWhiskerStats }) {
  const pad = 16;
  const chartWidth = 100; // percentage-based
  const toX = (val: number) => `${Math.max(0, Math.min(100, val))}%`;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <h3 className="text-xs font-semibold text-muted-foreground mb-3">Pool Performance Distribution</h3>
      <svg viewBox={`0 0 400 60`} className="w-full h-[60px]" preserveAspectRatio="xMidYMid meet">
        {/* Background track */}
        <rect x="20" y="22" width="360" height="16" rx="8" fill="hsl(var(--muted))" />

        {/* Whisker line: min to max */}
        <line
          x1={20 + (stats.min / 100) * 360}
          x2={20 + (stats.max / 100) * 360}
          y1="30" y2="30"
          stroke="hsl(var(--muted-foreground))" strokeWidth="1.5"
        />

        {/* Min cap */}
        <line
          x1={20 + (stats.min / 100) * 360}
          x2={20 + (stats.min / 100) * 360}
          y1="24" y2="36"
          stroke="hsl(var(--muted-foreground))" strokeWidth="1.5"
        />

        {/* Max cap */}
        <line
          x1={20 + (stats.max / 100) * 360}
          x2={20 + (stats.max / 100) * 360}
          y1="24" y2="36"
          stroke="hsl(var(--muted-foreground))" strokeWidth="1.5"
        />

        {/* IQR box */}
        <rect
          x={20 + (stats.q1 / 100) * 360}
          y="20"
          width={((stats.q3 - stats.q1) / 100) * 360}
          height="20"
          rx="3"
          fill="hsl(var(--primary) / 0.2)"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
        />

        {/* Median line */}
        <line
          x1={20 + (stats.median / 100) * 360}
          x2={20 + (stats.median / 100) * 360}
          y1="18" y2="42"
          stroke="hsl(var(--primary))" strokeWidth="2"
        />

        {/* User marker (triangle) */}
        {stats.userAccuracy !== null && (
          <polygon
            points={`${20 + (stats.userAccuracy / 100) * 360},14 ${20 + (stats.userAccuracy / 100) * 360 - 5},6 ${20 + (stats.userAccuracy / 100) * 360 + 5},6`}
            fill="hsl(var(--accent-foreground))"
          />
        )}

        {/* Labels */}
        <text x={20 + (stats.min / 100) * 360} y="54" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">{stats.min.toFixed(0)}%</text>
        <text x={20 + (stats.max / 100) * 360} y="54" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">{stats.max.toFixed(0)}%</text>
        {stats.userAccuracy !== null && (
          <text x={20 + (stats.userAccuracy / 100) * 360} y="4" textAnchor="middle" fontSize="8" fontWeight="bold" fill="hsl(var(--accent-foreground))">You</text>
        )}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
        <span>Min</span>
        <span>Q1: {stats.q1.toFixed(0)}%</span>
        <span>Median: {stats.median.toFixed(0)}%</span>
        <span>Q3: {stats.q3.toFixed(0)}%</span>
        <span>Max</span>
      </div>
    </div>
  );
}

const LeaderboardDetail = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [allRows, setAllRows] = useState<ScoreRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    loadData();
  }, [type, id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      // Determine title
      if (type === "school" && id && id !== "all") {
        const { data: school } = await supabase.from("schools").select("name").eq("id", id).single();
        setTitle(school?.name ?? "School Leaderboard");
      } else {
        setTitle("Global Leaderboard");
      }

      const currentYear = new Date().getFullYear();

      // Get user filter for school type
      let userFilter: string[] | null = null;
      if (type === "school" && id && id !== "all") {
        const { data: profiles } = await supabase.from("profiles").select("id").eq("school_id", id);
        userFilter = profiles?.map(p => p.id) || [];
        if (userFilter.length === 0) {
          setAllRows([]);
          setLoading(false);
          return;
        }
      }

      // Fetch scores — get latest week per user by ordering
      let query = supabase
        .from("user_scores")
        .select("user_id, season_points, predictions_made, predictions_correct, rank_global, rank_school")
        .eq("season_year", currentYear)
        .order("season_points", { ascending: false });

      if (userFilter) {
        query = query.in("user_id", userFilter);
      }

      const { data: scoresRaw } = await query;
      if (!scoresRaw || scoresRaw.length === 0) {
        setAllRows([]);
        setLoading(false);
        return;
      }

      // Deduplicate: keep highest season_points per user
      const userMap = new Map<string, typeof scoresRaw[0]>();
      for (const s of scoresRaw) {
        const existing = userMap.get(s.user_id);
        if (!existing || (s.season_points ?? 0) > (existing.season_points ?? 0)) {
          userMap.set(s.user_id, s);
        }
      }
      const dedupedScores = Array.from(userMap.values());

      // Fetch display names
      const userIds = dedupedScores.map(s => s.user_id);
      const { data: profilesPublic } = await supabase
        .from("profiles_public")
        .select("id, display_name")
        .in("id", userIds);

      const nameMap = new Map<string, string>();
      profilesPublic?.forEach(p => {
        if (p.id && p.display_name) nameMap.set(p.id, p.display_name);
      });

      // Build rows sorted by season_points DESC
      const rows: ScoreRow[] = dedupedScores
        .sort((a, b) => (b.season_points ?? 0) - (a.season_points ?? 0))
        .map(s => ({
          user_id: s.user_id,
          season_points: s.season_points ?? 0,
          predictions_made: s.predictions_made ?? 0,
          predictions_correct: s.predictions_correct ?? 0,
          rank_global: s.rank_global,
          rank_school: s.rank_school,
          display_name: nameMap.get(s.user_id) ?? null,
          accuracy: (s.predictions_made ?? 0) > 0
            ? ((s.predictions_correct ?? 0) / (s.predictions_made ?? 0)) * 100
            : 0,
        }));

      setAllRows(rows);
    } catch (err) {
      console.error("LeaderboardDetail load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(allRows.length / ROWS_PER_PAGE));
  const pageRows = allRows.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

  const avgAccuracy = useMemo(() => {
    if (allRows.length === 0) return 0;
    return allRows.reduce((sum, r) => sum + r.accuracy, 0) / allRows.length;
  }, [allRows]);

  const boxStats = useMemo(() => {
    const accs = allRows.map(r => r.accuracy);
    const userRow = allRows.find(r => r.user_id === currentUserId);
    return computeBoxWhisker(accs, userRow?.accuracy ?? null);
  }, [allRows, currentUserId]);

  const currentUserRow = allRows.find(r => r.user_id === currentUserId);
  const currentUserIndex = allRows.findIndex(r => r.user_id === currentUserId);
  const currentUserPage = currentUserIndex >= 0 ? Math.floor(currentUserIndex / ROWS_PER_PAGE) : -1;
  const userOnCurrentPage = currentUserPage === page;
  const userRank = currentUserIndex >= 0 ? currentUserIndex + 1 : null;

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <GlobalHeader />
        <main className="container mx-auto px-4 py-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-[60px] w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <GlobalHeader />

      <main className="container mx-auto px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate("/pools")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold truncate">{title}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {allRows.length.toLocaleString()} players
              </span>
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                Avg Accuracy: {avgAccuracy.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Box-and-Whisker */}
        {boxStats && <BoxWhiskerChart stats={boxStats} />}

        {/* Ranking Table */}
        {allRows.length > 0 ? (
          <div className="rounded-lg border border-border overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2.5rem_1fr_3.5rem_3.5rem_3rem] gap-1 px-3 py-2 bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase">
              <span><Hash className="w-3 h-3 inline" /></span>
              <span>User</span>
              <span className="text-right">Pts</span>
              <span className="text-right">Acc%</span>
              <span className="text-right">Picks</span>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-border/40">
              {pageRows.map((row, idx) => {
                const rank = page * ROWS_PER_PAGE + idx + 1;
                const isCurrentUser = row.user_id === currentUserId;
                return (
                  <div
                    key={row.user_id}
                    className={`grid grid-cols-[2.5rem_1fr_3.5rem_3.5rem_3rem] gap-1 px-3 py-2 items-center text-sm ${
                      isCurrentUser ? "bg-primary/10" : ""
                    }`}
                  >
                    <span className="text-xs text-muted-foreground font-medium">{rank}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-6 w-6 text-[10px]">
                        <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                          {getInitials(row.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-xs font-medium">
                        {row.display_name ?? "Anonymous"}
                      </span>
                    </div>
                    <span className="text-right text-xs font-semibold">{row.season_points}</span>
                    <span className="text-right text-xs text-muted-foreground">{row.accuracy.toFixed(0)}%</span>
                    <span className="text-right text-xs text-muted-foreground">{row.predictions_made}</span>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30 text-xs">
                <Button
                  variant="ghost" size="sm" className="h-7 text-xs"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  Prev
                </Button>
                <span className="text-muted-foreground">Page {page + 1} of {totalPages}</span>
                <Button
                  variant="ghost" size="sm" className="h-7 text-xs"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold mb-1">No rankings yet</h3>
            <p className="text-sm text-muted-foreground">Rankings will appear once predictions are scored.</p>
          </div>
        )}
      </main>

      {/* Sticky Footer */}
      {currentUserRow && !userOnCurrentPage && (
        <div className="fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur border-t border-border px-4 py-2 flex items-center justify-between z-40">
          <div className="text-xs">
            <span className="font-semibold">Your Standings: </span>
            <span className="text-muted-foreground">
              Rank #{userRank} · {currentUserRow.accuracy.toFixed(0)}% · {currentUserRow.season_points} pts
            </span>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPage(currentUserPage)}>
            Jump
          </Button>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default LeaderboardDetail;
