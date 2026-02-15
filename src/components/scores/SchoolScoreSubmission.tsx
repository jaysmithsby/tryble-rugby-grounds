import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trophy, CheckCircle2 } from "lucide-react";
import { SchoolJerseyImage } from "@/components/ui/SchoolJerseyImage";
import { useEffectiveDate } from "@/hooks/useEffectiveDate";
import { format } from "date-fns";

interface FixtureWithSchools {
  id: string;
  match_date: string;
  venue: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_school: {
    id: string;
    name: string;
    slug: string;
    jersey_url: string | null;
  };
  away_school: {
    id: string;
    name: string;
    slug: string;
    jersey_url: string | null;
  };
  isUserHomeTeam: boolean;
}

interface SchoolScoreSubmissionProps {
  userSchoolName: string;
}

export const SchoolScoreSubmission = ({ userSchoolName }: SchoolScoreSubmissionProps) => {
  const { toast } = useToast();
  const { effectiveDate, getSASTTime, weekendRange, seasonYear } = useEffectiveDate();
  const [homeScore, setHomeScore] = useState<string>("");
  const [awayScore, setAwayScore] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedScores, setSubmittedScores] = useState<{ home: number; away: number } | null>(null);
  const [fixture, setFixture] = useState<FixtureWithSchools | null>(null);
  const [loading, setLoading] = useState(true);
  const [noSchoolFound, setNoSchoolFound] = useState(false);

  // Determine if within the submission window: 3PM on match day to 10AM next morning
  const isWithinWindow = useMemo(() => {
    if (!fixture) return false;
    const sastNow = getSASTTime();
    const matchDate = new Date(fixture.match_date);
    const matchSAST = getSASTTime(matchDate);

    // Window opens at 3PM (15:00) on match day
    const windowOpen = new Date(matchSAST);
    windowOpen.setHours(15, 0, 0, 0);

    // Window closes at 10AM next morning
    const windowClose = new Date(matchSAST);
    windowClose.setDate(windowClose.getDate() + 1);
    windowClose.setHours(10, 0, 0, 0);

    return sastNow >= windowOpen && sastNow <= windowClose;
  }, [fixture, effectiveDate, getSASTTime]);

  useEffect(() => {
    fetchSchoolFixture();
  }, [userSchoolName, effectiveDate]);

  const fetchSchoolFixture = async () => {
    try {
      setLoading(true);
      setNoSchoolFound(false);

      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('id, name')
        .ilike('name', userSchoolName)
        .single();

      if (schoolError || !schoolData) {
        setNoSchoolFound(true);
        setLoading(false);
        return;
      }

      const startOfWeekend = weekendRange.start;
      const endOfWeekend = weekendRange.end;

      const { data: fixtureData, error: fixtureError } = await supabase
        .from('fixtures')
        .select(`
          id, match_date, venue, status, home_score, away_score,
          home_school_id, away_school_id
        `)
        .or(`home_school_id.eq.${schoolData.id},away_school_id.eq.${schoolData.id}`)
        .eq('year', seasonYear)
        .gte('match_date', startOfWeekend.toISOString())
        .lte('match_date', endOfWeekend.toISOString())
        .order('match_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (fixtureError) {
        console.error('Error fetching fixture:', fixtureError);
        setLoading(false);
        return;
      }

      if (!fixtureData) {
        setLoading(false);
        return;
      }

      const [{ data: homeSchool }, { data: awaySchool }] = await Promise.all([
        supabase.from('schools').select('id, name, slug, jersey_url').eq('id', fixtureData.home_school_id).single(),
        supabase.from('schools').select('id, name, slug, jersey_url').eq('id', fixtureData.away_school_id).single(),
      ]);

      if (homeSchool && awaySchool) {
        setFixture({
          id: fixtureData.id,
          match_date: fixtureData.match_date,
          venue: fixtureData.venue,
          status: fixtureData.status,
          home_score: fixtureData.home_score,
          away_score: fixtureData.away_score,
          home_school: homeSchool,
          away_school: awaySchool,
          isUserHomeTeam: fixtureData.home_school_id === schoolData.id,
        });

        if (fixtureData.home_score !== null && fixtureData.away_score !== null) {
          setHasSubmitted(true);
          setSubmittedScores({ home: fixtureData.home_score, away: fixtureData.away_score });
        }
      }
    } catch (error) {
      console.error('Error fetching school fixture:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixture) return;

    const homeScoreValue = parseInt(homeScore);
    const awayScoreValue = parseInt(awayScore);

    if (isNaN(homeScoreValue) || homeScoreValue < 0 || isNaN(awayScoreValue) || awayScoreValue < 0) {
      toast({ variant: "destructive", title: "Invalid scores", description: "Please enter valid non-negative numbers for both scores" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ variant: "destructive", title: "Not authenticated", description: "Please sign in to submit scores" });
        return;
      }

      const response = await supabase.functions.invoke('submit-score', {
        body: { fixtureId: fixture.id, homeScore: homeScoreValue, awayScore: awayScoreValue },
      });

      if (response.error) throw response.error;
      if (response.data?.error) {
        toast({ variant: "destructive", title: "Submission failed", description: response.data.error });
        return;
      }

      toast({ title: "Score submitted!", description: `${fixture.home_school.name} ${homeScoreValue} - ${awayScoreValue} ${fixture.away_school.name}` });
      setHasSubmitted(true);
      setSubmittedScores({ home: homeScoreValue, away: awayScoreValue });
      setHomeScore("");
      setAwayScore("");
    } catch (error: any) {
      console.error('Error submitting score:', error);
      toast({ variant: "destructive", title: "Score Submission Failed", description: error.message || "Could not submit your score. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground text-sm">Loading fixture...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Holding message: no school found
  if (noSchoolFound) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-foreground">Weekend Score Submission</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Your school hasn't been added to Trybal yet. Once it's uploaded, you'll be able to submit scores here.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Holding message: no fixture this weekend
  if (!fixture) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-foreground">Weekend Score Submission</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {userSchoolName} doesn't have a fixture this weekend. Check back next week!
          </p>
        </CardContent>
      </Card>
    );
  }

  const formattedDate = format(new Date(fixture.match_date), "EEE d MMM");
  const isDisabled = !isWithinWindow && !hasSubmitted;

  return (
    <Card className="border-border/40 overflow-hidden">
      <CardContent className="p-0">
        {/* Header row: date + venue */}
        <div className={`px-5 pt-4 pb-2 ${isDisabled ? 'opacity-40' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">{formattedDate}</span>
              <span className="text-sm text-muted-foreground">{fixture.venue}</span>
            </div>
          </div>
        </div>

        {hasSubmitted && submittedScores ? (
          /* Submitted state */
          <div className={`px-5 pb-5`}>
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="font-semibold text-sm">Score Submitted</span>
              </div>
              <div className="flex items-center justify-center gap-6">
                <div className="flex flex-col items-center gap-2">
                  <SchoolJerseyImage
                    src={fixture.home_school.jersey_url}
                    alt={fixture.home_school.name}
                    fallbackText={fixture.home_school.name.substring(0, 2).toUpperCase()}
                    size="lg"
                    variant={fixture.isUserHomeTeam ? "accent" : "primary"}
                  />
                  <span className="text-xs font-medium text-center max-w-[80px] line-clamp-2">{fixture.home_school.name}</span>
                  <span className="text-2xl font-bold text-primary">{submittedScores.home}</span>
                </div>
                <span className="text-lg font-bold text-muted-foreground">VS</span>
                <div className="flex flex-col items-center gap-2">
                  <SchoolJerseyImage
                    src={fixture.away_school.jersey_url}
                    alt={fixture.away_school.name}
                    fallbackText={fixture.away_school.name.substring(0, 2).toUpperCase()}
                    size="lg"
                    variant={!fixture.isUserHomeTeam ? "accent" : "primary"}
                  />
                  <span className="text-xs font-medium text-center max-w-[80px] line-clamp-2">{fixture.away_school.name}</span>
                  <span className="text-2xl font-bold text-primary">{submittedScores.away}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">Thank you for submitting the score!</p>
            </div>
          </div>
        ) : (
          /* Score input form — greyed out when outside window */
          <form onSubmit={handleSubmit} className={`px-5 pb-5 ${isDisabled ? 'opacity-40 pointer-events-none' : ''}`}>
            {/* Teams with score inputs */}
            <div className="flex items-stretch justify-center gap-4 py-3">
              {/* Home Team */}
              <div className="flex-1 flex flex-col items-center gap-2 max-w-[140px]">
                <SchoolJerseyImage
                  src={fixture.home_school.jersey_url}
                  alt={fixture.home_school.name}
                  fallbackText={fixture.home_school.name.substring(0, 2).toUpperCase()}
                  size="lg"
                  variant={fixture.isUserHomeTeam ? "accent" : "primary"}
                />
                <span className={`text-xs font-semibold text-center line-clamp-2 ${fixture.isUserHomeTeam ? 'text-accent' : 'text-foreground'}`}>
                  {fixture.home_school.name}
                </span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  placeholder="0"
                  required
                  className="text-center text-2xl font-bold h-14 w-20 bg-background/80"
                />
              </div>

              {/* VS */}
              <div className="flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-muted-foreground">VS</span>
              </div>

              {/* Away Team */}
              <div className="flex-1 flex flex-col items-center gap-2 max-w-[140px]">
                <SchoolJerseyImage
                  src={fixture.away_school.jersey_url}
                  alt={fixture.away_school.name}
                  fallbackText={fixture.away_school.name.substring(0, 2).toUpperCase()}
                  size="lg"
                  variant={!fixture.isUserHomeTeam ? "accent" : "primary"}
                />
                <span className={`text-xs font-semibold text-center line-clamp-2 ${!fixture.isUserHomeTeam ? 'text-accent' : 'text-foreground'}`}>
                  {fixture.away_school.name}
                </span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  placeholder="0"
                  required
                  className="text-center text-2xl font-bold h-14 w-20 bg-background/80"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !homeScore || !awayScore}
              className="w-full mt-2"
              size="lg"
            >
              {isSubmitting ? "Submitting..." : "Submit Score"}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-3">
              Score input available from 3 PM on match day until 10 AM the next morning
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
