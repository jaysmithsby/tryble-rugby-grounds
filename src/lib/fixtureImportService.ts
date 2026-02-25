import { supabase } from "@/integrations/supabase/client";

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface CsvFixtureRow {
  index: string;
  school_a_name: string;
  school_b_name: string;
  date_time: string;
  score_a: string;
  score_b: string;
  venue_type: string;
  venue_school: string;
  tournament_name: string;
  season: string;
  status: string;
  source_url: string;
}

interface FixtureInsert {
  school_a_id: string;
  school_b_id: string;
  match_date: string;
  score_a: number | null;
  score_b: number | null;
  venue_type: string;
  venue_id: string | null;
  tournament_id: string | null;
  season: string;
  year: number;
  status: string;
  source_url: string | null;
  is_derby: boolean;
  sport: string;
  is_visible: boolean;
}

export interface ImportError {
  row: number;
  message: string;
}

export interface ImportResult {
  inserted: number;
  errors: ImportError[];
}

interface LookupMaps {
  schoolNameToId: Map<string, string>;
  schoolIdToRival: Map<string, string | null>;
  tournamentNameToId: Map<string, string>;
  editionMap: Map<string, string>; // `${tournamentId}_${year}` → edition UUID
}

// ── Lookup prefetch ─────────────────────────────────────────────────────────

async function prefetchLookups(): Promise<LookupMaps> {
  const [schoolsRes, tournamentsRes, editionsRes] = await Promise.all([
    supabase.from("schools").select("id, name, main_rival"),
    supabase.from("tournaments").select("id, name"),
    supabase.from("tournament_editions").select("id, tournament_id, year"),
  ]);

  if (schoolsRes.error) throw new Error(`Failed to fetch schools: ${schoolsRes.error.message}`);
  if (tournamentsRes.error) throw new Error(`Failed to fetch tournaments: ${tournamentsRes.error.message}`);
  if (editionsRes.error) throw new Error(`Failed to fetch editions: ${editionsRes.error.message}`);

  const schoolNameToId = new Map<string, string>();
  const schoolIdToRival = new Map<string, string | null>();

  for (const s of schoolsRes.data ?? []) {
    schoolNameToId.set(s.name.toLowerCase().trim(), s.id);
    schoolIdToRival.set(s.id, s.main_rival ?? null);
  }

  const tournamentNameToId = new Map<string, string>();
  for (const t of tournamentsRes.data ?? []) {
    tournamentNameToId.set(t.name.toLowerCase().trim(), t.id);
  }

  const editionMap = new Map<string, string>();
  for (const e of editionsRes.data ?? []) {
    editionMap.set(`${e.tournament_id}_${e.year}`, e.id);
  }

  return { schoolNameToId, schoolIdToRival, tournamentNameToId, editionMap };
}

// ── Row mapping ─────────────────────────────────────────────────────────────

function mapRow(
  row: CsvFixtureRow,
  rowIndex: number,
  maps: LookupMaps
): { fixture: FixtureInsert | null; errors: ImportError[] } {
  const errors: ImportError[] = [];
  const rowNum = rowIndex + 1; // 1-indexed for user display

  // Required fields
  const schoolAName = row.school_a_name?.trim();
  const schoolBName = row.school_b_name?.trim();

  if (!schoolAName) {
    errors.push({ row: rowNum, message: "Missing required field school_a_name" });
    return { fixture: null, errors };
  }
  if (!schoolBName) {
    errors.push({ row: rowNum, message: "Missing required field school_b_name" });
    return { fixture: null, errors };
  }

  const schoolAId = maps.schoolNameToId.get(schoolAName.toLowerCase());
  const schoolBId = maps.schoolNameToId.get(schoolBName.toLowerCase());

  if (!schoolAId) {
    errors.push({ row: rowNum, message: `School '${schoolAName}' not found in database` });
  }
  if (!schoolBId) {
    errors.push({ row: rowNum, message: `School '${schoolBName}' not found in database` });
  }
  if (!schoolAId || !schoolBId) {
    return { fixture: null, errors };
  }

  // Derby logic
  const rivalA = maps.schoolIdToRival.get(schoolAId);
  const rivalB = maps.schoolIdToRival.get(schoolBId);
  const isDerby =
    (rivalA != null && rivalA.toLowerCase().trim() === schoolBName.toLowerCase()) ||
    (rivalB != null && rivalB.toLowerCase().trim() === schoolAName.toLowerCase());

  // Scores
  const scoreA = row.score_a?.trim() ? parseInt(row.score_a.trim(), 10) : null;
  const scoreB = row.score_b?.trim() ? parseInt(row.score_b.trim(), 10) : null;

  // Season / year
  const season = row.season?.trim() || new Date().getFullYear().toString();
  const year = parseInt(season, 10) || new Date().getFullYear();

  // Venue & tournament
  const venueType = row.venue_type?.trim().toLowerCase() || "school";
  let venueId: string | null = null;
  let tournamentId: string | null = null;

  if (venueType === "tournament") {
    const tName = row.tournament_name?.trim();
    if (tName) {
      const masterId = maps.tournamentNameToId.get(tName.toLowerCase());
      if (!masterId) {
        errors.push({ row: rowNum, message: `Tournament '${tName}' not found` });
      } else {
        const editionId = maps.editionMap.get(`${masterId}_${year}`);
        if (!editionId) {
          errors.push({ row: rowNum, message: `No edition found for '${tName}' in season ${year}` });
        } else {
          tournamentId = editionId;
        }
      }
    }
  } else {
    // venue_type = school
    const venueSchoolName = row.venue_school?.trim();
    if (venueSchoolName) {
      const vsId = maps.schoolNameToId.get(venueSchoolName.toLowerCase());
      if (!vsId) {
        errors.push({ row: rowNum, message: `Venue school '${venueSchoolName}' not found` });
      } else {
        venueId = vsId;
      }
    } else {
      // Default venue to school A
      venueId = schoolAId;
    }
  }

  // Status computation
  const dateStr = row.date_time?.trim().replace(/−/g, "-");
  const matchDate = dateStr || new Date().toISOString();
  let status: string;

  const csvStatus = row.status?.trim();
  if (csvStatus) {
    status = csvStatus;
  } else {
    const parsedDate = new Date(matchDate);
    const now = new Date();
    if (parsedDate > now) {
      status = "upcoming";
    } else if (scoreA !== null && scoreB !== null) {
      status = "completed";
    } else {
      status = "final";
    }
  }

  const fixture: FixtureInsert = {
    school_a_id: schoolAId,
    school_b_id: schoolBId,
    match_date: matchDate,
    score_a: isNaN(scoreA as number) ? null : scoreA,
    score_b: isNaN(scoreB as number) ? null : scoreB,
    venue_type: venueType,
    venue_id: venueId,
    tournament_id: tournamentId,
    season,
    year,
    status,
    source_url: row.source_url?.trim() || null,
    is_derby: isDerby,
    sport: "Rugby",
    is_visible: true,
  };

  return { fixture, errors };
}

// ── Batch insert ────────────────────────────────────────────────────────────

async function insertFixtures(fixtures: FixtureInsert[]): Promise<number> {
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < fixtures.length; i += batchSize) {
    const batch = fixtures.slice(i, i + batchSize);
    const { error } = await supabase.from("fixtures").insert(batch);
    if (error) {
      throw new Error(`Batch insert failed at row ${i + 1}: ${error.message}`);
    }
    inserted += batch.length;
  }

  return inserted;
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function importFixturesFromCsv(rows: CsvFixtureRow[]): Promise<ImportResult> {
  const maps = await prefetchLookups();

  const validFixtures: FixtureInsert[] = [];
  const allErrors: ImportError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Skip completely empty rows
    if (!row.school_a_name?.trim() && !row.school_b_name?.trim()) continue;

    const { fixture, errors } = mapRow(row, i, maps);
    allErrors.push(...errors);
    if (fixture) validFixtures.push(fixture);
  }

  let inserted = 0;
  if (validFixtures.length > 0) {
    inserted = await insertFixtures(validFixtures);
  }

  return { inserted, errors: allErrors };
}
