import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clock, Trophy, CheckCircle2, AlertCircle } from "lucide-react";
import { SchoolJerseyImage } from "@/components/ui/SchoolJerseyImage";
import { useEffectiveDate } from "@/hooks/useEffectiveDate";

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
  const [isWithinWindow, setIsWithinWindow] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedScores, setSubmittedScores] = useState<{ home: number; away: number } | null>(null);
  const [timeUntilWindow, setTimeUntilWindow] = useState<string>("");
  const [fixture, setFixture] = useState<FixtureWithSchools | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSubmissionWindow();
    fetchSchoolFixture();
    
    const interval = setInterval(() => {
      checkSubmissionWindow();
    }, 60000);

    return () => clearInterval(interval);
  }, [userSchoolName, effectiveDate]);

  const checkSubmissionWindow = () => {
    const sastTime = getSASTTime();
    const dayOfWeek = sastTime.getDay();
    const hour = sastTime.getHours();

    let withinWindow = false;

    if (dayOfWeek === 5 && hour >= 17) {
      withinWindow = true;
    } else if (dayOfWeek === 6) {
      withinWindow = true;
    } else if (dayOfWeek === 0 && hour < 24) {
      withinWindow = true;
    }

    setIsWithinWindow(withinWindow);

    if (!withinWindow) {
      let nextWindowStart = new Date(sastTime);
      
      if (dayOfWeek < 5 || (dayOfWeek === 5 && hour < 17)) {
        const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
        nextWindowStart.setDate(sastTime.getDate() + daysUntilFriday);
        nextWindowStart.setHours(17, 0, 0, 0);
      } else {
        const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
        nextWindowStart.setDate(sastTime.getDate() + daysUntilFriday);
        nextWindowStart.setHours(17, 0, 0, 0);
      }

      const diffMs = nextWindowStart.getTime() - sastTime.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (diffDays > 0) {
        setTimeUntilWindow(`${diffDays} day${diffDays > 1 ? 's' : ''} and ${diffHours} hour${diffHours > 1 ? 's' : ''}`);
      } else {
        setTimeUntilWindow(`${diffHours} hour${diffHours > 1 ? 's' : ''}`);
      }
    }
  };

  const fetchSchoolFixture = async () => {
    try {
      setLoading(true);
      
      // Get the user's school ID first
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('id, name')
        .ilike('name', userSchoolName)
        .single();

      if (schoolError || !schoolData) {
        console.log('School not found:', userSchoolName);
        setLoading(false);
        return;
      }

      // Use weekend range from simulation context
      const startOfWeekend = weekendRange.start;
      const endOfWeekend = weekendRange.end;

      // Fetch fixture for the user's school this weekend
      const { data: fixtureData, error: fixtureError } = await supabase
        .from('fixtures')
        .select(`
          id,
          match_date,
          venue,
          status,
          home_score,
          away_score,
          home_school_id,
          away_school_id
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
        console.log('No fixture found for this weekend');
        setLoading(false);
        return;
      }

      // Fetch both schools' details
      const { data: homeSchool } = await supabase
        .from('schools')
        .select('id, name, slug, jersey_url')
        .eq('id', fixtureData.home_school_id)
        .single();

      const { data: awaySchool } = await supabase
        .from('schools')
        .select('id, name, slug, jersey_url')
        .eq('id', fixtureData.away_school_id)
        .single();

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
          isUserHomeTeam: fixtureData.home_school_id === schoolData.id
        });

        // Check if score already submitted (fixture has scores)
        if (fixtureData.home_score !== null && fixtureData.away_score !== null) {
          setHasSubmitted(true);
          setSubmittedScores({
            home: fixtureData.home_score,
            away: fixtureData.away_score
          });
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
      toast({
        variant: "destructive",
        title: "Invalid scores",
        description: "Please enter valid non-negative numbers for both scores",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          variant: "destructive",
          title: "Not authenticated",
          description: "Please sign in to submit scores",
        });
        return;
      }

      // Submit the fixture score via edge function
      const response = await supabase.functions.invoke('submit-score', {
        body: { 
          fixtureId: fixture.id,
          homeScore: homeScoreValue,
          awayScore: awayScoreValue
        },
      });

      if (response.error) {
        throw response.error;
      }

      if (response.data?.error) {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: response.data.error,
        });
        return;
      }

      toast({
        title: "Score submitted!",
        description: `${fixture.home_school.name} ${homeScoreValue} - ${awayScoreValue} ${fixture.away_school.name}`,
      });

      setHasSubmitted(true);
      setSubmittedScores({ home: homeScoreValue, away: awayScoreValue });
      setHomeScore("");
      setAwayScore("");
    } catch (error: any) {
      console.error('Error submitting score:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit score. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border/40">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading fixture...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!fixture) {
    return null; // No fixture this weekend for user's school
  }

  const formatMatchDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-ZA', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="bg-gradient-card border-border/40 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" />
          Weekend Score Submission
        </CardTitle>
        <CardDescription>
          Submit your school's first team score (Friday 5 PM - Sunday 11:59 PM SAST)
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {hasSubmitted && submittedScores ? (
          // Submitted state
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="font-semibold">Score Submitted</span>
              </div>
              
              {/* Match-up display with submitted scores */}
              <div className="flex items-center justify-center gap-4 py-3">
                <div className="flex flex-col items-center gap-2">
                  <SchoolJerseyImage
                    src={fixture.home_school.jersey_url}
                    alt={fixture.home_school.name}
                    fallbackText={fixture.home_school.name.substring(0, 2).toUpperCase()}
                    size="lg"
                  />
                  <span className="text-xs font-medium text-center max-w-[80px] truncate">
                    {fixture.home_school.name}
                  </span>
                  <span className="text-2xl font-bold text-primary">{submittedScores.home}</span>
                </div>
                
                <div className="text-muted-foreground font-medium px-2">-</div>
                
                <div className="flex flex-col items-center gap-2">
                  <SchoolJerseyImage
                    src={fixture.away_school.jersey_url}
                    alt={fixture.away_school.name}
                    fallbackText={fixture.away_school.name.substring(0, 2).toUpperCase()}
                    size="lg"
                  />
                  <span className="text-xs font-medium text-center max-w-[80px] truncate">
                    {fixture.away_school.name}
                  </span>
                  <span className="text-2xl font-bold text-primary">{submittedScores.away}</span>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground text-center mt-2">
                Thank you for submitting the score!
              </p>
            </div>
          </div>
        ) : isWithinWindow ? (
          // Active submission form
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Match-up with score inputs */}
            <div className="bg-muted/20 rounded-xl p-4 border border-border/30">
              <div className="flex items-stretch justify-center gap-3">
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

                {/* VS divider */}
                <div className="flex flex-col items-center justify-center px-1">
                  <span className="text-lg font-bold text-muted-foreground">vs</span>
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
              
              <div className="mt-3 text-center text-xs text-muted-foreground">
                {formatMatchDate(fixture.match_date)} • {fixture.venue}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !homeScore || !awayScore}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? "Submitting..." : "Confirm Score"}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              Submissions close Sunday 11:59 PM SAST
            </p>
          </form>
        ) : (
          // Window closed state
          <div className="space-y-4">
            {/* Show the fixture match-up even when closed */}
            <div className="bg-muted/10 rounded-xl p-4 border border-border/30">
              <div className="flex items-center justify-center gap-4">
                <div className="flex flex-col items-center gap-2">
                  <SchoolJerseyImage
                    src={fixture.home_school.jersey_url}
                    alt={fixture.home_school.name}
                    fallbackText={fixture.home_school.name.substring(0, 2).toUpperCase()}
                    size="lg"
                    variant={fixture.isUserHomeTeam ? "accent" : "primary"}
                  />
                  <span className={`text-xs font-semibold text-center max-w-[80px] truncate ${fixture.isUserHomeTeam ? 'text-accent' : 'text-foreground'}`}>
                    {fixture.home_school.name}
                  </span>
                </div>

                <span className="text-lg font-bold text-muted-foreground px-2">vs</span>

                <div className="flex flex-col items-center gap-2">
                  <SchoolJerseyImage
                    src={fixture.away_school.jersey_url}
                    alt={fixture.away_school.name}
                    fallbackText={fixture.away_school.name.substring(0, 2).toUpperCase()}
                    size="lg"
                    variant={!fixture.isUserHomeTeam ? "accent" : "primary"}
                  />
                  <span className={`text-xs font-semibold text-center max-w-[80px] truncate ${!fixture.isUserHomeTeam ? 'text-accent' : 'text-foreground'}`}>
                    {fixture.away_school.name}
                  </span>
                </div>
              </div>
              
              <div className="mt-3 text-center text-xs text-muted-foreground">
                {formatMatchDate(fixture.match_date)} • {fixture.venue}
              </div>
            </div>

            <div className="p-4 bg-muted/10 border border-border/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">Submissions Closed</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Score submissions are only open Friday 5 PM through Sunday 11:59 PM (SAST).
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Opens in: {timeUntilWindow}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
