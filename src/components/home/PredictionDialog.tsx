import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { SchoolJerseyImage } from "@/components/ui/SchoolJerseyImage";
import { Minus } from "lucide-react";

interface PredictionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeTeam: string;
  awayTeam: string;
  homeTeamShort: string;
  awayTeamShort: string;
  homeTeamIcon?: string | null;
  awayTeamIcon?: string | null;
  homeSchoolId?: string;
  awaySchoolId?: string;
  matchId?: string;
  appliesTo?: string[];
  onPredictionSubmit?: (schoolId: string, margin: number) => void;
}

export const PredictionDialog = ({
  open,
  onOpenChange,
  homeTeam,
  awayTeam,
  homeTeamShort,
  awayTeamShort,
  homeTeamIcon,
  awayTeamIcon,
  homeSchoolId,
  awaySchoolId,
  appliesTo = [],
  onPredictionSubmit
}: PredictionDialogProps) => {
  const [selectedTeam, setSelectedTeam] = useState<"home" | "away" | "draw">("home");
  const [margin, setMargin] = useState<number>(7);
  const [marginInput, setMarginInput] = useState<string>("7");
  const { toast } = useToast();

  const handleSelectTeam = (team: "home" | "away" | "draw") => {
    setSelectedTeam(team);
    if (team === "draw") {
      setMargin(0);
      setMarginInput("0");
    } else if (margin === 0) {
      setMargin(1);
      setMarginInput("1");
    }
  };

  const handleSubmit = () => {
    if (selectedTeam === "draw") {
      onPredictionSubmit?.("draw", 0);
      toast({
        title: "Draw — bold call.",
        description: "You're backing the stalemate. Respect.",
        duration: 2000,
      });
    } else {
      const winner = selectedTeam === "home" ? homeTeam : awayTeam;
      const schoolId = selectedTeam === "home" ? homeSchoolId : awaySchoolId;
      onPredictionSubmit?.(schoolId || "", margin);
      toast({
        title: "Locked in. Let's go.",
        description: `${winner} by ${margin}. Respect.`,
        duration: 2000,
      });
    }

    setTimeout(() => {
      onOpenChange(false);
    }, 500);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setMarginInput(inputValue);

    const numValue = parseInt(inputValue);
    if (!isNaN(numValue) && numValue >= 0) {
      setMargin(numValue);
    }
  };

  const handleInputBlur = () => {
    const numValue = parseInt(marginInput);
    if (isNaN(numValue) || numValue < 0) {
      setMargin(0);
      setMarginInput("0");
    } else {
      setMarginInput(numValue.toString());
    }
  };

  const isDraw = selectedTeam === "draw";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] sm:max-w-sm p-4">
        <DialogHeader>
          <DialogTitle className="text-center text-base">Make Your Call</DialogTitle>
          {appliesTo.length > 1 && (
            <Badge variant="secondary" className="mx-auto mt-1 text-xs">
              Applied to {appliesTo.length} pools
            </Badge>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Team Selection — 3 columns: Home | Draw | Away */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Who's taking this?</Label>
            <div className="grid grid-cols-3 gap-2">
              {/* Home */}
              <button
                type="button"
                onClick={() => handleSelectTeam("home")}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedTeam === "home"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <SchoolJerseyImage
                  src={homeTeamIcon}
                  alt={`${homeTeam} jersey`}
                  fallbackText={homeTeamShort}
                  size="md"
                  variant="primary"
                  priority
                  containerClassName="border-border"
                />
                <span className="text-xs font-medium text-center leading-tight line-clamp-2">{homeTeam}</span>
              </button>

              {/* Draw */}
              <button
                type="button"
                onClick={() => handleSelectTeam("draw")}
                className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedTeam === "draw"
                    ? "border-muted-foreground bg-muted"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Minus className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium text-center">Draw</span>
              </button>

              {/* Away */}
              <button
                type="button"
                onClick={() => handleSelectTeam("away")}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedTeam === "away"
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <SchoolJerseyImage
                  src={awayTeamIcon}
                  alt={`${awayTeam} jersey`}
                  fallbackText={awayTeamShort}
                  size="md"
                  variant="accent"
                  priority
                  containerClassName="border-border"
                />
                <span className="text-xs font-medium text-center leading-tight line-clamp-2">{awayTeam}</span>
              </button>
            </div>
          </div>

          {/* Winning Margin */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Winning Margin (Points)</Label>
            <Input
              type="number"
              value={marginInput}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              min={0}
              disabled={isDraw}
              className="text-center text-lg font-bold h-11"
              aria-label="Enter winning margin"
              placeholder="0"
            />
            {isDraw && (
              <p className="text-xs text-muted-foreground text-center">
                Margin locked to 0 for a draw
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
            size="default"
          >
            Lock It In
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
