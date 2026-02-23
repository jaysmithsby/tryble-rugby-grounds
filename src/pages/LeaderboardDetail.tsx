import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Users, Trophy, Target, Hash, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import GlobalHeader from "@/components/GlobalHeader";
import { BottomNav } from "@/components/BottomNav";
import { cn } from "@/lib/utils";
import { BoxWhiskerChart, computeBoxWhisker } from "@/components/ui/BoxWhiskerChart";

const ROWS_PER_PAGE = 20;
const AVAILABLE_SEASONS = [2025, 2026];

type ScoreRow = {
  user_id: string;
  season_points: number;
  predictions_made: number;
  predictions_correct: number;
  rank_global: number | null;
  rank_school: number | null;
  display_name: string | null;
  accuracy: number;
  efficiency: number;
};

const LeaderboardDetail = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [allRows, setAllRows] = useState<ScoreRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [selectedSeason, setSelectedSeason] = useState(2026);
  const [seasonPopoverOpen, setSeasonPopoverOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [type, id, selectedSeason]);

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

      const currentYear = selectedSeason;

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
        .map(s => {
          const made = s.predictions_made ?? 0;
          const correct = s.predictions_correct ?? 0;
          const pts = s.season_points ?? 0;
          return {
            user_id: s.user_id,
            season_points: pts,
            predictions_made: made,
            predictions_correct: correct,
            rank_global: s.rank_global,
            rank_school: s.rank_school,
            display_name: nameMap.get(s.user_id) ?? null,
            accuracy: made > 0 ? (correct / made) * 100 : 0,
            efficiency: made > 0 ? pts / made : 0,
          };
        });

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
    const effs = allRows.filter(r => r.predictions_made > 0).map(r => r.efficiency);
    const userRow = allRows.find(r => r.user_id === currentUserId);
    const userEff = userRow && userRow.predictions_made > 0 ? userRow.efficiency : null;
    return computeBoxWhisker(effs, userEff);
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
          <div className="min-w-0 flex-1">
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
          <Popover open={seasonPopoverOpen} onOpenChange={setSeasonPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 font-medium text-xs shrink-0 h-8 px-2.5"
              >
                <Calendar className="h-3.5 w-3.5" />
                {selectedSeason}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end">
              <div className="flex flex-col gap-1">
                {AVAILABLE_SEASONS.map(year => (
                  <button
                    key={year}
                    onClick={() => {
                      setSelectedSeason(year);
                      setSeasonPopoverOpen(false);
                      setPage(0);
                    }}
                    className={cn(
                      "px-4 py-2 text-sm rounded-md font-medium transition-colors text-left",
                      selectedSeason === year
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    {year} Season
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
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
