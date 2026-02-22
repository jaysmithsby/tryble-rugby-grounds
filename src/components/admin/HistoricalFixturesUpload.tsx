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
import { Check, ChevronsUpDown, Loader2, Plus, Trash2, History, AlertCircle, CheckCircle2, CalendarIcon, ClipboardPaste, ChevronDown, Upload, AlertTriangle } from "lucide-react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  parseMultiSchoolData,
  BulkParseResult,
  BulkFixtureRow,
} from "@/lib/fixtureParser/multiSchoolParser";

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
  
  // Mode toggle
  const [isBulkMode, setIsBulkMode] = useState(false);
  
  // === Single School Mode State ===
  const [primarySchoolId, setPrimarySchoolId] = useState("");
  const [primarySchoolOpen, setPrimarySchoolOpen] = useState(false);
  const [primarySearchQuery, setPrimarySearchQuery] = useState("");
  const [defaultYear, setDefaultYear] = useState(currentYear.toString());
  const [rows, setRows] = useState<FixtureRow[]>([createEmptyRow()]);
  const [activeOpponentDropdown, setActiveOpponentDropdown] = useState<string | null>(null);
  const [opponentSearchQueries, setOpponentSearchQueries] = useState<Record<string, string>>({});
  const [activeTournamentDropdown, setActiveTournamentDropdown] = useState<string | null>(null);
  const [tournamentSearchQueries, setTournamentSearchQueries] = useState<Record<string, string>>({});
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [parseInfo, setParseInfo] = useState<string | null>(null);
  
  // === Bulk Mode State ===
  const [bulkPasteText, setBulkPasteText] = useState("");
  const [bulkResult, setBulkResult] = useState<BulkParseResult | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [activeBulkSchoolDropdown, setActiveBulkSchoolDropdown] = useState<string | null>(null);
  const [bulkSchoolSearchQueries, setBulkSchoolSearchQueries] = useState<Record<string, string>>({});
  
  // === Shared State ===
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

  const createNewSchool = async (name: string, province?: string): Promise<string | null> => {
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
          ...(province ? { province } : {}),
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
    setBulkPasteText("");
    setBulkResult(null);
    setExpandedSections(new Set());
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

  // === Bulk Mode Functions ===

  const parseBulkData = () => {
    if (!bulkPasteText.trim()) return;

    const result = parseMultiSchoolData(bulkPasteText, schools, tournaments);

    if (result.schoolSections.length === 0) {
      toast({
        title: "No fixtures parsed",
        description: "Could not find any school sections or fixture data. Make sure each school name is on its own line followed by fixture rows.",
        variant: "destructive",
      });
      return;
    }

    setBulkResult(result);
    // Expand all sections by default
    setExpandedSections(new Set(result.schoolSections.map(s => s.schoolName)));

    toast({
      title: "Data parsed successfully",
      description: `Found ${result.schoolSections.length} school(s), ${result.totalFixtures} unique fixture(s), ${result.duplicates} duplicate(s) removed.`,
    });
  };

  const updateBulkFixture = (sectionIndex: number, fixtureIndex: number, field: keyof BulkFixtureRow, value: string) => {
    if (!bulkResult) return;
    setBulkResult(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated.schoolSections = [...prev.schoolSections];
      updated.schoolSections[sectionIndex] = { ...prev.schoolSections[sectionIndex] };
      updated.schoolSections[sectionIndex].fixtures = [...prev.schoolSections[sectionIndex].fixtures];
      updated.schoolSections[sectionIndex].fixtures[fixtureIndex] = {
        ...prev.schoolSections[sectionIndex].fixtures[fixtureIndex],
        [field]: value,
      };
      return updated;
    });
    if (errors.length > 0) setErrors([]);
  };

  const removeBulkFixture = (sectionIndex: number, fixtureIndex: number) => {
    if (!bulkResult) return;
    setBulkResult(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated.schoolSections = [...prev.schoolSections];
      updated.schoolSections[sectionIndex] = { ...prev.schoolSections[sectionIndex] };
      updated.schoolSections[sectionIndex].fixtures = prev.schoolSections[sectionIndex].fixtures.filter((_, i) => i !== fixtureIndex);
      updated.totalFixtures = updated.schoolSections.reduce((sum, s) => sum + s.fixtures.length, 0);
      return updated;
    });
  };

  const toggleSection = (schoolName: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(schoolName)) {
        next.delete(schoolName);
      } else {
        next.add(schoolName);
      }
      return next;
    });
  };

  const handleBulkSubmit = async () => {
    if (!bulkResult || bulkResult.totalFixtures === 0) return;

    setLoading(true);
    setErrors([]);

    try {
      // Collect all unique school names that need creating
      const allSchoolNames = new Set<string>();
      for (const section of bulkResult.schoolSections) {
        for (const fixture of section.fixtures) {
          if (!fixture.homeTeamId && fixture.homeTeamName) allSchoolNames.add(fixture.homeTeamName);
          if (!fixture.awayTeamId && fixture.awayTeamName) allSchoolNames.add(fixture.awayTeamName);
        }
      }

      // Create missing schools
      const createdSchoolIds: Record<string, string> = {};
      for (const name of allSchoolNames) {
        // Check if already in DB (may have been matched differently)
        const existing = schools.find(s => s.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          createdSchoolIds[name.toLowerCase()] = existing.id;
          continue;
        }
        
        const newId = await createNewSchool(name, bulkResult.province || undefined);
        if (newId) {
          createdSchoolIds[name.toLowerCase()] = newId;
        }
      }

      // Build fixture inserts
      const fixturesToInsert = [];

      for (const section of bulkResult.schoolSections) {
        for (const fixture of section.fixtures) {
          if (fixture.isCancelled) continue; // Skip cancelled matches

          const homeId = fixture.homeTeamId || createdSchoolIds[fixture.homeTeamName.toLowerCase()];
          const awayId = fixture.awayTeamId || createdSchoolIds[fixture.awayTeamName.toLowerCase()];

          if (!homeId || !awayId) continue;

          const isUpcoming = fixture.result === "upcoming";
          const homeScore = isUpcoming ? null : (fixture.homeAway === "home" ? parseInt(fixture.scoreFor) : parseInt(fixture.scoreAgainst));
          const awayScore = isUpcoming ? null : (fixture.homeAway === "home" ? parseInt(fixture.scoreAgainst) : parseInt(fixture.scoreFor));

          const year = parseInt(fixture.year);
          let matchDate: Date;
          if (fixture.matchDate) {
            matchDate = new Date(fixture.matchDate);
          } else {
            matchDate = new Date(year, 2, 15, 14, 0, 0);
          }

          fixturesToInsert.push({
            home_school_id: homeId,
            away_school_id: awayId,
            home_score: isNaN(homeScore as number) ? null : homeScore,
            away_score: isNaN(awayScore as number) ? null : awayScore,
            match_date: matchDate.toISOString(),
            venue: fixture.homeTeamName || "TBD",
            status: isUpcoming ? "upcoming" : "completed",
            season: fixture.year,
            year,
            sport: "Rugby",
            is_visible: true,
            tournament_id: null,
          });
        }
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
        description: `${fixturesToInsert.length} fixture(s) created successfully`,
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

  // === Single School Submit (unchanged logic) ===

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

  // === Render Helpers ===

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

  // === Render Bulk School Combobox ===

  const renderBulkSchoolCombobox = (
    sectionIndex: number,
    fixtureIndex: number,
    teamType: "home" | "away",
    fixture: BulkFixtureRow,
  ) => {
    const dropdownKey = `${sectionIndex}-${fixtureIndex}-${teamType}`;
    const nameField = teamType === "home" ? "homeTeamName" : "awayTeamName";
    const idField = teamType === "home" ? "homeTeamId" : "awayTeamId";
    const currentName = teamType === "home" ? fixture.homeTeamName : fixture.awayTeamName;
    const currentId = teamType === "home" ? fixture.homeTeamId : fixture.awayTeamId;

    const searchQuery = bulkSchoolSearchQueries[dropdownKey] || "";
    const isOpen = activeBulkSchoolDropdown === dropdownKey;

    const filtered = searchQuery
      ? schools.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : schools;

    return (
      <Popover open={isOpen} onOpenChange={(open) => {
        setActiveBulkSchoolDropdown(open ? dropdownKey : null);
        if (open) {
          setBulkSchoolSearchQueries(prev => ({ ...prev, [dropdownKey]: "" }));
        }
      }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className={cn(
              "w-full justify-between h-7 text-xs px-1",
              !currentId && "border-amber-400"
            )}
          >
            <span className="truncate">
              {currentId ? getSchoolName(currentId) : currentName || "Select..."}
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
                setBulkSchoolSearchQueries(prev => ({ ...prev, [dropdownKey]: val }));
              }}
            />
            <CommandList>
              <CommandGroup>
                {filtered.slice(0, 10).map((school) => (
                  <CommandItem
                    key={school.id}
                    value={school.id}
                    onSelect={() => {
                      updateBulkFixture(sectionIndex, fixtureIndex, nameField, school.name);
                      updateBulkFixture(sectionIndex, fixtureIndex, idField, school.id);
                      setActiveBulkSchoolDropdown(null);
                      setBulkSchoolSearchQueries(prev => ({ ...prev, [dropdownKey]: "" }));
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentId === school.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{school.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              {searchQuery && !filtered.some(s =>
                s.name.toLowerCase() === searchQuery.toLowerCase()
              ) && (
                <CommandGroup>
                  <CommandItem
                    value={`create-bulk-${dropdownKey}-${searchQuery}`}
                    onSelect={async () => {
                      const newId = await createNewSchool(searchQuery, bulkResult?.province || undefined);
                      if (newId) {
                        updateBulkFixture(sectionIndex, fixtureIndex, nameField, searchQuery.trim());
                        updateBulkFixture(sectionIndex, fixtureIndex, idField, newId);
                        setActiveBulkSchoolDropdown(null);
                        setBulkSchoolSearchQueries(prev => ({ ...prev, [dropdownKey]: "" }));
                      }
                    }}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Create "{searchQuery}" as new school</span>
                  </CommandItem>
                </CommandGroup>
              )}
              {filtered.length === 0 && !searchQuery && (
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

  // === Render Bulk Review ===

  const renderBulkReview = () => {
    if (!bulkResult) return null;

    const matchedSchools = bulkResult.schoolSections.filter(s => s.schoolId).length;
    const unmatchedSchools = bulkResult.schoolSections.filter(s => !s.schoolId).length;

    return (
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        {/* Summary Bar */}
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/50 border">
          <Badge variant="secondary" className="gap-1">
            <Upload className="h-3 w-3" />
            {bulkResult.totalFixtures} fixtures
          </Badge>
          {bulkResult.province && (
            <Badge variant="outline">{bulkResult.province}</Badge>
          )}
          <Select
            value={bulkResult.year}
            onValueChange={(val) => {
              setBulkResult(prev => {
                if (!prev) return prev;
                const yearNum = parseInt(val);
                const updated = { ...prev, year: val };
                // Update all fixtures' year and matchDate year
                updated.schoolSections = prev.schoolSections.map(section => ({
                  ...section,
                  fixtures: section.fixtures.map(f => {
                    const oldDate = f.matchDate ? new Date(f.matchDate) : null;
                    let newMatchDate = f.matchDate;
                    if (oldDate) {
                      oldDate.setFullYear(yearNum);
                      newMatchDate = oldDate.toISOString();
                    }
                    return {
                      ...f,
                      year: val,
                      matchDate: newMatchDate,
                      result: yearNum >= UPCOMING_YEAR_THRESHOLD ? "upcoming" as const : f.result,
                    };
                  }),
                }));
                return updated;
              });
            }}
          >
            <SelectTrigger className="h-6 w-[80px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {matchedSchools} matched
          </Badge>
          {unmatchedSchools > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {unmatchedSchools} unmatched
            </Badge>
          )}
          {bulkResult.duplicates > 0 && (
            <Badge variant="outline" className="text-muted-foreground">
              {bulkResult.duplicates} duplicates removed
            </Badge>
          )}
        </div>

        {/* School Sections */}
        <div className="flex-1 overflow-auto space-y-2">
          {bulkResult.schoolSections.map((section, sectionIndex) => {
            const isExpanded = expandedSections.has(section.schoolName);
            const hasFixtures = section.fixtures.length > 0;

            return (
              <div key={section.schoolName} className="border rounded-lg overflow-hidden">
                {/* Section Header */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.schoolName)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                    <span className="font-semibold text-sm">{section.schoolName}</span>
                    {section.schoolId ? (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Matched
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <AlertTriangle className="h-3 w-3" /> New School
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {section.fixtures.length} match{section.fixtures.length !== 1 ? "es" : ""}
                  </span>
                </button>

                {/* Section Content */}
                {isExpanded && hasFixtures && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/20">
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-[80px]">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Home</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground w-[80px]">Score</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Away</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground w-[90px]">Result</th>
                          <th className="px-3 py-2 w-[40px]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.fixtures.map((fixture, fixtureIndex) => (
                          <tr 
                            key={fixture.id} 
                            className={cn(
                              "border-b last:border-0 hover:bg-muted/20",
                              fixture.isCancelled && "bg-amber-50 dark:bg-amber-950/20",
                            )}
                          >
                            <td className="px-3 py-2">
                              <Input
                                value={fixture.matchDate ? format(new Date(fixture.matchDate), "dd MMM") : ""}
                                onChange={(e) => {
                                  // Try to parse date like "09 Mar"
                                  const val = e.target.value.trim();
                                  const match = val.match(/^(\d{1,2})\s+([A-Za-z]{3})$/);
                                  if (match) {
                                    const months: Record<string, number> = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
                                    const m = months[match[2].toLowerCase()];
                                    if (m !== undefined) {
                                      const yr = parseInt(bulkResult?.year || "2025");
                                      const d = new Date(yr, m, parseInt(match[1]), 14, 0, 0);
                                      updateBulkFixture(sectionIndex, fixtureIndex, "matchDate", d.toISOString());
                                    }
                                  }
                                }}
                                className="h-7 text-xs w-[70px] px-1"
                                placeholder="DD MMM"
                              />
                            </td>
                            <td className="px-3 py-2">
                              {renderBulkSchoolCombobox(sectionIndex, fixtureIndex, "home", fixture)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {fixture.isCancelled ? (
                                <span className="text-xs text-amber-600 font-medium">CXL</span>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <Input
                                    value={fixture.homeAway === "home" ? fixture.scoreFor : fixture.scoreAgainst}
                                    onChange={(e) => {
                                      const field = fixture.homeAway === "home" ? "scoreFor" : "scoreAgainst";
                                      updateBulkFixture(sectionIndex, fixtureIndex, field, e.target.value);
                                    }}
                                    className="h-7 text-xs w-[40px] px-1 text-center font-mono"
                                  />
                                  <span className="text-xs text-muted-foreground">-</span>
                                  <Input
                                    value={fixture.homeAway === "home" ? fixture.scoreAgainst : fixture.scoreFor}
                                    onChange={(e) => {
                                      const field = fixture.homeAway === "home" ? "scoreAgainst" : "scoreFor";
                                      updateBulkFixture(sectionIndex, fixtureIndex, field, e.target.value);
                                    }}
                                    className="h-7 text-xs w-[40px] px-1 text-center font-mono"
                                  />
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {renderBulkSchoolCombobox(sectionIndex, fixtureIndex, "away", fixture)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Select
                                value={fixture.result}
                                onValueChange={(val) => updateBulkFixture(sectionIndex, fixtureIndex, "result", val)}
                              >
                                <SelectTrigger className="h-7 text-xs w-[80px]">
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
                            </td>
                            <td className="px-3 py-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => removeBulkFixture(sectionIndex, fixtureIndex)}
                              >
                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Upload Historical Fixtures
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="bulk-mode" className="text-xs text-muted-foreground cursor-pointer">
                Bulk Upload
              </Label>
              <Switch
                id="bulk-mode"
                checked={isBulkMode}
                onCheckedChange={(checked) => {
                  setIsBulkMode(checked);
                  setErrors([]);
                }}
              />
            </div>
          </div>
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
        ) : isBulkMode ? (
          /* === BULK UPLOAD MODE === */
          <div className="flex-1 flex flex-col overflow-hidden gap-3">
            {!bulkResult ? (
              /* Step 1: Paste */
              <div className="flex-1 flex flex-col gap-3">
                <Textarea
                  placeholder={`Paste province-wide results here...

Expected format:

KZN Schoolboy Rugby Results 2025

Clifton

Date Home Team Home Score Away Score Away Team Festival
09 Mar Clifton 43 0 KZN Development
16 Mar Maritzburg College 83 10 Clifton
...

Durban HS

Date Home Team Home Score Away Score Away Team Festival
16 Mar Kearsney 0 23 Durban HS
...`}
                  value={bulkPasteText}
                  onChange={(e) => setBulkPasteText(e.target.value)}
                  className="flex-1 min-h-[300px] font-mono text-xs"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground max-w-md">
                    Include the province/year header, then each school on its own line followed by fixture rows. Scores act as anchors to split team names.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBulkPasteText("")}
                      disabled={!bulkPasteText}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={parseBulkData}
                      disabled={!bulkPasteText.trim()}
                      className="gap-1"
                    >
                      <ClipboardPaste className="h-3 w-3" />
                      Parse Data
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Step 2: Review */
              <>
                {renderBulkReview()}

                {/* Error Display */}
                {errors.length > 0 && (
                  <Alert variant="destructive">
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

                <DialogFooter className="pt-3 border-t">
                  <div className="flex items-center justify-between w-full">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setBulkResult(null)}
                    >
                      ← Back to Paste
                    </Button>
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
                        onClick={handleBulkSubmit}
                        disabled={loading || bulkResult.totalFixtures === 0}
                        className="gap-2"
                      >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        <Upload className="h-4 w-4" />
                        Upload {bulkResult.totalFixtures} Fixture{bulkResult.totalFixtures !== 1 ? "s" : ""}
                      </Button>
                    </div>
                  </div>
                </DialogFooter>
              </>
            )}
          </div>
        ) : (
          /* === SINGLE SCHOOL MODE (unchanged) === */
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
