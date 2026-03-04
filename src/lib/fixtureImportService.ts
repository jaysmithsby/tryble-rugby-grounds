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
  updated: number;
  skipped: number;
  errors: ImportError[];
}

export interface SchoolOption {
  id: string;
  name: string;
}

export interface TournamentOption {
  id: string;
  name: string;
}

export interface AnalysisResult {
  unknownSchools: string[];
  unknownTournaments: string[];
  allSchools: SchoolOption[];
  allTournaments: TournamentOption[];
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

async function prefetchLookups(): Promise<{ maps: LookupMaps; allSchools: SchoolOption[]; allTournaments: TournamentOption[] }> {
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
  const allTournaments: TournamentOption[] = [];
  for (const t of tournamentsRes.data ?? []) {
    tournamentNameToId.set(t.name.toLowerCase().trim(), t.id);
    allTournaments.push({ id: t.id, name: t.name });
  }

  const editionMap = new Map<string, string>();
  for (const e of editionsRes.data ?? []) {
    editionMap.set(`${e.tournament_id}_${e.year}`, e.id);
  }

  return { maps: { schoolNameToId, schoolIdToRival, tournamentNameToId, editionMap }, allSchools, allTournaments };
}

// ── Row mapping ─────────────────────────────────────────────────────────────

async function mapRow(
  row: CsvFixtureRow,
  rowIndex: number,
  maps: LookupMaps
): Promise<{ fixture: FixtureInsert | null; errors: ImportError[] }> {
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

  // Resolve tournament for any venue type if tournament_name is provided
  const tName = row.tournament_name?.trim();
  if (tName) {
    const masterId = maps.tournamentNameToId.get(tName.toLowerCase());
    if (!masterId) {
      errors.push({ row: rowNum, message: `Tournament '${tName}' not found` });
    } else {
      const editionKey = `${masterId}_${year}`;
      let editionId = maps.editionMap.get(editionKey);
      if (!editionId) {
        // Auto-create edition
        const matchDate = row.date_time?.trim().replace(/−/g, "-") || new Date().toISOString();
        const { data: newEdition, error: insertErr } = await supabase
          .from("tournament_editions" as any)
          .insert({
            tournament_id: masterId,
            year,
            start_date: matchDate,
            end_date: matchDate,
            is_active: true,
          })
          .select("id")
          .single();
        if (insertErr || !newEdition) {
          errors.push({ row: rowNum, message: `Failed to auto-create edition for '${tName}' ${year}: ${insertErr?.message || "unknown"}` });
        } else {
          editionId = (newEdition as any).id;
          maps.editionMap.set(editionKey, editionId!);
        }
      }
      if (editionId) tournamentId = editionId;
    }
  }

  // If a tournament name was provided but we couldn't resolve an edition, skip the fixture
  if (tName && !tournamentId) {
    errors.push({ row: rowNum, message: `Skipped: No tournament edition resolved for '${tName}' (${year})` });
    return { fixture: null, errors };
  }

  // Resolve venue school for non-tournament types
  if (venueType !== "tournament") {
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
  if (csvStatus && csvStatus.toLowerCase() === "cancelled") {
    status = "cancelled";
  } else if (csvStatus) {
    status = csvStatus.toLowerCase();
  } else {
    const parsedDate = new Date(matchDate);
    const now = new Date();
    if (parsedDate > now) {
      status = "upcoming";
    } else if (scoreA !== null && scoreB !== null) {
      status = "final";
    } else {
      status = "completed";
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

// ── Fingerprint helper ──────────────────────────────────────────────────────

function getFixtureFingerprint(schoolAId: string, schoolBId: string, matchDate: string): string {
  const [lo, hi] = [schoolAId, schoolBId].sort();
  const day = matchDate.substring(0, 10); // YYYY-MM-DD
  return `${lo}|${hi}|${day}`;
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

// ── DB dedup lookup ─────────────────────────────────────────────────────────

async function fetchExistingFingerprints(fixtures: FixtureInsert[]): Promise<Set<string>> {
  const dates = [...new Set(fixtures.map((f) => f.match_date.substring(0, 10)))];
  if (dates.length === 0) return new Set();

  // Query fixtures in the date range and fingerprint client-side
  const sortedDates = [...dates].sort();
  const minDate = sortedDates[0] + "T00:00:00Z";
  const maxDate = sortedDates[sortedDates.length - 1] + "T23:59:59Z";

  const { data, error } = await supabase
    .from("fixtures")
    .select("school_a_id, school_b_id, match_date")
    .gte("match_date", minDate)
    .lte("match_date", maxDate);

  if (error) {
    console.warn("DB dedup query failed, skipping DB dedup:", error.message);
    return new Set();
  }

  const set = new Set<string>();
  for (const row of data ?? []) {
    set.add(getFixtureFingerprint(row.school_a_id, row.school_b_id, row.match_date));
  }
  return set;
}

// ── Import core (shared) ────────────────────────────────────────────────────

async function runImport(rows: CsvFixtureRow[], maps: LookupMaps): Promise<{ validFixtures: FixtureInsert[]; allErrors: ImportError[] }> {
  const validFixtures: FixtureInsert[] = [];
  const allErrors: ImportError[] = [];
  const seenFingerprints = new Map<string, number>(); // fingerprint → first row number

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.school_a_name?.trim() && !row.school_b_name?.trim()) continue;

    const { fixture, errors } = await mapRow(row, i, maps);
    allErrors.push(...errors);

    if (fixture) {
      const fp = getFixtureFingerprint(fixture.school_a_id, fixture.school_b_id, fixture.match_date);
      const firstRow = seenFingerprints.get(fp);
      if (firstRow !== undefined) {
        allErrors.push({ row: i + 1, message: `Duplicate of row ${firstRow} within CSV (same schools and date)` });
      } else {
        seenFingerprints.set(fp, i + 1);
        validFixtures.push(fixture);
      }
    }
  }

  return { validFixtures, allErrors };
}

// ── Public API: Step 1 — Analyze ────────────────────────────────────────────

export async function analyzeFixturesCsv(rows: CsvFixtureRow[]): Promise<AnalysisResult> {
  const { maps, allSchools, allTournaments } = await prefetchLookups();

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

  // Collect all unique tournament names from CSV
  const allCsvTournaments = new Set<string>();
  for (const row of rows) {
    const tName = row.tournament_name?.trim();
    if (tName) allCsvTournaments.add(tName);
  }

  const unknownTournaments: string[] = [];
  for (const name of allCsvTournaments) {
    if (!maps.tournamentNameToId.has(name.toLowerCase())) {
      unknownTournaments.push(name);
    }
  }

  // If no unknowns at all, import immediately
  if (unknownSchools.length === 0 && unknownTournaments.length === 0) {
    const { validFixtures, allErrors } = await runImport(rows, maps);
    const existingFps = await fetchExistingFingerprints(validFixtures);
    const newFixtures = validFixtures.filter((f) => {
      const fp = getFixtureFingerprint(f.school_a_id, f.school_b_id, f.match_date);
      if (existingFps.has(fp)) {
        allErrors.push({ row: 0, message: `Skipped: Fixture already exists in database (${f.match_date.substring(0, 10)})` });
        return false;
      }
      return true;
    });
    const skipped = validFixtures.length - newFixtures.length;
    let inserted = 0;
    if (newFixtures.length > 0) inserted = await insertFixtures(newFixtures);
    return { unknownSchools: [], unknownTournaments: [], allSchools, allTournaments, maps, rows, importResult: { inserted, skipped, errors: allErrors } };
  }

  return { unknownSchools: unknownSchools.sort(), unknownTournaments: unknownTournaments.sort(), allSchools, allTournaments, maps, rows };
}

// ── Public API: Step 2 — Apply mappings & import ────────────────────────────

// ── Public API: Cleanup duplicates ──────────────────────────────────────────

export async function cleanupExistingDuplicates(): Promise<number> {
  const { data, error } = await supabase.rpc("delete_duplicate_fixtures");
  if (error) throw new Error(`Cleanup failed: ${error.message}`);
  return (data as number) ?? 0;
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
  const { validFixtures, allErrors } = await runImport(rows, maps);
  const existingFps = await fetchExistingFingerprints(validFixtures);
  const newFixtures = validFixtures.filter((f) => {
    const fp = getFixtureFingerprint(f.school_a_id, f.school_b_id, f.match_date);
    if (existingFps.has(fp)) {
      allErrors.push({ row: 0, message: `Skipped: Fixture already exists in database (${f.match_date.substring(0, 10)})` });
      return false;
    }
    return true;
  });
  const skipped = validFixtures.length - newFixtures.length;
  let inserted = 0;
  if (newFixtures.length > 0) inserted = await insertFixtures(newFixtures);

  return { inserted, skipped, errors: allErrors };
}
