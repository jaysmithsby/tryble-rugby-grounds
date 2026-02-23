import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trophy, Users, UserPlus, Plus } from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";
import { BottomNav } from "@/components/BottomNav";
import { PoolListRow } from "@/components/pools/PoolListRow";
import { CreatePoolDialog } from "@/components/pools/CreatePoolDialog";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";

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

export const Pools = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

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

  const handleJoinPool = async () => {
    if (!joinCode.trim()) return;

    setJoining(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: poolData, error: poolError } = await supabase
        .rpc("get_pool_by_invite_code", { code: joinCode.toUpperCase() });

      if (poolError || !poolData || poolData.length === 0) {
        throw new Error("Pool not found. Check the invite code and try again.");
      }

      const pool = poolData[0];

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

  const filteredPools = pools.filter(pool =>
    pool.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

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

        {/* Search + Create */}
        <div className="flex gap-2">
          <Input
            placeholder="Search pools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 h-9 text-sm"
          />
          <CreatePoolDialog onPoolCreated={loadData} />
        </div>

        {/* Join Code */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter invite code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="font-mono uppercase flex-1 h-9 text-sm"
          />
          <Button
            onClick={handleJoinPool}
            disabled={!joinCode.trim() || joining}
            size="sm"
            variant="outline"
            className="h-9"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Join
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
              Create a pool to compete with friends or enter an invite code to join one.
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Pools;
