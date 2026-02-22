import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clock, Trophy, CheckCircle2, AlertCircle, Users, ThumbsUp } from "lucide-react";
import { SchoolJerseyImage } from "@/components/ui/SchoolJerseyImage";
import { Badge } from "@/components/ui/badge";

interface FixtureWithSchools {
  id: string;
  match_date: string;
  venue_legacy: string;
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

interface CommunityScore {
  homeScore: number;
  awayScore: number;
  count: number;
}

interface MatchScoreSubmissionProps {
  userSchoolName: string;
}

export const MatchScoreSubmission = ({ userSchoolName }: MatchScoreSubmissionProps) => {
  const { toast } = useToast();
  const [homeScore, setHomeScore] = useState<string>("");
  const [awayScore, setAwayScore] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedScores, setSubmittedScores] = useState<{ home: number; away: number } | null>(null);
  const [fixture, setFixture] = useState<FixtureWithSchools | null>(null);
  const [loading, setLoading] = useState(true);
  const [communityScores, setCommunityScores] = useState<CommunityScore[]>([]);
  
  // Timing states
  const [submissionState, setSubmissionState] = useState<'before' | 'open' | 'closed'>('before');
  const [countdown, setCountdown] = useState<string>("");
  const [closingTime, setClosingTime] = useState<string>("");

  // Get SAST time helper
  const getSASTTime = useCallback((date: Date = new Date()) => {
    const sastOffset = 2 * 60; // minutes
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
    return new Date(utcTime + sastOffset * 60000);
  }, []);

  // Calculate submission window based on match date
  const calculateSubmissionWindow = useCallback((matchDate: Date) => {
    const matchDay = new Date(matchDate);
    matchDay.setHours(0, 0, 0, 0);
    
    // Opens at 3pm (15:00) on match day
    const opensAt = new Date(matchDay);
    opensAt.setHours(15, 0, 0, 0);
    
    // Closes at 10am the next day
    const closesAt = new Date(matchDay);
    closesAt.setDate(closesAt.getDate() + 1);
    closesAt.setHours(10, 0, 0, 0);
    
    return { opensAt, closesAt };
  }, []);

  // Check and update submission state
  const updateSubmissionState = useCallback(() => {
    if (!fixture) return;
    
    const matchDate = new Date(fixture.match_date);
    const { opensAt, closesAt } = calculateSubmissionWindow(matchDate);
    const now = getSASTTime();
    
    // Format closing time for display
    const closingDay = closesAt.toLocaleDateString('en-ZA', { weekday: 'long' });
    setClosingTime(`${closingDay} 10:00 AM SAST`);
    
    if (now < opensAt) {
      setSubmissionState('before');
      
      // Calculate countdown
      const diffMs = opensAt.getTime() - now.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours > 24) {
        const diffDays = Math.floor(diffHours / 24);
        const remainingHours = diffHours % 24;
        setCountdown(`${diffDays}d ${remainingHours}h ${diffMins}m`);
      } else if (diffHours > 0) {
        setCountdown(`${diffHours}h ${diffMins}m`);
      } else {
        setCountdown(`${diffMins} minutes`);
      }
    } else if (now >= opensAt && now < closesAt) {
      setSubmissionState('open');
    } else {
      setSubmissionState('closed');
    }
  }, [fixture, getSASTTime, calculateSubmissionWindow]);

  // Fetch the next fixture for user's school
  const fetchSchoolFixture = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get the user's school ID
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('id, name')
        .ilike('name', userSchoolName)
        .maybeSingle();

      if (schoolError || !schoolData) {
        console.log('School not found:', userSchoolName);
        setLoading(false);
        return;
      }

      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      
      // Look ahead 7 days for the next match
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 7);

      // Fetch next upcoming fixture for the user's school
      const { data: fixtureData, error: fixtureError } = await supabase
        .from('fixtures')
        .select(`
          id,
          match_date,
          venue_legacy,
          status,
          home_score,
          away_score,
          home_school_id,
          away_school_id
        `)
        .or(`home_school_id.eq.${schoolData.id},away_school_id.eq.${schoolData.id}`)
        .gte('match_date', startOfToday.toISOString())
        .lte('match_date', endDate.toISOString())
        .order('match_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (fixtureError) {
        console.error('Error fetching fixture:', fixtureError);
        setLoading(false);
        return;
      }

      if (!fixtureData) {
        console.log('No upcoming fixture found');
        setLoading(false);
        return;
      }

      // Fetch both schools' details in parallel
      const [{ data: homeSchool }, { data: awaySchool }] = await Promise.all([
        supabase
          .from('schools')
          .select('id, name, slug, jersey_url')
          .eq('id', fixtureData.home_school_id)
          .single(),
        supabase
          .from('schools')
          .select('id, name, slug, jersey_url')
          .eq('id', fixtureData.away_school_id)
          .single()
      ]);

      if (homeSchool && awaySchool) {
        setFixture({
          id: fixtureData.id,
          match_date: fixtureData.match_date,
          venue_legacy: fixtureData.venue_legacy,
          status: fixtureData.status,
          home_score: fixtureData.home_score,
          away_score: fixtureData.away_score,
          home_school: homeSchool,
          away_school: awaySchool,
          isUserHomeTeam: fixtureData.home_school_id === schoolData.id
        });

        // Check if already has official score
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
  }, [userSchoolName]);

  // Fetch community-submitted scores for this fixture
  const fetchCommunityScores = useCallback(async () => {
    if (!fixture) return;
    
    try {
      // Fetch game_scores submitted by users from the same school for this fixture
      const { data: scores, error } = await supabase
        .from('game_scores')
        .select('score')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false })
        .limit(50);

      if (error || !scores || scores.length === 0) {
        setCommunityScores([]);
        return;
      }

      // For now, we'll simulate community scores from same school
      // In production, this would be filtered by fixture_id and school
      // Group identical scores and count
      const scoreMap = new Map<string, number>();
      
      // This is simplified - in real implementation, game_scores would have
      // home_score and away_score columns for fixture scoring
      setCommunityScores([]);
    } catch (error) {
      console.error('Error fetching community scores:', error);
    }
  }, [fixture]);

  useEffect(() => {
    fetchSchoolFixture();
  }, [fetchSchoolFixture]);

  useEffect(() => {
    if (fixture) {
      updateSubmissionState();
      fetchCommunityScores();
      
      // Update every minute
      const interval = setInterval(() => {
        updateSubmissionState();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [fixture, updateSubmissionState, fetchCommunityScores]);

  const handleCommunityScoreSelect = (score: CommunityScore) => {
    setHomeScore(score.homeScore.toString());
    setAwayScore(score.awayScore.toString());
    toast({
      title: "Score selected",
      description: "Confirm if this score is correct, or adjust if needed.",
    });
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
        title: "Score Submission Failed",
        description: error.message || "Could not submit your score. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatMatchDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-ZA', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'short'
    });
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border/40">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading match...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!fixture) {
    return null; // No upcoming fixture
  }

  return (
    <Card className="bg-gradient-card border-border/40 overflow-hidden mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" />
          Submit Match Score
        </CardTitle>
        <CardDescription>
          Help the community by entering your school's first team result
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {hasSubmitted && submittedScores ? (
          // Score already submitted
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="font-semibold">Score Submitted</span>
              </div>
              
              <div className="flex items-center justify-center gap-4 py-3">
                <div className="flex flex-col items-center gap-2">
                  <SchoolJerseyImage
                    src={fixture.home_school.jersey_url}
                    alt={fixture.home_school.name}
                    fallbackText={fixture.home_school.name.substring(0, 2).toUpperCase()}
                    size="lg"
                  />
                  <span className="text-xs font-medium text-center max-w-[80px] leading-tight line-clamp-2">
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
                  <span className="text-xs font-medium text-center max-w-[80px] leading-tight line-clamp-2">
                    {fixture.away_school.name}
                  </span>
                  <span className="text-2xl font-bold text-primary">{submittedScores.away}</span>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground text-center mt-2">
                Thank you for contributing!
              </p>
            </div>
          </div>
        ) : submissionState === 'open' ? (
          // Submission window is open
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Community suggestions */}
            {communityScores.length > 0 && (
              <div className="bg-muted/20 rounded-lg p-3 border border-border/30">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Others from your school submitted:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {communityScores.map((score, idx) => (
                    <Button
                      key={idx}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCommunityScoreSelect(score)}
                      className="gap-1"
                    >
                      {score.homeScore} - {score.awayScore}
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {score.count}
                      </Badge>
                      <ThumbsUp className="w-3 h-3 ml-1" />
                    </Button>
                  ))}
                </div>
              </div>
            )}

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
                {formatMatchDate(fixture.match_date)} • {fixture.venue_legacy || "TBD"}
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
              Submissions close {closingTime}
            </p>
          </form>
        ) : submissionState === 'before' ? (
          // Before submission window opens
          <div className="space-y-4">
            {/* Match-up display */}
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
                  <span className={`text-xs font-semibold text-center max-w-[80px] leading-tight line-clamp-2 ${fixture.isUserHomeTeam ? 'text-accent' : 'text-foreground'}`}>
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
                  <span className={`text-xs font-semibold text-center max-w-[80px] leading-tight line-clamp-2 ${!fixture.isUserHomeTeam ? 'text-accent' : 'text-foreground'}`}>
                    {fixture.away_school.name}
                  </span>
                </div>
              </div>
              
              <div className="mt-3 text-center text-xs text-muted-foreground">
                {formatMatchDate(fixture.match_date)} • {fixture.venue_legacy || "TBD"}
              </div>
            </div>

            {/* Countdown to opening */}
            <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg text-center">
              <Clock className="w-8 h-8 text-accent mx-auto mb-2" />
              <h4 className="font-semibold text-foreground mb-1">Score Entry Opens Soon</h4>
              <p className="text-sm text-muted-foreground mb-3">
                You'll be able to enter the final score after 3:00 PM on match day
              </p>
              <div className="inline-flex items-center gap-2 bg-background/50 rounded-full px-4 py-2">
                <Clock className="w-4 h-4 text-accent" />
                <span className="font-mono font-bold text-lg text-accent">{countdown}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Help the Trybal community by entering your school's first team score after the match
            </p>
          </div>
        ) : (
          // Submission window closed
          <div className="space-y-4">
            <div className="bg-muted/10 rounded-xl p-4 border border-border/30">
              <div className="flex items-center justify-center gap-4">
                <div className="flex flex-col items-center gap-2">
                  <SchoolJerseyImage
                    src={fixture.home_school.jersey_url}
                    alt={fixture.home_school.name}
                    fallbackText={fixture.home_school.name.substring(0, 2).toUpperCase()}
                    size="lg"
                  />
                  <span className="text-xs font-semibold text-center max-w-[80px] leading-tight line-clamp-2">
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
                  />
                  <span className="text-xs font-semibold text-center max-w-[80px] leading-tight line-clamp-2">
                    {fixture.away_school.name}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/10 border border-border/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">Submissions Closed</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The score submission window for this match has ended.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
