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

export interface SchoolOption {
  id: string;
  name: string;
}

export interface AnalysisResult {
  unknownSchools: string[];
  allSchools: SchoolOption[];
  maps: LookupMaps;
  rows: CsvFixtureRow[];
  /** If no unknowns, import runs immediately and this is populated */
  importResult?: ImportResult;
}

export interface LookupMaps {
  schoolNameToId: Map<string, string>;
  schoolIdToRival: Map<string, string | null>;
  tournamentNameToId: Map<string, string>;
  editionMap: Map<string, string>;
}

// ── Lookup prefetch ─────────────────────────────────────────────────────────

async function prefetchLookups(): Promise<{ maps: LookupMaps; allSchools: SchoolOption[] }> {
  const [schoolsRes, tournamentsRes, editionsRes] = await Promise.all([
    supabase.from("schools").select("id, name, main_rival, alias"),
    supabase.from("tournaments").select("id, name"),
    supabase.from("tournament_editions").select("id, tournament_id, year"),
  ]);

  if (schoolsRes.error) throw new Error(`Failed to fetch schools: ${schoolsRes.error.message}`);
  if (tournamentsRes.error) throw new Error(`Failed to fetch tournaments: ${tournamentsRes.error.message}`);
  if (editionsRes.error) throw new Error(`Failed to fetch editions: ${editionsRes.error.message}`);

  const schoolNameToId = new Map<string, string>();
  const schoolIdToRival = new Map<string, string | null>();
  const allSchools: SchoolOption[] = [];

  for (const s of schoolsRes.data ?? []) {
    const key = s.name.toLowerCase().trim();
    schoolNameToId.set(key, s.id);
    schoolIdToRival.set(s.id, s.main_rival ?? null);
    allSchools.push({ id: s.id, name: s.name });

    // Index aliases
    const aliases = (s as any).alias;
    if (Array.isArray(aliases)) {
      for (const a of aliases) {
        if (typeof a === "string" && a.trim()) {
          schoolNameToId.set(a.toLowerCase().trim(), s.id);
        }
      }
    }
  }

  const tournamentNameToId = new Map<string, string>();
  for (const t of tournamentsRes.data ?? []) {
    tournamentNameToId.set(t.name.toLowerCase().trim(), t.id);
  }

  const editionMap = new Map<string, string>();
  for (const e of editionsRes.data ?? []) {
    editionMap.set(`${e.tournament_id}_${e.year}`, e.id);
  }

  return { maps: { schoolNameToId, schoolIdToRival, tournamentNameToId, editionMap }, allSchools };
}

// ── Row mapping ─────────────────────────────────────────────────────────────

function mapRow(
  row: CsvFixtureRow,
  rowIndex: number,
  maps: LookupMaps
): { fixture: FixtureInsert | null; errors: ImportError[] } {
  const errors: ImportError[] = [];
  const rowNum = rowIndex + 1;

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

  if (!schoolAId) errors.push({ row: rowNum, message: `School '${schoolAName}' not found in database` });
  if (!schoolBId) errors.push({ row: rowNum, message: `School '${schoolBName}' not found in database` });
  if (!schoolAId || !schoolBId) return { fixture: null, errors };

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
    const venueSchoolName = row.venue_school?.trim();
    if (venueSchoolName) {
      const vsId = maps.schoolNameToId.get(venueSchoolName.toLowerCase());
      if (!vsId) {
        errors.push({ row: rowNum, message: `Venue school '${venueSchoolName}' not found` });
      } else {
        venueId = vsId;
      }
    } else {
      venueId = schoolAId;
    }
  }

  // Status
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
    if (error) throw new Error(`Batch insert failed at row ${i + 1}: ${error.message}`);
    inserted += batch.length;
  }

  return inserted;
}

// ── Import core (shared) ────────────────────────────────────────────────────

function runImport(rows: CsvFixtureRow[], maps: LookupMaps): { validFixtures: FixtureInsert[]; allErrors: ImportError[] } {
  const validFixtures: FixtureInsert[] = [];
  const allErrors: ImportError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.school_a_name?.trim() && !row.school_b_name?.trim()) continue;

    const { fixture, errors } = mapRow(row, i, maps);
    allErrors.push(...errors);
    if (fixture) validFixtures.push(fixture);
  }

  return { validFixtures, allErrors };
}

// ── Public API: Step 1 — Analyze ────────────────────────────────────────────

export async function analyzeFixturesCsv(rows: CsvFixtureRow[]): Promise<AnalysisResult> {
  const { maps, allSchools } = await prefetchLookups();

  // Collect all unique school names from CSV
  const allCsvNames = new Set<string>();
  for (const row of rows) {
    if (row.school_a_name?.trim()) allCsvNames.add(row.school_a_name.trim());
    if (row.school_b_name?.trim()) allCsvNames.add(row.school_b_name.trim());
    if (row.venue_school?.trim()) allCsvNames.add(row.venue_school.trim());
  }

  const unknownSchools: string[] = [];
  for (const name of allCsvNames) {
    if (!maps.schoolNameToId.has(name.toLowerCase())) {
      unknownSchools.push(name);
    }
  }

  // If no unknowns, import immediately
  if (unknownSchools.length === 0) {
    const { validFixtures, allErrors } = runImport(rows, maps);
    let inserted = 0;
    if (validFixtures.length > 0) inserted = await insertFixtures(validFixtures);
    return { unknownSchools: [], allSchools, maps, rows, importResult: { inserted, errors: allErrors } };
  }

  return { unknownSchools: unknownSchools.sort(), allSchools, maps, rows };
}

// ── Public API: Step 2 — Apply mappings & import ────────────────────────────

export async function applyMappingsAndImport(
  mappings: Record<string, string>,
  maps: LookupMaps,
  rows: CsvFixtureRow[]
): Promise<ImportResult> {
  // Persist aliases to database
  const schoolUpdates = new Map<string, string[]>(); // schoolId → list of new alias names
  for (const [csvName, schoolId] of Object.entries(mappings)) {
    const existing = schoolUpdates.get(schoolId) || [];
    existing.push(csvName);
    schoolUpdates.set(schoolId, existing);
  }

  for (const [schoolId, names] of schoolUpdates.entries()) {
    // Read current aliases, append new ones, update
    const { data } = await supabase.from("schools").select("alias").eq("id", schoolId).single();
    const currentAliases: string[] = Array.isArray((data as any)?.alias) ? (data as any).alias : [];
    for (const name of names) {
      if (!currentAliases.some((a: string) => a.toLowerCase() === name.toLowerCase())) {
        currentAliases.push(name);
      }
    }
    const { error } = await supabase.from("schools").update({ alias: currentAliases } as any).eq("id", schoolId);
    if (error) console.warn(`Failed to update alias for school ${schoolId}:`, error.message);
  }

  // Update lookup maps with new mappings
  for (const [csvName, schoolId] of Object.entries(mappings)) {
    maps.schoolNameToId.set(csvName.toLowerCase().trim(), schoolId);
  }

  // Run the import
  const { validFixtures, allErrors } = runImport(rows, maps);
  let inserted = 0;
  if (validFixtures.length > 0) inserted = await insertFixtures(validFixtures);

  return { inserted, errors: allErrors };
}
