import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Clock, Trophy, CheckCircle2, AlertCircle } from "lucide-react";

export const ScoreSubmission = () => {
  const { toast } = useToast();
  const [score, setScore] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWithinWindow, setIsWithinWindow] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);
  const [timeUntilWindow, setTimeUntilWindow] = useState<string>("");

  useEffect(() => {
    checkSubmissionWindow();
    checkExistingSubmission();
    
    // Update every minute
    const interval = setInterval(() => {
      checkSubmissionWindow();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const checkSubmissionWindow = () => {
    const now = new Date();
    
    // Get SAST time (UTC+2)
    const sastOffset = 2 * 60; // minutes
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const sastTime = new Date(utcTime + (sastOffset * 60000));
    
    const dayOfWeek = sastTime.getDay();
    const hour = sastTime.getHours();

    let withinWindow = false;

    if (dayOfWeek === 5 && hour >= 17) {
      // Friday 5 PM or later
      withinWindow = true;
    } else if (dayOfWeek === 6) {
      // Saturday - any time
      withinWindow = true;
    } else if (dayOfWeek === 0 && hour < 24) {
      // Sunday - before midnight
      withinWindow = true;
    }

    setIsWithinWindow(withinWindow);

    // Calculate time until next window
    if (!withinWindow) {
      let nextWindowStart = new Date(sastTime);
      
      if (dayOfWeek < 5 || (dayOfWeek === 5 && hour < 17)) {
        // Before Friday 5 PM - go to next Friday 5 PM
        const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
        nextWindowStart.setDate(sastTime.getDate() + daysUntilFriday);
        nextWindowStart.setHours(17, 0, 0, 0);
      } else {
        // After Sunday - go to next Friday 5 PM
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

  const checkExistingSubmission = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get start of current weekend (Friday 5 PM)
      const now = new Date();
      const sastOffset = 2 * 60;
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const sastTime = new Date(utcTime + (sastOffset * 60000));
      const dayOfWeek = sastTime.getDay();
      
      const startOfWeekend = new Date(sastTime);
      const daysBackToFriday = (dayOfWeek + 7 - 5) % 7;
      startOfWeekend.setDate(sastTime.getDate() - daysBackToFriday);
      startOfWeekend.setHours(17, 0, 0, 0);

      const { data, error } = await supabase
        .from('game_scores')
        .select('score, submitted_at')
        .eq('user_id', user.id)
        .gte('submitted_at', startOfWeekend.toISOString())
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setHasSubmitted(true);
        setSubmittedScore(data.score);
      }
    } catch (error) {
      console.error('Error checking existing submission:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const scoreValue = parseInt(score);
    if (isNaN(scoreValue) || scoreValue < 0) {
      toast({
        variant: "destructive",
        title: "Invalid score",
        description: "Please enter a valid non-negative number",
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
          description: "Please sign in to submit your score",
        });
        return;
      }

      const response = await supabase.functions.invoke('submit-score', {
        body: { score: scoreValue },
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
        description: "Your score is pending review and will be finalized soon.",
      });

      setHasSubmitted(true);
      setSubmittedScore(scoreValue);
      setScore("");
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

  return (
    <Card className="bg-gradient-card border-border/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" />
          Weekend Score Submission
        </CardTitle>
        <CardDescription>
          Submit your game score for review (Friday 5 PM - Sunday 11:59 PM SAST)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasSubmitted ? (
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="font-semibold">Score Submitted</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your score of <span className="font-bold text-foreground">{submittedScore}</span> has been submitted and is pending review.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                You can submit a new score next weekend.
              </p>
            </div>
          </div>
        ) : isWithinWindow ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="score">Your Score</Label>
              <Input
                id="score"
                type="number"
                min="0"
                step="1"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Enter your score"
                required
                className="text-lg"
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting || !score}
              className="w-full"
            >
              {isSubmitting ? "Submitting..." : "Submit Score"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Submissions close Sunday 11:59 PM SAST
            </p>
          </form>
        ) : (
          <div className="space-y-4">
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
