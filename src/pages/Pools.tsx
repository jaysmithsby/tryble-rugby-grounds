import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Trophy, Users, Calendar, ChevronRight, Globe, School, MapPin, Plus, UserPlus } from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";
import { BottomNav } from "@/components/BottomNav";
import { PoolCard } from "@/components/pools/PoolCard";
import { CreatePoolDialog } from "@/components/pools/CreatePoolDialog";
import { useToast } from "@/hooks/use-toast";
import { getISOWeek } from "date-fns";

type Pool = {
  id: string;
  name: string;
  invite_code: string;
  voting_mode: boolean;
  schools: string[];
  icon_id: string | null;
  color_id: string | null;
  pool_members: { count: number }[];
};

type Tournament = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  participating_schools: string[] | null;
};

type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  points: number;
};

export const Pools = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pools, setPools] = useState<Pool[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState<"global" | "school" | "province">("global");
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"weekly" | "season">("weekly");
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [userSchool, setUserSchool] = useState<string | null>(null);
  const [userProvince, setUserProvince] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadLeaderboardPreview();
  }, [leaderboardTab, leaderboardPeriod, userSchool, userProvince]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Load user profile for school/province context
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_name_legacy, school_id, province, schools(name)")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserSchool((profile.schools as any)?.name || profile.school_name_legacy);
        setUserProvince(profile.province);
      }

      // Load user's pools
      const { data: poolsData, error: poolsError } = await supabase
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

      if (poolsError) throw poolsError;
      
      const userPools = poolsData
        ?.map(d => d.pools)
        .filter((p): p is Pool => p !== null) || [];
      setPools(userPools);

      // Load followed tournaments
      const { data: followsData, error: followsError } = await supabase
        .from("user_tournament_follows")
        .select(`
          tournament_id,
          tournaments (
            id,
            name,
            start_date,
            end_date,
            participating_schools
          )
        `)
        .eq("user_id", user.id);

      if (followsError) throw followsError;
      
      const userTournaments = followsData
        ?.map(d => d.tournaments)
        .filter((t): t is Tournament => t !== null) || [];
      setTournaments(userTournaments);

    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboardPreview = async () => {
    const currentWeek = getISOWeek(new Date());
    const currentYear = new Date().getFullYear();

    try {
      let query = supabase
        .from("user_scores")
        .select("user_id, weekly_points, season_points")
        .eq("season_year", currentYear)
        .eq("week_number", currentWeek);

      // For school/province filtering we need to join with profiles
      // For now, just get top 5 global and filter client-side if needed
      const pointsColumn = leaderboardPeriod === "weekly" ? "weekly_points" : "season_points";
      
      const { data: scoresData, error: scoresError } = await query
        .order(pointsColumn, { ascending: false })
        .limit(20); // Get more to allow for filtering

      if (scoresError) throw scoresError;

      if (!scoresData || scoresData.length === 0) {
        setLeaderboardData([]);
        return;
      }

      // Get profiles for display names and filtering
      const userIds = scoresData.map(s => s.user_id);
      const { data: profilesData } = await supabase
        .from("profiles_public")
        .select("id, display_name, school_name, province")
        .in("id", userIds);

      const profilesMap: Record<string, { display_name: string | null; school_name: string | null; province: string | null }> = {};
      profilesData?.forEach(p => {
        if (p.id) {
          profilesMap[p.id] = { 
            display_name: p.display_name, 
            school_name: p.school_name,
            province: p.province
          };
        }
      });

      let filteredScores = scoresData;

      // Apply tab-based filtering
      if (leaderboardTab === "school" && userSchool) {
        filteredScores = scoresData.filter(s => 
          profilesMap[s.user_id]?.school_name === userSchool
        );
      } else if (leaderboardTab === "province" && userProvince) {
        filteredScores = scoresData.filter(s => 
          profilesMap[s.user_id]?.province === userProvince
        );
      }

      const entries: LeaderboardEntry[] = filteredScores.slice(0, 5).map((score, index) => ({
        rank: index + 1,
        userId: score.user_id,
        displayName: profilesMap[score.user_id]?.display_name || "Anonymous",
        points: leaderboardPeriod === "weekly" ? (score.weekly_points || 0) : (score.season_points || 0),
      }));

      setLeaderboardData(entries);
    } catch (error) {
      console.error("Error loading leaderboard preview:", error);
      setLeaderboardData([]);
    }
  };

  const handleJoinPool = async () => {
    if (!joinCode.trim()) return;
    
    setJoining(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if pool exists
      const { data: poolData, error: poolError } = await supabase
        .rpc("get_pool_by_invite_code", { code: joinCode.toUpperCase() });

      if (poolError || !poolData || poolData.length === 0) {
        throw new Error("Pool not found. Check the invite code and try again.");
      }

      const pool = poolData[0];

      // Check if already a member
      const { data: existingMember } = await supabase
        .from("pool_members")
        .select("id")
        .eq("pool_id", pool.id)
        .eq("user_id", user.id)
        .single();

      if (existingMember) {
        toast({
          title: "Already a member",
          description: "You're already in this pool!",
        });
        setJoinCode("");
        return;
      }

      // Join the pool
      const { error: joinError } = await supabase
        .from("pool_members")
        .insert({
          pool_id: pool.id,
          user_id: user.id
        });

      if (joinError) throw joinError;

      toast({
        title: "Joined pool!",
        description: `Welcome to ${pool.name}`,
      });

      setJoinCode("");
      loadData();
    } catch (error: any) {
      toast({
        title: "Error joining pool",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading pools...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <GlobalHeader />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <CreatePoolDialog onPoolCreated={loadData} />
          
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Enter code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="font-mono uppercase"
              />
              <Button 
                onClick={handleJoinPool} 
                disabled={!joinCode.trim() || joining}
                size="icon"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Your Pools Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Your Pools
            </h2>
            <Badge variant="outline">{pools.length}</Badge>
          </div>

          {pools.length > 0 ? (
            <div className="grid gap-4">
              {pools.map((pool) => (
                <PoolCard 
                  key={pool.id} 
                  pool={pool} 
                  memberCount={pool.pool_members?.[0]?.count || 0}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-2">No pools yet</h3>
                <p className="text-sm text-muted-foreground">
                  Create a pool to compete with friends or enter a pool code to join an existing one.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Tournaments You Follow Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Tournaments You Follow
            </h2>
            <Badge variant="outline">{tournaments.length}</Badge>
          </div>

          {tournaments.length > 0 ? (
            <div className="grid gap-3">
              {tournaments.map((tournament) => (
                <Card 
                  key={tournament.id} 
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/tournament/${tournament.id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{tournament.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {tournament.participating_schools?.length || 0} schools
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-6 text-center">
                <Calendar className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                <h3 className="font-semibold text-sm mb-1">No tournaments followed</h3>
                <p className="text-xs text-muted-foreground">
                  Follow tournaments from the Fixtures page to see them here.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Leaderboards Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              Leaderboards
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/leaderboard")}
              className="text-primary"
            >
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Tabs value={leaderboardTab} onValueChange={(v) => setLeaderboardTab(v as typeof leaderboardTab)}>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="global" className="text-xs">
                      <Globe className="w-3 h-3 mr-1" />
                      Global
                    </TabsTrigger>
                    <TabsTrigger value="school" className="text-xs">
                      <School className="w-3 h-3 mr-1" />
                      School
                    </TabsTrigger>
                    <TabsTrigger value="province" className="text-xs">
                      <MapPin className="w-3 h-3 mr-1" />
                      Province
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  variant={leaderboardPeriod === "weekly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLeaderboardPeriod("weekly")}
                  className="flex-1"
                >
                  Weekly
                </Button>
                <Button
                  variant={leaderboardPeriod === "season" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLeaderboardPeriod("season")}
                  className="flex-1"
                >
                  Season
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {leaderboardData.length > 0 ? (
                <div className="space-y-2">
                  {leaderboardData.map((entry) => (
                    <div
                      key={entry.userId}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-bold w-6 text-center ${entry.rank <= 3 ? "text-accent" : "text-muted-foreground"}`}>
                          #{entry.rank}
                        </span>
                        <span className="font-medium">{entry.displayName}</span>
                      </div>
                      <span className="font-bold text-primary">{entry.points} brags</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                  <h3 className="font-semibold text-sm mb-1">No rankings yet</h3>
                  <p className="text-xs text-muted-foreground">
                    Rankings appear once predictions are scored.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Pools;
