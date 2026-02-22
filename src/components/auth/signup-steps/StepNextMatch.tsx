import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock, Trophy, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow, isFuture } from "date-fns";

interface Fixture {
  id: string;
  match_date: string;
  venue_legacy: string;
  home_school: { name: string; emblem_url: string | null };
  away_school: { name: string; emblem_url: string | null };
}

interface StepNextMatchProps {
  schoolName: string;
  onFollowTournament: () => void;
  onCreatePool: () => void;
}

const StepNextMatch = ({ schoolName, onFollowTournament, onCreatePool }: StepNextMatchProps) => {
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNextFixture = async () => {
      try {
        // First, find the school ID
        const { data: schoolData } = await supabase
          .from("schools")
          .select("id, name")
          .ilike("name", schoolName)
          .single();

        if (!schoolData) {
          setLoading(false);
          return;
        }

        // Find next upcoming fixture for this school
        const now = new Date().toISOString();
        const { data: fixtureData } = await supabase
          .from("fixtures")
          .select(`
            id,
            match_date,
            venue_legacy,
            home_school:schools!fixtures_home_school_id_fkey(name, emblem_url),
            away_school:schools!fixtures_away_school_id_fkey(name, emblem_url)
          `)
          .or(`home_school_id.eq.${schoolData.id},away_school_id.eq.${schoolData.id}`)
          .gte("match_date", now)
          .eq("status", "upcoming")
          .eq("is_visible", true)
          .order("match_date", { ascending: true })
          .limit(1)
          .single();

        if (fixtureData) {
          setFixture(fixtureData as unknown as Fixture);
        }
      } catch (e) {
        console.error("Error fetching fixture:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchNextFixture();
  }, [schoolName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!fixture) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-bold">No upcoming match yet</h2>
          <p className="text-muted-foreground">
            We'll notify you when a match is added for {schoolName}.
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={onFollowTournament} className="w-full" size="lg">
            <Trophy className="w-4 h-4 mr-2" />
            Follow a Tournament
          </Button>
          <Button onClick={onCreatePool} variant="outline" className="w-full" size="lg">
            <Users className="w-4 h-4 mr-2" />
            Create a Pool
          </Button>
        </div>
      </div>
    );
  }

  const matchDate = new Date(fixture.match_date);
  const countdown = isFuture(matchDate)
    ? formatDistanceToNow(matchDate, { addSuffix: false })
    : "Match day!";

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Your Next Match</h2>
        <p className="text-muted-foreground">Here's what's coming up for {schoolName}</p>
      </div>

      {/* Fixture Card */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        {/* Teams */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            {fixture.home_school.emblem_url ? (
              <img
                src={fixture.home_school.emblem_url}
                alt={fixture.home_school.name}
                className="w-16 h-16 mx-auto object-contain mb-2"
              />
            ) : (
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-2">
                <Trophy className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <p className="font-medium text-sm">{fixture.home_school.name}</p>
            <p className="text-xs text-muted-foreground">Home</p>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-muted-foreground">VS</span>
          </div>

          <div className="flex-1 text-center">
            {fixture.away_school.emblem_url ? (
              <img
                src={fixture.away_school.emblem_url}
                alt={fixture.away_school.name}
                className="w-16 h-16 mx-auto object-contain mb-2"
              />
            ) : (
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-2">
                <Trophy className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <p className="font-medium text-sm">{fixture.away_school.name}</p>
            <p className="text-xs text-muted-foreground">Away</p>
          </div>
        </div>

        {/* Match Details */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{format(matchDate, "EEEE, d MMMM yyyy")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{format(matchDate, "h:mm a")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{fixture.venue_legacy || "TBD"}</span>
          </div>
        </div>

        {/* Countdown */}
        <div className="bg-primary/10 rounded-lg p-3 text-center">
          <p className="text-sm text-muted-foreground">Kick-off in</p>
          <p className="text-xl font-bold text-primary">{countdown}</p>
        </div>
      </div>

      {/* CTAs */}
      <div className="space-y-3">
        <Button onClick={onFollowTournament} className="w-full" size="lg">
          <Trophy className="w-4 h-4 mr-2" />
          Follow a Tournament
        </Button>
        <Button onClick={onCreatePool} variant="outline" className="w-full" size="lg">
          <Users className="w-4 h-4 mr-2" />
          Create a Pool
        </Button>
      </div>
    </div>
  );
};

export default StepNextMatch;
