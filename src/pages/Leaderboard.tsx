import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Trophy, Users, School, Globe, MapPin, Share2, AlertCircle } from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";
import { useToast } from "@/hooks/use-toast";
import { CreatePoolDialog } from "@/components/pools/CreatePoolDialog";
import { PoolCard } from "@/components/pools/PoolCard";
import { BottomNav } from "@/components/BottomNav";
import { DEFAULT_QUERY_OPTIONS, CACHE_TIMES, GC_TIMES } from "@/lib/queryConfig";

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
  schoolId: string;
  averagePoints: number;
  totalUsers: number;
};

const currentYear = new Date().getFullYear();

const getSchoolCode = (schoolName: string) => {
  const words = schoolName.split(" ");
  if (words.length === 1) return schoolName.substring(0, 3).toUpperCase();
  return words.map(w => w[0]).join("").toUpperCase();
};

const Leaderboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [joinPoolCode, setJoinPoolCode] = useState("");
  const { toast } = useToast();

  // 1. School slugs (static, parallel with leaderboard)
  const schoolSlugsQuery = useQuery({
    queryKey: ["school-slugs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("schools")
        .select("id, slug, name")
        .limit(500);
      return data ?? [];
    },
    ...DEFAULT_QUERY_OPTIONS.static,
  });

  const schoolSlugMap = useMemo(() => {
    const map: Record<string, string> = {};
    schoolSlugsQuery.data?.forEach(s => { map[s.name] = s.slug; });
    return map;
  }, [schoolSlugsQuery.data]);

  // 2. Leaderboard stats (dynamic, parallel with schools)
  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard-stats", currentYear],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_leaderboard_stats", {
        p_season_year: currentYear,
      });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    ...DEFAULT_QUERY_OPTIONS.dynamic,
  });

  const globalLeaderboard = useMemo<LeaderboardEntry[]>(() => {
    if (!leaderboardQuery.data) return [];
    return leaderboardQuery.data.map((item: any, index: number) => ({
      rank: index + 1,
      userId: item.user_id,
      nickname: item.display_name || "Anonymous",
      schoolCode: getSchoolCode(item.school_name || ""),
      points: Number(item.total_brags) || 0,
      badges: [],
    }));
  }, [leaderboardQuery.data]);

  const schoolLeaderboard = useMemo<SchoolLeaderboardEntry[]>(() => {
    if (!leaderboardQuery.data) return [];
    const schoolAgg: Record<string, { schoolName: string; schoolId: string; totalBrags: number; userCount: number }> = {};
    leaderboardQuery.data.forEach((item: any) => {
      const schoolName = item.school_name;
      const schoolId = item.school_id;
      if (schoolName && schoolId) {
        if (!schoolAgg[schoolId]) {
          schoolAgg[schoolId] = { schoolName, schoolId, totalBrags: 0, userCount: 0 };
        }
        schoolAgg[schoolId].totalBrags += Number(item.total_brags) || 0;
        schoolAgg[schoolId].userCount += 1;
      }
    });
    return Object.values(schoolAgg)
      .map(s => ({
        rank: 0,
        schoolName: s.schoolName,
        schoolId: s.schoolId,
        averagePoints: s.userCount > 0 ? s.totalBrags / s.userCount : 0,
        totalUsers: s.userCount,
      }))
      .sort((a, b) => b.averagePoints - a.averagePoints)
      .slice(0, 20)
      .map((s, i) => ({ ...s, rank: i + 1 }));
  }, [leaderboardQuery.data]);

  // 3. User pools (reference cache)
  const userPoolsQuery = useQuery({
    queryKey: ["user-pools"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { pools: [], counts: {} as Record<string, number> };

      const { data, error } = await supabase
        .from("pool_members")
        .select(`
          pool_id,
          pools (
            id, name, invite_code, schools, voting_mode, icon_id, color_id,
            pool_members(count)
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      const pools = data?.map(d => d.pools).filter(Boolean) ?? [];
      const counts: Record<string, number> = {};
      for (const pool of pools) {
        if (pool) {
          counts[pool.id] = (pool as any).pool_members?.[0]?.count ?? 0;
        }
      }
      return { pools, counts };
    },
    staleTime: CACHE_TIMES.REFERENCE,
    gcTime: GC_TIMES.STANDARD,
  });

  const userPools = userPoolsQuery.data?.pools ?? [];
  const poolMemberCounts = userPoolsQuery.data?.counts ?? {};

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

      const { data: poolData, error: poolError } = await supabase
        .rpc("get_pool_by_invite_code", { code: joinPoolCode.toUpperCase() });

      if (poolError || !poolData || poolData.length === 0) {
        throw new Error("Invalid pool code");
      }

      const pool = poolData[0];

      if (!pool.is_active) {
        throw new Error("This pool is no longer active");
      }

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
        .insert({ pool_id: pool.id, user_id: user.id });

      if (error) throw error;

      toast({ title: "Joined pool successfully! 🎉" });
      setJoinPoolCode("");
      queryClient.invalidateQueries({ queryKey: ["user-pools"] });
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
        const schoolSlug = schoolSlugMap[entry.schoolName];
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

  const renderLoadingOrError = (query: typeof leaderboardQuery, emptyIcon: React.ReactNode, emptyTitle: string, emptyDesc: string) => {
    if (query.isLoading) {
      return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
    }
    if (query.isError) {
      return (
        <div className="text-center py-8 text-destructive">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Failed to load data. Pull down to retry.</p>
        </div>
      );
    }
    return (
      <div className="text-center py-12">
        {emptyIcon}
        <h3 className="font-semibold mb-2">{emptyTitle}</h3>
        <p className="text-muted-foreground text-sm">{emptyDesc}</p>
      </div>
    );
  };

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
      </div>

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
                <CardDescription>Season leaderboard — {currentYear}</CardDescription>
              </CardHeader>
              <CardContent>
                {globalLeaderboard.length > 0 ? (
                  <LeaderboardTable entries={globalLeaderboard} />
                ) : (
                  renderLoadingOrError(
                    leaderboardQuery,
                    <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />,
                    "No rankings yet",
                    "Rankings will appear once the first predictions are scored.\nCheck back after the weekend's matches!"
                  )
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="school" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>School Pride Leaderboard</CardTitle>
                <CardDescription>Top schools by average user performance</CardDescription>
              </CardHeader>
              <CardContent>
                {schoolLeaderboard.length > 0 ? (
                  <SchoolLeaderboardTable entries={schoolLeaderboard} />
                ) : (
                  renderLoadingOrError(
                    leaderboardQuery,
                    <School className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />,
                    "No school rankings yet",
                    "School rankings are calculated after predictions are scored."
                  )
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="province" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Provincial Rankings</CardTitle>
                <CardDescription>Top performers in your province</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Provincial data coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pools" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <CreatePoolDialog onPoolCreated={() => queryClient.invalidateQueries({ queryKey: ["user-pools"] })} />

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
                    <DialogDescription>Enter the pool code to join</DialogDescription>
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

            {userPoolsQuery.isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading pools...</div>
            ) : userPools.length > 0 ? (
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
                  <p className="text-muted-foreground mb-4">You haven't joined any pools yet</p>
                  <p className="text-sm text-muted-foreground">Create or join a pool to compete with friends!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            🏁 Season ends on June 28th. Leaderboards reset for next season!
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Leaderboard;
