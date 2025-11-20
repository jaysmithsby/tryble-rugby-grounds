import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Star } from "lucide-react";
import { PredictionDialog } from "./PredictionDialog";

interface SchoolFixtureCardProps {
  userSchool: string;
  userSchoolShort: string;
  userSchoolIcon?: string | null;
  opponentSchool: string;
  opponentSchoolShort: string;
  opponentSchoolIcon?: string | null;
  userSchoolSlug?: string;
  opponentSchoolSlug?: string;
  time: string;
  venue: string;
  matchId?: string;
  isPredicted?: boolean;
  predictedTeam?: "home" | "away";
  predictedMargin?: number;
  onPredictionMade?: (team: "home" | "away", margin: number) => void;
}

export const SchoolFixtureCard = ({
  userSchool,
  userSchoolShort,
  userSchoolIcon,
  opponentSchool,
  opponentSchoolShort,
  opponentSchoolIcon,
  userSchoolSlug,
  opponentSchoolSlug,
  time,
  venue,
  matchId,
  isPredicted = false,
  predictedTeam,
  predictedMargin,
  onPredictionMade
}: SchoolFixtureCardProps) => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handlePredictionSubmit = (team: "home" | "away", margin: number) => {
    onPredictionMade?.(team, margin);
  };

  const predictedTeamName = predictedTeam === "home" ? userSchool : opponentSchool;

  return (
    <>
      <PredictionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        homeTeam={userSchool}
        awayTeam={opponentSchool}
        homeTeamShort={userSchoolShort}
        awayTeamShort={opponentSchoolShort}
        homeTeamIcon={userSchoolIcon}
        awayTeamIcon={opponentSchoolIcon}
        matchId={matchId}
        onPredictionSubmit={handlePredictionSubmit}
      />
      <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-background border-2 border-primary/30 shadow-glow">
        <div className="p-5 space-y-4">
          {/* Your School Badge */}
          <div className="flex items-center justify-center gap-2 pb-2 border-b border-border/40">
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-bold text-primary">Your School</span>
            <Star className="w-4 h-4 text-primary fill-primary" />
          </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{time}</span>
          </div>
          <span className="text-sm font-medium text-muted-foreground">{venue}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center gap-2 flex-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (userSchoolSlug) navigate(`/school/${userSchoolSlug}`);
              }}
              className="w-20 h-20 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center border-2 border-primary overflow-hidden p-2 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              disabled={!userSchoolSlug}
            >
              {userSchoolIcon ? (
                <img 
                  src={userSchoolIcon} 
                  alt={`${userSchool} crest`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xl font-bold text-primary">{userSchoolShort}</span>
              )}
            </button>
            <span className="text-sm font-bold text-center line-clamp-2">{userSchool}</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-muted-foreground">VS</span>
          </div>

          <div className="flex flex-col items-center gap-2 flex-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (opponentSchoolSlug) navigate(`/school/${opponentSchoolSlug}`);
              }}
              className="w-20 h-20 rounded-full bg-accent/20 backdrop-blur-sm flex items-center justify-center border-2 border-accent overflow-hidden p-2 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              disabled={!opponentSchoolSlug}
            >
              {opponentSchoolIcon ? (
                <img 
                  src={opponentSchoolIcon} 
                  alt={`${opponentSchool} crest`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xl font-bold text-accent">{opponentSchoolShort}</span>
              )}
            </button>
            <span className="text-sm font-bold text-center line-clamp-2">{opponentSchool}</span>
          </div>
        </div>

        {isPredicted && (
          <div className="pt-2 border-t border-border/40">
            <p className="text-xs text-primary font-medium text-center">
              You picked: {predictedTeamName} to win by {predictedMargin}
            </p>
          </div>
        )}

        <Button 
          onClick={() => setDialogOpen(true)}
          disabled={isPredicted}
          className={`w-full h-12 font-bold text-base shadow-lg ${
            isPredicted 
              ? "bg-muted text-muted-foreground cursor-not-allowed" 
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
          }`}
        >
          {isPredicted ? "Prediction Made" : "Predict Now"}
        </Button>
        </div>
      </Card>
    </>
  );
};
