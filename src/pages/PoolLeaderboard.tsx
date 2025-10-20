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

type LeaderboardEntry = {
  rank: number;
  userId: string;
  nickname: string;
  schoolCode: string;
  points: number;
  badges?: string[];
};

export const PoolLeaderboard = () => {
  const { poolId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [period, setPeriod] = useState<"weekly" | "season">("weekly");
  const [pool, setPool] = useState<any>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPoolData();
  }, [poolId, period]);

  const loadPoolData = async () => {
    if (!poolId) return;
    
    setLoading(true);
    try {
      // Load pool details
      const { data: poolData, error: poolError } = await supabase
        .from("pools")
        .select("*")
        .eq("id", poolId)
        .single();

      if (poolError) throw poolError;
      setPool(poolData);

      // Load member count
      const { data: members, error: membersError } = await supabase
        .from("pool_members")
        .select("user_id")
        .eq("pool_id", poolId);

      if (membersError) throw membersError;
      setMemberCount(members?.length || 0);

      // Load leaderboard data (mock for now)
      loadLeaderboardData();
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

  const loadLeaderboardData = () => {
    // Mock data - will be replaced with real queries
    const mockData: LeaderboardEntry[] = [
      { rank: 1, userId: "1", nickname: "James S", schoolCode: "MHS", points: 245, badges: ["top_dog"] },
      { rank: 2, userId: "2", nickname: "Zanele T", schoolCode: "SACS", points: 238, badges: [] },
      { rank: 3, userId: "3", nickname: "Thabo M", schoolCode: "GRY", points: 234, badges: [] },
    ];
    setLeaderboard(mockData);
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
            onClick={() => navigate("/leaderboard")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leaderboards
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
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border/40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-6 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <span>🚙 <strong>Hilux of the Week:</strong> James S (245 pts)</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🥔 <strong>Spud:</strong> Mike J (42 pts)</span>
            </div>
          </div>
        </div>
      </div>

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
                        {entry.rank === 1 && <span className="ml-2 text-base">🚙</span>}
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
