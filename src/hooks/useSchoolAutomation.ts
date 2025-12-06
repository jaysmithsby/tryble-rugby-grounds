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

function parseWebhookOutput(output: string): ParsedSchoolData {
  const result: ParsedSchoolData = {};
  
  const lines = output.split('\n');
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const label = line.substring(0, colonIndex).trim().toLowerCase();
    const value = line.substring(colonIndex + 1).trim();
    
    // Skip unclear or empty values
    if (!value || value.toLowerCase() === 'unclear' || value === '') continue;
    
    switch (label) {
      case 'school name':
        result.name = value;
        break;
      case 'nickname':
        result.nickname = value;
        break;
      case 'province':
        // Match province from the list (case-insensitive)
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
        if (value.startsWith('#')) {
          result.primary_color = value;
        }
        break;
      case 'secondary uniform colour (hex)':
        if (value.startsWith('#')) {
          result.secondary_color = value;
        }
        break;
      case 'tertiary colour (hex)':
        // We don't have a tertiary color field, ignore for now
        break;
    }
  }
  
  // Check for Rugby Trivia section (multi-line)
  const triviaMatch = output.match(/Rugby Trivia:\s*\n?([\s\S]*?)(?:\n\n|$)/i);
  if (triviaMatch && triviaMatch[1]) {
    const triviaText = triviaMatch[1].trim();
    if (triviaText && triviaText.toLowerCase() !== 'unclear') {
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
      
      // Handle array response with single object
      if (Array.isArray(data) && data.length > 0 && data[0].output) {
        const parsed = parseWebhookOutput(data[0].output);
        
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
      } else {
        toast({
          title: "No data found",
          description: "No data found. Please fill manually.",
          variant: "destructive",
        });
        return null;
      }
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
