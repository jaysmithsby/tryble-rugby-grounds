import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trophy, Target, Zap, Award } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

const HowScoringWorks = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border/40 sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">How Scoring Works</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Everything you need to know about earning points
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Point System Overview
            </CardTitle>
            <CardDescription>
              Earn points by making accurate predictions on rugby fixtures
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Our scoring system rewards accurate predictions with a base score for 
              picking the correct winner, plus bonus points for predicting the margin 
              of victory accurately.
            </p>
          </CardContent>
        </Card>

        {/* Base Points */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-primary" />
              Base Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
              <div>
                <p className="font-medium">Correct Winner</p>
                <p className="text-sm text-muted-foreground">
                  Pick the winning team correctly
                </p>
              </div>
              <div className="text-2xl font-bold text-primary">10 pts</div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              You must predict the correct winner to be eligible for margin bonuses.
              If your winner prediction is wrong, you earn 0 points for that fixture.
            </p>
          </CardContent>
        </Card>

        {/* Margin Bonuses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-primary" />
              Margin Bonuses
            </CardTitle>
            <CardDescription>
              Predict the winning margin for extra points
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-yellow-600/10 to-yellow-500/5 border border-yellow-600/20">
              <div>
                <p className="font-medium">Exact Margin</p>
                <p className="text-sm text-muted-foreground">
                  Nail the exact point difference
                </p>
              </div>
              <div className="text-xl font-bold text-yellow-600">+25 pts</div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-gray-400/10 to-gray-300/5 border border-gray-400/20">
              <div>
                <p className="font-medium">Within 3 Points</p>
                <p className="text-sm text-muted-foreground">
                  Off by 1–3 points from actual margin
                </p>
              </div>
              <div className="text-xl font-bold text-gray-500">+15 pts</div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-amber-700/10 to-amber-600/5 border border-amber-700/20">
              <div>
                <p className="font-medium">Within 7 Points</p>
                <p className="text-sm text-muted-foreground">
                  Off by 4–7 points from actual margin
                </p>
              </div>
              <div className="text-xl font-bold text-amber-700">+10 pts</div>
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              Margin bonuses are cumulative with the base points. For example, 
              predicting the exact winning margin earns you 10 + 25 = 35 points total.
            </p>
          </CardContent>
        </Card>

        {/* Examples */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="w-5 h-5 text-primary" />
              Scoring Examples
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg border bg-card">
              <p className="text-sm font-medium mb-2">Example 1: Perfect Prediction</p>
              <p className="text-xs text-muted-foreground mb-2">
                You predict: Maritzburg College to win by 12 points<br />
                Actual result: Maritzburg College wins 25-13 (12 point margin)
              </p>
              <p className="text-sm">
                Points earned: <span className="font-bold text-primary">35 pts</span> (10 base + 25 exact)
              </p>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <p className="text-sm font-medium mb-2">Example 2: Close Prediction</p>
              <p className="text-xs text-muted-foreground mb-2">
                You predict: Paul Roos to win by 7 points<br />
                Actual result: Paul Roos wins 21-10 (11 point margin)
              </p>
              <p className="text-sm">
                Points earned: <span className="font-bold text-primary">20 pts</span> (10 base + 10 within 7)
              </p>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <p className="text-sm font-medium mb-2">Example 3: Wrong Winner</p>
              <p className="text-xs text-muted-foreground mb-2">
                You predict: Glenwood to win by 5 points<br />
                Actual result: Michaelhouse wins 18-14
              </p>
              <p className="text-sm">
                Points earned: <span className="font-bold text-destructive">0 pts</span> (wrong winner)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">💡 Pro Tips</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Focus on getting the winner right first—that's your guaranteed 10 points</li>
              <li>• Research recent head-to-head results for more accurate margin predictions</li>
              <li>• Consider factors like home advantage, injuries, and weather conditions</li>
              <li>• Derby matches are often closer than expected—adjust your margins accordingly</li>
            </ul>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

export default HowScoringWorks;
