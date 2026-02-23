import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSimulation } from "@/contexts/SimulationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  FlaskConical, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Play,
  SkipForward,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  Info
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface WeekStats {
  fixtureCount: number;
  fixturesWithScores: number;
  predictionsCount: number;
  usersWithPredictions: number;
}

export function TestingCenter() {
  const { toast } = useToast();
  const {
    isSimulationMode,
    setIsSimulationMode,
    simulatedDate,
    setSimulatedDate,
    effectiveWeek,
    effectiveYear,
    advanceToNextWeek,
    goToPreviousWeek,
    weekendRange,
  } = useSimulation();

  const [weekStats, setWeekStats] = useState<WeekStats>({
    fixtureCount: 0,
    fixturesWithScores: 0,
    predictionsCount: 0,
    usersWithPredictions: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [_isResetting, setIsResetting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const weekNumber = effectiveWeek;
  const year = effectiveYear;

  useEffect(() => {
    if (isSimulationMode) {
      loadWeekStats();
    }
  }, [isSimulationMode, simulatedDate]);

  const loadWeekStats = async () => {
    try {
      const startDate = weekendRange.start.toISOString();
      const endDate = weekendRange.end.toISOString();

      const { data: fixtures, error: fixturesError } = await supabase
        .from("fixtures")
        .select("id, score_a, score_b")
        .gte("match_date", startDate)
        .lte("match_date", endDate)
        .eq("year", year);

      if (fixturesError) throw fixturesError;

      const fixtureIds = fixtures?.map(f => f.id) || [];
      const fixturesWithScores = fixtures?.filter(f => f.score_a !== null && f.score_b !== null).length || 0;

      let predictionsCount = 0;
      let usersWithPredictions = 0;

      if (fixtureIds.length > 0) {
        const { data: predictions, error: predictionsError } = await supabase
          .from("predictions")
          .select("user_id")
          .in("fixture_id", fixtureIds);

        if (!predictionsError && predictions) {
          predictionsCount = predictions.length;
          usersWithPredictions = new Set(predictions.map(p => p.user_id)).size;
        }
      }

      setWeekStats({
        fixtureCount: fixtures?.length || 0,
        fixturesWithScores,
        predictionsCount,
        usersWithPredictions,
      });
    } catch (error) {
      console.error("Error loading week stats:", error);
    }
  };

  const processWeekResults = async () => {
    setIsProcessing(true);
    try {
      const startDate = weekendRange.start.toISOString();
      const endDate = weekendRange.end.toISOString();

      const { data: fixtures, error: fixturesError } = await supabase
        .from("fixtures")
        .select("id")
        .gte("match_date", startDate)
        .lte("match_date", endDate)
        .eq("year", year)
        .not("score_a", "is", null)
        .not("score_b", "is", null);

      if (fixturesError) throw fixturesError;

      let totalPredictionsProcessed = 0;

      for (const fixture of fixtures || []) {
        const { data, error } = await supabase.rpc("calculate_prediction_points", {
          p_fixture_id: fixture.id,
        });
        if (error) {
          console.error(`Error processing fixture ${fixture.id}:`, error);
        } else {
          totalPredictionsProcessed += data || 0;
        }
      }

      toast({
        title: "Week processed successfully!",
        description: `Calculated brags for ${totalPredictionsProcessed} predictions across ${fixtures?.length || 0} fixtures.`,
      });

      loadWeekStats();
    } catch (error: any) {
      console.error("Error processing week:", error);
      toast({
        variant: "destructive",
        title: "Processing failed",
        description: error.message || "An error occurred while processing results.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetTestData = async () => {
    setIsResetting(true);
    try {
      const { data: fixtures2025 } = await supabase
        .from("fixtures")
        .select("id")
        .eq("year", 2025);

      if (fixtures2025 && fixtures2025.length > 0) {
        const fixtureIds = fixtures2025.map(f => f.id);
        const { error } = await supabase
          .from("predictions")
          .delete()
          .in("fixture_id", fixtureIds);
        if (error) throw error;
      }

      toast({
        title: "Test data reset",
        description: "All 2025 predictions have been cleared.",
      });

      loadWeekStats();
    } catch (error: any) {
      console.error("Error resetting test data:", error);
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: error.message || "An error occurred while resetting data.",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Testing Center</h2>
        <p className="text-muted-foreground mt-1">
          Simulate the 2025 season using historical data. Process results week by week to test the full prediction flow.
        </p>
      </div>

      {/* Info card about auto-scoring */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 pt-4">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <strong className="text-foreground">Auto-scoring is active.</strong> Brags are automatically calculated whenever fixture scores are entered or updated. 
            Leaderboards are derived live from predictions — no rollup step needed.
            Use "Re-calculate Brags" below only as a manual fallback.
          </div>
        </CardContent>
      </Card>

      <Card className={isSimulationMode ? "border-primary/50 bg-primary/5" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Simulation Mode
          </CardTitle>
          <CardDescription>
            When enabled, the app uses your simulated date instead of today's date for all fixture filtering and time-based logic.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                id="simulation-mode"
                checked={isSimulationMode}
                onCheckedChange={setIsSimulationMode}
              />
              <Label htmlFor="simulation-mode" className="font-medium">
                {isSimulationMode ? "Simulation Active" : "Simulation Off"}
              </Label>
            </div>
            {isSimulationMode && (
              <Badge variant="default" className="gap-1">
                <Clock className="h-3 w-3" />
                Week {weekNumber} of {year}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {isSimulationMode && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Simulated Date
              </CardTitle>
              <CardDescription>
                Control what date the app thinks it is. Navigate week by week or pick a specific date.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[240px] justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(simulatedDate, "EEEE, MMMM d, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={simulatedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSimulatedDate(date);
                          setCalendarOpen(false);
                        }
                      }}
                      defaultMonth={simulatedDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous Week
                </Button>
                <div className="flex-1 text-center">
                  <span className="text-sm font-medium">
                    Week {weekNumber} • {format(weekendRange.start, "MMM d")} - {format(weekendRange.end, "MMM d, yyyy")}
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={advanceToNextWeek}>
                  Next Week
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                This Weekend's Data
              </CardTitle>
              <CardDescription>
                Statistics for fixtures between {format(weekendRange.start, "MMM d")} and {format(weekendRange.end, "MMM d")}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <div className="text-2xl font-bold">{weekStats.fixtureCount}</div>
                  <div className="text-sm text-muted-foreground">Total Fixtures</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <div className="text-2xl font-bold text-primary">{weekStats.fixturesWithScores}</div>
                  <div className="text-sm text-muted-foreground">With Scores</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <div className="text-2xl font-bold">{weekStats.predictionsCount}</div>
                  <div className="text-sm text-muted-foreground">Predictions Made</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <div className="text-2xl font-bold">{weekStats.usersWithPredictions}</div>
                  <div className="text-sm text-muted-foreground">Users Participated</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Actions
              </CardTitle>
              <CardDescription>
                Re-calculate brags for this weekend's fixtures (manual fallback).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <Button
                  onClick={processWeekResults}
                  disabled={isProcessing || weekStats.fixturesWithScores === 0}
                  className="flex-1 gap-2"
                >
                  {isProcessing ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Re-calculate Brags
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={advanceToNextWeek}
                  className="gap-2"
                >
                  <SkipForward className="h-4 w-4" />
                  Advance to Next Week
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Brags are calculated automatically when scores are entered. Use this button to manually re-run the calculation if needed.
              </p>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Reset Test Data
              </CardTitle>
              <CardDescription>
                Clear test predictions for 2025. This does not affect fixture data or 2026 data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Clear All 2025 Predictions
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear All 2025 Predictions?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will completely wipe all test predictions for 2025. Use this when starting a fresh test cycle.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={resetTestData}>
                      Clear All Data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
