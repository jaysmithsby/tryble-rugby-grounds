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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { AlertTriangle, CalendarIcon, Loader2, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EditFixtureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fixture: any;
  onSuccess?: () => void;
}

interface School {
  id: string;
  name: string;
}

interface Tournament {
  id: string;
  name: string;
}

export function EditFixtureDialog({ open, onOpenChange, fixture, onSuccess }: EditFixtureDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  
  // Form state
  const [matchDate, setMatchDate] = useState<Date | undefined>();
  const [venueType, setVenueType] = useState<"home_ground" | "away_ground" | "tournament">("home_ground");
  const [tournamentId, setTournamentId] = useState("");
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [status, setStatus] = useState("upcoming");
  const [isVisible, setIsVisible] = useState(true);
  const [sourceUrl, setSourceUrl] = useState("");

  // Mirror-duplicate warning state
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Check for mirror duplicates when date changes
  useEffect(() => {
    const checkDuplicate = async () => {
      if (!fixture || !matchDate) {
        setDuplicateWarning(null);
        return;
      }
      setCheckingDuplicate(true);
      try {
        const dateStr = matchDate.toISOString().split("T")[0];
        const schoolAId = fixture.school_a_id;
        const schoolBId = fixture.school_b_id;
        const { data, error } = await supabase
          .from("fixtures")
          .select("id")
          .neq("id", fixture.id)
          .or(
            `and(school_a_id.eq.${schoolAId},school_b_id.eq.${schoolBId}),and(school_a_id.eq.${schoolBId},school_b_id.eq.${schoolAId})`
          )
          .gte("match_date", `${dateStr}T00:00:00`)
          .lt("match_date", `${dateStr}T23:59:59`)
          .limit(1);

        if (error) throw error;
        setDuplicateWarning(
          data && data.length > 0
            ? "A fixture between these two schools already exists for this date."
            : null
        );
      } catch {
        setDuplicateWarning(null);
      } finally {
        setCheckingDuplicate(false);
      }
    };
    checkDuplicate();
  }, [matchDate, fixture]);

  // Load data when dialog opens
  useEffect(() => {
    if (open && fixture) {
      fetchSchools();
      fetchTournaments();
      
      // Initialize form with fixture data
      setMatchDate(fixture.match_date ? new Date(fixture.match_date) : undefined);
      // Map stored venue_type back to UI state
      const storedType = fixture.venue_type || "school";
      if (storedType === "tournament") {
        setVenueType("tournament");
      } else if (storedType === "school" && fixture.venue_id === fixture.school_b_id) {
        setVenueType("away_ground");
      } else {
        setVenueType("home_ground");
      }
      setTournamentId(fixture.tournament_id || "none");
      setScoreA(fixture.score_a !== null ? String(fixture.score_a) : "");
      setScoreB(fixture.score_b !== null ? String(fixture.score_b) : "");
      setStatus(fixture.status || "upcoming");
      setIsVisible(fixture.is_visible !== false);
      setSourceUrl(fixture.source_url || "");
    }
  }, [open, fixture]);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error("Error fetching schools:", error);
    }
  };

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, name")
        .order("start_date", { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    }
  };

  const getSchoolName = (id: string) => {
    return schools.find(s => s.id === id)?.name || "Unknown School";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!matchDate) {
      toast({
        title: "Validation Error",
        description: "Please select a match date",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const resolvedTournamentId = tournamentId && tournamentId !== "none" ? tournamentId : null;
      let computedVenueId: string | null = null;
      let computedVenueType: string = "school";

      if (resolvedTournamentId) {
        // Tournament always drives venue
        computedVenueId = resolvedTournamentId;
        computedVenueType = "tournament";
      } else if (venueType === "home_ground") {
        computedVenueId = fixture.school_a_id;
        computedVenueType = "school";
      } else if (venueType === "away_ground") {
        computedVenueId = fixture.school_b_id;
        computedVenueType = "school";
      }

      const updateData = {
        match_date: matchDate.toISOString(),
        venue_type: computedVenueType,
        venue_id: computedVenueId,
        tournament_id: resolvedTournamentId,
        score_a: scoreA ? parseInt(scoreA) : null,
        score_b: scoreB ? parseInt(scoreB) : null,
        status,
        is_visible: isVisible,
        source_url: sourceUrl || null,
      };

      const { error } = await supabase
        .from("fixtures")
        .update(updateData)
        .eq("id", fixture.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Fixture updated successfully",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error updating fixture:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Could not update the fixture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  // Don't render dialog at all if no fixture
  if (!fixture) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Fixture</DialogTitle>
        </DialogHeader>
        
        {/* Display fixture teams (read-only) */}
        <div className="bg-muted/50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="font-medium">{getSchoolName(fixture.school_a_id)}</span>
            <span className="text-muted-foreground">vs</span>
            <span className="font-medium">{getSchoolName(fixture.school_b_id)}</span>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Match Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !matchDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {matchDate ? format(matchDate, "PPP 'at' HH:mm") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={matchDate}
                  onSelect={setMatchDate}
                  initialFocus
                  className="pointer-events-auto"
                />
                <div className="border-t p-3">
                  <Label className="text-xs">Time</Label>
                  <Input
                    type="time"
                    className="mt-1"
                    value={matchDate ? format(matchDate, "HH:mm") : ""}
                    onChange={(e) => {
                      if (matchDate && e.target.value) {
                        const [hours, minutes] = e.target.value.split(':');
                        const newDate = new Date(matchDate);
                        newDate.setHours(parseInt(hours), parseInt(minutes));
                        setMatchDate(newDate);
                      }
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Venue Type */}
          <div className="space-y-2">
            <Label>Venue</Label>
            <div className="flex gap-1 rounded-lg border p-1">
              {([
                { value: "home_ground" as const, label: "Home Ground" },
                { value: "away_ground" as const, label: "Away Ground" },
                { value: "tournament" as const, label: "Tournament" },
              ]).map(({ value, label }) => (
                <Button
                  key={value}
                  type="button"
                  variant={venueType === value ? "default" : "ghost"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setVenueType(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            {venueType === "home_ground" && (
              <p className="text-sm text-muted-foreground">📍 {getSchoolName(fixture.school_a_id)}</p>
            )}
            {venueType === "away_ground" && (
              <p className="text-sm text-muted-foreground">📍 {getSchoolName(fixture.school_b_id)}</p>
            )}
            {venueType === "tournament" && (
              <Select value={tournamentId} onValueChange={setTournamentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tournament..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {tournaments.map((tournament) => (
                    <SelectItem key={tournament.id} value={tournament.id}>
                      {tournament.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {(venueType !== "tournament") && (
              <div className="space-y-2">
                <Label>Tournament (Optional)</Label>
                <Select value={tournamentId} onValueChange={setTournamentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tournament (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {tournaments.map((tournament) => (
                      <SelectItem key={tournament.id} value={tournament.id}>
                        {tournament.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
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

          {/* Score */}
          <div className="space-y-2">
            <Label>Score</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Score A"
                  value={scoreA}
                  onChange={(e) => setScoreA(e.target.value)}
                  min="0"
                />
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {getSchoolName(fixture.school_a_id)}
                </p>
              </div>
              <span className="text-muted-foreground font-medium">-</span>
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Score B"
                  value={scoreB}
                  onChange={(e) => setScoreB(e.target.value)}
                  min="0"
                />
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {getSchoolName(fixture.school_b_id)}
                </p>
              </div>
            </div>
          </div>

          {/* Source URL */}
          <div className="space-y-2">
            <Label htmlFor="source_url">Source URL (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="source_url"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://example.com/fixture-info"
                className="flex-1"
              />
              {sourceUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  asChild
                >
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Visible to Users</Label>
              <p className="text-xs text-muted-foreground">
                Show this fixture on the app
              </p>
            </div>
            <Switch
              checked={isVisible}
              onCheckedChange={setIsVisible}
            />
          </div>

          {/* Duplicate Warning */}
          {duplicateWarning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{duplicateWarning}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || checkingDuplicate}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
