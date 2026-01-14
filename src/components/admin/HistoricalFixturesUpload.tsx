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
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

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
  
  // Quick Paste state
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [parseInfo, setParseInfo] = useState<string | null>(null);
  
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

  // Create a new school and return its ID
  const createNewSchool = async (name: string): Promise<string | null> => {
    const trimmedName = name.trim();
    if (!trimmedName) return null;

    try {
      const slug = trimmedName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');

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

      // Add the new school to local state
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
    setRows(prev => [...prev, { ...createEmptyRow(), year: defaultYear }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(prev => prev.filter(row => row.id !== id));
      // Clear errors when a row is removed so user can retry submission
      setErrors([]);
    }
  };

  const updateRow = (id: string, field: keyof FixtureRow, value: string) => {
    setRows(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
    // Clear errors when user edits a row so they can retry submission
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
    setSubmitted(false);
    setSubmittedCount(0);
    setErrors([]);
    setPasteText("");
    setParseInfo(null);
  };

  // Normalize school name for better matching
  const normalizeSchoolName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[''`']/g, '') // Remove apostrophes
      .replace(/[^a-z0-9\s]/g, '') // Remove other punctuation
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Fuzzy match school name to existing schools
  const fuzzyMatchSchool = (name: string): { id: string; name: string } | null => {
    if (!name || !name.trim()) return null;
    
    const normalizedName = normalizeSchoolName(name);
    
    // Exact match on normalized names
    const exactMatch = schools.find(s => normalizeSchoolName(s.name) === normalizedName);
    if (exactMatch) return { id: exactMatch.id, name: exactMatch.name };
    
    // Partial match (school name contains or is contained in search)
    const partialMatch = schools.find(s => {
      const normalizedSchool = normalizeSchoolName(s.name);
      return normalizedSchool.includes(normalizedName) || normalizedName.includes(normalizedSchool);
    });
    if (partialMatch) return { id: partialMatch.id, name: partialMatch.name };
    
    // Word-based scoring match
    const searchWords = normalizedName.split(' ').filter(w => w.length > 2);
    if (searchWords.length === 0) return null;
    
    let bestMatch: School | null = null;
    let bestScore = 0;
    
    for (const school of schools) {
      const schoolWords = normalizeSchoolName(school.name).split(' ');
      const matchingWords = searchWords.filter(sw => 
        schoolWords.some(scw => scw.includes(sw) || sw.includes(scw))
      );
      const score = matchingWords.length / searchWords.length;
      if (score > bestScore && score >= 0.5) {
        bestScore = score;
        bestMatch = school;
      }
    }
    
    if (bestMatch) return { id: bestMatch.id, name: bestMatch.name };
    
    return null;
  };

  // Parse concatenated data (no tabs) using date patterns as anchors
  const parseConcatenatedData = (text: string): FixtureRow[] => {
    const primarySchoolName = getSchoolName(primarySchoolId);
    const normalizedPrimary = normalizeSchoolName(primarySchoolName);
    
    // Remove headers if present
    let dataText = text;
    if (text.toLowerCase().includes('match_date')) {
      // Find where first date appears (after headers)
      const firstDateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
      if (firstDateMatch && firstDateMatch.index !== undefined) {
        dataText = text.substring(firstDateMatch.index);
      }
    }
    
    // Split into chunks using date as delimiter
    // Each chunk starts with a date: YYYY-MM-DD
    const datePattern = /(\d{4}-\d{2}-\d{2})/g;
    const parts: string[] = [];
    let lastIndex = 0;
    let match;
    
    while ((match = datePattern.exec(dataText)) !== null) {
      if (match.index > lastIndex) {
        // Add the text before this date to the previous chunk
        if (parts.length > 0) {
          parts[parts.length - 1] += dataText.substring(lastIndex, match.index);
        }
      }
      // Start new chunk with this date
      parts.push(match[1]);
      lastIndex = match.index + match[1].length;
    }
    // Add remaining text to last chunk
    if (parts.length > 0 && lastIndex < dataText.length) {
      parts[parts.length - 1] += dataText.substring(lastIndex);
    }
    
    const parsedRows: FixtureRow[] = [];
    
    for (const part of parts) {
      // Extract date (first 10 chars should be the date)
      const dateMatch = part.match(/^(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) continue;
      
      const dateStr = dateMatch[1];
      const remainder = part.substring(10);
      
      // Parse the date
      let matchDate = "";
      let year = defaultYear;
      try {
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          parsedDate.setHours(14, 0, 0, 0);
          matchDate = parsedDate.toISOString();
          year = parsedDate.getFullYear().toString();
        }
      } catch (e) {
        // Keep defaults
      }
      
      // Find "Rugby" keyword to split schools section from rest
      const rugbyIndex = remainder.toLowerCase().indexOf('rugby');
      if (rugbyIndex === -1) continue;
      
      const schoolsSection = remainder.substring(0, rugbyIndex);
      const afterRugby = remainder.substring(rugbyIndex + 5);
      
      // Find Home/Away/Neutral keyword
      const haMatch = afterRugby.match(/(Home|Away|Neutral)/i);
      let homeAway: "home" | "away" = "home";
      
      if (haMatch) {
        const haValue = haMatch[1].toLowerCase();
        // "Neutral" and "Away" both mean primary school is away
        homeAway = (haValue === 'away' || haValue === 'neutral') ? "away" : "home";
      }
      
      // Now extract opponent from schools section
      // The schools section contains: homeSchool + awaySchool
      // We need to find the primary school and the other one is the opponent
      let opponentName = "";
      
      // Try to find where primary school name appears in the schools section
      const normalizedSchools = normalizeSchoolName(schoolsSection);
      
      // Check if we can find the primary school name
      if (normalizedSchools.includes(normalizedPrimary)) {
        // Split around the primary school name
        const primaryIndex = normalizedSchools.indexOf(normalizedPrimary);
        const beforePrimary = schoolsSection.substring(0, primaryIndex).trim();
        const afterPrimary = schoolsSection.substring(primaryIndex + primarySchoolName.length).trim();
        
        // The opponent is the non-empty part
        opponentName = (beforePrimary || afterPrimary).trim();
      } else {
        // Primary school not found in text - use home/away to determine which part
        // Split by trying to find known school names
        let foundSchool1: { id: string; name: string } | null = null;
        let foundSchool2: { id: string; name: string } | null = null;
        
        // Try to match each school from the database
        for (const school of schools) {
          if (school.id === primarySchoolId) continue;
          const normalizedSchool = normalizeSchoolName(school.name);
          if (normalizedSchools.includes(normalizedSchool)) {
            if (!foundSchool1) {
              foundSchool1 = { id: school.id, name: school.name };
            } else if (!foundSchool2) {
              foundSchool2 = { id: school.id, name: school.name };
            }
          }
        }
        
        // Use the first found school as opponent
        if (foundSchool1) {
          opponentName = foundSchool1.name;
        } else {
          // Fallback: take the whole schools section as opponent name
          // and try fuzzy matching
          opponentName = schoolsSection.trim();
        }
      }
      
      // Clean up opponent name
      opponentName = opponentName.replace(/^\s*['']?/, '').replace(/['']?\s*$/, '').trim();
      
      // Try to match opponent to existing school
      const matchedSchool = fuzzyMatchSchool(opponentName);
      
      parsedRows.push({
        id: generateId(),
        year,
        matchDate,
        homeAway,
        opponentName: matchedSchool?.name || opponentName,
        opponentId: matchedSchool?.id || "",
        result: "won",
        scoreFor: "",
        scoreAgainst: "",
        tournamentId: "",
      });
    }
    
    return parsedRows;
  };

  // Parse markdown table format: | No | Date | Union | Opponent | Venue | Result | PF | PA | Notes |
  const parseMarkdownTableData = (text: string): FixtureRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const parsedRows: FixtureRow[] = [];
    
    // Find header line
    let headerIndex = -1;
    let headers: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('|') && (line.toLowerCase().includes('date') || line.toLowerCase().includes('opponent'))) {
        headerIndex = i;
        headers = line.split('|').map(h => h.trim().toLowerCase()).filter(h => h);
        break;
      }
    }
    
    if (headerIndex === -1) return [];
    
    // Find column indices
    const colIndex = {
      no: headers.findIndex(h => h === 'no' || h === '#'),
      date: headers.findIndex(h => h === 'date'),
      union: headers.findIndex(h => h === 'union'),
      opponent: headers.findIndex(h => h === 'opponent'),
      venue: headers.findIndex(h => h === 'venue'),
      result: headers.findIndex(h => h === 'result'),
      pf: headers.findIndex(h => h === 'pf' || h === 'for' || h === 'points for'),
      pa: headers.findIndex(h => h === 'pa' || h === 'against' || h === 'points against'),
      notes: headers.findIndex(h => h === 'notes' || h === 'tournament'),
    };
    
    // Parse data rows (skip header and separator lines)
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip separator lines (| -- | -- | etc.)
      if (line.includes('--') || line.includes('---')) continue;
      
      // Skip empty lines
      if (!line.includes('|')) continue;
      
      const values = line.split('|').map(v => v.trim()).filter((v, idx, arr) => {
        // Filter out empty first/last elements from | borders
        return !(idx === 0 && v === '') && !(idx === arr.length - 1 && v === '');
      });
      
      // Re-split properly to handle the pipe borders
      const allValues = line.split('|').map(v => v.trim());
      // Remove empty first and last if they exist
      if (allValues[0] === '') allValues.shift();
      if (allValues[allValues.length - 1] === '') allValues.pop();
      
      if (allValues.length < 4) continue; // Need at least date, opponent, venue, result
      
      // Skip if first value is separator
      if (allValues[0].includes('-')) continue;
      
      // Parse date (format: Mon.03Mar, Fri.07Mar, etc.)
      let matchDate = "";
      let year = defaultYear;
      const dateValue = colIndex.date >= 0 ? allValues[colIndex.date] : allValues[1];
      
      if (dateValue) {
        // Parse format: Mon.03Mar or Sat.15Mar
        const dateMatch = dateValue.match(/(?:\w+\.)?(\d{1,2})([A-Za-z]{3})/);
        if (dateMatch) {
          const day = parseInt(dateMatch[1], 10);
          const monthStr = dateMatch[2].toLowerCase();
          const months: Record<string, number> = {
            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
            'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
          };
          const month = months[monthStr];
          if (month !== undefined) {
            const parsedDate = new Date(parseInt(defaultYear), month, day, 14, 0, 0);
            if (!isNaN(parsedDate.getTime())) {
              matchDate = parsedDate.toISOString();
              year = defaultYear;
            }
          }
        }
      }
      
      // Parse opponent
      const opponentName = colIndex.opponent >= 0 ? allValues[colIndex.opponent] : allValues[3];
      const matchedSchool = fuzzyMatchSchool(opponentName);
      
      // Parse venue: H = Home, A = Away, F = Festival/Neutral
      const venueValue = colIndex.venue >= 0 ? allValues[colIndex.venue] : allValues[4];
      let homeAway: "home" | "away" = "home";
      if (venueValue) {
        const v = venueValue.toUpperCase();
        if (v === 'A' || v === 'AWAY') {
          homeAway = "away";
        } else if (v === 'F' || v === 'FESTIVAL' || v === 'N' || v === 'NEUTRAL') {
          homeAway = "away"; // Festival/Neutral = away for the primary school
        }
        // H or HOME = home (default)
      }
      
      // Parse result: Won, Lost, Drew
      const resultValue = colIndex.result >= 0 ? allValues[colIndex.result] : allValues[5];
      let result: "won" | "lost" | "drew" = "won";
      if (resultValue) {
        const r = resultValue.toLowerCase();
        if (r === 'lost' || r === 'l') {
          result = "lost";
        } else if (r === 'drew' || r === 'draw' || r === 'd') {
          result = "drew";
        }
        // Won or W = won (default)
      }
      
      // Parse scores: PF (Points For) and PA (Points Against)
      const pfValue = colIndex.pf >= 0 ? allValues[colIndex.pf] : allValues[6];
      const paValue = colIndex.pa >= 0 ? allValues[colIndex.pa] : allValues[7];
      const scoreFor = pfValue ? pfValue.replace(/\D/g, '') : "";
      const scoreAgainst = paValue ? paValue.replace(/\D/g, '') : "";
      
      // Parse notes/tournament
      const notesValue = colIndex.notes >= 0 ? allValues[colIndex.notes] : (allValues[8] || "");
      let tournamentId = "";
      if (notesValue) {
        // Try to match tournament from notes
        const matchedTournament = tournaments.find(t => 
          normalizeSchoolName(t.name).includes(normalizeSchoolName(notesValue)) ||
          normalizeSchoolName(notesValue).includes(normalizeSchoolName(t.name))
        );
        if (matchedTournament) {
          tournamentId = matchedTournament.id;
        }
      }
      
      parsedRows.push({
        id: generateId(),
        year,
        matchDate,
        homeAway,
        opponentName: matchedSchool?.name || opponentName,
        opponentId: matchedSchool?.id || "",
        result,
        scoreFor,
        scoreAgainst,
        tournamentId,
      });
    }
    
    return parsedRows;
  };

  // Parse tab-separated data
  const parseTabSeparatedData = (text: string): FixtureRow[] => {
    const lines = text.split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split('\t').map(h => h.trim());
    
    const colIndex = {
      matchDate: headers.findIndex(h => h.includes('match_date') || h.includes('date')),
      homeSchool: headers.findIndex(h => h.includes('home_school') || h === 'home'),
      awaySchool: headers.findIndex(h => h.includes('away_school') || h === 'away'),
      homeAway: headers.findIndex(h => h.includes('home_away') || h === 'h/a'),
      result: headers.findIndex(h => h === 'result'),
      pf: headers.findIndex(h => h === 'pf' || h === 'for'),
      pa: headers.findIndex(h => h === 'pa' || h === 'against'),
    };

    const parsedRows: FixtureRow[] = [];
    const primarySchoolName = getSchoolName(primarySchoolId)?.toLowerCase() || "";

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t').map(v => v.trim());
      if (values.length < 2) continue;

      let matchDate = "";
      let year = defaultYear;
      if (colIndex.matchDate >= 0 && values[colIndex.matchDate]) {
        try {
          const parsedDate = new Date(values[colIndex.matchDate]);
          if (!isNaN(parsedDate.getTime())) {
            parsedDate.setHours(14, 0, 0, 0);
            matchDate = parsedDate.toISOString();
            year = parsedDate.getFullYear().toString();
          }
        } catch (e) {}
      }

      let homeAway: "home" | "away" = "home";
      let opponentName = "";
      
      if (colIndex.homeAway >= 0) {
        const haValue = values[colIndex.homeAway]?.toLowerCase() || "";
        homeAway = (haValue.includes('away') || haValue === 'a' || haValue === 'neutral') ? "away" : "home";
      }

      if (colIndex.homeSchool >= 0 && colIndex.awaySchool >= 0) {
        const homeSchoolName = values[colIndex.homeSchool] || "";
        const awaySchoolName = values[colIndex.awaySchool] || "";
        
        if (homeSchoolName.toLowerCase().includes(primarySchoolName) || 
            primarySchoolName.includes(homeSchoolName.toLowerCase())) {
          opponentName = awaySchoolName;
          homeAway = "home";
        } else if (awaySchoolName.toLowerCase().includes(primarySchoolName) || 
                   primarySchoolName.includes(awaySchoolName.toLowerCase())) {
          opponentName = homeSchoolName;
          homeAway = "away";
        } else {
          opponentName = homeAway === "home" ? awaySchoolName : homeSchoolName;
        }
      }

      // Parse result if available
      let result: "won" | "lost" | "drew" = "won";
      if (colIndex.result >= 0 && values[colIndex.result]) {
        const r = values[colIndex.result].toLowerCase();
        if (r === 'lost' || r === 'l') result = "lost";
        else if (r === 'drew' || r === 'draw' || r === 'd') result = "drew";
      }

      // Parse scores
      const scoreFor = colIndex.pf >= 0 && values[colIndex.pf] ? values[colIndex.pf].replace(/\D/g, '') : "";
      const scoreAgainst = colIndex.pa >= 0 && values[colIndex.pa] ? values[colIndex.pa].replace(/\D/g, '') : "";

      const matchedSchool = fuzzyMatchSchool(opponentName);

      parsedRows.push({
        id: generateId(),
        year,
        matchDate,
        homeAway,
        opponentName: matchedSchool?.name || opponentName,
        opponentId: matchedSchool?.id || "",
        result,
        scoreFor,
        scoreAgainst,
        tournamentId: "",
      });
    }
    
    return parsedRows;
  };

  // Parse pasted data from clipboard - smart detection
  const parsePastedData = () => {
    if (!pasteText.trim()) {
      toast({
        title: "No data to parse",
        description: "Please paste your fixture data first",
        variant: "destructive",
      });
      return;
    }

    if (!primarySchoolId) {
      toast({
        title: "No primary school selected",
        description: "Please select the primary school first",
        variant: "destructive",
      });
      return;
    }

    const text = pasteText.trim();
    let parsedRows: FixtureRow[] = [];
    
    // Detect format and use appropriate parser
    // Check for markdown table format (pipe characters with headers like Date, Opponent, Venue, Result)
    const isMarkdownTable = text.includes('|') && 
      (text.toLowerCase().includes('opponent') || text.toLowerCase().includes('venue') || text.toLowerCase().includes('result'));
    
    if (isMarkdownTable) {
      parsedRows = parseMarkdownTableData(text);
    } else if (text.includes('\t')) {
      // Tab-separated format
      parsedRows = parseTabSeparatedData(text);
    } else {
      // Fallback - concatenated data parser
      parsedRows = parseConcatenatedData(text);
    }

    if (parsedRows.length === 0) {
      toast({
        title: "No fixtures parsed",
        description: "Could not parse any fixtures from the pasted data. Try using markdown table format with columns: Date, Opponent, Venue, Result, PF, PA, Notes",
        variant: "destructive",
      });
      return;
    }

    // Count matched vs new schools
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
                              <div className="flex flex-col">
                                <span>{school.name}</span>
                                {school.province && (
                                  <span className="text-xs text-muted-foreground">{school.province}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        {primarySearchQuery && !filteredPrimarySchools.some(s => 
                          s.name.toLowerCase() === primarySearchQuery.toLowerCase()
                        ) && (
                          <CommandGroup>
                            <CommandItem
                              value={`create-primary-${primarySearchQuery}`}
                              onSelect={handleCreatePrimarySchool}
                              className="text-primary"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              <span>Create "{primarySearchQuery}" as new school</span>
                            </CommandItem>
                          </CommandGroup>
                        )}
                        {filteredPrimarySchools.length === 0 && !primarySearchQuery && (
                          <CommandEmpty>No school found. Type to search or create new.</CommandEmpty>
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
                {rows.map((row, index) => {
                  // Parse the date for the picker
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
                              // Set time to 14:00 for the match
                              date.setHours(14, 0, 0, 0);
                              updateRow(row.id, "matchDate", date.toISOString());
                              // Also update the year to match the selected date
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
