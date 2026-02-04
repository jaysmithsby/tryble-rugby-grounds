import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface BulkYearCorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFixtures: any[];
  onSuccess: () => void;
}

export function BulkYearCorrectionDialog({
  open,
  onOpenChange,
  selectedFixtures,
  onSuccess,
}: BulkYearCorrectionDialogProps) {
  const { toast } = useToast();
  const [targetYear, setTargetYear] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Generate year options (from 2020 to current year + 1)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 2019 }, (_, i) => 2020 + i);

  const handleSubmit = async () => {
    if (!targetYear) {
      toast({
        title: "Missing Target Year",
        description: "Please select a target year before proceeding.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Update each fixture's match_date, preserving month and day
      const updates = selectedFixtures.map(async (fixture) => {
        const originalDate = new Date(fixture.match_date);
        const month = originalDate.getMonth();
        const day = originalDate.getDate();
        const hours = originalDate.getHours();
        const minutes = originalDate.getMinutes();
        const seconds = originalDate.getSeconds();

        // Create new date with target year, same month/day/time
        const newDate = new Date(parseInt(targetYear), month, day, hours, minutes, seconds);

        const { error } = await supabase
          .from("fixtures")
          .update({
            match_date: newDate.toISOString(),
            year: parseInt(targetYear),
          })
          .eq("id", fixture.id);

        if (error) throw error;
      });

      await Promise.all(updates);

      toast({
        title: "Success",
        description: `Updated ${selectedFixtures.length} fixture(s) to year ${targetYear}`,
      });

      onSuccess();
      onOpenChange(false);
      setTargetYear("");
    } catch (error) {
      console.error("Error updating fixtures:", error);
      toast({
        title: "Update Failed",
        description: "Could not update fixture years. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Bulk Year Correction
          </DialogTitle>
          <DialogDescription>
            Change the year for {selectedFixtures.length} selected fixture(s). The month and day will remain the same.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-200">
              <p className="font-medium">This action cannot be undone</p>
              <p className="text-amber-300/80 mt-1">
                Make sure you've selected the correct fixtures before proceeding.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Selected Fixtures Preview</Label>
            <div className="max-h-[150px] overflow-y-auto rounded-lg border border-border bg-muted/30 p-2 space-y-1">
              {selectedFixtures.slice(0, 10).map((fixture) => (
                <div key={fixture.id} className="text-sm text-muted-foreground flex justify-between">
                  <span className="truncate flex-1">
                    {fixture.homeName} vs {fixture.awayName}
                  </span>
                  <span className="text-xs ml-2">
                    {format(new Date(fixture.match_date), "MMM dd, yyyy")}
                  </span>
                </div>
              ))}
              {selectedFixtures.length > 10 && (
                <div className="text-xs text-muted-foreground text-center pt-1">
                  ... and {selectedFixtures.length - 10} more
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetYear">Correct Year</Label>
            <Select value={targetYear} onValueChange={setTargetYear}>
              <SelectTrigger id="targetYear">
                <SelectValue placeholder="Select the correct year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !targetYear}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update {selectedFixtures.length} Fixture(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
