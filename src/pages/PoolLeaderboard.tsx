import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, Pen, Copy, ChevronDown, ChevronLeft, ChevronRight, Lock, Clock, Users } from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { PoolInvite } from "@/components/pools/PoolInvite";
import { EditPoolDialog } from "@/components/pools/EditPoolDialog";
import { ScoringInfoCard } from "@/components/pools/ScoringInfoCard";
import { BottomNav } from "@/components/BottomNav";
import { FixtureCard } from "@/components/fixtures/FixtureCard";
import { FixturesDateSelector } from "@/components/fixtures/FixturesDateSelector";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getPoolIconComponent, getPoolColorValue } from "@/components/pools/PoolIconSelector";
import { resolveVenueName } from "@/lib/venueUtils";
import { differenceInMinutes, format, endOfYear } from "date-fns";
import { cn } from "@/lib/utils";

type PoolMember = {
  user_id: string;
  joined_at: string | null;
  display_name: string | null;
  school_name: string | null;
};

type LeaderboardEntry = {
  rank: number;
  userId: string;
  nickname: string;
  points: number;
  accuracy: number;
  picks: number;
};

type PoolHighlights = {
  hilux: { name: string; points: number } | null;
  spud: { name: string; points: number } | null;
};

export const PoolLeaderboard = () => {
  const { poolId } = useParams();
  const { toast } = useToast();

  // Core state
  const [pool, setPool] = useState<any>(null);
  const [members, setMembers] = useState<PoolMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Lock state
  const [isEditable, setIsEditable] = useState(true);
  const [lockReason, setLockReason] = useState<string | undefined>();
  const [lockCountdown, setLockCountdown] = useState<string | null>(null);

  // View state
  const [activeView, setActiveView] = useState<"leaderboard" | "fixtures">("leaderboard");
  const [selectedSeason, setSelectedSeason] = useState(2026);
  const [schoolsOpen, setSchoolsOpen] = useState(false);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [highlights, setHighlights] = useState<PoolHighlights>({ hilux: null, spud: null });
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const LEADERBOARD_PER_PAGE = 20;

  // Fixtures state
  const [poolFixtures, setPoolFixtures] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({ from: new Date(2026, 0, 1), to: endOfYear(new Date(2026, 0, 1)) });
  const [fixturesPage, setFixturesPage] = useState(1);
  const [userPredictions, setUserPredictions] = useState<Record<string, { predictedSchoolId: string; predictedMargin: number }>>({});
  const [hasHistoryMap, setHasHistoryMap] = useState<Record<string, boolean>>({});
  const FIXTURES_PER_PAGE = 8;

  // School IDs resolved from pool school names
  const [poolSchoolIds, setPoolSchoolIds] = useState<string[]>([]);

  useEffect(() => {
    loadCurrentUser();
    loadPoolData();
  }, [poolId]);

  useEffect(() => {
    if (pool && poolSchoolIds.length > 0) {
      loadLeaderboardData();
    }
  }, [poolSchoolIds, selectedSeason, members]);

  useEffect(() => {
    if (pool && poolSchoolIds.length > 0 && activeView === "fixtures") {
      loadFixturesData();
    }
  }, [poolSchoolIds, dateRange, activeView]);

  useEffect(() => {
    setFixturesPage(1);
  }, [dateRange]);

  useEffect(() => {
    setLeaderboardPage(1);
  }, [selectedSeason]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const checkEditableLock = async (poolSchools: string[]) => {
    if (!poolSchools || poolSchools.length === 0) {
      setIsEditable(true);
      setLockReason(undefined);
      return;
    }
    try {
      const { data: schoolsData } = await supabase
        .from("schools")
        .select("id, name")
        .in("name", poolSchools);
      if (!schoolsData || schoolsData.length === 0) { setIsEditable(true); return; }
      const schoolIds = schoolsData.map(s => s.id);
      const now = new Date();
      const { data: fixtures } = await supabase
        .from("fixtures")
        .select("match_date")
        .or(`school_a_id.in.(${schoolIds.join(",")}),school_b_id.in.(${schoolIds.join(",")})`)
        .gte("match_date", now.toISOString())
        .order("match_date", { ascending: true })
        .limit(1);
      if (fixtures && fixtures.length > 0) {
        const firstMatch = new Date(fixtures[0].match_date);
        const minutesUntilMatch = differenceInMinutes(firstMatch, now);
        if (minutesUntilMatch <= 60) {
          setIsEditable(false);
          setLockReason("Pool is locked - match starting soon");
        } else if (minutesUntilMatch <= 120) {
          setIsEditable(true);
          setLockCountdown(`Editing closes in ${minutesUntilMatch - 60} minutes`);
          setLockReason(`Editing closes at ${format(new Date(firstMatch.getTime() - 60 * 60 * 1000), "h:mm a")}`);
        } else {
          setIsEditable(true);
          setLockReason(undefined);
        }
      } else {
        setIsEditable(true);
      }
    } catch (error) {
      console.error("Error checking edit lock:", error);
      setIsEditable(true);
    }
  };

  const loadPoolData = async () => {
    if (!poolId) return;
    setLoading(true);
    try {
      const { data: poolData, error: poolError } = await supabase
        .from("pools")
        .select("*")
        .eq("id", poolId)
        .single();
      if (poolError) throw poolError;
      setPool(poolData);

      await checkEditableLock(poolData.schools || []);

      // Resolve school names to IDs
      if (poolData.schools && poolData.schools.length > 0) {
        const { data: schoolsData } = await supabase
          .from("schools")
          .select("id, name")
          .in("name", poolData.schools);
        setPoolSchoolIds((schoolsData || []).map(s => s.id));
      } else {
        setPoolSchoolIds([]);
      }

      // Load members
      const { data: membersData, error: membersError } = await supabase
        .from("pool_members")
        .select("user_id, joined_at")
        .eq("pool_id", poolId);
      if (membersError) throw membersError;

      const memberIds = membersData?.map(m => m.user_id) || [];
      if (memberIds.length === 0) {
        setMembers([]);
        setLeaderboard([]);
        setHighlights({ hilux: null, spud: null });
        setLoading(false);
        return;
      }

      const { data: profilesData } = await supabase
        .from("profiles_public")
        .select("id, display_name, school_name")
        .in("id", memberIds);

      const profilesMap: Record<string, { display_name: string | null; school_name: string | null }> = {};
      profilesData?.forEach(p => {
        if (p.id) profilesMap[p.id] = { display_name: p.display_name, school_name: p.school_name };
      });

      const membersList: PoolMember[] = membersData.map(m => ({
        user_id: m.user_id,
        joined_at: m.joined_at,
        display_name: profilesMap[m.user_id]?.display_name || null,
        school_name: profilesMap[m.user_id]?.school_name || null,
      }));
      setMembers(membersList);
    } catch (error: any) {
      toast({ title: "Error loading pool", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboardData = async () => {
    if (poolSchoolIds.length === 0 || members.length === 0) return;

    const memberIds = members.map(m => m.user_id);

    try {
      // Get fixtures where BOTH teams are pool schools
      const { data: fixturesData } = await supabase
        .from("fixtures")
        .select("id")
        .in("school_a_id", poolSchoolIds)
        .in("school_b_id", poolSchoolIds)
        .eq("year", selectedSeason);

      const fixtureIds = (fixturesData || []).map(f => f.id);

      if (fixtureIds.length === 0) {
        // No pool-scoped fixtures, show empty leaderboard
        const entries: LeaderboardEntry[] = memberIds.map(userId => ({
          rank: 0,
          userId,
          nickname: members.find(m => m.user_id === userId)?.display_name || "Anonymous",
          points: 0,
          accuracy: 0,
          picks: 0,
        }));
        entries.forEach((e, i) => e.rank = i + 1);
        setLeaderboard(entries);
        setHighlights({ hilux: null, spud: null });
        return;
      }

      // RLS: Users can only see their own predictions. 
      // For the current user, we compute scoped stats. For others, we use user_scores (global).
      // Fetch current user's scoped predictions
      let currentUserScoped: { points: number; accuracy: number; picks: number } | null = null;
      if (currentUserId && memberIds.includes(currentUserId)) {
        const { data: myPreds } = await supabase
          .from("predictions")
          .select("points_earned")
          .eq("user_id", currentUserId)
          .in("fixture_id", fixtureIds);

        if (myPreds) {
          const totalPicks = myPreds.length;
          const totalPoints = myPreds.reduce((s, p) => s + (p.points_earned || 0), 0);
          const correct = myPreds.filter(p => (p.points_earned || 0) > 0).length;
          currentUserScoped = {
            points: totalPoints,
            accuracy: totalPicks > 0 ? Math.round((correct / totalPicks) * 100) : 0,
            picks: totalPicks,
          };
        }
      }

      // For all members, use user_scores as fallback (global points)
      const { data: scoresData } = await supabase
        .from("user_scores")
        .select("user_id, season_points, predictions_made, predictions_correct")
        .in("user_id", memberIds)
        .eq("season_year", selectedSeason);

      // Aggregate season scores per user (sum across weeks)
      const userAgg: Record<string, { points: number; picks: number; correct: number }> = {};
      scoresData?.forEach(s => {
        if (!userAgg[s.user_id]) userAgg[s.user_id] = { points: 0, picks: 0, correct: 0 };
        userAgg[s.user_id].points = s.season_points || 0; // season_points is already cumulative
        userAgg[s.user_id].picks += s.predictions_made || 0;
        userAgg[s.user_id].correct += s.predictions_correct || 0;
      });

      const entries: LeaderboardEntry[] = memberIds.map(userId => {
        const member = members.find(m => m.user_id === userId);
        // Use scoped data for current user, global for others
        if (userId === currentUserId && currentUserScoped) {
          return {
            rank: 0,
            userId,
            nickname: member?.display_name || "Anonymous",
            points: currentUserScoped.points,
            accuracy: currentUserScoped.accuracy,
            picks: currentUserScoped.picks,
          };
        }
        const agg = userAgg[userId];
        return {
          rank: 0,
          userId,
          nickname: member?.display_name || "Anonymous",
          points: agg?.points || 0,
          accuracy: agg?.picks ? Math.round(((agg.correct || 0) / agg.picks) * 100) : 0,
          picks: agg?.picks || 0,
        };
      });

      entries.sort((a, b) => b.points - a.points);
      entries.forEach((e, i) => e.rank = i + 1);
      setLeaderboard(entries);

      // Highlights
      if (entries.length >= 2 && entries[0].points > 0) {
        const activeEntries = entries.filter(e => e.points > 0);
        const spud = activeEntries.length >= 2 ? activeEntries[activeEntries.length - 1] : null;
        setHighlights({
          hilux: { name: entries[0].nickname, points: entries[0].points },
          spud: spud && spud.userId !== entries[0].userId ? { name: spud.nickname, points: spud.points } : null,
        });
      } else if (entries.length >= 1 && entries[0].points > 0) {
        setHighlights({ hilux: { name: entries[0].nickname, points: entries[0].points }, spud: null });
      } else {
        setHighlights({ hilux: null, spud: null });
      }
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    }
  };

  const loadFixturesData = async () => {
    if (poolSchoolIds.length === 0) return;

    try {
      const { data: fixturesData } = await supabase
        .from("fixtures")
        .select(`
          id, match_date, venue_type, venue_id, school_a_id, school_b_id, status, score_a, score_b,
          school_a:schools!fixtures_school_a_id_fkey(id, name, slug, jersey_url, province),
          school_b:schools!fixtures_school_b_id_fkey(id, name, slug, jersey_url, province),
          tournament:tournaments(id, name)
        `)
        .or(`school_a_id.in.(${poolSchoolIds.join(",")}),school_b_id.in.(${poolSchoolIds.join(",")})`)
        .gte("match_date", dateRange.from.toISOString())
        .lte("match_date", dateRange.to.toISOString())
        .order("match_date", { ascending: true });

      setPoolFixtures(fixturesData || []);

      // Load predictions for current user
      if (currentUserId && fixturesData && fixturesData.length > 0) {
        const ids = fixturesData.map(f => f.id);
        const { data: preds } = await supabase
          .from("predictions")
          .select("fixture_id, predicted_school_id, predicted_margin")
          .eq("user_id", currentUserId)
          .in("fixture_id", ids);
        if (preds) {
          const predsMap: Record<string, { predictedSchoolId: string; predictedMargin: number }> = {};
          preds.forEach(p => {
            predsMap[p.fixture_id] = { predictedSchoolId: p.predicted_school_id, predictedMargin: p.predicted_margin };
          });
          setUserPredictions(predsMap);
        }
      }
    } catch (error) {
      console.error("Error loading fixtures:", error);
    }
  };

  const handleCopyCode = () => {
    if (pool?.invite_code) {
      navigator.clipboard.writeText(pool.invite_code);
      sonnerToast("Code copied!");
    }
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-600/20 to-yellow-500/10 border-yellow-600/30";
    if (rank === 2) return "bg-gradient-to-r from-gray-400/20 to-gray-300/10 border-gray-400/30";
    if (rank === 3) return "bg-gradient-to-r from-amber-700/20 to-amber-600/10 border-amber-700/30";
    return "";
  };

  // Pagination
  const filteredFixtures = useMemo(() => poolFixtures, [poolFixtures]);
  const totalFixturePages = Math.max(1, Math.ceil(filteredFixtures.length / FIXTURES_PER_PAGE));
  const paginatedFixtures = filteredFixtures.slice(
    (fixturesPage - 1) * FIXTURES_PER_PAGE,
    fixturesPage * FIXTURES_PER_PAGE
  );

  const totalLeaderboardPages = Math.max(1, Math.ceil(leaderboard.length / LEADERBOARD_PER_PAGE));
  const paginatedLeaderboard = leaderboard.slice(
    (leaderboardPage - 1) * LEADERBOARD_PER_PAGE,
    leaderboardPage * LEADERBOARD_PER_PAGE
  );

  const currentUserEntry = leaderboard.find(e => e.userId === currentUserId);
  const isAdmin = currentUserId === pool?.creator_id;

  const PoolIcon = pool ? getPoolIconComponent(pool.icon_id || "trophy") : null;
  const poolColor = pool ? getPoolColorValue(pool.color_id || "green") : "#10B981";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading pool...</p>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Pool not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <GlobalHeader />

      {/* ===== COMPACT HEADER ===== */}
      <div className="px-4 pt-4 pb-2 max-w-7xl mx-auto space-y-1">
        {/* Row 1: Icon + Name + Actions */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0"
            style={{ borderColor: poolColor, backgroundColor: `${poolColor}15` }}
          >
            {PoolIcon && <PoolIcon className="w-4 h-4" style={{ color: poolColor }} />}
          </div>
          <h1 className="text-lg font-bold truncate flex-1">{pool.name}</h1>
          <PoolInvite
            poolName={pool.name}
            inviteCode={pool.invite_code}
            triggerElement={
              <button type="button" className="p-1.5 hover:opacity-80 transition-opacity shrink-0">
                <Share2 className="w-5 h-5 text-muted-foreground" />
              </button>
            }
          />
          {isAdmin && (
            <EditPoolDialog
              pool={{ id: pool.id, name: pool.name, icon_id: pool.icon_id, color_id: pool.color_id, schools: pool.schools }}
              isEditable={isEditable}
              lockReason={lockReason}
              onPoolUpdated={loadPoolData}
              triggerElement={
                <button type="button" className="p-1.5 hover:opacity-80 transition-opacity shrink-0">
                  <Pen className="w-4 h-4 text-muted-foreground" />
                </button>
              }
            />
          )}
        </div>

        {/* Row 2: Metadata */}
        <div className="flex items-center gap-2 pl-11 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1 font-mono hover:text-foreground transition-colors"
          >
            Code: {pool.invite_code}
            <Copy className="w-3 h-3" />
          </button>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {members.length} Participants
          </span>
        </div>

        {/* Collapsible Schools */}
        {pool.schools && pool.schools.length > 0 && (
          <Collapsible open={schoolsOpen} onOpenChange={setSchoolsOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 pl-11 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
              >
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", schoolsOpen && "rotate-180")} />
                Schools in Pool ({pool.schools.length})
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-wrap gap-1.5 pl-11 mt-2">
                {pool.schools.map((school: string) => (
                  <Badge key={school} variant="outline" className="text-xs h-6 px-2">
                    {school}
                  </Badge>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Lock warnings */}
        {!isEditable && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mt-2">
            <Lock className="w-3.5 h-3.5" />
            <span>Pool locked for this week's matches</span>
          </div>
        )}
        {lockCountdown && isEditable && (
          <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 rounded-lg px-3 py-2 mt-2">
            <Clock className="w-3.5 h-3.5" />
            <span>{lockCountdown}</span>
          </div>
        )}
      </div>

      {/* ===== MODE TOGGLE ===== */}
      <div className="flex gap-2 justify-center px-4 py-3">
        <Button
          variant={activeView === "leaderboard" ? "default" : "outline"}
          onClick={() => setActiveView("leaderboard")}
          size="sm"
        >
          Leaderboard
        </Button>
        <Button
          variant={activeView === "fixtures" ? "default" : "outline"}
          onClick={() => setActiveView("fixtures")}
          size="sm"
        >
          Fixtures
        </Button>
      </div>

      {/* ===== HIGHLIGHTS BANNER (leaderboard only) ===== */}
      {activeView === "leaderboard" && (
        highlights.hilux ? (
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border/40">
            <div className="container mx-auto px-4 py-2">
              <div className="flex items-center justify-center gap-6 text-xs flex-wrap">
                <span>🚙 <strong>Hilux:</strong> {highlights.hilux.name} ({highlights.hilux.points} brags)</span>
                {highlights.spud && (
                  <span>🥔 <strong>Spud:</strong> {highlights.spud.name} ({highlights.spud.points} brags)</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border/40">
            <div className="container mx-auto px-4 py-2 text-center text-xs text-muted-foreground">
              Weekly highlights appear after matches are scored
            </div>
          </div>
        )
      )}

      <main className="px-4 py-4 space-y-4 max-w-7xl mx-auto">

        {/* ===== LEADERBOARD VIEW ===== */}
        {activeView === "leaderboard" && (
          <>
            {/* Season Selector */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground">Rankings</h2>
              <div className="flex gap-1">
                {[2025, 2026].map(year => (
                  <Button
                    key={year}
                    variant={selectedSeason === year ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-3"
                    onClick={() => setSelectedSeason(year)}
                  >
                    {year}
                  </Button>
                ))}
              </div>
            </div>

            {/* Leaderboard Table */}
            {paginatedLeaderboard.length > 0 ? (
              <div className="space-y-1">
                {/* Header */}
                <div className="grid grid-cols-[2rem_1fr_3rem_3rem_3rem] gap-2 px-3 py-1.5 text-[10px] uppercase text-muted-foreground font-semibold">
                  <span>#</span>
                  <span>User</span>
                  <span className="text-right">Pts</span>
                  <span className="text-right">Acc%</span>
                  <span className="text-right">Picks</span>
                </div>

                {paginatedLeaderboard.map((entry) => (
                  <div
                    key={entry.userId}
                    className={cn(
                      "grid grid-cols-[2rem_1fr_3rem_3rem_3rem] gap-2 px-3 py-2.5 rounded-lg border items-center",
                      entry.userId === currentUserId ? "border-primary bg-primary/5" : "border-border/40",
                      getRankStyle(entry.rank)
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs",
                      entry.rank <= 3 ? "bg-background/80" : "bg-muted"
                    )}>
                      {entry.rank}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium truncate block">
                        {entry.nickname}
                        {entry.userId === currentUserId && (
                          <Badge variant="secondary" className="text-[9px] h-3.5 px-1 ml-1.5 align-middle">You</Badge>
                        )}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-right">{entry.points}</span>
                    <span className="text-xs text-muted-foreground text-right">{entry.accuracy}%</span>
                    <span className="text-xs text-muted-foreground text-right">{entry.picks}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No scores recorded yet for {selectedSeason}
              </div>
            )}

            {/* Leaderboard Pagination */}
            {totalLeaderboardPages > 1 && (
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={() => setLeaderboardPage(p => Math.max(1, p - 1))}
                  disabled={leaderboardPage === 1}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                <span className="text-xs text-muted-foreground">
                  {leaderboardPage} / {totalLeaderboardPages}
                </span>
                <button
                  onClick={() => setLeaderboardPage(p => Math.min(totalLeaderboardPages, p + 1))}
                  disabled={leaderboardPage === totalLeaderboardPages}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <ScoringInfoCard />
          </>
        )}

        {/* ===== FIXTURES VIEW ===== */}
        {activeView === "fixtures" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground">Pool Fixtures</h2>
              <FixturesDateSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
            </div>

            {paginatedFixtures.length > 0 ? (
              <>
                <div className="space-y-3">
                  {paginatedFixtures.map((f) => {
                    const pred = userPredictions[f.id];
                    return (
                      <FixtureCard
                        key={f.id}
                        homeTeam={f.school_a?.name || "TBD"}
                        awayTeam={f.school_b?.name || "TBD"}
                        homeTeamShort={f.school_a?.name?.substring(0, 3) || "TBD"}
                        awayTeamShort={f.school_b?.name?.substring(0, 3) || "TBD"}
                        homeTeamIcon={f.school_a?.jersey_url}
                        awayTeamIcon={f.school_b?.jersey_url}
                        homeSchoolId={f.school_a_id}
                        awaySchoolId={f.school_b_id}
                        homeSchoolSlug={f.school_a?.slug}
                        awaySchoolSlug={f.school_b?.slug}
                        matchDate={f.match_date}
                        time=""
                        venue={resolveVenueName(f)}
                        tournamentName={f.tournament?.name}
                        matchId={f.id}
                        isPredicted={!!pred}
                        predictedSchoolId={pred?.predictedSchoolId}
                        predictedMargin={pred?.predictedMargin}
                        onPredictionMade={(schoolId, margin) => {
                          setUserPredictions(prev => ({
                            ...prev,
                            [f.id]: { predictedSchoolId: schoolId, predictedMargin: margin }
                          }));
                        }}
                        hasHistory={hasHistoryMap[f.id]}
                      />
                    );
                  })}
                </div>

                {totalFixturePages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => setFixturesPage(p => Math.max(1, p - 1))}
                      disabled={fixturesPage === 1}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {fixturesPage} / {totalFixturePages}
                    </span>
                    <button
                      onClick={() => setFixturesPage(p => Math.min(totalFixturePages, p + 1))}
                      disabled={fixturesPage === totalFixturePages}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">
                No fixtures found for this period
              </p>
            )}
          </>
        )}
      </main>

      {/* ===== STICKY USER FOOTER ===== */}
      {activeView === "leaderboard" && currentUserEntry && (
        <div className="fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur border-t border-border/40 z-40">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {currentUserEntry.rank}
              </div>
              <span className="text-sm font-medium">Your Standings</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span><strong className="text-foreground">{currentUserEntry.points}</strong> pts</span>
              <span>{currentUserEntry.accuracy}% acc</span>
              <span>{currentUserEntry.picks} picks</span>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};
