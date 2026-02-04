import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

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

interface ParsedSchoolData {
  name?: string;
  nickname?: string;
  province?: string;
  website?: string;
  main_rival?: string;
  established_year?: string;
  springboks_count?: string;
  motto?: string;
  primary_color?: string;
  secondary_color?: string;
  trivia_fact?: string;
}

// Extract hex color from value like "#002060 (Navy Blue)" -> "#002060"
function extractHexColor(value: string): string | null {
  const match = value.match(/#[A-Fa-f0-9]{6}/);
  return match ? match[0] : null;
}

// Extract number from value like "39 (confirmed from multiple...)" -> "39"
function extractNumber(value: string): string | null {
  const match = value.match(/^\d+/);
  return match ? match[0] : null;
}

// Check if value is valid (not empty, unclear, etc.)
function isValidValue(value: unknown): boolean {
  if (!value || typeof value !== 'string') return false;
  const v = value.trim().toLowerCase();
  return v !== '' && v !== 'unclear' && !v.startsWith('unclear');
}

// Parse JSON format response (new format)
function parseJsonResponse(item: Record<string, unknown>): ParsedSchoolData {
  const result: ParsedSchoolData = {};
  
  // Map both camelCase and space-separated keys to our schema (snake_case)
  const keyMappings: Record<string, keyof ParsedSchoolData> = {
    // camelCase format (from n8n)
    'schoolName': 'name',
    'nickname': 'nickname',
    'province': 'province',
    'website': 'website',
    'mainRival': 'main_rival',
    'establishedYear': 'established_year',
    'numberOfSpringboks': 'springboks_count',
    'schoolMotto': 'motto',
    'primaryColourHex': 'primary_color',
    'secondaryColourHex': 'secondary_color',
    'rugbyTrivia': 'trivia_fact',
    // Space-separated format (legacy)
    'School Name': 'name',
    'Nickname': 'nickname',
    'Province': 'province',
    'Website': 'website',
    'Main Rival': 'main_rival',
    'Main Rival (Derby)': 'main_rival',
    'Established Year': 'established_year',
    'Number of Springboks': 'springboks_count',
    'School Motto': 'motto',
    'Primary uniform colour (HEX)': 'primary_color',
    'Secondary uniform colour (HEX)': 'secondary_color',
    'Tertiary colour (HEX)': 'primary_color',
    'Rugby Trivia': 'trivia_fact',
  };

  for (const [key, value] of Object.entries(item)) {
    const mappedKey = keyMappings[key];
    if (mappedKey && isValidValue(value)) {
      const strValue = String(value);
      
      if (mappedKey === 'primary_color' || mappedKey === 'secondary_color') {
        const color = extractHexColor(strValue);
        if (color) result[mappedKey] = color;
      } else if (mappedKey === 'established_year' || mappedKey === 'springboks_count') {
        const num = extractNumber(strValue);
        if (num) result[mappedKey] = num;
      } else if (mappedKey === 'province') {
        const normalizedProvince = PROVINCES.find(p => 
          p.toLowerCase() === strValue.toLowerCase() || 
          strValue.toLowerCase().includes(p.toLowerCase())
        );
        if (normalizedProvince) result[mappedKey] = normalizedProvince;
      } else {
        result[mappedKey] = strValue;
      }
    }
  }

  return result;
}

// Parse text-based output format (legacy format)
function parseTextOutput(output: string): ParsedSchoolData {
  const result: ParsedSchoolData = {};
  
  const lines = output.split('\n');
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const label = line.substring(0, colonIndex).trim().toLowerCase();
    const value = line.substring(colonIndex + 1).trim();
    
    if (!isValidValue(value)) continue;
    
    switch (label) {
      case 'school name':
        result.name = value;
        break;
      case 'nickname':
        result.nickname = value;
        break;
      case 'province':
        const matchedProvince = PROVINCES.find(
          p => p.toLowerCase() === value.toLowerCase()
        );
        if (matchedProvince) {
          result.province = matchedProvince;
        }
        break;
      case 'website':
        result.website = value;
        break;
      case 'main rival':
        result.main_rival = value;
        break;
      case 'established year':
        const year = parseInt(value);
        if (!isNaN(year) && year > 1000 && year <= new Date().getFullYear()) {
          result.established_year = value;
        }
        break;
      case 'number of springboks':
        const count = parseInt(value);
        if (!isNaN(count) && count >= 0) {
          result.springboks_count = value;
        }
        break;
      case 'school motto':
        result.motto = value;
        break;
      case 'primary uniform colour (hex)':
        const primaryHex = extractHexColor(value);
        if (primaryHex) {
          result.primary_color = primaryHex;
        }
        break;
      case 'secondary uniform colour (hex)':
        const secondaryHex = extractHexColor(value);
        if (secondaryHex) {
          result.secondary_color = secondaryHex;
        }
        break;
    }
  }
  
  // Check for Rugby Trivia section (multi-line)
  const triviaMatch = output.match(/Rugby Trivia:\s*\n?([\s\S]*?)(?:\n\n|$)/i);
  if (triviaMatch && triviaMatch[1]) {
    const triviaText = triviaMatch[1].trim();
    if (isValidValue(triviaText)) {
      result.trivia_fact = triviaText;
    }
  }
  
  return result;
}

export function useSchoolAutomation() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [schoolNameInput, setSchoolNameInput] = useState("");

  const fetchSchoolData = async (schoolName: string): Promise<ParsedSchoolData | null> => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('automate-school', {
        body: { school_name: schoolName },
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      logger.debug("Automation response received", {
        dataType: typeof data,
        isArray: Array.isArray(data),
        keyCount: data && typeof data === 'object' ? Object.keys(data).length : 0,
      });
      
      // Handle response - the edge function now returns a single object (not array)
      let responseObj: Record<string, unknown> | null = null;
      
      if (Array.isArray(data) && data.length > 0) {
        responseObj = data[0] as Record<string, unknown>;
      } else if (data && typeof data === 'object' && !Array.isArray(data)) {
        responseObj = data as Record<string, unknown>;
      }
      
      if (!responseObj) {
        logger.warn("Could not extract response object from automation data");
        toast({
          title: "No data found",
          description: "No data found. Please fill manually.",
          variant: "destructive",
        });
        return null;
      }
      
      logger.debug("Response object structure", { keys: Object.keys(responseObj) });
      
      let parsed: ParsedSchoolData;
      
      // Check if it's JSON format (camelCase or space-separated keys)
      if ("School Name" in responseObj || "schoolName" in responseObj) {
        logger.debug("Using JSON format parser");
        parsed = parseJsonResponse(responseObj);
      } 
      // Check if it's the legacy text output format
      else if ("output" in responseObj && typeof responseObj.output === 'string') {
        logger.debug("Using text output parser");
        parsed = parseTextOutput(responseObj.output);
      } 
      else {
        logger.debug("Trying JSON parser for unknown format", { keys: Object.keys(responseObj) });
        parsed = parseJsonResponse(responseObj);
      }
      
      logger.debug("Automation parsing complete", { fieldCount: Object.keys(parsed).length });
      
      if (Object.keys(parsed).length === 0) {
        toast({
          title: "No data found",
          description: "No data found. Please fill manually.",
          variant: "destructive",
        });
        return null;
      }
      
      toast({
        title: "Success",
        description: "Fields auto-filled from automation!",
      });
      
      return parsed;
    } catch (error) {
      logger.error("School automation request failed", { error: error instanceof Error ? error.message : String(error) });
      toast({
        title: "Automation failed",
        description: "Automation request failed. Try again later.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const openPrompt = (initialName?: string) => {
    setSchoolNameInput(initialName || "");
    setShowPrompt(true);
  };

  const closePrompt = () => {
    setShowPrompt(false);
    setSchoolNameInput("");
  };

  return {
    isLoading,
    showPrompt,
    schoolNameInput,
    setSchoolNameInput,
    fetchSchoolData,
    openPrompt,
    closePrompt,
  };
}
