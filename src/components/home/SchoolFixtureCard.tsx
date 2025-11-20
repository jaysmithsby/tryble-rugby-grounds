import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Star, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SchoolFixtureCardProps {
  userSchool: string;
  userSchoolShort: string;
  userSchoolIcon?: string | null;
  opponentSchool: string;
  opponentSchoolShort: string;
  opponentSchoolIcon?: string | null;
  userSchoolId?: string;
  opponentSchoolId?: string;
  time: string;
  venue: string;
  isCompleted: boolean;
  matchDate?: Date;
}

export const SchoolFixtureCard = ({
  userSchool,
  userSchoolShort,
  userSchoolIcon,
  opponentSchool,
  opponentSchoolShort,
  opponentSchoolIcon,
  userSchoolId,
  opponentSchoolId,
  time,
  venue,
  isCompleted,
  matchDate,
}: SchoolFixtureCardProps) => {
  const navigate = useNavigate();
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleScoreSubmit = () => {
    if (!homeScore || !awayScore) {
      toast({
        title: "Invalid Score",
        description: "Please enter scores for both teams",
        variant: "destructive",
      });
      return;
    }

    setSubmitted(true);
    toast({
      title: "Score Submitted!",
      description: "Your score submission is pending review.",
    });
  };

  const handlePredict = () => {
    toast({
      title: "Prediction Mode",
      description: "Prediction feature coming soon!",
    });
  };

  return (
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
                if (userSchoolId) navigate(`/school/${userSchoolId}`);
              }}
              className="w-20 h-20 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center border-2 border-primary overflow-hidden p-2 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              disabled={!userSchoolId}
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

          <div className="flex flex-col items-center gap-2">
            {!isCompleted && <span className="text-2xl font-bold text-muted-foreground">VS</span>}
            {isCompleted && !submitted && (
              <div className="flex flex-col gap-2 items-center">
                <span className="text-xs font-medium text-muted-foreground">Final Score</span>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    min="0"
                    max="999"
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    className="w-12 h-10 text-center text-lg font-bold"
                    placeholder="0"
                  />
                  <span className="text-muted-foreground font-bold">-</span>
                  <Input
                    type="number"
                    min="0"
                    max="999"
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    className="w-12 h-10 text-center text-lg font-bold"
                    placeholder="0"
                  />
                </div>
              </div>
            )}
            {submitted && (
              <div className="flex flex-col gap-2 items-center">
                <span className="text-xs font-medium text-muted-foreground">Final Score</span>
                <div className="flex gap-2 items-center text-xl font-bold">
                  <span>{homeScore}</span>
                  <span>-</span>
                  <span>{awayScore}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 flex-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (opponentSchoolId) navigate(`/school/${opponentSchoolId}`);
              }}
              className="w-20 h-20 rounded-full bg-accent/20 backdrop-blur-sm flex items-center justify-center border-2 border-accent overflow-hidden p-2 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              disabled={!opponentSchoolId}
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

        {!isCompleted && (
          <Button
            onClick={handlePredict}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base shadow-lg"
          >
            Predict Now
          </Button>
        )}

        {isCompleted && !submitted && (
          <Button
            onClick={handleScoreSubmit}
            className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base shadow-lg"
          >
            Submit Score
          </Button>
        )}

        {submitted && (
          <div className="flex items-center justify-center gap-2 py-3 px-4 bg-primary/10 rounded-md">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span className="text-base font-bold text-primary">Score Submitted - Pending Review</span>
          </div>
        )}
      </div>
    </Card>
  );
};
