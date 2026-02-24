import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Check, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Tournament {
  id: string;
  name: string;
  logo_url?: string | null;
  follower_count?: number;
  isUserSchool?: boolean;
  editionSchoolCount?: number;
}

interface StepTournamentProps {
  schoolName: string;
  userId: string;
  onNext: () => void;
  onSkip: () => void;
}

const StepTournament = ({ schoolName, userId, onNext, onSkip }: StepTournamentProps) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        // Fetch tournaments
        const { data: tournamentsData, error } = await supabase
          .from("tournaments")
          .select("*")
          .order("name");

        if (error) throw error;

        // Fetch active editions to get participating schools info
        const { data: editionsData } = await supabase
          .from("tournament_editions" as any)
          .select("tournament_id, participating_schools")
          .eq("is_active", true);

        const editionsMap = new Map<string, string[]>();
        ((editionsData || []) as any[]).forEach((e: any) => {
          editionsMap.set(e.tournament_id, e.participating_schools || []);
        });

        const sorted = (tournamentsData || [])
          .map((t: any) => {
            const schools = editionsMap.get(t.id) || [];
            return {
              id: t.id,
              name: t.name,
              logo_url: null as string | null,
              isUserSchool: schools.includes(schoolName),
              follower_count: 0,
              editionSchoolCount: schools.length,
            };
          })
          .sort((a, b) => {
            if (a.isUserSchool && !b.isUserSchool) return -1;
            if (!a.isUserSchool && b.isUserSchool) return 1;
            return (b.editionSchoolCount || 0) - (a.editionSchoolCount || 0);
          });

        setTournaments(sorted);

        // Fetch user's existing follows
        if (userId) {
          const { data: follows } = await supabase
            .from("user_tournament_follows")
            .select("tournament_id")
            .eq("user_id", userId);

          if (follows) {
            setFollowedIds(new Set(follows.map((f) => f.tournament_id)));
          }
        }
      } catch (e) {
        console.error("Error fetching tournaments:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [schoolName, userId]);

  const handleFollow = async (tournamentId: string) => {
    if (!userId) return;

    setFollowing(tournamentId);
    try {
      const { error } = await supabase.from("user_tournament_follows").insert({
        user_id: userId,
        tournament_id: tournamentId,
      });

      if (error) throw error;

      setFollowedIds((prev) => new Set([...prev, tournamentId]));
      toast({
        title: "Tournament followed!",
        description: "You'll see fixtures from this tournament.",
      });

      setTimeout(onNext, 500);
    } catch (error: any) {
      toast({
        title: "Failed to follow",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setFollowing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Follow a Tournament</h2>
        <p className="text-muted-foreground">
          Stay updated on fixtures and results from tournaments you care about
        </p>
      </div>

      {tournaments.length === 0 ? (
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No active tournaments right now.</p>
          <Button onClick={onSkip} className="mt-4">
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {tournaments.map((tournament) => {
              const isFollowed = followedIds.has(tournament.id);
              const isLoading = following === tournament.id;

              return (
                <div
                  key={tournament.id}
                  className={cn(
                    "border rounded-lg p-4 transition-all",
                    isFollowed ? "border-primary bg-primary/5" : "border-border",
                    tournament.isUserSchool && !isFollowed && "border-primary/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {tournament.logo_url ? (
                      <img
                        src={tournament.logo_url}
                        alt={tournament.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium">{tournament.name}</h3>
                          {tournament.isUserSchool && (
                            <span className="text-xs text-primary font-medium">
                              Your school is participating
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {tournament.editionSchoolCount || 0} schools
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={isFollowed ? "secondary" : "default"}
                      onClick={() => !isFollowed && handleFollow(tournament.id)}
                      disabled={isFollowed || isLoading}
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : isFollowed ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Following
                        </>
                      ) : (
                        "Follow"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {followedIds.size > 0 && (
            <Button onClick={onNext} className="w-full" size="lg">
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          <Button onClick={onSkip} variant="ghost" className="w-full text-muted-foreground">
            Skip for now
          </Button>
        </>
      )}
    </div>
  );
};

export default StepTournament;
