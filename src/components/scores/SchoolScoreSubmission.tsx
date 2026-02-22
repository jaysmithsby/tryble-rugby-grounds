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

interface SchoolScoreSubmissionProps {
  userSchoolName: string;
}

export const SchoolScoreSubmission = ({ userSchoolName }: SchoolScoreSubmissionProps) => {
  const { toast } = useToast();
  const { effectiveDate, getSASTTime, weekendRange, seasonYear } = useEffectiveDate();
  const [scoreA, setScoreA] = useState<string>("");
  const [scoreB, setScoreB] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedScores, setSubmittedScores] = useState<{ scoreA: number; scoreB: number } | null>(null);
  const [fixture, setFixture] = useState<FixtureWithSchools | null>(null);
  const [loading, setLoading] = useState(true);
  const [noSchoolFound, setNoSchoolFound] = useState(false);

  const isWithinWindow = useMemo(() => {
    if (!fixture) return false;
    const sastNow = getSASTTime();
    const matchDate = new Date(fixture.match_date);
    const matchSAST = getSASTTime(matchDate);

    const windowOpen = new Date(matchSAST);
    windowOpen.setHours(15, 0, 0, 0);

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
          id, match_date, venue_legacy, status, score_a, score_b,
          school_a_id, school_b_id
        `)
        .or(`school_a_id.eq.${schoolData.id},school_b_id.eq.${schoolData.id}`)
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

      const [{ data: schoolA }, { data: schoolB }] = await Promise.all([
        supabase.from('schools').select('id, name, slug, jersey_url').eq('id', fixtureData.school_a_id).single(),
        supabase.from('schools').select('id, name, slug, jersey_url').eq('id', fixtureData.school_b_id).single(),
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
          isUserSchoolA: fixtureData.school_a_id === schoolData.id,
        });

        if (fixtureData.score_a !== null && fixtureData.score_b !== null) {
          setHasSubmitted(true);
          setSubmittedScores({ scoreA: fixtureData.score_a, scoreB: fixtureData.score_b });
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

    const scoreAValue = parseInt(scoreA);
    const scoreBValue = parseInt(scoreB);

    if (isNaN(scoreAValue) || scoreAValue < 0 || isNaN(scoreBValue) || scoreBValue < 0) {
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
        body: { fixtureId: fixture.id, scoreA: scoreAValue, scoreB: scoreBValue },
      });

      if (response.error) throw response.error;
      if (response.data?.error) {
        toast({ variant: "destructive", title: "Submission failed", description: response.data.error });
        return;
      }

      toast({ title: "Score submitted!", description: `${fixture.school_a.name} ${scoreAValue} - ${scoreBValue} ${fixture.school_b.name}` });
      setHasSubmitted(true);
      setSubmittedScores({ scoreA: scoreAValue, scoreB: scoreBValue });
      setScoreA("");
      setScoreB("");
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
        <div className={`px-5 pt-4 pb-2 ${isDisabled ? 'opacity-40' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">{formattedDate}</span>
              <span className="text-sm text-muted-foreground">{fixture.venue_legacy || "TBD"}</span>
            </div>
          </div>
        </div>

        {hasSubmitted && submittedScores ? (
          <div className={`px-5 pb-5`}>
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="font-semibold text-sm">Score Submitted</span>
              </div>
              <div className="flex items-center justify-center gap-6">
                <div className="flex flex-col items-center gap-2">
                  <SchoolJerseyImage
                    src={fixture.school_a.jersey_url}
                    alt={fixture.school_a.name}
                    fallbackText={fixture.school_a.name.substring(0, 2).toUpperCase()}
                    size="lg"
                    variant={fixture.isUserSchoolA ? "accent" : "primary"}
                  />
                  <span className="text-xs font-medium text-center max-w-[80px] line-clamp-2">{fixture.school_a.name}</span>
                  <span className="text-2xl font-bold text-primary">{submittedScores.scoreA}</span>
                </div>
                <span className="text-lg font-bold text-muted-foreground">VS</span>
                <div className="flex flex-col items-center gap-2">
                  <SchoolJerseyImage
                    src={fixture.school_b.jersey_url}
                    alt={fixture.school_b.name}
                    fallbackText={fixture.school_b.name.substring(0, 2).toUpperCase()}
                    size="lg"
                    variant={!fixture.isUserSchoolA ? "accent" : "primary"}
                  />
                  <span className="text-xs font-medium text-center max-w-[80px] line-clamp-2">{fixture.school_b.name}</span>
                  <span className="text-2xl font-bold text-primary">{submittedScores.scoreB}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">Thank you for submitting the score!</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={`px-5 pb-5 ${isDisabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex items-stretch justify-center gap-4 py-3">
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

              <div className="flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-muted-foreground">VS</span>
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
