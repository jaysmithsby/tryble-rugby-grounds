import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, ArrowRight, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Pool {
  id: string;
  name: string;
  schools: string[] | null;
  member_count?: number;
}

interface StepPoolProps {
  schoolName: string;
  userId: string;
  onComplete: () => void;
  onSkip: () => void;
}

const StepPool = ({ schoolName, userId, onComplete, onSkip }: StepPoolProps) => {
  const [mode, setMode] = useState<"choice" | "join" | "create">("choice");
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);
  const [poolName, setPoolName] = useState(`${schoolName} Predictions`);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPools = async () => {
      // Fetch public pools related to user's school
      // For now, we don't have a public pool discovery mechanism
      // This is a placeholder for future functionality
      setPools([]);
    };

    if (mode === "join") {
      fetchPools();
    }
  }, [mode, schoolName]);

  const generateInviteCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const handleCreatePool = async () => {
    if (!poolName.trim() || !userId) return;

    setCreating(true);
    try {
      const inviteCode = generateInviteCode();

      // Create the pool
      const { data: pool, error: poolError } = await supabase
        .from("pools")
        .insert({
          name: poolName.trim(),
          creator_id: userId,
          invite_code: inviteCode,
          schools: [schoolName],
          is_active: true,
        })
        .select()
        .single();

      if (poolError) throw poolError;

      // Add creator as member
      const { error: memberError } = await supabase.from("pool_members").insert({
        pool_id: pool.id,
        user_id: userId,
      });

      if (memberError) throw memberError;

      toast({
        title: "Pool created!",
        description: `Share code ${inviteCode} with friends to invite them.`,
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: "Failed to create pool",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinPool = async (poolId: string) => {
    if (!userId) return;

    setJoining(poolId);
    try {
      const { error } = await supabase.from("pool_members").insert({
        pool_id: poolId,
        user_id: userId,
      });

      if (error) throw error;

      toast({
        title: "Joined pool!",
        description: "You're now part of this prediction pool.",
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: "Failed to join",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setJoining(null);
    }
  };

  if (mode === "choice") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Play with Others</h2>
          <p className="text-muted-foreground">
            Pools let you compete with friends and classmates
          </p>
        </div>

        <div className="grid gap-4">
          <button
            onClick={() => setMode("create")}
            className="flex items-center gap-4 p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Create a Pool</h3>
              <p className="text-sm text-muted-foreground">
                Start your own and invite friends
              </p>
            </div>
          </button>

          <button
            onClick={() => setMode("join")}
            className="flex items-center gap-4 p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Join Existing Pool</h3>
              <p className="text-sm text-muted-foreground">
                Enter an invite code from a friend
              </p>
            </div>
          </button>
        </div>

        <Button onClick={onSkip} variant="ghost" className="w-full text-muted-foreground">
          Skip for now
        </Button>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Create Your Pool</h2>
          <p className="text-muted-foreground">
            Name your pool and we'll get it set up
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="poolName">Pool name</Label>
            <Input
              id="poolName"
              placeholder="e.g. Grey College 1st XV Pool"
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <Share2 className="w-4 h-4 inline-block mr-1" />
              You can invite friends with a code after creating
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleCreatePool}
            className="w-full"
            size="lg"
            disabled={!poolName.trim() || creating}
          >
            {creating ? "Creating..." : "Create Pool"}
          </Button>

          <Button
            onClick={() => setMode("choice")}
            variant="ghost"
            className="w-full text-muted-foreground"
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "join") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Join a Pool</h2>
          <p className="text-muted-foreground">
            Enter an invite code from a friend, or browse available pools
          </p>
        </div>

        <JoinPoolByCode userId={userId} onSuccess={onComplete} />

        {pools.length > 0 && (
          <div className="space-y-3">
            <Label>Or join a pool from your school</Label>
            {pools.map((pool) => (
              <div
                key={pool.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <h3 className="font-medium">{pool.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {pool.member_count || 0} members
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleJoinPool(pool.id)}
                  disabled={joining === pool.id}
                >
                  {joining === pool.id ? "Joining..." : "Join"}
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={() => setMode("choice")}
          variant="ghost"
          className="w-full text-muted-foreground"
        >
          Back
        </Button>
      </div>
    );
  }

  return null;
};

// Subcomponent for joining by invite code
const JoinPoolByCode = ({
  userId,
  onSuccess,
}: {
  userId: string;
  onSuccess: () => void;
}) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleJoin = async () => {
    if (!code.trim() || !userId) return;

    setLoading(true);
    try {
      // Find pool by invite code
      const { data: pools, error: findError } = await supabase
        .rpc("get_pool_by_invite_code", { code: code.trim().toUpperCase() });

      if (findError) throw findError;
      if (!pools || pools.length === 0) {
        throw new Error("Invalid invite code");
      }

      const pool = pools[0];

      // Join the pool
      const { error: joinError } = await supabase.from("pool_members").insert({
        pool_id: pool.id,
        user_id: userId,
      });

      if (joinError) throw joinError;

      toast({
        title: "Joined pool!",
        description: `You're now part of ${pool.name}.`,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Failed to join",
        description: error.message || "Please check the code and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="inviteCode">Invite code</Label>
        <div className="flex gap-2">
          <Input
            id="inviteCode"
            placeholder="e.g. ABC123"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="flex-1 uppercase"
            maxLength={6}
          />
          <Button onClick={handleJoin} disabled={code.length < 4 || loading}>
            {loading ? "..." : "Join"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StepPool;
