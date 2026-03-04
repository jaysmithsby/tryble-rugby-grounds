import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import Papa from "papaparse";
import {
  analyzeFixturesCsv,
  applyMappingsAndImport,
  type CsvFixtureRow,
  type SchoolOption,
  type TournamentOption,
  type LookupMaps,
} from "@/lib/fixtureImportService";
import { SchoolMappingDialog } from "./SchoolMappingDialog";
import { TournamentMappingDialog } from "./TournamentMappingDialog";

interface ImportFixturesButtonProps {
  onSuccess?: () => void;
}

export function ImportFixturesButton({ onSuccess }: ImportFixturesButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // School mapping dialog state
  const [schoolMappingOpen, setSchoolMappingOpen] = useState(false);
  const [unknownSchools, setUnknownSchools] = useState<string[]>([]);
  const [allSchools, setAllSchools] = useState<SchoolOption[]>([]);

  // Tournament mapping dialog state
  const [tournamentMappingOpen, setTournamentMappingOpen] = useState(false);
  const [unknownTournaments, setUnknownTournaments] = useState<string[]>([]);
  const [allTournaments, setAllTournaments] = useState<TournamentOption[]>([]);
  const [detectedSeasons, setDetectedSeasons] = useState<string[]>([]);

  // Shared pending state
  const [pendingMaps, setPendingMaps] = useState<LookupMaps | null>(null);
  const [pendingRows, setPendingRows] = useState<CsvFixtureRow[]>([]);
  const [pendingSchoolMappings, setPendingSchoolMappings] = useState<Record<string, string>>({});

  const showResult = (inserted: number, updated: number, skipped: number, errorCount: number) => {
    if (inserted === 0 && updated === 0 && errorCount > 0 && skipped === 0) {
      toast({ title: "Import Failed", description: `${errorCount} error(s). Check console for details.`, variant: "destructive" });
    } else {
      const parts = [`${inserted} inserted`];
      if (updated > 0) parts.push(`${updated} scores updated`);
      if (skipped > 0) parts.push(`${skipped} skipped (duplicates)`);
      if (errorCount > 0) parts.push(`${errorCount} error(s) — see console`);
      toast({ title: "Import Complete", description: parts.join(", ") });
    }
    if (inserted > 0 || updated > 0) onSuccess?.();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);

    Papa.parse<CsvFixtureRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const analysis = await analyzeFixturesCsv(results.data);

          if (analysis.importResult) {
            // No unknowns — imported immediately
            const { inserted, skipped, errors } = analysis.importResult;
            if (errors.length > 0) console.warn("Import errors:", errors.map((e) => `Row ${e.row}: ${e.message}`));
            showResult(inserted, skipped, errors.length);
          } else {
            // Store shared state
            setPendingMaps(analysis.maps);
            setPendingRows(analysis.rows);
            setAllSchools(analysis.allSchools);
            setAllTournaments(analysis.allTournaments);

            // Detect seasons from CSV
            const seasons = new Set<string>();
            for (const row of analysis.rows) {
              const s = row.season?.trim();
              if (s) seasons.add(s);
            }
            setDetectedSeasons([...seasons].sort());

            if (analysis.unknownSchools.length > 0) {
              // Step 1: Schools first
              setUnknownSchools(analysis.unknownSchools);
              setUnknownTournaments(analysis.unknownTournaments);
              setSchoolMappingOpen(true);
            } else if (analysis.unknownTournaments.length > 0) {
              // No unknown schools, go straight to tournaments
              setUnknownTournaments(analysis.unknownTournaments);
              setPendingSchoolMappings({});
              setTournamentMappingOpen(true);
            }
          }
        } catch (error: any) {
          console.error("Import error:", error);
          toast({ title: "Import Failed", description: error.message, variant: "destructive" });
        } finally {
          setLoading(false);
          if (inputRef.current) inputRef.current.value = "";
        }
      },
      error: (error) => {
        console.error("CSV parse error:", error);
        toast({ title: "Parse Error", description: "Failed to parse CSV file", variant: "destructive" });
        setLoading(false);
      },
    });
  };

  const handleSchoolMappingConfirm = (mappings: Record<string, string>, newSchools: SchoolOption[]) => {
    setSchoolMappingOpen(false);
    setPendingSchoolMappings(mappings);

    // Add newly created schools to allSchools for reference
    if (newSchools.length > 0) {
      setAllSchools((prev) => [...prev, ...newSchools]);
    }

    // Proceed to tournament mapping if there are unknown tournaments
    if (unknownTournaments.length > 0) {
      setTournamentMappingOpen(true);
    } else {
      // No unknown tournaments — go straight to import
      runFinalImport(mappings);
    }
  };

  const handleTournamentMappingConfirm = (_tournamentMappings: Record<string, string>) => {
    setTournamentMappingOpen(false);
    runFinalImport(pendingSchoolMappings);
  };

  const runFinalImport = async (schoolMappings: Record<string, string>) => {
    setLoading(true);
    try {
      const { inserted, skipped, errors } = await applyMappingsAndImport(schoolMappings, pendingMaps!, pendingRows);
      if (errors.length > 0) console.warn("Import errors:", errors.map((e) => `Row ${e.row}: ${e.message}`));
      showResult(inserted, skipped, errors.length);
    } catch (error: any) {
      console.error("Import error:", error);
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleImport}
          style={{ display: "none" }}
          id="csv-upload"
          disabled={loading}
        />
        <label htmlFor="csv-upload">
          <Button asChild disabled={loading}>
            <span className="cursor-pointer">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
                </>
              )}
            </span>
          </Button>
        </label>
      </div>

      <SchoolMappingDialog
        open={schoolMappingOpen}
        onOpenChange={setSchoolMappingOpen}
        unknownSchools={unknownSchools}
        allSchools={allSchools}
        onConfirm={handleSchoolMappingConfirm}
      />

      <TournamentMappingDialog
        open={tournamentMappingOpen}
        onOpenChange={setTournamentMappingOpen}
        unknownTournaments={unknownTournaments}
        allTournaments={allTournaments}
        maps={pendingMaps!}
        seasons={detectedSeasons}
        onConfirm={handleTournamentMappingConfirm}
      />
    </>
  );
}
