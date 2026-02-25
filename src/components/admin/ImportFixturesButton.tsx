import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { importFixturesFromCsv, type CsvFixtureRow } from "@/lib/fixtureImportService";

interface ImportFixturesButtonProps {
  onSuccess?: () => void;
}

export function ImportFixturesButton({ onSuccess }: ImportFixturesButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    Papa.parse<CsvFixtureRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const { inserted, errors } = await importFixturesFromCsv(results.data);

          if (inserted === 0 && errors.length > 0) {
            toast({
              title: "Import Failed",
              description: `${errors.length} error(s). Check console for details.`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Import Complete",
              description: `${inserted} fixture(s) imported.${errors.length > 0 ? ` ${errors.length} error(s) — see console.` : ""}`,
            });
          }

          if (errors.length > 0) {
            console.warn("Import errors:", errors.map((e) => `Row ${e.row}: ${e.message}`));
          }

          if (inserted > 0) onSuccess?.();
        } catch (error: any) {
          console.error("Import error:", error);
          toast({
            title: "Import Failed",
            description: error.message,
            variant: "destructive",
          });
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

  return (
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
  );
}
