import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  
  // School Name
  if (isValidValue(item["School Name"])) {
    result.name = String(item["School Name"]).trim();
  }
  
  // Nickname
  if (isValidValue(item["Nickname"])) {
    result.nickname = String(item["Nickname"]).trim();
  }
  
  // Province
  if (isValidValue(item["Province"])) {
    const provinceValue = String(item["Province"]).trim();
    const matchedProvince = PROVINCES.find(
      p => p.toLowerCase() === provinceValue.toLowerCase()
    );
    if (matchedProvince) {
      result.province = matchedProvince;
    }
  }
  
  // Website
  if (isValidValue(item["Website"])) {
    result.website = String(item["Website"]).trim();
  }
  
  // Main Rival
  if (isValidValue(item["Main Rival"])) {
    result.main_rival = String(item["Main Rival"]).trim();
  }
  
  // Established Year
  if (isValidValue(item["Established Year"])) {
    const yearStr = extractNumber(String(item["Established Year"])) || String(item["Established Year"]).trim();
    const year = parseInt(yearStr);
    if (!isNaN(year) && year > 1000 && year <= new Date().getFullYear()) {
      result.established_year = yearStr;
    }
  }
  
  // Number of Springboks
  if (isValidValue(item["Number of Springboks"])) {
    const countStr = extractNumber(String(item["Number of Springboks"]));
    if (countStr) {
      result.springboks_count = countStr;
    }
  }
  
  // School Motto
  if (isValidValue(item["School Motto"])) {
    result.motto = String(item["School Motto"]).trim();
  }
  
  // Primary uniform colour
  if (isValidValue(item["Primary uniform colour (HEX)"])) {
    const hex = extractHexColor(String(item["Primary uniform colour (HEX)"]));
    if (hex) {
      result.primary_color = hex;
    }
  }
  
  // Secondary uniform colour
  if (isValidValue(item["Secondary uniform colour (HEX)"])) {
    const hex = extractHexColor(String(item["Secondary uniform colour (HEX)"]));
    if (hex) {
      result.secondary_color = hex;
    }
  }
  
  // Rugby Trivia
  if (isValidValue(item["Rugby Trivia"])) {
    result.trivia_fact = String(item["Rugby Trivia"]).trim();
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
      
      console.log("Automation response data:", JSON.stringify(data, null, 2));
      console.log("Data type:", typeof data);
      console.log("Is array:", Array.isArray(data));
      
      // Handle response - the edge function now returns a single object (not array)
      let responseObj: Record<string, unknown> | null = null;
      
      if (Array.isArray(data) && data.length > 0) {
        responseObj = data[0] as Record<string, unknown>;
      } else if (data && typeof data === 'object' && !Array.isArray(data)) {
        responseObj = data as Record<string, unknown>;
      }
      
      if (!responseObj) {
        console.log("Could not extract response object from:", data);
        toast({
          title: "No data found",
          description: "No data found. Please fill manually.",
          variant: "destructive",
        });
        return null;
      }
      
      console.log("Response object keys:", Object.keys(responseObj));
      
      let parsed: ParsedSchoolData;
      
      // Check if it's the new JSON format (has direct keys like "School Name")
      if ("School Name" in responseObj) {
        console.log("Using JSON format parser");
        parsed = parseJsonResponse(responseObj);
      } 
      // Check if it's the legacy text output format
      else if ("output" in responseObj && typeof responseObj.output === 'string') {
        console.log("Using text output parser");
        parsed = parseTextOutput(responseObj.output);
      } 
      else {
        console.log("Unknown format, keys found:", Object.keys(responseObj));
        toast({
          title: "No data found",
          description: "No data found. Please fill manually.",
          variant: "destructive",
        });
        return null;
      }
      
      console.log("Parsed result:", parsed);
      
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
      console.error("Automation error:", error);
      toast({
        title: "Error",
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
