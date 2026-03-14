import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Share2, Pen, Copy, ChevronDown, ChevronLeft, ChevronRight, Users, Trophy, Hash, Calendar } from "lucide-react";
import { BoxWhiskerChart, computeBoxWhisker } from "@/components/ui/BoxWhiskerChart";
import GlobalHeader from "@/components/GlobalHeader";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { PoolInvite } from "@/components/pools/PoolInvite";
import { EditPoolDialog } from "@/components/pools/EditPoolDialog";
import { ScoringInfoCard } from "@/components/pools/ScoringInfoCard";
import { BottomNav } from "@/components/BottomNav";
import { FixtureCard } from "@/components/fixtures/FixtureCard";
import { SwipeableFixtureCard } from "@/components/fixtures/SwipeableFixtureCard";
import { FixturesDateSelector } from "@/components/fixtures/FixturesDateSelector";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getPoolIconComponent, getPoolColorValue } from "@/components/pools/PoolIconSelector";
import { resolveVenueName } from "@/lib/venueUtils";
import { endOfYear } from "date-fns";
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

const LEADERBOARD_PER_PAGE = 20;
const FIXTURES_PER_PAGE = 8;
const AVAILABLE_SEASONS = [2025, 2026];

export const PoolLeaderboard = () => {
  const { poolId } = useParams();
  const { toast } = useToast();

  // Core state
  const [pool, setPool] = useState<any>(null);
  const [members, setMembers] = useState<PoolMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);



  // View state
  const [activeView, setActiveView] = useState<"leaderboard" | "fixtures">("leaderboard");
  const [selectedSeason, setSelectedSeason] = useState(2026);
  const [schoolsOpen, setSchoolsOpen] = useState(false);
  const [seasonPopoverOpen, setSeasonPopoverOpen] = useState(false);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardPage, setLeaderboardPage] = useState(1);

  // Fixtures state
  const [poolFixtures, setPoolFixtures] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({ from: new Date(2026, 0, 1), to: endOfYear(new Date(2026, 0, 1)) });
  const [fixturesPage, setFixturesPage] = useState(1);
  const [userPredictions, setUserPredictions] = useState<Record<string, { predictedSchoolId: string; predictedMargin: number }>>({});
  const [hasHistoryMap, setHasHistoryMap] = useState<Record<string, boolean>>({});
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

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

  useEffect(() => { setFixturesPage(1); setDismissedIds(new Set()); }, [dateRange]);
  useEffect(() => { setLeaderboardPage(1); }, [selectedSeason]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };



  const loadPoolData = async () => {
    if (!poolId) return;
    setLoading(true);
    try {
      const { data: poolData, error: poolError } = await supabase
        .from("pools").select("*").eq("id", poolId).single();
      if (poolError) throw poolError;
      setPool(poolData);



      if (poolData.schools && poolData.schools.length > 0) {
        const { data: schoolsData } = await supabase
          .from("schools").select("id, name").in("name", poolData.schools);
        setPoolSchoolIds((schoolsData || []).map(s => s.id));
      } else {
        setPoolSchoolIds([]);
      }

      const { data: membersData, error: membersError } = await supabase
        .from("pool_members").select("user_id, joined_at").eq("pool_id", poolId);
      if (membersError) throw membersError;

      const memberIds = membersData?.map(m => m.user_id) || [];
      if (memberIds.length === 0) {
        setMembers([]);
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      const { data: profilesData } = await supabase
        .from("profiles_public").select("id, display_name, school_name").in("id", memberIds);

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
      const { data: fixturesData } = await supabase
        .from("fixtures").select("id")
        .in("school_a_id", poolSchoolIds)
        .in("school_b_id", poolSchoolIds)
        .eq("year", selectedSeason);

      const fixtureIds = (fixturesData || []).map(f => f.id);

      if (fixtureIds.length === 0) {
        const entries: LeaderboardEntry[] = memberIds.map(userId => ({
          rank: 0, userId,
          nickname: members.find(m => m.user_id === userId)?.display_name || "Anonymous",
          points: 0, accuracy: 0, picks: 0,
        }));
        entries.forEach((e, i) => e.rank = i + 1);
        setLeaderboard(entries);
        return;
      }

      let currentUserScoped: { points: number; accuracy: number; picks: number } | null = null;
      if (currentUserId && memberIds.includes(currentUserId)) {
        const { data: myPreds } = await supabase
          .from("predictions").select("points_earned")
          .eq("user_id", currentUserId).in("fixture_id", fixtureIds);
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

      // Get all predictions for pool fixtures by pool members
      const { data: allPreds } = await supabase
        .from("predictions").select("user_id, points_earned")
        .in("user_id", memberIds).in("fixture_id", fixtureIds);

      const userAgg: Record<string, { points: number; picks: number; correct: number }> = {};
      allPreds?.forEach(p => {
        if (!userAgg[p.user_id]) userAgg[p.user_id] = { points: 0, picks: 0, correct: 0 };
        userAgg[p.user_id].points += p.points_earned || 0;
        userAgg[p.user_id].picks += 1;
        if ((p.points_earned || 0) >= 4) userAgg[p.user_id].correct += 1;
      });

      const entries: LeaderboardEntry[] = memberIds.map(userId => {
        const member = members.find(m => m.user_id === userId);
        if (userId === currentUserId && currentUserScoped) {
          return {
            rank: 0, userId,
            nickname: member?.display_name || "Anonymous",
            points: currentUserScoped.points,
            accuracy: currentUserScoped.accuracy,
            picks: currentUserScoped.picks,
          };
        }
        const agg = userAgg[userId];
        return {
          rank: 0, userId,
          nickname: member?.display_name || "Anonymous",
          points: agg?.points || 0,
          accuracy: agg?.picks ? Math.round(((agg.correct || 0) / agg.picks) * 100) : 0,
          picks: agg?.picks || 0,
        };
      });

      entries.sort((a, b) => b.points - a.points);
      entries.forEach((e, i) => e.rank = i + 1);
      setLeaderboard(entries);
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
        .eq("is_visible", true)
        .eq("venue_type", "school")
        .or(`school_a_id.in.(${poolSchoolIds.join(",")}),school_b_id.in.(${poolSchoolIds.join(",")})`)
        .gte("match_date", dateRange.from.toISOString())
        .lte("match_date", dateRange.to.toISOString())
        .order("match_date", { ascending: true });

      setPoolFixtures(fixturesData || []);

      if (currentUserId && fixturesData && fixturesData.length > 0) {
        const ids = fixturesData.map(f => f.id);
        const { data: preds } = await supabase
          .from("predictions").select("fixture_id, predicted_school_id, predicted_margin")
          .eq("user_id", currentUserId).in("fixture_id", ids);
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

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  };

  // Pagination
  const totalFixturePages = Math.max(1, Math.ceil(poolFixtures.length / FIXTURES_PER_PAGE));
  const paginatedFixtures = poolFixtures.slice(
    (fixturesPage - 1) * FIXTURES_PER_PAGE,
    fixturesPage * FIXTURES_PER_PAGE
  );

  const totalLeaderboardPages = Math.max(1, Math.ceil(leaderboard.length / LEADERBOARD_PER_PAGE));
  const paginatedLeaderboard = leaderboard.slice(
    (leaderboardPage - 1) * LEADERBOARD_PER_PAGE,
    leaderboardPage * LEADERBOARD_PER_PAGE
  );

  const currentUserEntry = leaderboard.find(e => e.userId === currentUserId);
  const currentUserIndex = leaderboard.findIndex(e => e.userId === currentUserId);
  const currentUserPage = currentUserIndex >= 0 ? Math.floor(currentUserIndex / LEADERBOARD_PER_PAGE) + 1 : -1;
  const userOnCurrentPage = currentUserPage === leaderboardPage;
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

      {/* ===== COMPACT HEADER (matches SchoolProfile / Tournament) ===== */}
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



      </div>

      {/* ===== MODE TOGGLE ===== */}
      <div className="flex gap-2 px-4 py-3">
        <Button
          variant={activeView === "leaderboard" ? "default" : "outline"}
          onClick={() => setActiveView("leaderboard")}
          size="sm"
          className="flex-1"
        >
          Leaderboard
        </Button>
        <Button
          variant={activeView === "fixtures" ? "default" : "outline"}
          onClick={() => setActiveView("fixtures")}
          size="sm"
          className="flex-1"
        >
          Fixtures
        </Button>
      </div>

      <main className="px-4 py-4 space-y-4 max-w-7xl mx-auto">

        {/* ===== LEADERBOARD VIEW ===== */}
        {activeView === "leaderboard" && (
          <>
            {/* Header row with season popover */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground">Rankings</h2>
              <Popover open={seasonPopoverOpen} onOpenChange={setSeasonPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 font-medium text-xs shrink-0 h-8 px-2.5"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    {selectedSeason} Season
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

            {/* Box & Whisker - Points Efficiency */}
            {(() => {
              const withPicks = leaderboard.filter(e => e.picks > 0);
              const effs = withPicks.map(e => e.points / e.picks);
              const userEntry = leaderboard.find(e => e.userId === currentUserId);
              const userEff = userEntry && userEntry.picks > 0 ? userEntry.points / userEntry.picks : null;
              const stats = computeBoxWhisker(effs, userEff);
              return stats ? <BoxWhiskerChart stats={stats} /> : null;
            })()}

            {/* Leaderboard Table (same as LeaderboardDetail) */}
            {paginatedLeaderboard.length > 0 ? (
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
                  {paginatedLeaderboard.map((entry, idx) => {
                    const rank = (leaderboardPage - 1) * LEADERBOARD_PER_PAGE + idx + 1;
                    const isCurrentUser = entry.userId === currentUserId;
                    return (
                      <div
                        key={entry.userId}
                        className={cn(
                          "grid grid-cols-[2.5rem_1fr_3.5rem_3.5rem_3rem] gap-1 px-3 py-2 items-center text-sm",
                          isCurrentUser && "bg-primary/10"
                        )}
                      >
                        <span className="text-xs text-muted-foreground font-medium">{rank}</span>
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-6 w-6 text-[10px]">
                            <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                              {getInitials(entry.nickname)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate text-xs font-medium">{entry.nickname}</span>
                        </div>
                        <span className="text-right text-xs font-semibold">{entry.points}</span>
                        <span className="text-right text-xs text-muted-foreground">{entry.accuracy}%</span>
                        <span className="text-right text-xs text-muted-foreground">{entry.picks}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalLeaderboardPages > 1 && (
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/30 text-xs">
                    <Button
                      variant="ghost" size="sm" className="h-7 text-xs"
                      disabled={leaderboardPage === 1}
                      onClick={() => setLeaderboardPage(p => p - 1)}
                    >
                      Prev
                    </Button>
                    <span className="text-muted-foreground">Page {leaderboardPage} of {totalLeaderboardPages}</span>
                    <Button
                      variant="ghost" size="sm" className="h-7 text-xs"
                      disabled={leaderboardPage >= totalLeaderboardPages}
                      onClick={() => setLeaderboardPage(p => p + 1)}
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
                      <SwipeableFixtureCard
                        key={f.id}
                        fixtureId={f.id}
                        onDismiss={(id) => setDismissedIds(prev => new Set(prev).add(id))}
                      >
                        <FixtureCard
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
                      </SwipeableFixtureCard>
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
      {activeView === "leaderboard" && currentUserEntry && !userOnCurrentPage && (
        <div className="fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur border-t border-border px-4 py-2 flex items-center justify-between z-40">
          <div className="text-xs">
            <span className="font-semibold">Your Standings: </span>
            <span className="text-muted-foreground">
              Rank #{currentUserEntry.rank} · {currentUserEntry.accuracy}% · {currentUserEntry.points} pts
            </span>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setLeaderboardPage(currentUserPage)}>
            Jump
          </Button>
        </div>
      )}

      <BottomNav />
    </div>
  );
};
