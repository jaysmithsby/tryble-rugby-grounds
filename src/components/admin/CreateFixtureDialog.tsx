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
import { Loader2 } from "lucide-react";

interface CreateFixtureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFixtureDialog({ open, onOpenChange }: CreateFixtureDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tournaments, setTournaments] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    home_school_id: "",
    away_school_id: "",
    match_date: "",
    venue: "",
    status: "upcoming",
    season: new Date().getFullYear().toString(),
    year: new Date().getFullYear(),
    sport: "Rugby",
    is_visible: true,
    tournament_id: "",
  });

  useEffect(() => {
    if (open) {
      fetchTournaments();
    }
  }, [open]);

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
      const fixtureData = {
        ...formData,
        tournament_id: formData.tournament_id || null,
      };
      const { error } = await supabase.from('fixtures').insert([fixtureData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Fixture created successfully",
      });

      onOpenChange(false);
      setFormData({
        home_school_id: "",
        away_school_id: "",
        match_date: "",
        venue: "",
        status: "upcoming",
        season: new Date().getFullYear().toString(),
        year: new Date().getFullYear(),
        sport: "Rugby",
        is_visible: true,
        tournament_id: "",
      });
      window.location.reload();
    } catch (error: any) {
      console.error('Error creating fixture:', error);
      toast({
        title: "Error",
        description: error.message,
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
          <DialogTitle>Create New Fixture</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="home_school_id">Home School ID</Label>
            <Input
              id="home_school_id"
              value={formData.home_school_id}
              onChange={(e) => setFormData({ ...formData, home_school_id: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="away_school_id">Away School ID</Label>
            <Input
              id="away_school_id"
              value={formData.away_school_id}
              onChange={(e) => setFormData({ ...formData, away_school_id: e.target.value })}
              required
            />
          </div>

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
                <SelectItem value="holding">Holding</SelectItem>
              </SelectContent>
            </Select>
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

          <div className="flex justify-end gap-2">
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
              Create Fixture
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
