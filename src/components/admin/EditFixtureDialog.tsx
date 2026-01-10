import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ExternalLink } from "lucide-react";

interface EditFixtureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fixture: any;
}

export function EditFixtureDialog({ open, onOpenChange, fixture }: EditFixtureDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tournaments, setTournaments] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    venue: "",
    status: "upcoming",
    home_score: null as number | null,
    away_score: null as number | null,
    match_date: "",
    tournament_id: "",
    source_url: "",
  });

  useEffect(() => {
    if (open) {
      fetchTournaments();
    }
    if (fixture) {
      setFormData({
        venue: fixture.venue,
        status: fixture.status,
        home_score: fixture.home_score,
        away_score: fixture.away_score,
        match_date: fixture.match_date?.substring(0, 16) || "",
        tournament_id: fixture.tournament_id || "",
        source_url: fixture.source_url || "",
      });
    }
  }, [fixture, open]);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, name")
        .eq("is_active", true)
        .order("start_date", { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        ...formData,
        tournament_id: formData.tournament_id || null,
        source_url: formData.source_url || null,
      };
      const { error } = await supabase
        .from('fixtures')
        .update(updateData)
        .eq('id', fixture.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Fixture updated successfully",
      });

      onOpenChange(false);
      window.location.reload();
    } catch (error: any) {
      console.error('Error updating fixture:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!fixture) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Fixture</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="match_date">Match Date</Label>
            <Input
              id="match_date"
              type="datetime-local"
              value={formData.match_date}
              onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="final">Final</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="holding">Holding</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="home_score">Home Score</Label>
              <Input
                id="home_score"
                type="number"
                value={formData.home_score ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    home_score: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="away_score">Away Score</Label>
              <Input
                id="away_score"
                type="number"
                value={formData.away_score ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    away_score: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tournament">Tournament (Optional)</Label>
            <Select
              value={formData.tournament_id}
              onValueChange={(value) => setFormData({ ...formData, tournament_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tournament (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {tournaments.map((tournament) => (
                  <SelectItem key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source_url">Source URL (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="source_url"
                type="url"
                value={formData.source_url}
                onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                placeholder="https://example.com/fixture-info"
                className="flex-1"
              />
              {formData.source_url && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  asChild
                >
                  <a href={formData.source_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Where did you get this fixture information?</p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Fixture
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
