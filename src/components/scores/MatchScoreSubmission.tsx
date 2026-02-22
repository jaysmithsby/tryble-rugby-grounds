import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clock, Trophy, CheckCircle2, AlertCircle, Users, ThumbsUp } from "lucide-react";
import { SchoolJerseyImage } from "@/components/ui/SchoolJerseyImage";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface FixtureWithSchools {
  id: string;
  match_date: string;
  venue_legacy: string;
  status: string;
  score_a: number | null;
  score_b: number | null;
  school_a: {
    id: string;
    name: string;
    slug: string;
    jersey_url: string | null;
  };
  school_b: {
    id: string;
    name: string;
    slug: string;
    jersey_url: string | null;
  };
  isUserSchoolA: boolean;
}

interface CommunityScore {
  scoreA: number;
  scoreB: number;
  count: number;
}

interface MatchScoreSubmissionProps {
  userSchoolName: string;
}

export const MatchScoreSubmission = ({ userSchoolName }: MatchScoreSubmissionProps) => {
  const { toast } = useToast();
  const [scoreA, setScoreA] = useState<string>("");
  const [scoreB, setScoreB] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedScores, setSubmittedScores] = useState<{ scoreA: number; scoreB: number } | null>(null);
  const [fixture, setFixture] = useState<FixtureWithSchools | null>(null);
  const [loading, setLoading] = useState(true);
  const [communityScores, setCommunityScores] = useState<CommunityScore[]>([]);
  
  // Timing states
  const [submissionState, setSubmissionState] = useState<'before' | 'open' | 'closed'>('before');
  const [countdown, setCountdown] = useState<string>("");
  const [closingTime, setClosingTime] = useState<string>("");

  const getSASTTime = useCallback((date: Date = new Date()) => {
    const sastOffset = 2 * 60; // minutes
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
    return new Date(utcTime + sastOffset * 60000);
  }, []);

  const calculateSubmissionWindow = useCallback((matchDate: Date) => {
    const matchDay = new Date(matchDate);
    matchDay.setHours(0, 0, 0, 0);
    
    const opensAt = new Date(matchDay);
    opensAt.setHours(15, 0, 0, 0);
    
    const closesAt = new Date(matchDay);
    closesAt.setDate(closesAt.getDate() + 1);
    closesAt.setHours(10, 0, 0, 0);
    
    return { opensAt, closesAt };
  }, []);

  const updateSubmissionState = useCallback(() => {
    if (!fixture) return;
    
    const matchDate = new Date(fixture.match_date);
    const { opensAt, closesAt } = calculateSubmissionWindow(matchDate);
    const now = getSASTTime();
    
    const closingDay = closesAt.toLocaleDateString('en-ZA', { weekday: 'long' });
    setClosingTime(`${closingDay} 10:00 AM SAST`);
    
    if (now < opensAt) {
      setSubmissionState('before');
      
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

  const fetchSchoolFixture = useCallback(async () => {
    try {
      setLoading(true);
      
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
      
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 7);

      const { data: fixtureData, error: fixtureError } = await supabase
        .from('fixtures')
        .select(`
          id,
          match_date,
          venue_legacy,
          status,
          score_a,
          score_b,
          school_a_id,
          school_b_id
        `)
        .or(`school_a_id.eq.${schoolData.id},school_b_id.eq.${schoolData.id}`)
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

      const [{ data: schoolA }, { data: schoolB }] = await Promise.all([
        supabase
          .from('schools')
          .select('id, name, slug, jersey_url')
          .eq('id', fixtureData.school_a_id)
          .single(),
        supabase
          .from('schools')
          .select('id, name, slug, jersey_url')
          .eq('id', fixtureData.school_b_id)
          .single()
      ]);

      if (schoolA && schoolB) {
        setFixture({
          id: fixtureData.id,
          match_date: fixtureData.match_date,
          venue_legacy: fixtureData.venue_legacy,
          status: fixtureData.status,
          score_a: fixtureData.score_a,
          score_b: fixtureData.score_b,
          school_a: schoolA,
          school_b: schoolB,
          isUserSchoolA: fixtureData.school_a_id === schoolData.id
        });

        if (fixtureData.score_a !== null && fixtureData.score_b !== null) {
          setHasSubmitted(true);
          setSubmittedScores({
            scoreA: fixtureData.score_a,
            scoreB: fixtureData.score_b
          });
        }
      }
    } catch (error) {
      console.error('Error fetching school fixture:', error);
    } finally {
      setLoading(false);
    }
  }, [userSchoolName]);

  const fetchCommunityScores = useCallback(async () => {
    if (!fixture) return;
    
    try {
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
      
      const interval = setInterval(() => {
        updateSubmissionState();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [fixture, updateSubmissionState, fetchCommunityScores]);

  const handleCommunityScoreSelect = (score: CommunityScore) => {
    setScoreA(score.scoreA.toString());
    setScoreB(score.scoreB.toString());
    toast({
      title: "Score selected",
      description: "Confirm if this score is correct, or adjust if needed.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fixture) return;

    const scoreAValue = parseInt(scoreA);
    const scoreBValue = parseInt(scoreB);
    
    if (isNaN(scoreAValue) || scoreAValue < 0 || isNaN(scoreBValue) || scoreBValue < 0) {
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
          scoreA: scoreAValue,
          scoreB: scoreBValue
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
        description: `${fixture.school_a.name} ${scoreAValue} - ${scoreBValue} ${fixture.school_b.name}`,
      });

      setHasSubmitted(true);
      setSubmittedScores({ scoreA: scoreAValue, scoreB: scoreBValue });
      setScoreA("");
      setScoreB("");
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
    return null;
  }

  const formattedDate = format(new Date(fixture.match_date), "EEE d MMM");
  const isDisabled = !submissionState && !hasSubmitted; // simplified for now

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
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="font-semibold">Score Submitted</span>
              </div>
              
              <div className="flex items-center justify-center gap-4 py-3">
                <div className="flex flex-col items-center gap-2">
                  <SchoolJerseyImage
                    src={fixture.school_a.jersey_url}
                    alt={fixture.school_a.name}
                    fallbackText={fixture.school_a.name.substring(0, 2).toUpperCase()}
                    size="lg"
                  />
                  <span className="text-xs font-medium text-center max-w-[80px] leading-tight line-clamp-2">
                    {fixture.school_a.name}
                  </span>
                  <span className="text-2xl font-bold text-primary">{submittedScores.scoreA}</span>
                </div>
                
                <div className="text-muted-foreground font-medium px-2">-</div>
                
                <div className="flex flex-col items-center gap-2">
                  <SchoolJerseyImage
                    src={fixture.school_b.jersey_url}
                    alt={fixture.school_b.name}
                    fallbackText={fixture.school_b.name.substring(0, 2).toUpperCase()}
                    size="lg"
                  />
                  <span className="text-xs font-medium text-center max-w-[80px] leading-tight line-clamp-2">
                    {fixture.school_b.name}
                  </span>
                  <span className="text-2xl font-bold text-primary">{submittedScores.scoreB}</span>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground text-center mt-2">
                Thank you for contributing!
              </p>
            </div>
          </div>
        ) : submissionState === 'open' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
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
                      {score.scoreA} - {score.scoreB}
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {score.count}
                      </Badge>
                      <ThumbsUp className="w-3 h-3 ml-1" />
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-muted/20 rounded-xl p-4 border border-border/30">
              <div className="flex items-stretch justify-center gap-3">
                <div className="flex-1 flex flex-col items-center gap-2 max-w-[140px]">
                  <SchoolJerseyImage
                    src={fixture.school_a.jersey_url}
                    alt={fixture.school_a.name}
                    fallbackText={fixture.school_a.name.substring(0, 2).toUpperCase()}
                    size="lg"
                    variant={fixture.isUserSchoolA ? "accent" : "primary"}
                  />
                  <span className={`text-xs font-semibold text-center line-clamp-2 ${fixture.isUserSchoolA ? 'text-accent' : 'text-foreground'}`}>
                    {fixture.school_a.name}
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={scoreA}
                    onChange={(e) => setScoreA(e.target.value)}
                    placeholder="0"
                    required
                    className="text-center text-2xl font-bold h-14 w-20 bg-background/80"
                  />
                </div>

                <div className="flex flex-col items-center justify-center px-1">
                  <span className="text-lg font-bold text-muted-foreground">vs</span>
                </div>

                <div className="flex-1 flex flex-col items-center gap-2 max-w-[140px]">
                  <SchoolJerseyImage
                    src={fixture.school_b.jersey_url}
                    alt={fixture.school_b.name}
                    fallbackText={fixture.school_b.name.substring(0, 2).toUpperCase()}
                    size="lg"
                    variant={!fixture.isUserSchoolA ? "accent" : "primary"}
                  />
                  <span className={`text-xs font-semibold text-center line-clamp-2 ${!fixture.isUserSchoolA ? 'text-accent' : 'text-foreground'}`}>
                    {fixture.school_b.name}
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={scoreB}
                    onChange={(e) => setScoreB(e.target.value)}
                    placeholder="0"
                    required
                    className="text-center text-2xl font-bold h-14 w-20 bg-background/80"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !scoreA || !scoreB}
                className="w-full mt-4"
              >
                {isSubmitting ? "Submitting..." : "Submit Score"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            {submissionState === 'before' ? `Submission opens in ${countdown}` : `Submission closed`}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
