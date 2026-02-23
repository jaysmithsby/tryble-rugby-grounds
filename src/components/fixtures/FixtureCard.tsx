import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Lock, Trophy, AlertCircle } from "lucide-react";
import { PredictionDialog } from "@/components/home/PredictionDialog";
import { SchoolJerseyImage } from "@/components/ui/SchoolJerseyImage";
import { MatchHistory } from "@/components/fixtures/MatchHistory";
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
  priority = false
}: FixtureCardProps) => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handlePredictionSubmit = (schoolId: string, margin: number) => {
    onPredictionMade?.(schoolId, margin);
  };

  // Resolve predicted school name from ID
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

        {/* Match History */}
        {homeSchoolId && awaySchoolId && (
          <div className="border-t border-border/40 -mx-4 -mb-4 px-0">
            <MatchHistory leftSchoolId={homeSchoolId} rightSchoolId={awaySchoolId} />
          </div>
        )}

      </div>
    </Card>
    </>
  );
};
