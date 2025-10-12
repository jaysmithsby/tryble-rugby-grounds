import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Users, Vote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PoolInvite } from "@/components/pools/PoolInvite";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [availableSchools, setAvailableSchools] = useState<string[]>([]);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [schoolVotes, setSchoolVotes] = useState<Record<string, number>>({});
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

      // Load voting data if in voting mode
      if (poolData.voting_mode) {
        await loadVotingData();
      }

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

  const loadVotingData = async () => {
    try {
      // Load available schools
      const { data: schools } = await supabase
        .from("schools")
        .select("name")
        .eq("status", "verified")
        .order("name");

      setAvailableSchools(schools?.map(s => s.name) || []);

      // Load vote counts
      const { data: votes } = await supabase
        .from("pool_school_votes")
        .select("school_name")
        .eq("pool_id", poolId!);

      const voteCounts: Record<string, number> = {};
      votes?.forEach(vote => {
        voteCounts[vote.school_name] = (voteCounts[vote.school_name] || 0) + 1;
      });
      setSchoolVotes(voteCounts);

      // Load user's votes
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userVoteData } = await supabase
          .from("pool_school_votes")
          .select("school_name")
          .eq("pool_id", poolId!)
          .eq("user_id", user.id);

        setUserVotes(userVoteData?.map(v => v.school_name) || []);
      }
    } catch (error) {
      console.error("Error loading voting data:", error);
    }
  };

  const toggleVote = async (school: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (userVotes.includes(school)) {
        // Remove vote
        await supabase
          .from("pool_school_votes")
          .delete()
          .eq("pool_id", poolId!)
          .eq("user_id", user.id)
          .eq("school_name", school);

        setUserVotes(userVotes.filter(s => s !== school));
        setSchoolVotes(prev => ({
          ...prev,
          [school]: (prev[school] || 1) - 1
        }));
      } else if (userVotes.length < 10) {
        // Add vote
        await supabase
          .from("pool_school_votes")
          .insert({
            pool_id: poolId!,
            user_id: user.id,
            school_name: school
          });

        setUserVotes([...userVotes, school]);
        setSchoolVotes(prev => ({
          ...prev,
          [school]: (prev[school] || 0) + 1
        }));

        toast({
          title: "Vote added!",
          description: `You voted for ${school}`
        });
      } else {
        toast({
          title: "Maximum votes reached",
          description: "You can vote for up to 10 schools",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error voting",
        description: error.message,
        variant: "destructive"
      });
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

        {/* Voting Section (if voting mode) */}
        {pool.voting_mode && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Vote className="w-5 h-5" />
                Vote for Schools to Follow
              </CardTitle>
              <CardDescription>
                Top 10 schools by votes will be included. You have {userVotes.length}/10 votes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {availableSchools
                    .sort((a, b) => (schoolVotes[b] || 0) - (schoolVotes[a] || 0))
                    .map((school) => (
                      <Button
                        key={school}
                        variant={userVotes.includes(school) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleVote(school)}
                        className="justify-between"
                      >
                        <span>{school}</span>
                        {schoolVotes[school] > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {schoolVotes[school]}
                          </Badge>
                        )}
                      </Button>
                    ))}
                </div>
              </ScrollArea>
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
