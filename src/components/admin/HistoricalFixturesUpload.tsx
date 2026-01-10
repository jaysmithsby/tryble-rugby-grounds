import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2, Plus, Trash2, History, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface HistoricalFixturesUploadProps {
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

interface FixtureRow {
  id: string;
  year: string;
  homeAway: "home" | "away";
  opponentName: string;
  opponentId: string;
  result: "won" | "lost" | "drew";
  scoreFor: string;
  scoreAgainst: string;
  tournamentId: string;
  matchDate: string;
}

const RESULT_OPTIONS = [
  { value: "won", label: "Won", color: "text-green-600" },
  { value: "lost", label: "Lost", color: "text-red-600" },
  { value: "drew", label: "Drew", color: "text-orange-500" },
];

const generateId = () => Math.random().toString(36).substring(2, 9);

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => (currentYear - i).toString());

export function HistoricalFixturesUpload({ open, onOpenChange }: HistoricalFixturesUploadProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  
  // Step 1: Primary school selection
  const [primarySchoolId, setPrimarySchoolId] = useState("");
  const [primarySchoolOpen, setPrimarySchoolOpen] = useState(false);
  const [primarySearchQuery, setPrimarySearchQuery] = useState("");
  const [defaultYear, setDefaultYear] = useState(currentYear.toString());
  
  // Step 2: Fixture rows
  const [rows, setRows] = useState<FixtureRow[]>([createEmptyRow()]);
  
  // Opponent dropdown states
  const [activeOpponentDropdown, setActiveOpponentDropdown] = useState<string | null>(null);
  const [opponentSearchQueries, setOpponentSearchQueries] = useState<Record<string, string>>({});
  
  // Submission state
  const [submitted, setSubmitted] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  function createEmptyRow(): FixtureRow {
    return {
      id: generateId(),
      year: defaultYear,
      homeAway: "home",
      opponentName: "",
      opponentId: "",
      result: "won",
      scoreFor: "",
      scoreAgainst: "",
      tournamentId: "",
      matchDate: "",
    };
  }

  useEffect(() => {
    if (open) {
      fetchSchools();
      fetchTournaments();
    }
  }, [open]);

  useEffect(() => {
    // Update default year in empty rows when defaultYear changes
    setRows(prev => prev.map(row => 
      row.year === "" ? { ...row, year: defaultYear } : row
    ));
  }, [defaultYear]);

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
        .order("start_date", { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    }
  };

  const filteredPrimarySchools = useMemo(() => {
    if (!primarySearchQuery) return schools;
    return schools.filter(school =>
      school.name.toLowerCase().includes(primarySearchQuery.toLowerCase())
    );
  }, [schools, primarySearchQuery]);

  const getFilteredOpponents = (query: string) => {
    if (!query) return schools.filter(s => s.id !== primarySchoolId);
    return schools.filter(school =>
      school.id !== primarySchoolId &&
      school.name.toLowerCase().includes(query.toLowerCase())
    );
  };

  const getSchoolName = (id: string) => {
    return schools.find(s => s.id === id)?.name || "";
  };

  const addRow = () => {
    setRows(prev => [...prev, { ...createEmptyRow(), year: defaultYear }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(prev => prev.filter(row => row.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof FixtureRow, value: string) => {
    setRows(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const resetForm = () => {
    setPrimarySchoolId("");
    setPrimarySearchQuery("");
    setDefaultYear(currentYear.toString());
    setRows([createEmptyRow()]);
    setOpponentSearchQueries({});
    setSubmitted(false);
    setSubmittedCount(0);
    setErrors([]);
  };

  const validateRows = (): string[] => {
    const validationErrors: string[] = [];
    
    if (!primarySchoolId) {
      validationErrors.push("Please select a primary school");
      return validationErrors;
    }

    rows.forEach((row, index) => {
      const rowNum = index + 1;
      
      if (!row.opponentId && !row.opponentName.trim()) {
        validationErrors.push(`Row ${rowNum}: Opponent is required`);
      }
      
      if (!row.scoreFor || !row.scoreAgainst) {
        validationErrors.push(`Row ${rowNum}: Score is required`);
      }
      
      if (!row.year) {
        validationErrors.push(`Row ${rowNum}: Year is required`);
      }
    });

    return validationErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validateRows();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors([]);
    
    try {
      const fixturesToInsert = [];
      const newSchoolsToCreate: { name: string; tempId: string }[] = [];

      // First pass: identify schools that need to be created
      for (const row of rows) {
        if (!row.opponentId && row.opponentName.trim()) {
          const existingSchool = schools.find(
            s => s.name.toLowerCase() === row.opponentName.trim().toLowerCase()
          );
          if (!existingSchool) {
            const existing = newSchoolsToCreate.find(
              s => s.name.toLowerCase() === row.opponentName.trim().toLowerCase()
            );
            if (!existing) {
              newSchoolsToCreate.push({
                name: row.opponentName.trim(),
                tempId: row.id,
              });
            }
          }
        }
      }

      // Create new schools if needed
      const createdSchoolIds: Record<string, string> = {};
      for (const newSchool of newSchoolsToCreate) {
        const slug = newSchool.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-');

        const { data, error } = await supabase
          .from("schools")
          .insert({
            name: newSchool.name,
            slug,
            status: "verified",
            is_visible: true,
          })
          .select("id")
          .single();

        if (error) throw error;
        createdSchoolIds[newSchool.name.toLowerCase()] = data.id;
      }

      // Second pass: create fixtures
      for (const row of rows) {
        let opponentId = row.opponentId;
        
        // Get opponent ID from newly created schools if needed
        if (!opponentId && row.opponentName.trim()) {
          const existingSchool = schools.find(
            s => s.name.toLowerCase() === row.opponentName.trim().toLowerCase()
          );
          if (existingSchool) {
            opponentId = existingSchool.id;
          } else {
            opponentId = createdSchoolIds[row.opponentName.trim().toLowerCase()];
          }
        }

        if (!opponentId) continue;

        const scoreFor = parseInt(row.scoreFor);
        const scoreAgainst = parseInt(row.scoreAgainst);
        
        // Determine home/away and scores
        const isHome = row.homeAway === "home";
        const homeSchoolId = isHome ? primarySchoolId : opponentId;
        const awaySchoolId = isHome ? opponentId : primarySchoolId;
        const homeScore = isHome ? scoreFor : scoreAgainst;
        const awayScore = isHome ? scoreAgainst : scoreFor;

        // Determine venue based on home/away
        // If Home: venue is the primary school's name
        // If Away: venue is the opponent's name
        const primarySchoolName = getSchoolName(primarySchoolId);
        const opponentName = row.opponentName.trim() || getSchoolName(opponentId);
        const venue = isHome ? primarySchoolName : opponentName;

        // Calculate status based on result
        const status = "completed";

        // Create match date (use middle of the year if no specific date)
        const year = parseInt(row.year);
        let matchDate: Date;
        if (row.matchDate) {
          matchDate = new Date(row.matchDate);
        } else {
          // Default to March 15 of the specified year
          matchDate = new Date(year, 2, 15, 14, 0, 0);
        }

        fixturesToInsert.push({
          home_school_id: homeSchoolId,
          away_school_id: awaySchoolId,
          home_score: homeScore,
          away_score: awayScore,
          match_date: matchDate.toISOString(),
          venue: venue || "TBD",
          status,
          season: year.toString(),
          year,
          sport: "Rugby",
          is_visible: true,
          tournament_id: row.tournamentId && row.tournamentId !== "none" ? row.tournamentId : null,
        });
      }

      if (fixturesToInsert.length === 0) {
        throw new Error("No valid fixtures to insert");
      }

      const { error } = await supabase.from("fixtures").insert(fixturesToInsert);

      if (error) throw error;

      setSubmitted(true);
      setSubmittedCount(fixturesToInsert.length);
      
      toast({
        title: "Success",
        description: `${fixturesToInsert.length} historical fixture(s) created successfully`,
      });

    } catch (error: any) {
      console.error("Error creating fixtures:", error);
      setErrors([error.message || "Failed to create fixtures"]);
      toast({
        title: "Error",
        description: error.message || "Failed to create fixtures",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (submitted) {
      window.location.reload();
    }
    resetForm();
    onOpenChange(false);
  };

  const renderOpponentCombobox = (row: FixtureRow) => {
    const searchQuery = opponentSearchQueries[row.id] || "";
    const filteredOpponents = getFilteredOpponents(searchQuery);
    const isOpen = activeOpponentDropdown === row.id;

    return (
      <Popover open={isOpen} onOpenChange={(open) => setActiveOpponentDropdown(open ? row.id : null)}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-between h-9 text-sm"
          >
            <span className="truncate">
              {row.opponentId ? getSchoolName(row.opponentId) : row.opponentName || "Select opponent..."}
            </span>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search or type new..."
              value={searchQuery}
              onValueChange={(val) => {
                setOpponentSearchQueries(prev => ({ ...prev, [row.id]: val }));
                // Update opponent name for free text entry
                updateRow(row.id, "opponentName", val);
                updateRow(row.id, "opponentId", "");
              }}
            />
            <CommandList>
              <CommandGroup>
                {filteredOpponents.slice(0, 10).map((school) => (
                  <CommandItem
                    key={school.id}
                    value={school.id}
                    onSelect={() => {
                      updateRow(row.id, "opponentId", school.id);
                      updateRow(row.id, "opponentName", school.name);
                      setActiveOpponentDropdown(null);
                      setOpponentSearchQueries(prev => ({ ...prev, [row.id]: "" }));
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        row.opponentId === school.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{school.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              {searchQuery && filteredOpponents.length === 0 && (
                <CommandGroup>
                  <CommandItem
                    value={`create-${searchQuery}`}
                    onSelect={() => {
                      updateRow(row.id, "opponentId", "");
                      updateRow(row.id, "opponentName", searchQuery);
                      setActiveOpponentDropdown(null);
                      setOpponentSearchQueries(prev => ({ ...prev, [row.id]: "" }));
                      toast({
                        title: "New school will be created",
                        description: `"${searchQuery}" will be added to the database when you upload.`,
                      });
                    }}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Create "{searchQuery}" as new school</span>
                  </CommandItem>
                </CommandGroup>
              )}
              {filteredOpponents.length === 0 && !searchQuery && (
                <div className="p-2 text-center text-sm text-muted-foreground">
                  Type to search or add new school
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Upload Historical Fixtures
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Upload Complete!</h3>
            <p className="text-muted-foreground mb-6">
              Successfully created {submittedCount} historical fixture{submittedCount !== 1 ? "s" : ""}.
            </p>
            <Button onClick={handleClose}>Close & Refresh</Button>
          </div>
        ) : (
          <>
            {/* Step 1: Primary School Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4 mb-4">
              <div className="space-y-2">
                <Label>Primary School *</Label>
                <Popover open={primarySchoolOpen} onOpenChange={setPrimarySchoolOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={primarySchoolOpen}
                      className="w-full justify-between"
                    >
                      {primarySchoolId ? getSchoolName(primarySchoolId) : "Select school..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search schools..."
                        value={primarySearchQuery}
                        onValueChange={setPrimarySearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No school found.</CommandEmpty>
                        <CommandGroup>
                          {filteredPrimarySchools.map((school) => (
                            <CommandItem
                              key={school.id}
                              value={school.id}
                              onSelect={() => {
                                setPrimarySchoolId(school.id);
                                setPrimarySchoolOpen(false);
                                setPrimarySearchQuery("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  primarySchoolId === school.id ? "opacity-100" : "opacity-0"
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
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Default Year</Label>
                <Select value={defaultYear} onValueChange={setDefaultYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Error Display */}
            {errors.length > 0 && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Step 2: Fixture Rows Table */}
            <ScrollArea className="flex-1 -mx-6 px-6 max-h-[400px]">
              <div className="space-y-2">
                {/* Table Header */}
                <div className="grid grid-cols-[80px_80px_1fr_100px_70px_70px_1fr_40px] gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                  <div>Year</div>
                  <div>H/A</div>
                  <div>Opponent</div>
                  <div>Result</div>
                  <div>For</div>
                  <div>Against</div>
                  <div>Tournament</div>
                  <div></div>
                </div>

                {/* Fixture Rows */}
                {rows.map((row, index) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[80px_80px_1fr_100px_70px_70px_1fr_40px] gap-2 items-center py-1"
                  >
                    {/* Year */}
                    <Select
                      value={row.year}
                      onValueChange={(val) => updateRow(row.id, "year", val)}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Home/Away */}
                    <Select
                      value={row.homeAway}
                      onValueChange={(val) => updateRow(row.id, "homeAway", val as "home" | "away")}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home">Home</SelectItem>
                        <SelectItem value="away">Away</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Opponent */}
                    {renderOpponentCombobox(row)}

                    {/* Result */}
                    <Select
                      value={row.result}
                      onValueChange={(val) => updateRow(row.id, "result", val as "won" | "lost" | "drew")}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESULT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className={option.color}>{option.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Score For */}
                    <Input
                      type="number"
                      min="0"
                      max="200"
                      value={row.scoreFor}
                      onChange={(e) => updateRow(row.id, "scoreFor", e.target.value)}
                      placeholder="For"
                      className="h-9 text-sm"
                    />

                    {/* Score Against */}
                    <Input
                      type="number"
                      min="0"
                      max="200"
                      value={row.scoreAgainst}
                      onChange={(e) => updateRow(row.id, "scoreAgainst", e.target.value)}
                      placeholder="Agst"
                      className="h-9 text-sm"
                    />

                    {/* Tournament */}
                    <Select
                      value={row.tournamentId}
                      onValueChange={(val) => updateRow(row.id, "tournamentId", val)}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="None" />
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

                    {/* Delete Row */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add Row Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
                className="mt-4 gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Row
              </Button>
            </ScrollArea>

            <DialogFooter className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between w-full">
                <p className="text-sm text-muted-foreground">
                  {rows.length} fixture{rows.length !== 1 ? "s" : ""} to upload
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || !primarySchoolId}
                    className="gap-2"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Upload {rows.length} Fixture{rows.length !== 1 ? "s" : ""}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
