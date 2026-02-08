import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PoolInvite } from "@/components/pools/PoolInvite";
import { PoolVoting } from "@/components/pools/PoolVoting";
import { BottomNav } from "@/components/BottomNav";
import { getISOWeek } from "date-fns";

type LeaderboardEntry = {
  rank: number;
  userId: string;
  nickname: string;
  schoolCode: string;
  points: number;
  badges?: string[];
};

type PoolHighlights = {
  hilux: { name: string; points: number } | null;
  spud: { name: string; points: number } | null;
};

export const PoolLeaderboard = () => {
  const { poolId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [period, setPeriod] = useState<"weekly" | "season">("weekly");
  const [pool, setPool] = useState<any>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [highlights, setHighlights] = useState<PoolHighlights>({ hilux: null, spud: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPoolData();
  }, [poolId, period]);

  const getSchoolCode = (schoolName: string) => {
    if (!schoolName) return "";
    const words = schoolName.split(" ");
    if (words.length === 1) return schoolName.substring(0, 3).toUpperCase();
    return words.map(w => w[0]).join("").toUpperCase();
  };

  const loadPoolData = async () => {
    if (!poolId) return;
    
    setLoading(true);
    const currentWeek = getISOWeek(new Date());
    const currentYear = new Date().getFullYear();

    try {
      // Load pool details
      const { data: poolData, error: poolError } = await supabase
        .from("pools")
        .select("*")
        .eq("id", poolId)
        .single();

      if (poolError) throw poolError;
      setPool(poolData);

      // Load member count and member IDs
      const { data: members, error: membersError } = await supabase
        .from("pool_members")
        .select("user_id")
        .eq("pool_id", poolId);

      if (membersError) throw membersError;
      setMemberCount(members?.length || 0);

      const memberIds = members?.map(m => m.user_id) || [];

      if (memberIds.length === 0) {
        setLeaderboard([]);
        setHighlights({ hilux: null, spud: null });
        setLoading(false);
        return;
      }

      // Fetch user scores for pool members
      const { data: scoresData, error: scoresError } = await supabase
        .from("user_scores")
        .select("*")
        .in("user_id", memberIds)
        .eq("season_year", currentYear)
        .eq("week_number", currentWeek);

      if (scoresError) {
        console.error("Error fetching scores:", scoresError);
      }

      // Fetch profiles for members
      const { data: profilesData } = await supabase
        .from("profiles_public")
        .select("id, display_name, school_name")
        .in("id", memberIds);

      const profilesMap: Record<string, { display_name: string | null; school_name: string | null }> = {};
      profilesData?.forEach(p => {
        if (p.id) {
          profilesMap[p.id] = { display_name: p.display_name, school_name: p.school_name };
        }
      });

      // Build leaderboard entries
      const scoresMap: Record<string, any> = {};
      scoresData?.forEach(s => {
        scoresMap[s.user_id] = s;
      });

      const entries: LeaderboardEntry[] = memberIds.map(userId => {
        const score = scoresMap[userId];
        const profile = profilesMap[userId];
        return {
          rank: 0,
          userId,
          nickname: profile?.display_name || "Anonymous",
          schoolCode: getSchoolCode(profile?.school_name || ""),
          points: period === "weekly" 
            ? (score?.weekly_points || 0) 
            : (score?.season_points || 0),
          badges: [],
        };
      });

      // Sort by points and assign ranks
      entries.sort((a, b) => b.points - a.points);
      entries.forEach((e, i) => e.rank = i + 1);

      setLeaderboard(entries);

      // Calculate highlights (Hilux = top scorer, Spud = bottom scorer with points > 0)
      if (entries.length >= 2) {
        const hilux = entries[0];
        const activeEntries = entries.filter(e => e.points > 0);
        const spud = activeEntries.length >= 2 ? activeEntries[activeEntries.length - 1] : null;
        
        setHighlights({
          hilux: hilux.points > 0 ? { name: hilux.nickname, points: hilux.points } : null,
          spud: spud && spud.userId !== hilux.userId ? { name: spud.nickname, points: spud.points } : null,
        });
      } else if (entries.length === 1 && entries[0].points > 0) {
        setHighlights({
          hilux: { name: entries[0].nickname, points: entries[0].points },
          spud: null,
        });
      } else {
        setHighlights({ hilux: null, spud: null });
      }
    } catch (error: any) {
      toast({
        title: "Error loading pool",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-600/20 to-yellow-500/10 border-yellow-600/30";
    if (rank === 2) return "bg-gradient-to-r from-gray-400/20 to-gray-300/10 border-gray-400/30";
    if (rank === 3) return "bg-gradient-to-r from-amber-700/20 to-amber-600/10 border-amber-700/30";
    return "";
  };

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
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border/40 sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/pools")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pools
          </Button>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{pool.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="font-mono">
                    {pool.invite_code}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {memberCount} members
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly/Season Toggle */}
          <div className="flex gap-2 justify-center">
            <Button
              variant={period === "weekly" ? "default" : "outline"}
              onClick={() => setPeriod("weekly")}
              size="sm"
            >
              Weekly
            </Button>
            <Button
              variant={period === "season" ? "default" : "outline"}
              onClick={() => setPeriod("season")}
              size="sm"
            >
              Season
            </Button>
          </div>
        </div>
      </header>

      {/* Weekly Highlight Banner */}
      {highlights.hilux ? (
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border/40">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-6 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <span>🚙 <strong>Hilux of the Week:</strong> {highlights.hilux.name} ({highlights.hilux.points} pts)</span>
              </div>
              {highlights.spud && (
                <div className="flex items-center gap-2">
                  <span>🥔 <strong>Spud:</strong> {highlights.spud.name} ({highlights.spud.points} pts)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border/40">
          <div className="container mx-auto px-4 py-3 text-center text-sm text-muted-foreground">
            Weekly highlights appear after matches are scored
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Invite Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invite Friends</CardTitle>
            <CardDescription>
              Share your pool code to grow your competition
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PoolInvite poolName={pool.name} inviteCode={pool.invite_code} />
          </CardContent>
        </Card>

        {/* Voting Section (if voting mode and not finalized) */}
        {pool.voting_mode && !pool.is_voting_finalized && pool.voting_closes_at && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vote for Schools to Follow</CardTitle>
              <CardDescription>
                Select up to 10 schools for this pool
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PoolVoting
                poolId={poolId!}
                votingClosesAt={pool.voting_closes_at}
                isFinalized={pool.is_voting_finalized}
                onVotingComplete={loadPoolData}
              />
            </CardContent>
          </Card>
        )}

        {/* Finalized Schools (if voting is done) */}
        {pool.voting_mode && pool.is_voting_finalized && pool.schools?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pool Schools</CardTitle>
              <CardDescription>
                The following schools were selected by vote
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {pool.schools.map((school: string) => (
                  <Badge key={school} variant="outline" className="h-8 px-3">
                    {school}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>Pool Leaderboard</CardTitle>
            <CardDescription>
              {period === "weekly" ? "This week's rankings" : "Season rankings"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length > 0 ? (
              <div className="space-y-2">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.userId}
                    className={`flex items-center justify-between p-4 rounded-lg border ${getRankStyle(entry.rank)} transition-colors hover:bg-muted/50`}
                    style={{ minHeight: '60px' }}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`text-lg font-bold w-12 text-center ${entry.rank <= 3 ? "text-accent" : "text-muted-foreground"}`}>
                        #{entry.rank}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">
                          {entry.nickname} — {entry.schoolCode}
                          {entry.rank === 1 && entry.points > 0 && <span className="ml-2 text-base">🚙</span>}
                          {entry.badges?.includes("top_dog") && <span className="ml-2 text-base">👑</span>}
                        </div>
                      </div>
                      <div className="text-lg font-bold text-primary">
                        {entry.points} pts
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-2">No rankings yet</h3>
                <p className="text-muted-foreground text-sm">
                  Pool rankings will appear once predictions are scored.
                  <br />Make predictions on upcoming fixtures to get started!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Safety Notice */}
        <p className="text-xs text-muted-foreground text-center">
          💡 Pool activity is visible in the Parent Dashboard
        </p>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default PoolLeaderboard;
