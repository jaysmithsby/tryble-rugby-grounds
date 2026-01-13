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

  // Helper function to calculate result from scores
  const calculateResult = (scoreFor: number, scoreAgainst: number): "won" | "lost" | "drew" => {
    if (scoreFor > scoreAgainst) return "won";
    if (scoreFor < scoreAgainst) return "lost";
    return "drew";
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
      let afterHomeAway = afterRugby;
      
      if (haMatch && haMatch.index !== undefined) {
        const haValue = haMatch[1].toLowerCase();
        // "Neutral" and "Away" both mean primary school is away
        homeAway = (haValue === 'away' || haValue === 'neutral') ? "away" : "home";
        afterHomeAway = afterRugby.substring(haMatch.index + haMatch[1].length);
      }
      
      // Extract scores from afterHomeAway
      // Look for patterns like "Won 25-10", "Lost 10-25", "Drew 15-15", "Win5519", or just numbers
      let scoreFor = "";
      let scoreAgainst = "";
      let result: "won" | "lost" | "drew" = "won";
      
      console.log('[Concat Parse Debug] afterHomeAway:', afterHomeAway);
      
      // Extract score values that might be in angle brackets like <15> or plain numbers
      const extractScoreValue = (val: string): string => {
        const bracketMatch = val.match(/<(\d+)>/);
        if (bracketMatch) return bracketMatch[1];
        return val;
      };
      
      // Try to match result keyword followed by scores with separator
      const resultScoreMatch = afterHomeAway.match(/(won|lost|drew|win|loss|draw|unofficial)\s*(\d+)\s*[-–:]\s*(\d+)/i);
      // Also try result keyword with scores directly concatenated: "Win5519" or "Win 55 19"
      const resultScoreNoSepMatch = afterHomeAway.match(/(won|lost|drew|win|loss|draw|unofficial)\s*(\d{1,3})(\d{1,3})(?!\d)/i);
      // Also try result followed by <score><score> pattern
      const resultBracketMatch = afterHomeAway.match(/(won|lost|drew|win|loss|draw|unofficial)\s*<(\d+)>\s*<(\d+)>/i);
      // Try with space between scores
      const resultScoreSpaceMatch = afterHomeAway.match(/(won|lost|drew|win|loss|draw|unofficial)\s+(\d+)\s+(\d+)(?!\d)/i);
      
      if (resultScoreMatch) {
        console.log('[Concat Parse Debug] Matched with separator:', resultScoreMatch);
        const resultKeyword = resultScoreMatch[1].toLowerCase();
        scoreFor = resultScoreMatch[2];
        scoreAgainst = resultScoreMatch[3];
        
        if (resultKeyword === 'won' || resultKeyword === 'win') {
          result = "won";
        } else if (resultKeyword === 'lost' || resultKeyword === 'loss') {
          result = "lost";
        } else if (resultKeyword === 'drew' || resultKeyword === 'draw') {
          result = "drew";
        } else if (resultKeyword === 'unofficial') {
          // For unofficial, determine result from scores
          result = calculateResult(parseInt(scoreFor), parseInt(scoreAgainst));
        }
      } else if (resultBracketMatch) {
        console.log('[Concat Parse Debug] Matched bracket format:', resultBracketMatch);
        const resultKeyword = resultBracketMatch[1].toLowerCase();
        scoreFor = resultBracketMatch[2];
        scoreAgainst = resultBracketMatch[3];
        
        if (resultKeyword === 'won' || resultKeyword === 'win') {
          result = "won";
        } else if (resultKeyword === 'lost' || resultKeyword === 'loss') {
          result = "lost";
        } else if (resultKeyword === 'drew' || resultKeyword === 'draw') {
          result = "drew";
        } else {
          result = calculateResult(parseInt(scoreFor), parseInt(scoreAgainst));
        }
      } else if (resultScoreSpaceMatch) {
        console.log('[Concat Parse Debug] Matched with space:', resultScoreSpaceMatch);
        const resultKeyword = resultScoreSpaceMatch[1].toLowerCase();
        scoreFor = resultScoreSpaceMatch[2];
        scoreAgainst = resultScoreSpaceMatch[3];
        
        if (resultKeyword === 'won' || resultKeyword === 'win') {
          result = "won";
        } else if (resultKeyword === 'lost' || resultKeyword === 'loss') {
          result = "lost";
        } else if (resultKeyword === 'drew' || resultKeyword === 'draw') {
          result = "drew";
        } else {
          result = calculateResult(parseInt(scoreFor), parseInt(scoreAgainst));
        }
      } else if (resultScoreNoSepMatch) {
        // For concatenated scores like "Win5519", we need to intelligently split
        console.log('[Concat Parse Debug] Matched no separator:', resultScoreNoSepMatch);
        const resultKeyword = resultScoreNoSepMatch[1].toLowerCase();
        const combinedScores = resultScoreNoSepMatch[2] + resultScoreNoSepMatch[3];
        
        // If we have 4 digits, split 2-2; if 3 digits, try 2-1 or 1-2
        // The regex already captured them in groups 2 and 3
        scoreFor = resultScoreNoSepMatch[2];
        scoreAgainst = resultScoreNoSepMatch[3];
        
        if (resultKeyword === 'won' || resultKeyword === 'win') {
          result = "won";
        } else if (resultKeyword === 'lost' || resultKeyword === 'loss') {
          result = "lost";
        } else if (resultKeyword === 'drew' || resultKeyword === 'draw') {
          result = "drew";
        } else {
          result = calculateResult(parseInt(scoreFor), parseInt(scoreAgainst));
        }
      } else {
        // Try to match just score pattern like "25-10" or "25 - 10" or "25 10"
        const scoreOnlyMatch = afterHomeAway.match(/(\d+)\s*[-–:\s]\s*(\d+)/);
        if (scoreOnlyMatch) {
          const score1 = parseInt(scoreOnlyMatch[1]);
          const score2 = parseInt(scoreOnlyMatch[2]);
          scoreFor = scoreOnlyMatch[1];
          scoreAgainst = scoreOnlyMatch[2];
          result = calculateResult(score1, score2);
        }
      }
      
      console.log('[Concat Parse Debug] Parsed scores:', { scoreFor, scoreAgainst, result });
      
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
        result,
        scoreFor,
        scoreAgainst,
        tournamentId: "",
      });
    }
    
    return parsedRows;
  };

  // Parse tab-separated data
  const parseTabSeparatedData = (text: string): FixtureRow[] => {
    const lines = text.split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split('\t').map(h => h.trim());

    console.log('[Quick Paste Debug] Headers detected:', headers);
    console.log('[Quick Paste Debug] Raw first line:', lines[0]);
    
    // Find indices for known columns
    const colIndex = {
      matchDate: headers.findIndex(h => h.includes('match_date') || h.includes('date')),
      homeSchool: headers.findIndex(h => h.includes('home_school') || h === 'home'),
      awaySchool: headers.findIndex(h => h.includes('away_school') || h === 'away'),
      homeAway: headers.findIndex(h => h.includes('home_away') || h === 'h/a'),
      // Score columns - check various possible header names (more flexible matching)
      homeScore: headers.findIndex(h => 
        h.includes('home_score') || h.includes('home score') || h.includes('home_pts') || 
        h.includes('home pts') || h === 'hs' || h.includes('homescore')
      ),
      awayScore: headers.findIndex(h => 
        h.includes('away_score') || h.includes('away score') || h.includes('away_pts') || 
        h.includes('away pts') || h === 'as' || h.includes('awayscore')
      ),
      scoreFor: headers.findIndex(h => 
        h.includes('score_for') || h === 'for' || h.includes('pts for') || 
        h.includes('points for') || h === 'pf' || h.includes('pts_for') ||
        h.includes('points_for') || h === 'f' || h === 'scored'
      ),
      scoreAgainst: headers.findIndex(h => 
        h.includes('score_against') || h === 'against' || h === 'agst' || 
        h.includes('pts against') || h.includes('points against') || h === 'pa' || 
        h.includes('pts_against') || h.includes('points_against') || h === 'a' || h === 'conceded'
      ),
      result: headers.findIndex(h => 
        h === 'result' || h === 'outcome' || h === 'w/l/d' || h === 'w/l' || 
        h.includes('result') || h === 'wld' || h === 'won/lost'
      ),
      // Also check for score in format "score" which might contain "25-10"
      score: headers.findIndex(h => h === 'score' || h === 'final_score' || h === 'final score' || h === 'scores'),
    };

    // Auto-detect score columns by analyzing first data row for numeric values
    // Look for columns that have numeric values and aren't already identified
    const firstDataValues = lines[1]?.split('\t').map(v => v.trim()) || [];
    const numericColumns: number[] = [];
    
    firstDataValues.forEach((val, idx) => {
      // Check if this column contains a numeric value (score-like)
      const isNumeric = /^\d+$/.test(val) || /^\d+\s*[-–:]\s*\d+$/.test(val);
      const isAlreadyUsed = Object.values(colIndex).includes(idx);
      if (isNumeric && !isAlreadyUsed) {
        numericColumns.push(idx);
      }
    });

    console.log('[Quick Paste Debug] Column indices:', colIndex);
    console.log('[Quick Paste Debug] Auto-detected numeric columns:', numericColumns);
    console.log('[Quick Paste Debug] All headers with indices:', headers.map((h, i) => `${i}: "${h}"`).join(', '));
    console.log('[Quick Paste Debug] First data row:', firstDataValues);

    // If we haven't found score columns by header, try to use auto-detected numeric columns
    // Assuming the last two numeric columns are "For" and "Against"
    let autoScoreFor = -1;
    let autoScoreAgainst = -1;
    if (colIndex.scoreFor === -1 && colIndex.scoreAgainst === -1 && 
        colIndex.homeScore === -1 && colIndex.awayScore === -1 && 
        colIndex.score === -1 && numericColumns.length >= 2) {
      // Take the last two numeric columns as For and Against
      autoScoreFor = numericColumns[numericColumns.length - 2];
      autoScoreAgainst = numericColumns[numericColumns.length - 1];
      console.log('[Quick Paste Debug] Using auto-detected score columns:', autoScoreFor, autoScoreAgainst);
    }

    const parsedRows: FixtureRow[] = [];
    const primarySchoolName = getSchoolName(primarySchoolId)?.toLowerCase() || "";

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t').map(v => v.trim());
      if (values.length < 2) continue;
      
      if (i === 1) {
        console.log('[Quick Paste Debug] First row values:', values);
      }

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

      // Extract scores
      let scoreFor = "";
      let scoreAgainst = "";
      let result: "won" | "lost" | "drew" = "won";

      // Log score column detection for first row
      if (i === 1) {
        console.log('[Quick Paste Debug] Score column indices:', {
          scoreFor: colIndex.scoreFor,
          scoreAgainst: colIndex.scoreAgainst,
          homeScore: colIndex.homeScore,
          awayScore: colIndex.awayScore,
          result: colIndex.result,
          score: colIndex.score,
          autoScoreFor,
          autoScoreAgainst,
        });
      }

      // Helper to extract numeric score from value (handles <15> format and plain numbers)
      const extractScore = (val: string | undefined): string => {
        if (!val) return "";
        // Check for angle bracket format like <15>
        const bracketMatch = val.match(/<(\d+)>/);
        if (bracketMatch) return bracketMatch[1];
        // Check for plain number
        const numMatch = val.match(/^(\d+)$/);
        if (numMatch) return numMatch[1];
        return "";
      };

      // Try to get scores from score_for/score_against columns first
      if (colIndex.scoreFor >= 0 && colIndex.scoreAgainst >= 0) {
        const forVal = values[colIndex.scoreFor];
        const againstVal = values[colIndex.scoreAgainst];
        if (i === 1) console.log('[Quick Paste Debug] scoreFor/scoreAgainst values:', forVal, againstVal);
        scoreFor = extractScore(forVal);
        scoreAgainst = extractScore(againstVal);
      }
      
      // If no score_for/score_against, try home_score/away_score and map based on homeAway
      if (!scoreFor && !scoreAgainst && colIndex.homeScore >= 0 && colIndex.awayScore >= 0) {
        const homeScoreVal = values[colIndex.homeScore];
        const awayScoreVal = values[colIndex.awayScore];
        if (i === 1) console.log('[Quick Paste Debug] homeScore/awayScore values:', homeScoreVal, awayScoreVal, 'homeAway:', homeAway);
        
        if (homeAway === "home") {
          scoreFor = extractScore(homeScoreVal);
          scoreAgainst = extractScore(awayScoreVal);
        } else {
          scoreFor = extractScore(awayScoreVal);
          scoreAgainst = extractScore(homeScoreVal);
        }
      }

      // If still no scores, try to parse a combined "score" column like "25-10"
      if (!scoreFor && !scoreAgainst && colIndex.score >= 0 && values[colIndex.score]) {
        const scoreVal = values[colIndex.score];
        if (i === 1) console.log('[Quick Paste Debug] Combined score value:', scoreVal);
        const scoreMatch = scoreVal.match(/(\d+)\s*[-–:]\s*(\d+)/);
        if (scoreMatch) {
          scoreFor = scoreMatch[1];
          scoreAgainst = scoreMatch[2];
        }
      }

      // Also check if we have individual scoreFor or scoreAgainst columns (not both)
      if (!scoreFor && colIndex.scoreFor >= 0 && values[colIndex.scoreFor]) {
        scoreFor = extractScore(values[colIndex.scoreFor]);
      }
      if (!scoreAgainst && colIndex.scoreAgainst >= 0 && values[colIndex.scoreAgainst]) {
        scoreAgainst = extractScore(values[colIndex.scoreAgainst]);
      }

      // FALLBACK: Use auto-detected numeric columns if still no scores
      if (!scoreFor && !scoreAgainst && autoScoreFor >= 0 && autoScoreAgainst >= 0) {
        const forVal = values[autoScoreFor];
        const againstVal = values[autoScoreAgainst];
        if (i === 1) console.log('[Quick Paste Debug] Using auto-detected score values:', forVal, againstVal);
        scoreFor = extractScore(forVal);
        scoreAgainst = extractScore(againstVal);
      }

      // Calculate result from scores if we have them
      if (scoreFor && scoreAgainst) {
        result = calculateResult(parseInt(scoreFor), parseInt(scoreAgainst));
        if (i === 1) console.log('[Quick Paste Debug] Calculated result:', result, 'from scores:', scoreFor, scoreAgainst);
      } else if (colIndex.result >= 0 && values[colIndex.result]) {
        // Fallback to result column if no scores
        const resultVal = values[colIndex.result].toLowerCase();
        if (i === 1) console.log('[Quick Paste Debug] Result column value:', resultVal);
        if (resultVal.includes('won') || resultVal === 'w' || resultVal === 'win') {
          result = "won";
        } else if (resultVal.includes('lost') || resultVal === 'l' || resultVal === 'lose' || resultVal === 'loss') {
          result = "lost";
        } else if (resultVal.includes('drew') || resultVal.includes('draw') || resultVal === 'd') {
          result = "drew";
        }
      }

      if (i === 1) console.log('[Quick Paste Debug] Final parsed scores:', { scoreFor, scoreAgainst, result });

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
    
    // Check if tabs exist - use tab parser
    if (text.includes('\t')) {
      parsedRows = parseTabSeparatedData(text);
    } else {
      // No tabs - use concatenated data parser
      parsedRows = parseConcatenatedData(text);
    }

    if (parsedRows.length === 0) {
      toast({
        title: "No fixtures parsed",
        description: "Could not parse any fixtures from the pasted data. Make sure dates are in YYYY-MM-DD format.",
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
