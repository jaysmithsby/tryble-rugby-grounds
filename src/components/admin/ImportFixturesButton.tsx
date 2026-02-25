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
  type LookupMaps,
} from "@/lib/fixtureImportService";
import { SchoolMappingDialog } from "./SchoolMappingDialog";

interface ImportFixturesButtonProps {
  onSuccess?: () => void;
}

export function ImportFixturesButton({ onSuccess }: ImportFixturesButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mapping dialog state
  const [mappingOpen, setMappingOpen] = useState(false);
  const [unknownSchools, setUnknownSchools] = useState<string[]>([]);
  const [allSchools, setAllSchools] = useState<SchoolOption[]>([]);
  const [pendingMaps, setPendingMaps] = useState<LookupMaps | null>(null);
  const [pendingRows, setPendingRows] = useState<CsvFixtureRow[]>([]);

  const showResult = (inserted: number, skipped: number, errorCount: number) => {
    if (inserted === 0 && errorCount > 0 && skipped === 0) {
      toast({ title: "Import Failed", description: `${errorCount} error(s). Check console for details.`, variant: "destructive" });
    } else {
      const parts = [`${inserted} inserted`];
      if (skipped > 0) parts.push(`${skipped} skipped (duplicates)`);
      if (errorCount > 0) parts.push(`${errorCount} error(s) — see console`);
      toast({ title: "Import Complete", description: parts.join(", ") });
    }
    if (inserted > 0) onSuccess?.();
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
            // Unknowns found — show mapping dialog
            setUnknownSchools(analysis.unknownSchools);
            setAllSchools(analysis.allSchools);
            setPendingMaps(analysis.maps);
            setPendingRows(analysis.rows);
            setMappingOpen(true);
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

  const handleMappingConfirm = async (mappings: Record<string, string>) => {
    setMappingOpen(false);
    setLoading(true);
    try {
      const { inserted, skipped, errors } = await applyMappingsAndImport(mappings, pendingMaps!, pendingRows);
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
        open={mappingOpen}
        onOpenChange={setMappingOpen}
        unknownSchools={unknownSchools}
        allSchools={allSchools}
        onConfirm={handleMappingConfirm}
      />
    </>
  );
}
