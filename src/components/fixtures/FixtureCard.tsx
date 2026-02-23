import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Trophy, AlertCircle, ChevronDown } from "lucide-react";
import { PredictionDialog } from "@/components/home/PredictionDialog";
import { SchoolJerseyImage } from "@/components/ui/SchoolJerseyImage";
import { MatchHistory } from "./MatchHistory";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface FixtureCardProps {
  homeTeam: string;
  awayTeam: string;
  homeTeamShort: string;
  awayTeamShort: string;
  homeTeamIcon?: string | null;
  awayTeamIcon?: string | null;
  homeSchoolId?: string;
  awaySchoolId?: string;
  homeSchoolSlug?: string;
  awaySchoolSlug?: string;
  time: string;
  venue: string;
  matchDate?: string;
  tournamentName?: string;
  matchId?: string;
  appliesTo?: string[];
  isPredicted?: boolean;
  predictedSchoolId?: string;
  predictedMargin?: number;
  onPredictionMade?: (schoolId: string, margin: number) => void;
  priority?: boolean;
  hasHistory?: boolean;
}

export const FixtureCard = ({ 
  homeTeam, 
  awayTeam, 
  homeTeamShort, 
  awayTeamShort,
  homeTeamIcon,
  awayTeamIcon,
  homeSchoolId,
  awaySchoolId,
  homeSchoolSlug,
  awaySchoolSlug,
  time,
  venue,
  matchDate,
  tournamentName,
  matchId,
  appliesTo = [],
  isPredicted = false,
  predictedSchoolId,
  predictedMargin,
  onPredictionMade,
  priority = false,
  hasHistory
}: FixtureCardProps) => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [autoHasHistory, setAutoHasHistory] = useState<boolean | null>(null);

  useEffect(() => {
    if (hasHistory !== undefined) return;
    if (!homeSchoolId || !awaySchoolId) return;
    supabase
      .from("fixtures")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .or(`and(school_a_id.eq.${homeSchoolId},school_b_id.eq.${awaySchoolId}),and(school_a_id.eq.${awaySchoolId},school_b_id.eq.${homeSchoolId})`)
      .then(({ count }) => setAutoHasHistory((count ?? 0) > 0));
  }, [homeSchoolId, awaySchoolId, hasHistory]);

  const canExpand = hasHistory !== undefined ? hasHistory : autoHasHistory === true;

  const handlePredictionSubmit = (schoolId: string, margin: number) => {
    onPredictionMade?.(schoolId, margin);
  };

  const predictedSchoolName = predictedSchoolId === homeSchoolId ? homeTeam 
    : predictedSchoolId === awaySchoolId ? awayTeam 
    : undefined;

  return (
    <>
      <PredictionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        homeTeamShort={homeTeamShort}
        awayTeamShort={awayTeamShort}
        homeTeamIcon={homeTeamIcon}
        awayTeamIcon={awayTeamIcon}
        homeSchoolId={homeSchoolId}
        awaySchoolId={awaySchoolId}
        matchId={matchId}
        appliesTo={appliesTo}
        onPredictionSubmit={handlePredictionSubmit}
      />
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <Card 
          className="bg-gradient-card border-border/40 shadow-card hover:shadow-glow transition-all duration-300 cursor-pointer"
          onClick={() => !isPredicted && setDialogOpen(true)}
        >
          <div className="p-4 space-y-3">
            {/* Date + Venue row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {matchDate && (
                  <span className="text-xs font-semibold text-foreground">
                    {format(new Date(matchDate), "EEE d MMM")}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{venue}</span>
              </div>
              {isPredicted && (
                <Lock className="w-4 h-4 text-primary" aria-label="Prediction Locked" />
              )}
            </div>

            {tournamentName && (
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3 h-3 text-primary" />
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  {tournamentName}
                </span>
              </div>
            )}

            {/* Teams row */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col items-center gap-2 flex-1">
                <SchoolJerseyImage
                  src={homeTeamIcon}
                  alt={`${homeTeam} crest`}
                  fallbackText={homeTeamShort}
                  size="md"
                  variant="primary"
                  priority={priority}
                  onClick={homeSchoolSlug ? (e) => {
                    e.stopPropagation();
                    navigate(`/school/${homeSchoolSlug}`);
                  } : undefined}
                  containerClassName="border-border"
                />
                <span className="text-xs font-medium text-center line-clamp-2">{homeTeam}</span>
              </div>

              {/* Center area: VS / Pick needed / Locked prediction */}
              <div className="flex flex-col items-center gap-1 min-w-[80px]">
                {isPredicted ? (
                  <>
                    <Lock className="w-5 h-5 text-primary" />
                    <span className="text-xs font-semibold text-primary text-center">
                      {predictedSchoolName} by {predictedMargin}
                    </span>
                  </>
                ) : onPredictionMade ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <span className="text-xs font-semibold text-destructive">Pick needed</span>
                  </>
                ) : (
                  <span className="text-xl font-bold text-muted-foreground">VS</span>
                )}
              </div>

              <div className="flex flex-col items-center gap-2 flex-1">
                <SchoolJerseyImage
                  src={awayTeamIcon}
                  alt={`${awayTeam} crest`}
                  fallbackText={awayTeamShort}
                  size="md"
                  variant="accent"
                  priority={priority}
                  onClick={awaySchoolSlug ? (e) => {
                    e.stopPropagation();
                    navigate(`/school/${awaySchoolSlug}`);
                  } : undefined}
                  containerClassName="border-border"
                />
                <span className="text-xs font-medium text-center line-clamp-2">{awayTeam}</span>
              </div>
            </div>

            {/* Chevron row */}
            {canExpand && (
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex justify-center pt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", historyOpen && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
            )}
          </div>
        </Card>
        <CollapsibleContent>
          {homeSchoolId && awaySchoolId && (
            <div className="bg-muted/30 rounded-b-lg border border-t-0 border-border/40 -mt-1">
              <MatchHistory leftSchoolId={homeSchoolId} rightSchoolId={awaySchoolId} />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </>
  );
};
