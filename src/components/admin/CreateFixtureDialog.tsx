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
import { CalendarIcon, Check, ChevronsUpDown, Loader2, Plus, Search } from "lucide-react";
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

const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
];

export function CreateFixtureDialog({ open, onOpenChange }: CreateFixtureDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  
  // Form state
  const [matchDate, setMatchDate] = useState<Date>();
  const [homeSchoolId, setHomeSchoolId] = useState("");
  const [awaySchoolId, setAwaySchoolId] = useState("");
  const [venue, setVenue] = useState("");
  const [tournamentId, setTournamentId] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [status, setStatus] = useState("upcoming");
  const [isVisible, setIsVisible] = useState(true);
  
  // Combobox state
  const [homeSchoolOpen, setHomeSchoolOpen] = useState(false);
  const [awaySchoolOpen, setAwaySchoolOpen] = useState(false);
  const [homeSearchQuery, setHomeSearchQuery] = useState("");
  const [awaySearchQuery, setAwaySearchQuery] = useState("");
  
  // Inline school creation state
  const [showInlineSchool, setShowInlineSchool] = useState<"home" | "away" | null>(null);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolProvince, setNewSchoolProvince] = useState("");
  const [creatingSchool, setCreatingSchool] = useState(false);

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

  const filteredHomeSchools = useMemo(() => {
    if (!homeSearchQuery) return schools;
    return schools.filter(school =>
      school.name.toLowerCase().includes(homeSearchQuery.toLowerCase())
    );
  }, [schools, homeSearchQuery]);

  const filteredAwaySchools = useMemo(() => {
    if (!awaySearchQuery) return schools;
    return schools.filter(school =>
      school.name.toLowerCase().includes(awaySearchQuery.toLowerCase())
    );
  }, [schools, awaySearchQuery]);

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

      // Add to schools list and select it
      setSchools(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      
      if (showInlineSchool === "home") {
        setHomeSchoolId(data.id);
      } else {
        setAwaySchoolId(data.id);
      }

      toast({
        title: "School Created",
        description: `${data.name} has been added. You can edit full details in Schools Manager.`,
      });

      // Reset inline form
      setShowInlineSchool(null);
      setNewSchoolName("");
      setNewSchoolProvince("");
    } catch (error: any) {
      console.error("Error creating school:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create school",
        variant: "destructive",
      });
    } finally {
      setCreatingSchool(false);
    }
  };

  const resetForm = () => {
    setMatchDate(undefined);
    setHomeSchoolId("");
    setAwaySchoolId("");
    setVenue("");
    setTournamentId("");
    setHomeScore("");
    setAwayScore("");
    setStatus("upcoming");
    setIsVisible(true);
    setHomeSearchQuery("");
    setAwaySearchQuery("");
    setShowInlineSchool(null);
    setNewSchoolName("");
    setNewSchoolProvince("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!matchDate || !homeSchoolId || !awaySchoolId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Date, Home School, Away School)",
        variant: "destructive",
      });
      return;
    }

    if (homeSchoolId === awaySchoolId) {
      toast({
        title: "Validation Error",
        description: "Home and Away school cannot be the same",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const fixtureData = {
        home_school_id: homeSchoolId,
        away_school_id: awaySchoolId,
        match_date: matchDate.toISOString(),
        venue: venue || "TBD",
        tournament_id: tournamentId || null,
        home_score: homeScore ? parseInt(homeScore) : null,
        away_score: awayScore ? parseInt(awayScore) : null,
        status,
        is_visible: isVisible,
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
      window.location.reload();
    } catch (error: any) {
      console.error("Error creating fixture:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create fixture",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderSchoolCombobox = (
    type: "home" | "away",
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
          {value ? getSchoolName(value) : `Select ${type} school...`}
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

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Fixture</DialogTitle>
          </DialogHeader>
          
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

            {/* Home School */}
            <div className="space-y-2">
              <Label>Home School *</Label>
              {renderSchoolCombobox(
                "home",
                homeSchoolId,
                setHomeSchoolId,
                homeSchoolOpen,
                setHomeSchoolOpen,
                homeSearchQuery,
                setHomeSearchQuery,
                filteredHomeSchools
              )}
            </div>

            {/* Away School */}
            <div className="space-y-2">
              <Label>Away School *</Label>
              {renderSchoolCombobox(
                "away",
                awaySchoolId,
                setAwaySchoolId,
                awaySchoolOpen,
                setAwaySchoolOpen,
                awaySearchQuery,
                setAwaySearchQuery,
                filteredAwaySchools
              )}
            </div>

            {/* Venue */}
            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g., Grey College Stadium"
              />
            </div>

            {/* Tournament */}
            <div className="space-y-2">
              <Label>Tournament (Optional)</Label>
              <Select value={tournamentId} onValueChange={setTournamentId}>
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

            {/* Score (Optional) */}
            <div className="space-y-2">
              <Label>Score (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Home"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  className="w-24"
                  min="0"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="number"
                  placeholder="Away"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  className="w-24"
                  min="0"
                />
              </div>
              <p className="text-xs text-muted-foreground">Leave blank if match hasn't been played</p>
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
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="holding">Holding</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Visible Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>Visible to Users</Label>
                <p className="text-xs text-muted-foreground">
                  Show this fixture on the public app
                </p>
              </div>
              <Switch
                checked={isVisible}
                onCheckedChange={setIsVisible}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
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

      {/* Inline School Creation Dialog */}
      <Dialog open={!!showInlineSchool} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setShowInlineSchool(null);
          setNewSchoolName("");
          setNewSchoolProvince("");
        }
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New School (Quick Add)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add minimal school info to continue. You can edit the full profile later in Schools Manager.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="newSchoolName">School Name *</Label>
              <Input
                id="newSchoolName"
                value={newSchoolName}
                onChange={(e) => setNewSchoolName(e.target.value)}
                placeholder="e.g., Grey College"
              />
            </div>

            <div className="space-y-2">
              <Label>Province *</Label>
              <Select value={newSchoolProvince} onValueChange={setNewSchoolProvince}>
                <SelectTrigger>
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCES.map((province) => (
                    <SelectItem key={province} value={province}>
                      {province}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInlineSchool(null);
                  setNewSchoolName("");
                  setNewSchoolProvince("");
                }}
                disabled={creatingSchool}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateInlineSchool}
                disabled={creatingSchool || !newSchoolName.trim() || !newSchoolProvince}
              >
                {creatingSchool && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add School
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
