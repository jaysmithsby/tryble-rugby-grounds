import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, CheckCircle, AlertCircle, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type PoolInfo = {
  id: string;
  name: string;
  creator_id: string;
  is_active: boolean;
};

const JoinPool = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [pool, setPool] = useState<PoolInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    checkAuthAndLoadPool();
  }, [inviteCode]);

  const checkAuthAndLoadPool = async () => {
    setLoading(true);
    setError(null);

    // Check authentication status
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);

    if (!inviteCode) {
      setError("No invite code provided");
      setLoading(false);
      return;
    }

    // Lookup pool using the SECURITY DEFINER function
    const { data: poolData, error: poolError } = await supabase
      .rpc("get_pool_by_invite_code", { code: inviteCode.toUpperCase() });

    if (poolError || !poolData || poolData.length === 0) {
      setError("This pool code doesn't exist or has expired");
      setLoading(false);
      return;
    }

    const foundPool = poolData[0] as PoolInfo;

    if (!foundPool.is_active) {
      setError("This pool is no longer active");
      setLoading(false);
      return;
    }

    setPool(foundPool);

    // If user is authenticated, check if already a member
    if (user) {
      const { data: existingMember } = await supabase
        .from("pool_members")
        .select("id")
        .eq("pool_id", foundPool.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingMember) {
        setAlreadyMember(true);
        toast({
          title: "You're already a member!",
          description: "Redirecting to the pool...",
        });
        setTimeout(() => navigate(`/pool/${foundPool.id}`), 1500);
      }
    }

    setLoading(false);
  };

  const handleJoinPool = async () => {
    if (!pool) return;

    setJoining(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Redirect to auth with return URL
      navigate(`/auth?redirect=/join-pool/${inviteCode}`);
      return;
    }

    // Double-check membership (race condition prevention)
    const { data: existingMember } = await supabase
      .from("pool_members")
      .select("id")
      .eq("pool_id", pool.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMember) {
      toast({
        title: "You're already a member!",
        description: "Redirecting to the pool...",
      });
      navigate(`/pool/${pool.id}`);
      return;
    }

    // Join the pool
    const { error: joinError } = await supabase
      .from("pool_members")
      .insert({
        pool_id: pool.id,
        user_id: user.id,
      });

    if (joinError) {
      toast({
        title: "Failed to join pool",
        description: joinError.message,
        variant: "destructive",
      });
      setJoining(false);
      return;
    }

    toast({
      title: "Welcome to the pool! 🎉",
      description: `You've joined "${pool.name}"`,
    });

    navigate(`/pool/${pool.id}`);
  };

  const handleSignIn = () => {
    navigate(`/auth?redirect=/join-pool/${inviteCode}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Looking up pool...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Pool Not Found</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate("/leaderboard")} variant="outline">
              Go to Leaderboards
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already a member state
  if (alreadyMember && pool) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2">Already a Member!</h2>
            <p className="text-muted-foreground mb-2">
              You're already in <strong>{pool.name}</strong>
            </p>
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not authenticated state
  if (!isAuthenticated && pool) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Join "{pool.name}"</CardTitle>
            <CardDescription>
              Sign in to join this pool and compete with friends
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleSignIn} className="w-full" size="lg">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In to Join
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Don't have an account? You can create one after clicking sign in.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ready to join state
  if (pool) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Join "{pool.name}"</CardTitle>
            <CardDescription>
              You've been invited to join this pool
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Invite Code</p>
              <p className="text-2xl font-mono font-bold text-primary">
                {inviteCode?.toUpperCase()}
              </p>
            </div>
            <Button 
              onClick={handleJoinPool} 
              className="w-full" 
              size="lg"
              disabled={joining}
            >
              {joining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Join Pool
                </>
              )}
            </Button>
            <Button 
              variant="ghost" 
              className="w-full" 
              onClick={() => navigate("/leaderboard")}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default JoinPool;
