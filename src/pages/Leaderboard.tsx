import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Trophy, TrendingUp, Target, Users, School, Globe, MapPin, Share2 } from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";
import { useToast } from "@/hooks/use-toast";
import { CreatePoolDialog } from "@/components/pools/CreatePoolDialog";
import { PoolCard } from "@/components/pools/PoolCard";
import { PoolInvite } from "@/components/pools/PoolInvite";
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

type SchoolLeaderboardEntry = {
  rank: number;
  schoolName: string;
  averagePoints: number;
  totalUsers: number;
};

type WeeklyHighlights = {
  topClimber: { name: string; spotsGained: number } | null;
  bestAccuracy: { percentage: number } | null;
};

const Leaderboard = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<"weekly" | "season">("weekly");
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [schoolLeaderboard, setSchoolLeaderboard] = useState<SchoolLeaderboardEntry[]>([]);
  const [schoolIdMap, setSchoolIdMap] = useState<Record<string, string>>({});
  const [userPools, setUserPools] = useState<any[]>([]);
  const [poolMemberCounts, setPoolMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [joinPoolCode, setJoinPoolCode] = useState("");
  const [highlights, setHighlights] = useState<WeeklyHighlights>({ topClimber: null, bestAccuracy: null });
  const { toast } = useToast();

  useEffect(() => {
    loadLeaderboardData();
    loadUserPools();
  }, [period]);

  const getSchoolCode = (schoolName: string) => {
    const words = schoolName.split(" ");
    if (words.length === 1) return schoolName.substring(0, 3).toUpperCase();
    return words.map(w => w[0]).join("").toUpperCase();
  };

  const loadLeaderboardData = async () => {
    setLoading(true);
    const currentWeek = getISOWeek(new Date());
    const currentYear = new Date().getFullYear();
    
    // Load school slugs for navigation
    const { data: schoolsData } = await supabase
      .from("schools")
      .select("slug, name");
    
    const slugMap: Record<string, string> = {};
    schoolsData?.forEach(school => {
      slugMap[school.name] = school.slug;
    });
    setSchoolIdMap(slugMap);
    
    // Fetch real global leaderboard data from user_scores joined with profiles_public
    const { data: globalData, error: globalError } = await supabase
      .from("user_scores")
      .select(`
        user_id,
        weekly_points,
        season_points,
        rank_global,
        accuracy_percentage
      `)
      .eq("season_year", currentYear)
      .eq("week_number", currentWeek)
      .order(period === "weekly" ? "weekly_points" : "season_points", { ascending: false })
      .limit(50);

    if (globalError) {
      console.error("Error fetching leaderboard:", globalError);
    }

    // Fetch profiles for the users
    const userIds = globalData?.map(d => d.user_id) || [];
    let profilesMap: Record<string, { display_name: string | null; school_name: string | null }> = {};
    
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles_public")
        .select("id, display_name, school_name")
        .in("id", userIds);
      
      profilesData?.forEach(p => {
        if (p.id) {
          profilesMap[p.id] = { display_name: p.display_name, school_name: p.school_name };
        }
      });
    }

    // Transform to LeaderboardEntry format
    const entries: LeaderboardEntry[] = (globalData || []).map((item, index) => {
      const profile = profilesMap[item.user_id];
      return {
        rank: index + 1,
        userId: item.user_id,
        nickname: profile?.display_name || "Anonymous",
        schoolCode: getSchoolCode(profile?.school_name || ""),
        points: period === "weekly" ? (item.weekly_points || 0) : (item.season_points || 0),
        badges: [],
      };
    });

    setGlobalLeaderboard(entries);

    // Fetch real school leaderboard from school_scores
    const { data: schoolScoresData, error: schoolError } = await supabase
      .from("school_scores")
      .select("*")
      .eq("season_year", currentYear)
      .eq("week_number", currentWeek)
      .order("average_points", { ascending: false })
      .limit(20);

    if (schoolError) {
      console.error("Error fetching school scores:", schoolError);
    }

    const schoolEntries: SchoolLeaderboardEntry[] = (schoolScoresData || []).map((item, index) => ({
      rank: index + 1,
      schoolName: item.school_name,
      averagePoints: Number(item.average_points) || 0,
      totalUsers: item.total_users || 0,
    }));

    setSchoolLeaderboard(schoolEntries);

    // Weekly highlights - calculate if we have data
    if (entries.length > 0) {
      // Find best accuracy from the data
      const bestAccuracyEntry = globalData?.reduce((best, curr) => {
        const currAcc = Number(curr.accuracy_percentage) || 0;
        const bestAcc = Number(best?.accuracy_percentage) || 0;
        return currAcc > bestAcc ? curr : best;
      }, globalData[0]);

      setHighlights({
        topClimber: null, // Would need to compare with previous week's data
        bestAccuracy: bestAccuracyEntry?.accuracy_percentage 
          ? { percentage: Number(bestAccuracyEntry.accuracy_percentage) } 
          : null,
      });
    } else {
      setHighlights({ topClimber: null, bestAccuracy: null });
    }

    setLoading(false);
  };

  const loadUserPools = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's pools with member counts in a single query using the count aggregation
      const { data, error } = await supabase
        .from("pool_members")
        .select(`
          pool_id,
          pools (
            id,
            name,
            invite_code,
            schools,
            voting_mode,
            icon_id,
            color_id,
            pool_members(count)
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      
      const pools = data?.map(d => d.pools) || [];
      setUserPools(pools);

      // Extract member counts from the aggregated query (no N+1!)
      const counts: Record<string, number> = {};
      for (const pool of pools) {
        if (pool) {
          // The count comes from the nested pool_members aggregation
          const memberCount = (pool as any).pool_members?.[0]?.count ?? 0;
          counts[pool.id] = memberCount;
        }
      }
      setPoolMemberCounts(counts);
    } catch (error) {
      console.error("Error loading pools:", error);
    }
  };


  const joinPool = async () => {
    if (!joinPoolCode.trim()) {
      toast({ title: "Please enter a pool code", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please sign in first", variant: "destructive" });
        return;
      }

      // Use the SECURITY DEFINER function to lookup pool by invite code
      const { data: poolData, error: poolError } = await supabase
        .rpc("get_pool_by_invite_code", { code: joinPoolCode.toUpperCase() });

      if (poolError || !poolData || poolData.length === 0) {
        throw new Error("Invalid pool code");
      }

      const pool = poolData[0];

      if (!pool.is_active) {
        throw new Error("This pool is no longer active");
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from("pool_members")
        .select("id")
        .eq("pool_id", pool.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingMember) {
        toast({ title: "You're already a member of this pool!" });
        setJoinPoolCode("");
        navigate(`/pool/${pool.id}`);
        return;
      }

      const { error } = await supabase
        .from("pool_members")
        .insert({
          pool_id: pool.id,
          user_id: user.id,
        });

      if (error) throw error;

      toast({ title: "Joined pool successfully! 🎉" });
      setJoinPoolCode("");
      loadUserPools();
    } catch (error: any) {
      toast({ title: "Error joining pool", description: error.message, variant: "destructive" });
    }
  };

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case "top_dog": return "👑";
      case "podium_place": return "🥉";
      case "climber": return "📈";
      case "consistent_contender": return "📊";
      case "school_hero": return "🦸";
      default: return "";
    }
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-600/20 to-yellow-500/10 border-yellow-600/30";
    if (rank === 2) return "bg-gradient-to-r from-gray-400/20 to-gray-300/10 border-gray-400/30";
    if (rank === 3) return "bg-gradient-to-r from-amber-700/20 to-amber-600/10 border-amber-700/30";
    return "";
  };

  const LeaderboardTable = ({ entries }: { entries: LeaderboardEntry[] }) => (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.userId}
          className={`flex items-center justify-between p-4 rounded-lg border ${getRankStyle(entry.rank)} transition-colors hover:bg-muted/50`}
        >
          <div className="flex items-center gap-4 flex-1">
            <div className={`text-lg font-bold w-12 text-center ${entry.rank <= 3 ? "text-accent" : "text-muted-foreground"}`}>
              #{entry.rank}
            </div>
            <div className="flex-1">
              <div className="font-medium">
                {entry.nickname} — {entry.schoolCode}
                {entry.badges && entry.badges.map((badge) => (
                  <span key={badge} className="ml-2 text-base">{getBadgeIcon(badge)}</span>
                ))}
              </div>
            </div>
            <div className="text-lg font-bold text-primary">
              {entry.points} brags
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const SchoolLeaderboardTable = ({ entries }: { entries: SchoolLeaderboardEntry[] }) => (
    <div className="space-y-2">
      {entries.map((entry) => {
        const schoolSlug = schoolIdMap[entry.schoolName];
        return (
          <div
            key={entry.schoolName}
            onClick={() => schoolSlug && navigate(`/school/${schoolSlug}`)}
            className={`flex items-center justify-between p-4 rounded-lg border ${getRankStyle(entry.rank)} transition-colors hover:bg-muted/50 ${schoolSlug ? 'cursor-pointer' : ''}`}
          >
            <div className="flex items-center gap-4 flex-1">
              <div className={`text-lg font-bold w-12 text-center ${entry.rank <= 3 ? "text-accent" : "text-muted-foreground"}`}>
                #{entry.rank}
              </div>
              <div className="flex-1">
                <div className="font-medium">{entry.schoolName}</div>
                <div className="text-sm text-muted-foreground">{entry.totalUsers} users</div>
              </div>
              <div className="text-lg font-bold text-primary">
                {entry.averagePoints.toFixed(1)} brags
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <GlobalHeader />

      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="text-accent" />
            Leaderboards
          </h1>
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

      {/* Weekly Highlight Banner */}
      {(highlights.topClimber || highlights.bestAccuracy) ? (
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border/40">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-6 text-sm flex-wrap">
              {highlights.topClimber && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  <span><strong>Top Climber:</strong> {highlights.topClimber.name} jumped {highlights.topClimber.spotsGained} places!</span>
                </div>
              )}
              {highlights.bestAccuracy && (
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span><strong>Best Accuracy:</strong> {highlights.bestAccuracy.percentage}% this week!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border/40">
          <div className="container mx-auto px-4 py-3 text-center text-sm text-muted-foreground">
            Weekly highlights will appear after this weekend's matches are scored
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="global" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="global">
              <Globe className="w-4 h-4 mr-2" />
              Global
            </TabsTrigger>
            <TabsTrigger value="school">
              <School className="w-4 h-4 mr-2" />
              School
            </TabsTrigger>
            <TabsTrigger value="province">
              <MapPin className="w-4 h-4 mr-2" />
              Province
            </TabsTrigger>
            <TabsTrigger value="pools">
              <Users className="w-4 h-4 mr-2" />
              Pools
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Global Rankings</CardTitle>
                <CardDescription>
                  {period === "weekly" ? "This week's top performers" : "Season leaderboard"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : globalLeaderboard.length > 0 ? (
                  <LeaderboardTable entries={globalLeaderboard} />
                ) : (
                  <div className="text-center py-12">
                    <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-semibold mb-2">No rankings yet</h3>
                    <p className="text-muted-foreground text-sm">
                      Rankings will appear once the first predictions are scored.
                      <br />Check back after the weekend's matches!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="school" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>School Pride Leaderboard</CardTitle>
                <CardDescription>
                  Top schools by average user performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : schoolLeaderboard.length > 0 ? (
                  <SchoolLeaderboardTable entries={schoolLeaderboard} />
                ) : (
                  <div className="text-center py-12">
                    <School className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-semibold mb-2">No school rankings yet</h3>
                    <p className="text-muted-foreground text-sm">
                      School rankings are calculated after predictions are scored.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="province" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Provincial Rankings</CardTitle>
                <CardDescription>
                  Top performers in your province
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Provincial data coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pools" className="space-y-4">
            {/* Pool Management */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <CreatePoolDialog onPoolCreated={loadUserPools} />

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Share2 className="w-4 h-4 mr-2" />
                    Join Pool
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Join a Pool</DialogTitle>
                    <DialogDescription>
                      Enter the pool code to join
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="poolCode">Pool Code</Label>
                      <Input
                        id="poolCode"
                        placeholder="e.g., ABC123"
                        value={joinPoolCode}
                        onChange={(e) => setJoinPoolCode(e.target.value.toUpperCase())}
                      />
                    </div>
                    <Button onClick={joinPool} className="w-full">Join Pool</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* User's Pools */}
            {userPools.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userPools.map((pool: any) => pool && (
                  <PoolCard
                    key={pool.id}
                    pool={pool}
                    memberCount={poolMemberCounts[pool.id] || 0}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    You haven't joined any pools yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Create or join a pool to compete with friends!
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Season Reset Notice */}
        {period === "season" && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              🏁 Season ends on June 28th. Leaderboards reset for next season!
            </p>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Leaderboard;
