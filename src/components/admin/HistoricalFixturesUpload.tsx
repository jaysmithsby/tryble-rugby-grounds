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
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2, Plus, Trash2, History, AlertCircle, CheckCircle2, CalendarIcon, ClipboardPaste, ChevronDown } from "lucide-react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import {
  FixtureRow,
  School,
  Tournament,
  RESULT_OPTIONS,
  YEARS,
  currentYear,
  generateId,
  parseFixtureData,
  UPCOMING_YEAR_THRESHOLD,
} from "@/lib/fixtureParser";

interface HistoricalFixturesUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function HistoricalFixturesUpload({ open, onOpenChange, onSuccess }: HistoricalFixturesUploadProps) {
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
  
  // Dropdown states
  const [activeOpponentDropdown, setActiveOpponentDropdown] = useState<string | null>(null);
  const [opponentSearchQueries, setOpponentSearchQueries] = useState<Record<string, string>>({});
  const [activeTournamentDropdown, setActiveTournamentDropdown] = useState<string | null>(null);
  const [tournamentSearchQueries, setTournamentSearchQueries] = useState<Record<string, string>>({});
  
  // Quick Paste state
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [parseInfo, setParseInfo] = useState<string | null>(null);
  
  // Submission state
  const [submitted, setSubmitted] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  function createEmptyRow(): FixtureRow {
    const yearNum = parseInt(defaultYear);
    const defaultResult = yearNum >= UPCOMING_YEAR_THRESHOLD ? "upcoming" : "won";
    
    return {
      id: generateId(),
      year: defaultYear,
      homeAway: "home",
      opponentName: "",
      opponentId: "",
      result: defaultResult,
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

  const generateUniqueSlug = async (name: string): Promise<string> => {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    
    const { data: existing } = await supabase
      .from("schools")
      .select("slug")
      .eq("slug", baseSlug)
      .maybeSingle();
    
    if (!existing) return baseSlug;
    
    let suffix = 2;
    while (suffix < 100) {
      const candidateSlug = `${baseSlug}-${suffix}`;
      const { data: check } = await supabase
        .from("schools")
        .select("slug")
        .eq("slug", candidateSlug)
        .maybeSingle();
      
      if (!check) return candidateSlug;
      suffix++;
    }
    
    return `${baseSlug}-${Date.now()}`;
  };

  const createNewSchool = async (name: string): Promise<string | null> => {
    const trimmedName = name.trim();
    if (!trimmedName) return null;

    try {
      const slug = await generateUniqueSlug(trimmedName);

      const { data, error } = await supabase
        .from("schools")
        .insert({
          name: trimmedName,
          slug,
          status: "verified",
          is_visible: true,
        })
        .select("id, name, province")
        .single();

      if (error) throw error;

      setSchools(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      
      toast({
        title: "School created",
        description: `"${trimmedName}" has been added to the database.`,
      });

      return data.id;
    } catch (error: any) {
      console.error("Error creating school:", error);
      toast({
        title: "Failed to create school",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleCreatePrimarySchool = async () => {
    if (!primarySearchQuery.trim()) return;
    
    const newId = await createNewSchool(primarySearchQuery);
    if (newId) {
      setPrimarySchoolId(newId);
      setPrimarySchoolOpen(false);
      setPrimarySearchQuery("");
    }
  };

  const handleCreateOpponentSchool = async (rowId: string, schoolName: string) => {
    if (!schoolName.trim()) return;
    
    const newId = await createNewSchool(schoolName);
    if (newId) {
      updateRow(rowId, "opponentId", newId);
      updateRow(rowId, "opponentName", schoolName.trim());
      setActiveOpponentDropdown(null);
      setOpponentSearchQueries(prev => ({ ...prev, [rowId]: "" }));
    }
  };

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
    const yearNum = parseInt(defaultYear);
    const defaultResult = yearNum >= UPCOMING_YEAR_THRESHOLD ? "upcoming" : "won";
    setRows(prev => [...prev, { ...createEmptyRow(), year: defaultYear, result: defaultResult }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(prev => prev.filter(row => row.id !== id));
      setErrors([]);
    }
  };

  const updateRow = (id: string, field: keyof FixtureRow, value: string) => {
    setRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      
      const updatedRow = { ...row, [field]: value };
      
      if (field === "year") {
        const yearNum = parseInt(value);
        if (yearNum >= UPCOMING_YEAR_THRESHOLD) {
          updatedRow.result = "upcoming";
        }
      }
      
      return updatedRow;
    }));
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const resetForm = () => {
    setPrimarySchoolId("");
    setPrimarySearchQuery("");
    setDefaultYear(currentYear.toString());
    setRows([createEmptyRow()]);
    setOpponentSearchQueries({});
    setTournamentSearchQueries({});
    setSubmitted(false);
    setSubmittedCount(0);
    setErrors([]);
    setPasteText("");
    setParseInfo(null);
  };

  const createNewTournament = async (name: string, year: string): Promise<string | null> => {
    const trimmedName = name.trim();
    if (!trimmedName) return null;

    const yearPattern = /\d{4}$/;
    const tournamentName = yearPattern.test(trimmedName) 
      ? trimmedName 
      : `${trimmedName} ${year}`;

    try {
      const primarySchool = schools.find(s => s.id === primarySchoolId);
      const hostSchool = primarySchool?.name || "TBD";

      const { data, error } = await supabase
        .from("tournaments")
        .insert({
          name: tournamentName,
          host_school: hostSchool,
          venue: hostSchool,
          start_date: new Date(parseInt(year), 0, 1).toISOString(),
          end_date: new Date(parseInt(year), 11, 31).toISOString(),
          is_active: false,
        })
        .select("id, name")
        .single();

      if (error) throw error;

      setTournaments(prev => [data, ...prev]);
      
      toast({
        title: "Festival created",
        description: `"${tournamentName}" has been added to the database.`,
      });

      return data.id;
    } catch (error: any) {
      console.error("Error creating tournament:", error);
      toast({
        title: "Failed to create festival",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleCreateTournament = async (rowId: string, tournamentName: string) => {
    if (!tournamentName.trim()) return;
    
    const row = rows.find(r => r.id === rowId);
    const year = row?.year || defaultYear;
    
    const newId = await createNewTournament(tournamentName, year);
    if (newId) {
      updateRow(rowId, "tournamentId", newId);
      setActiveTournamentDropdown(null);
      setTournamentSearchQueries(prev => ({ ...prev, [rowId]: "" }));
    }
  };

  const getFilteredTournaments = (query: string) => {
    if (!query) return tournaments;
    return tournaments.filter(tournament =>
      tournament.name.toLowerCase().includes(query.toLowerCase())
    );
  };

  const getTournamentName = (id: string) => {
    return tournaments.find(t => t.id === id)?.name || "";
  };

  const parsePastedData = () => {
    if (!pasteText.trim() || !primarySchoolId) return;
    
    const primarySchoolName = getSchoolName(primarySchoolId);
    
    const parsedRows = parseFixtureData(pasteText, {
      primarySchoolId,
      primarySchoolName,
      defaultYear,
      schools,
      tournaments,
    });

    if (parsedRows.length === 0) {
      toast({
        title: "No fixtures parsed",
        description: "Could not parse any fixtures from the pasted data. Try using markdown table format with columns: Date, Opponent, Venue, Result, PF, PA, Notes",
        variant: "destructive",
      });
      return;
    }

    const matchedCount = parsedRows.filter(r => r.opponentId).length;
    const newCount = parsedRows.filter(r => !r.opponentId && r.opponentName).length;

    setRows(parsedRows);
    
    const info = `Parsed ${parsedRows.length} fixture(s). ` +
      `${matchedCount} opponent(s) matched to database. ` +
      `${newCount} will be created as new school(s).`;
    setParseInfo(info);
    
    toast({
      title: "Data parsed successfully",
      description: info,
    });

    setPasteText("");
    setPasteOpen(false);
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
      
      if (row.result !== "upcoming" && (!row.scoreFor || !row.scoreAgainst)) {
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

      const createdSchoolIds: Record<string, string> = {};
      for (const newSchool of newSchoolsToCreate) {
        const slug = await generateUniqueSlug(newSchool.name);

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

      for (const row of rows) {
        let opponentId = row.opponentId;
        
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

        const isUpcoming = row.result === "upcoming";
        const scoreFor = isUpcoming ? null : parseInt(row.scoreFor);
        const scoreAgainst = isUpcoming ? null : parseInt(row.scoreAgainst);
        
        const isHome = row.homeAway === "home";
        const homeSchoolId = isHome ? primarySchoolId : opponentId;
        const awaySchoolId = isHome ? opponentId : primarySchoolId;
        const homeScore = isUpcoming ? null : (isHome ? scoreFor : scoreAgainst);
        const awayScore = isUpcoming ? null : (isHome ? scoreAgainst : scoreFor);

        const primarySchoolName = getSchoolName(primarySchoolId);
        const opponentName = row.opponentName.trim() || getSchoolName(opponentId);
        const venue = isHome ? primarySchoolName : opponentName;

        const status = isUpcoming ? "upcoming" : "completed";

        const year = parseInt(row.year);
        let matchDate: Date;
        if (row.matchDate) {
          matchDate = new Date(row.matchDate);
        } else {
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
        title: "Failed to create fixtures",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (submitted) {
      onSuccess?.();
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
              {searchQuery && !filteredOpponents.some(s => 
                s.name.toLowerCase() === searchQuery.toLowerCase()
              ) && (
                <CommandGroup>
                  <CommandItem
                    value={`create-now-${searchQuery}`}
                    onSelect={() => handleCreateOpponentSchool(row.id, searchQuery)}
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

  const renderTournamentCombobox = (row: FixtureRow) => {
    const searchQuery = tournamentSearchQueries[row.id] || "";
    const filteredTournaments = getFilteredTournaments(searchQuery);
    const isOpen = activeTournamentDropdown === row.id;

    return (
      <Popover open={isOpen} onOpenChange={(open) => setActiveTournamentDropdown(open ? row.id : null)}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-between h-9 text-sm"
          >
            <span className="truncate">
              {row.tournamentId && row.tournamentId !== "none" 
                ? getTournamentName(row.tournamentId) 
                : "None"}
            </span>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search or create festival..."
              value={searchQuery}
              onValueChange={(val) => {
                setTournamentSearchQueries(prev => ({ ...prev, [row.id]: val }));
              }}
            />
            <CommandList>
              <CommandGroup>
                <CommandItem
                  value="none"
                  onSelect={() => {
                    updateRow(row.id, "tournamentId", "none");
                    setActiveTournamentDropdown(null);
                    setTournamentSearchQueries(prev => ({ ...prev, [row.id]: "" }));
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !row.tournamentId || row.tournamentId === "none" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-muted-foreground">None</span>
                </CommandItem>
                {filteredTournaments.slice(0, 10).map((tournament) => (
                  <CommandItem
                    key={tournament.id}
                    value={tournament.id}
                    onSelect={() => {
                      updateRow(row.id, "tournamentId", tournament.id);
                      setActiveTournamentDropdown(null);
                      setTournamentSearchQueries(prev => ({ ...prev, [row.id]: "" }));
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        row.tournamentId === tournament.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{tournament.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              {searchQuery && !filteredTournaments.some(t => 
                t.name.toLowerCase() === searchQuery.toLowerCase()
              ) && (
                <CommandGroup>
                  <CommandItem
                    value={`create-festival-${searchQuery}`}
                    onSelect={() => handleCreateTournament(row.id, searchQuery)}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="truncate">
                      Create "{searchQuery} {row.year}" as new festival
                    </span>
                  </CommandItem>
                </CommandGroup>
              )}
              {filteredTournaments.length === 0 && !searchQuery && (
                <div className="p-2 text-center text-sm text-muted-foreground">
                  Type to search or create festival
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
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col overflow-hidden">
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
                              {school.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        {primarySearchQuery && !filteredPrimarySchools.some(s => 
                          s.name.toLowerCase() === primarySearchQuery.toLowerCase()
                        ) && (
                          <CommandGroup>
                            <CommandItem
                              value={`create-${primarySearchQuery}`}
                              onSelect={handleCreatePrimarySchool}
                              className="text-primary"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Create "{primarySearchQuery}"
                            </CommandItem>
                          </CommandGroup>
                        )}
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

            {/* Quick Paste Section */}
            <Collapsible open={pasteOpen} onOpenChange={setPasteOpen} className="border rounded-lg mb-4">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-4 py-3 h-auto">
                  <div className="flex items-center gap-2">
                    <ClipboardPaste className="h-4 w-4" />
                    <span className="font-medium">Quick Paste</span>
                    <span className="text-xs text-muted-foreground">
                      — Paste tab-separated data from spreadsheets
                    </span>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", pasteOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <div className="space-y-3">
                  <Textarea
                    placeholder={`Paste your fixture data here...

Expected format (tab-separated with headers):
match_date	home_school	away_school	sport	venue	home_away	round_name
2026-03-14	St Charles College	Kearsney College	Rugby	St Charles College	Away	Winter Season`}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    className="min-h-[120px] font-mono text-xs"
                  />
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">
                      Headers: match_date, home_school, away_school, home_away, venue, round_name
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPasteText("")}
                        disabled={!pasteText}
                      >
                        Clear
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={parsePastedData}
                        disabled={!pasteText.trim() || !primarySchoolId}
                        className="gap-1"
                      >
                        <ClipboardPaste className="h-3 w-3" />
                        Parse & Fill Rows
                      </Button>
                    </div>
                  </div>
                  {!primarySchoolId && pasteText && (
                    <p className="text-xs text-amber-600">
                      Please select a Primary School first to parse correctly
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Parse Info Display */}
            {parseInfo && (
              <Alert className="mb-4">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{parseInfo}</AlertDescription>
              </Alert>
            )}

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
            <div className="flex-1 -mx-6 px-6 min-h-[200px] max-h-[calc(90vh-380px)] overflow-auto border rounded-md">
              <div className="space-y-2 min-w-[900px] p-2">
                {/* Table Header */}
                <div className="grid grid-cols-[80px_110px_80px_1fr_100px_70px_70px_1fr_40px] gap-2 text-xs font-medium text-muted-foreground pb-2 border-b sticky top-0 bg-background z-10">
                  <div>Year</div>
                  <div>Date</div>
                  <div>H/A</div>
                  <div>Opponent</div>
                  <div>Result</div>
                  <div>For</div>
                  <div>Against</div>
                  <div>Tournament</div>
                  <div></div>
                </div>

                {/* Fixture Rows */}
                {rows.map((row) => {
                  const rowDate = row.matchDate ? new Date(row.matchDate) : undefined;
                  
                  return (
                  <div
                    key={row.id}
                    className="grid grid-cols-[80px_110px_80px_1fr_100px_70px_70px_1fr_40px] gap-2 items-center py-1"
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

                    {/* Date Picker */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-9 text-sm justify-start text-left font-normal",
                            !row.matchDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {row.matchDate ? format(new Date(row.matchDate), "MMM dd") : "Pick"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={rowDate}
                          onSelect={(date) => {
                            if (date) {
                              date.setHours(14, 0, 0, 0);
                              updateRow(row.id, "matchDate", date.toISOString());
                              updateRow(row.id, "year", date.getFullYear().toString());
                            } else {
                              updateRow(row.id, "matchDate", "");
                            }
                          }}
                          defaultMonth={row.year ? new Date(parseInt(row.year), 0) : undefined}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>

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
                      onValueChange={(val) => updateRow(row.id, "result", val as "won" | "lost" | "drew" | "upcoming")}
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
                    {renderTournamentCombobox(row)}

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
                  );
                })}
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
            </div>

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
