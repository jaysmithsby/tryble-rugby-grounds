// School completeness score calculation utility

export interface SchoolFieldWeights {
  name: number;
  province: number;
  school_type: number;
  nickname: number;
  main_rival: number;
  motto: number;
  website: number;
  established_year: number;
  springboks_count: number;
  emblem_url: number;
  jersey_url: number;
  logo_url: number;
}

export const FIELD_WEIGHTS: SchoolFieldWeights = {
  name: 10,
  province: 10,
  school_type: 10,
  nickname: 5,
  main_rival: 5,
  motto: 5,
  website: 5,
  established_year: 10,
  springboks_count: 5,
  emblem_url: 10,
  jersey_url: 10,
  logo_url: 5,
};

export const FIELD_LABELS: Record<keyof SchoolFieldWeights, string> = {
  name: "School Name",
  province: "Province",
  school_type: "School Type",
  nickname: "Nickname",
  main_rival: "Main Rival",
  motto: "Motto",
  website: "Website",
  established_year: "Year Established",
  springboks_count: "Number of Springboks",
  emblem_url: "Emblem/Crest Image",
  jersey_url: "Jersey Image",
  logo_url: "Logo (from request)",
};

export interface SchoolData {
  name?: string | null;
  province?: string | null;
  school_type?: string | null;
  nickname?: string | null;
  main_rival?: string | null;
  motto?: string | null;
  website?: string | null;
  established_year?: number | string | null;
  springboks_count?: number | string | null;
  emblem_url?: string | null;
  jersey_url?: string | null;
  logo_url?: string | null;
  icon_url?: string | null;
}

export function calculateCompleteness(school: SchoolData): {
  score: number;
  maxScore: number;
  percentage: number;
  missingFields: (keyof SchoolFieldWeights)[];
  filledFields: (keyof SchoolFieldWeights)[];
} {
  let score = 0;
  const maxScore = Object.values(FIELD_WEIGHTS).reduce((a, b) => a + b, 0);
  const missingFields: (keyof SchoolFieldWeights)[] = [];
  const filledFields: (keyof SchoolFieldWeights)[] = [];

  const checkField = (key: keyof SchoolFieldWeights, value: any) => {
    const hasValue = value !== null && value !== undefined && value !== "" && value !== 0;
    if (hasValue) {
      score += FIELD_WEIGHTS[key];
      filledFields.push(key);
    } else {
      missingFields.push(key);
    }
  };

  checkField("name", school.name);
  checkField("province", school.province);
  checkField("school_type", school.school_type);
  checkField("nickname", school.nickname);
  checkField("main_rival", school.main_rival);
  checkField("motto", school.motto);
  checkField("website", school.website);
  checkField("established_year", school.established_year);
  checkField("springboks_count", school.springboks_count);
  checkField("emblem_url", school.emblem_url || school.icon_url);
  checkField("jersey_url", school.jersey_url);
  checkField("logo_url", school.logo_url || school.emblem_url || school.icon_url);

  return {
    score,
    maxScore,
    percentage: Math.round((score / maxScore) * 100),
    missingFields,
    filledFields,
  };
}

export function getCompletenessColor(percentage: number): string {
  if (percentage >= 100) return "text-green-500";
  if (percentage >= 70) return "text-yellow-500";
  if (percentage >= 40) return "text-orange-500";
  return "text-red-500";
}

export function getCompletenessBadgeVariant(percentage: number): "default" | "secondary" | "destructive" | "outline" {
  if (percentage >= 100) return "default";
  if (percentage >= 70) return "secondary";
  return "destructive";
}
