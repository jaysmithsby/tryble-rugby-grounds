import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, MapPin, Users, Trophy, Loader2, Flag } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { FixtureCard } from "@/components/fixtures/FixtureCard";

interface Tournament {
  id: string;
  name: string;
  host_school: string;
  venue: string;
  province: string | null;
  start_date: string;
  end_date: string;
  format_notes: string | null;
  participating_schools: string[];
  sponsor_name: string | null;
  sponsor_logo_url: string | null;
  is_active: boolean;
}

export default function Tournament() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tournamentId) {
      fetchTournament();
      fetchFixtures();
    }
  }, [tournamentId]);

  const fetchTournament = async () => {
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .single();

      if (error) throw error;
      setTournament(data);
    } catch (error) {
      console.error("Error fetching tournament:", error);
      toast({
        title: "Failed to Load Tournament",
        description: "Could not retrieve tournament details. Returning to home.",
        variant: "destructive",
      });
      navigate("/home");
    } finally {
      setLoading(false);
    }
  };

  const fetchFixtures = async () => {
    try {
      const { data, error } = await supabase
        .from("fixtures")
        .select(`
          *,
          school_a:schools!fixtures_school_a_id_fkey(id, name, slug, icon_url, emblem_url, jersey_url),
          school_b:schools!fixtures_school_b_id_fkey(id, name, slug, icon_url, emblem_url, jersey_url)
        `)
        .eq("tournament_id", tournamentId)
        .order("match_date", { ascending: true });

      if (error) throw error;
      setFixtures(data || []);
    } catch (error) {
      console.error("Error fetching fixtures:", error);
    }
  };

  const getSchoolImage = (school: any) => {
    return school?.emblem_url || school?.jersey_url || school?.icon_url;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournament) {
    return null;
  }

  return (
    <>
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 space-y-6">
          {tournament.sponsor_logo_url && (
            <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center justify-center gap-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Proudly Sponsored By
              </p>
              <img
                src={tournament.sponsor_logo_url}
                alt={tournament.sponsor_name || "Tournament Sponsor"}
                className="h-16 md:h-20 object-contain"
              />
              {tournament.sponsor_name && (
                <p className="text-sm font-medium">{tournament.sponsor_name}</p>
              )}
            </div>
          )}

          <div className="bg-gradient-to-br from-primary/10 via-background to-background rounded-lg border border-border p-8 text-center space-y-4">
            <Trophy className="h-12 w-12 mx-auto text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {tournament.name}
            </h1>
            <p className="text-lg text-muted-foreground">
              Hosted by {tournament.host_school}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Date Range</p>
                <p className="text-sm font-medium">
                  {format(new Date(tournament.start_date), "MMM d")} -{" "}
                  {format(new Date(tournament.end_date), "MMM d, yyyy")}
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm font-medium">
                  {tournament.venue}
                  {tournament.province && `, ${tournament.province}`}
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Participating Schools</p>
                <p className="text-sm font-medium">
                  {tournament.participating_schools.length} Schools
                </p>
              </div>
            </div>
          </div>

          {tournament.format_notes && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Tournament Format
              </h2>
              <p className="text-muted-foreground">{tournament.format_notes}</p>
            </div>
          )}

          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Participating Schools ({tournament.participating_schools.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {tournament.participating_schools.map((school, index) => (
                <div
                  key={index}
                  className="bg-background border border-border rounded-md p-3 text-sm font-medium"
                >
                  {school}
                </div>
              ))}
            </div>
          </div>

          {fixtures.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Flag className="h-5 w-5 text-primary" />
                Tournament Fixtures ({fixtures.length})
              </h2>
              <div className="space-y-3">
                {fixtures.map((fixture, index) => (
                  <FixtureCard
                    key={fixture.id}
                    homeTeam={fixture.school_a?.name || "TBD"}
                    awayTeam={fixture.school_b?.name || "TBD"}
                    homeTeamShort={fixture.school_a?.name?.slice(0, 3).toUpperCase() || "TBD"}
                    awayTeamShort={fixture.school_b?.name?.slice(0, 3).toUpperCase() || "TBD"}
                    homeTeamIcon={getSchoolImage(fixture.school_a)}
                    awayTeamIcon={getSchoolImage(fixture.school_b)}
                    homeSchoolSlug={fixture.school_a?.slug}
                    awaySchoolSlug={fixture.school_b?.slug}
                    time={format(new Date(fixture.match_date), "MMM d, h:mm a")}
                    venue={fixture.venue_legacy || "TBD"}
                    matchId={fixture.id}
                    priority={index < 3}
                    homeSchoolId={fixture.school_a?.id}
                    awaySchoolId={fixture.school_b?.id}
                  />
                ))}
              </div>
            </div>
          )}

          {tournament.sponsor_logo_url && (
            <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center justify-center gap-4">
              <img
                src={tournament.sponsor_logo_url}
                alt={tournament.sponsor_name || "Tournament Sponsor"}
                className="h-12 md:h-16 object-contain opacity-80"
              />
              <p className="text-xs text-muted-foreground text-center">
                Thank you to our sponsor for making this tournament possible
              </p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </>
  );
}
