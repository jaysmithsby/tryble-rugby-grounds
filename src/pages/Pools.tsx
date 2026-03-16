import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SchoolMultiSelectFilter } from "@/components/ui/SchoolMultiSelectFilter";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Plus, Globe } from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";
import { BottomNav } from "@/components/BottomNav";
import { PoolListRow } from "@/components/pools/PoolListRow";
import { LeaderboardRow } from "@/components/pools/LeaderboardRow";
import { PoolActionDialog } from "@/components/pools/PoolActionDialog";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { getSchoolDisplayImage } from "@/lib/schoolImageUtils";

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

type SchoolInfo = {
  id: string;
  name: string;
  slug: string;
  emblem_url: string | null;
  jersey_url: string | null;
  followerCount: number;
};

export const Pools = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoolNames, setSelectedPoolNames] = useState<string[]>([]);
  const [actionOpen, setActionOpen] = useState(false);

  // Leaderboard state
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [globalUserCount, setGlobalUserCount] = useState(0);
  const [schoolRank, setSchoolRank] = useState<number | null>(null);
  const [primarySchool, setPrimarySchool] = useState<SchoolInfo | null>(null);
  const [primarySchoolMemberCount, setPrimarySchoolMemberCount] = useState(0);
  const [followedSchools, setFollowedSchools] = useState<SchoolInfo[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch pools
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

      // --- Leaderboard data ---
      const currentYear = new Date().getFullYear();

      // Profile + user stats + global count in parallel
      const [profileRes, userStatsRes, globalCountRes] = await Promise.all([
        supabase.from("profiles").select("school_id").eq("id", user.id).single(),
        supabase.rpc("get_user_season_stats", { p_user_id: user.id, p_season_year: currentYear }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
      ]);

      const userStats = userStatsRes.data?.[0];
      setGlobalRank(userStats ? Number(userStats.global_rank) || null : null);
      setSchoolRank(userStats ? Number(userStats.school_rank) || null : null);
      setGlobalUserCount(globalCountRes.count ?? 0);

      const userSchoolId = profileRes.data?.school_id;

      if (userSchoolId) {
        // Primary school details + member count + followed schools in parallel
        const [schoolRes, schoolCountRes, followsRes] = await Promise.all([
          supabase.from("schools").select("id, name, slug, emblem_url, jersey_url")
            .eq("id", userSchoolId).single(),
          supabase.from("profiles").select("*", { count: "exact", head: true })
            .eq("school_id", userSchoolId),
          supabase.from("user_school_follows")
            .select("school_id, schools(id, name, slug, emblem_url, jersey_url)")
            .eq("user_id", user.id),
        ]);

        if (schoolRes.data) {
          setPrimarySchool({ ...schoolRes.data, followerCount: 0 });
        }
        setPrimarySchoolMemberCount(schoolCountRes.count ?? 0);

        // Process followed schools (exclude primary)
        const followedRaw = (followsRes.data || [])
          .map(f => f.schools)
          .filter((s): s is { id: string; name: string; slug: string; emblem_url: string | null; jersey_url: string | null } =>
            s !== null && (s as any).id !== userSchoolId
          );

        // Fetch follower counts in parallel
        const withCounts = await Promise.all(
          followedRaw.map(async (school) => {
            const { count } = await supabase
              .from("user_school_follows").select("*", { count: "exact", head: true })
              .eq("school_id", school.id);
            return { ...school, followerCount: count ?? 0 };
          })
        );
        setFollowedSchools(withCounts);
      } else {
        setPrimarySchool(null);
        setPrimarySchoolMemberCount(0);
        setFollowedSchools([]);
      }
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

  const allPoolNames = pools.map(p => p.name).sort();
  const filteredPools = selectedPoolNames.length > 0
    ? pools.filter(pool => selectedPoolNames.includes(pool.name))
    : pools;

  const renderSchoolIcon = (school: { emblem_url?: string | null; jersey_url?: string | null; name: string }) => {
    const imgUrl = getSchoolDisplayImage(school);
    if (imgUrl) {
      return <img src={imgUrl} alt={school.name} className="w-5 h-5 object-contain" />;
    }
    return <span className="text-[10px] font-bold text-primary">{school.name.slice(0, 2).toUpperCase()}</span>;
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

      <main className="container mx-auto px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Your Pools
          </h1>
          <span className="text-xs text-muted-foreground">{pools.length} pool{pools.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Search + Add */}
        <div className="flex gap-2">
          <Input
            placeholder="Search pools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 h-9 text-sm"
          />
          <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => setActionOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Pool List */}
        {filteredPools.length > 0 ? (
          <div className="divide-y divide-border/40">
            {filteredPools.map((pool) => (
              <PoolListRow
                key={pool.id}
                pool={pool}
                memberCount={pool.pool_members?.[0]?.count || 0}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold mb-1">No pools yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a pool or enter an invite code to join one.
            </p>
            <Button onClick={() => setActionOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Get Started
            </Button>
          </div>
        )}

        {/* Leaderboards Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Leaderboards</h2>
          <div className="divide-y divide-border/40">
            <LeaderboardRow
              icon={<Globe className="w-4 h-4 text-primary" />}
              name="Global Leaderboard"
              memberCount={globalUserCount}
              userRank={globalRank}
              onClick={() => navigate("/leaderboard/global/all")}
            />
            {primarySchool && (
              <LeaderboardRow
                icon={renderSchoolIcon(primarySchool)}
                name={primarySchool.name}
                memberCount={primarySchoolMemberCount}
                userRank={schoolRank}
                onClick={() => navigate(`/leaderboard/school/${primarySchool.id}`)}
              />
            )}
            {followedSchools.map((school) => (
              <LeaderboardRow
                key={school.id}
                icon={renderSchoolIcon(school)}
                name={school.name}
                memberCount={school.followerCount}
                userRank={null}
                onClick={() => navigate(`/leaderboard/school/${school.id}`)}
              />
            ))}
          </div>
        </section>
      </main>

      <PoolActionDialog open={actionOpen} onOpenChange={setActionOpen} onPoolCreated={loadData} />
      <BottomNav />
    </div>
  );
};

export default Pools;
