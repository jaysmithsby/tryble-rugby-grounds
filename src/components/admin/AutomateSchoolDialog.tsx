import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";

interface AutomateSchoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolName: string;
  onSchoolNameChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function AutomateSchoolDialog({
  open,
  onOpenChange,
  schoolName,
  onSchoolNameChange,
  onSubmit,
  isLoading,
}: AutomateSchoolDialogProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (schoolName.trim()) {
      onSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Auto-Fill School Data
          </DialogTitle>
          <DialogDescription>
            Enter the school name to automatically fetch and populate school information.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="automate-school-name">School Name</Label>
            <Input
              id="automate-school-name"
              value={schoolName}
              onChange={(e) => onSchoolNameChange(e.target.value)}
              placeholder="e.g. Michaelhouse"
              disabled={isLoading}
              autoFocus
            />
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !schoolName.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Fetch Data
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
