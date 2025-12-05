import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { SchoolJerseyImage } from "@/components/ui/SchoolJerseyImage";

interface PredictionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeTeam: string;
  awayTeam: string;
  homeTeamShort: string;
  awayTeamShort: string;
  homeTeamIcon?: string | null;
  awayTeamIcon?: string | null;
  matchId?: string;
  appliesTo?: string[];
  onPredictionSubmit?: (team: "home" | "away", margin: number) => void;
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
  appliesTo = [],
  onPredictionSubmit
}: PredictionDialogProps) => {
  const [selectedTeam, setSelectedTeam] = useState<"home" | "away">("home");
  const [margin, setMargin] = useState<number>(7);
  const { toast } = useToast();

  const handleSubmit = () => {
    const winner = selectedTeam === "home" ? homeTeam : awayTeam;
    
    onPredictionSubmit?.(selectedTeam, margin);
    
    toast({
      title: "Prediction Submitted!",
      description: `${winner} by ${margin} points`,
      duration: 2000,
    });

    setTimeout(() => {
      onOpenChange(false);
    }, 500);
  };

  const handleMarginChange = (value: number[]) => {
    setMargin(value[0]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    if (value >= 1 && value <= 50) {
      setMargin(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Make Your Prediction</DialogTitle>
          {appliesTo.length > 1 && (
            <Badge variant="secondary" className="mx-auto mt-2">
              Applied to {appliesTo.length} pools
            </Badge>
          )}
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Team Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Select Winner</Label>
            <RadioGroup
              value={selectedTeam}
              onValueChange={(value) => setSelectedTeam(value as "home" | "away")}
              className="grid grid-cols-2 gap-3"
            >
              <label
                htmlFor="home"
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedTeam === "home"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="home" id="home" className="sr-only" />
                <SchoolJerseyImage
                  src={homeTeamIcon}
                  alt={`${homeTeam} jersey`}
                  fallbackText={homeTeamShort}
                  size="lg"
                  variant="primary"
                  priority
                  containerClassName="border-border"
                />
                <span className="text-sm font-medium text-center">{homeTeam}</span>
              </label>

              <label
                htmlFor="away"
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedTeam === "away"
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <RadioGroupItem value="away" id="away" className="sr-only" />
                <SchoolJerseyImage
                  src={awayTeamIcon}
                  alt={`${awayTeam} jersey`}
                  fallbackText={awayTeamShort}
                  size="lg"
                  variant="accent"
                  priority
                  containerClassName="border-border"
                />
                <span className="text-sm font-medium text-center">{awayTeam}</span>
              </label>
            </RadioGroup>
          </div>

          {/* Winning Margin */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Winning Margin (Points)</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[margin]}
                onValueChange={handleMarginChange}
                min={1}
                max={50}
                step={1}
                className="flex-1"
              />
              <Input
                type="number"
                value={margin}
                onChange={handleInputChange}
                min={1}
                max={50}
                className="w-20 text-center"
                aria-label="Enter winning margin"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Selected margin: <span className="font-bold text-foreground">{margin} points</span>
            </p>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
            size="lg"
          >
            Submit Prediction
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
