import { useState, useEffect, useMemo } from "react";
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
import { AlertTriangle, CalendarIcon, Check, ChevronsUpDown, Loader2, Plus, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface CreateFixtureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface School {
  id: string;
  name: string;
  province: string | null;
}

interface Tournament {
  id: string;
  name: string;
}

export function CreateFixtureDialog({ open, onOpenChange, onSuccess }: CreateFixtureDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  
  // Form state
  const [matchDate, setMatchDate] = useState<Date>();
  const [schoolAId, setSchoolAId] = useState("");
  const [schoolBId, setSchoolBId] = useState("");
  const [venueType, setVenueType] = useState<"home_ground" | "away_ground" | "tournament">("home_ground");
  const [tournamentId, setTournamentId] = useState("");
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [status, setStatus] = useState("upcoming");
  const [isVisible, setIsVisible] = useState(true);
  const [sourceUrl, setSourceUrl] = useState("");
  
  // Combobox state
  const [schoolAOpen, setSchoolAOpen] = useState(false);
  const [schoolBOpen, setSchoolBOpen] = useState(false);
  const [schoolASearchQuery, setSchoolASearchQuery] = useState("");
  const [schoolBSearchQuery, setSchoolBSearchQuery] = useState("");
  
  // Inline school creation state
  const [showInlineSchool, setShowInlineSchool] = useState<"school_a" | "school_b" | null>(null);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolProvince, setNewSchoolProvince] = useState("");
  const [creatingSchool, setCreatingSchool] = useState(false);

  // Mirror-duplicate warning state
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Check for mirror duplicates when schools + date are selected
  useEffect(() => {
    const checkDuplicate = async () => {
      if (!schoolAId || !schoolBId || !matchDate) {
        setDuplicateWarning(null);
        return;
      }
      setCheckingDuplicate(true);
      try {
        const dateStr = matchDate.toISOString().split("T")[0];
        const { data, error } = await supabase
          .from("fixtures")
          .select("id")
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
  }, [schoolAId, schoolBId, matchDate]);

  useEffect(() => {
    if (open) {
      fetchSchools();
      fetchTournaments();
    }
  }, [open]);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("id, name, province")
        .order("name");

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error("Error fetching schools:", error);
    }
  };

  const fetchTournaments = async () => {
    try {
      // Fetch active tournament editions with their tournament names
      const { data: editionsData, error: editionsError } = await supabase
        .from("tournament_editions" as any)
        .select("id, tournament_id, year")
        .eq("is_active", true)
        .order("year", { ascending: false });

      if (editionsError) throw editionsError;

      // Fetch tournament names
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from("tournaments")
        .select("id, name");

      if (tournamentsError) throw tournamentsError;

      const tournamentMap = new Map((tournamentsData || []).map((t: any) => [t.id, t.name]));
      const data = ((editionsData || []) as any[]).map((e: any) => ({
        id: e.id,
        name: `${tournamentMap.get(e.tournament_id) || "Unknown"} ${e.year}`,
      }));
      const error = null;

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    }
  };

  const filteredSchoolA = useMemo(() => {
    if (!schoolASearchQuery) return schools;
    return schools.filter(school =>
      school.name.toLowerCase().includes(schoolASearchQuery.toLowerCase())
    );
  }, [schools, schoolASearchQuery]);

  const filteredSchoolB = useMemo(() => {
    if (!schoolBSearchQuery) return schools;
    return schools.filter(school =>
      school.name.toLowerCase().includes(schoolBSearchQuery.toLowerCase())
    );
  }, [schools, schoolBSearchQuery]);

  const getSchoolName = (id: string) => {
    return schools.find(s => s.id === id)?.name || "";
  };

  const handleCreateInlineSchool = async () => {
    if (!newSchoolName.trim() || !newSchoolProvince) return;
    
    setCreatingSchool(true);
    try {
      const slug = newSchoolName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');

      const { data, error } = await supabase
        .from("schools")
        .insert({
          name: newSchoolName.trim(),
          slug,
          province: newSchoolProvince,
          status: "verified",
          is_visible: true,
        })
        .select("id, name, province")
        .single();

      if (error) throw error;

      setSchools(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      
      if (showInlineSchool === "school_a") {
        setSchoolAId(data.id);
      } else {
        setSchoolBId(data.id);
      }

      toast({
        title: "School Created",
        description: `${data.name} has been added. You can edit full details in Schools Manager.`,
      });

      setShowInlineSchool(null);
      setNewSchoolName("");
      setNewSchoolProvince("");
    } catch (error: any) {
      console.error("Error creating school:", error);
      toast({
        title: "School Creation Failed",
        description: error.message || "Could not create the school. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreatingSchool(false);
    }
  };

  const resetForm = () => {
    setMatchDate(undefined);
    setSchoolAId("");
    setSchoolBId("");
    setVenueType("home_ground");
    setTournamentId("");
    setScoreA("");
    setScoreB("");
    setStatus("upcoming");
    setIsVisible(true);
    setSourceUrl("");
    setSchoolASearchQuery("");
    setSchoolBSearchQuery("");
    setShowInlineSchool(null);
    setNewSchoolName("");
    setNewSchoolProvince("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!matchDate || !schoolAId || !schoolBId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Date, School A, School B)",
        variant: "destructive",
      });
      return;
    }

    if (schoolAId === schoolBId) {
      toast({
        title: "Validation Error",
        description: "School A and School B cannot be the same",
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
        computedVenueId = schoolAId;
        computedVenueType = "school";
      } else if (venueType === "away_ground") {
        computedVenueId = schoolBId;
        computedVenueType = "school";
      }

      const fixtureData = {
        school_a_id: schoolAId,
        school_b_id: schoolBId,
        match_date: matchDate.toISOString(),
        venue_type: computedVenueType,
        venue_id: computedVenueId,
        tournament_id: resolvedTournamentId,
        score_a: scoreA ? parseInt(scoreA) : null,
        score_b: scoreB ? parseInt(scoreB) : null,
        status,
        is_visible: isVisible,
        source_url: sourceUrl || null,
        season: new Date().getFullYear().toString(),
        year: new Date().getFullYear(),
        sport: "Rugby",
      };

      const { error } = await supabase.from("fixtures").insert([fixtureData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Fixture created successfully",
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating fixture:", error);
      toast({
        title: "Fixture Creation Failed",
        description: error.message || "Could not create the fixture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderSchoolCombobox = (
    type: "school_a" | "school_b",
    value: string,
    setValue: (val: string) => void,
    isOpen: boolean,
    setIsOpen: (val: boolean) => void,
    searchQuery: string,
    setSearchQuery: (val: string) => void,
    filteredSchools: School[]
  ) => (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="w-full justify-between"
        >
          {value ? getSchoolName(value) : `Select ${type === "school_a" ? "School A" : "School B"}...`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search schools..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              <div className="p-2 text-center">
                <p className="text-sm text-muted-foreground mb-2">No school found.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    setShowInlineSchool(type);
                    setNewSchoolName(searchQuery);
                  }}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add "{searchQuery}"
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {filteredSchools.map((school) => (
                <CommandItem
                  key={school.id}
                  value={school.id}
                  onSelect={() => {
                    setValue(school.id);
                    setIsOpen(false);
                    setSearchQuery("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === school.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{school.name}</span>
                    {school.province && (
                      <span className="text-xs text-muted-foreground">{school.province}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="border-t p-2">
          <Button
            size="sm"
            variant="ghost"
            className="w-full gap-1"
            onClick={() => {
              setIsOpen(false);
              setShowInlineSchool(type);
            }}
          >
            <Plus className="h-4 w-4" />
            Add New School
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );

  const renderInlineSchoolForm = (type: "school_a" | "school_b") => {
    if (showInlineSchool !== type) return null;

    return (
      <div className="space-y-2">
        <Label>New School Name</Label>
        <Input
          placeholder="School Name"
          value={newSchoolName}
          onChange={(e) => setNewSchoolName(e.target.value)}
        />
        <Label>Province</Label>
        <Input
          placeholder="Province"
          value={newSchoolProvince}
          onChange={(e) => setNewSchoolProvince(e.target.value)}
        />
        <Button
          type="button"
          size="sm"
          onClick={handleCreateInlineSchool}
          disabled={creatingSchool || !newSchoolName.trim() || !newSchoolProvince}
        >
          {creatingSchool && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create School
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Fixture</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>School A *</Label>
              {renderSchoolCombobox(
                "school_a",
                schoolAId,
                setSchoolAId,
                schoolAOpen,
                setSchoolAOpen,
                schoolASearchQuery,
                setSchoolASearchQuery,
                filteredSchoolA
              )}
              {renderInlineSchoolForm("school_a")}
            </div>
            <div className="space-y-2">
              <Label>School B *</Label>
              {renderSchoolCombobox(
                "school_b",
                schoolBId,
                setSchoolBId,
                schoolBOpen,
                setSchoolBOpen,
                schoolBSearchQuery,
                setSchoolBSearchQuery,
                filteredSchoolB
              )}
              {renderInlineSchoolForm("school_b")}
            </div>
          </div>

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
            {venueType === "home_ground" && schoolAId && (
              <p className="text-sm text-muted-foreground">📍 {getSchoolName(schoolAId)}</p>
            )}
            {venueType === "away_ground" && schoolBId && (
              <p className="text-sm text-muted-foreground">📍 {getSchoolName(schoolBId)}</p>
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
          </div>

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
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="holding">Holding</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
                  {schoolAId ? getSchoolName(schoolAId) : "School A"}
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
                  {schoolBId ? getSchoolName(schoolBId) : "School B"}
                </p>
              </div>
            </div>
          </div>

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
                <Button type="button" variant="outline" size="icon" asChild>
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Visible to Users</Label>
              <p className="text-xs text-muted-foreground">
                Show this fixture on the app
              </p>
            </div>
            <Switch checked={isVisible} onCheckedChange={setIsVisible} />
          </div>

          {duplicateWarning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{duplicateWarning}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
