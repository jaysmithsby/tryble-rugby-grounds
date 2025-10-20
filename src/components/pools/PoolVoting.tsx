import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Clock, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PoolVotingProps {
  poolId: string;
  votingClosesAt: string;
  isFinalized: boolean;
  onVotingComplete: () => void;
}

export const PoolVoting = ({ poolId, votingClosesAt, isFinalized, onVotingComplete }: PoolVotingProps) => {
  const [availableSchools, setAvailableSchools] = useState<string[]>([]);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [voteStats, setVoteStats] = useState<Record<string, number>>({});
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSchools();
    loadUserVotes();
    loadVoteStats();
  }, [poolId]);

  useEffect(() => {
    if (isFinalized) return;

    const updateTimer = () => {
      const now = new Date();
      const closeTime = new Date(votingClosesAt);
      
      if (now >= closeTime) {
        setTimeRemaining("Voting closed");
        finalizeVoting();
      } else {
        setTimeRemaining(formatDistanceToNow(closeTime, { addSuffix: true }));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [votingClosesAt, isFinalized]);

  const loadSchools = async () => {
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("name")
        .eq("status", "verified")
        .order("name");

      if (error) throw error;
      setAvailableSchools(data?.map(s => s.name) || []);
    } catch (error) {
      console.error("Error loading schools:", error);
    }
  };

  const loadUserVotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("pool_school_votes")
        .select("school_name")
        .eq("pool_id", poolId)
        .eq("user_id", user.id);

      if (error) throw error;
      setUserVotes(data?.map(v => v.school_name) || []);
    } catch (error) {
      console.error("Error loading user votes:", error);
    }
  };

  const loadVoteStats = async () => {
    try {
      const { data, error } = await supabase
        .from("pool_school_votes")
        .select("school_name")
        .eq("pool_id", poolId);

      if (error) throw error;

      const stats: Record<string, number> = {};
      data?.forEach(vote => {
        stats[vote.school_name] = (stats[vote.school_name] || 0) + 1;
      });
      setVoteStats(stats);
    } catch (error) {
      console.error("Error loading vote stats:", error);
    }
  };

  const toggleVote = async (school: string) => {
    if (isFinalized) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (userVotes.includes(school)) {
        // Remove vote
        const { error } = await supabase
          .from("pool_school_votes")
          .delete()
          .eq("pool_id", poolId)
          .eq("user_id", user.id)
          .eq("school_name", school);

        if (error) throw error;
        setUserVotes(userVotes.filter(s => s !== school));
      } else if (userVotes.length < 10) {
        // Add vote
        const { error } = await supabase
          .from("pool_school_votes")
          .insert({
            pool_id: poolId,
            user_id: user.id,
            school_name: school
          });

        if (error) throw error;
        setUserVotes([...userVotes, school]);
      } else {
        toast({
          title: "Maximum votes reached",
          description: "You can vote for up to 10 schools",
          variant: "destructive"
        });
      }

      await loadVoteStats();
      await checkIfAllVoted();
    } catch (error: any) {
      toast({
        title: "Error voting",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkIfAllVoted = async () => {
    try {
      const { data, error } = await supabase
        .rpc('check_all_members_voted', { pool_id_param: poolId });

      if (error) throw error;
      if (data) {
        await finalizeVoting();
      }
    } catch (error) {
      console.error("Error checking votes:", error);
    }
  };

  const finalizeVoting = async () => {
    try {
      const { error } = await supabase
        .rpc('finalize_pool_voting', { pool_id_param: poolId });

      if (error) throw error;

      toast({
        title: "Voting finalized!",
        description: "Pool schools have been locked in"
      });

      onVotingComplete();
    } catch (error: any) {
      console.error("Error finalizing voting:", error);
    }
  };

  if (isFinalized) {
    return (
      <Card className="p-6 bg-muted/30 border-primary/20">
        <div className="flex items-center gap-2 text-primary mb-4">
          <CheckCircle2 className="w-5 h-5" />
          <h3 className="font-semibold">Voting Complete</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Schools have been finalized for this pool.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Voting closes {timeRemaining}</span>
          </div>
          <Badge variant="outline" className="bg-background">
            {userVotes.length}/10 votes
          </Badge>
        </div>
      </Card>

      <div>
        <p className="text-sm text-muted-foreground mb-3">
          Top 10 schools by votes will be included. You have {10 - userVotes.length} votes remaining.
        </p>

        <ScrollArea className="h-96 border rounded-lg bg-background">
          <div className="p-3 grid grid-cols-2 gap-2">
            {availableSchools.map((school) => {
              const hasVoted = userVotes.includes(school);
              const voteCount = voteStats[school] || 0;

              return (
                <Button
                  key={school}
                  variant={hasVoted ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleVote(school)}
                  disabled={loading || (!hasVoted && userVotes.length >= 10)}
                  className="h-auto py-3 px-3 justify-between items-start text-left flex-col gap-1"
                >
                  <span className="font-medium text-sm">{school}</span>
                  {voteCount > 0 && (
                    <span className="text-xs opacity-70">
                      {voteCount} vote{voteCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
