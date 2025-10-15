import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import Papa from "papaparse";

export function ImportFixturesButton() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        try {
          const fixtures = results.data
            .filter((row: any) => row.id && row.home_school_id && row.away_school_id)
            .map((row: any) => ({
              id: row.id,
              home_school_id: row.home_school_id,
              away_school_id: row.away_school_id,
              sport: row.sport || 'Rugby',
              match_date: row.match_date,
              venue: row.venue || 'TBD',
              status: row.status || 'upcoming',
              home_score: row.home_score ? parseInt(row.home_score) : null,
              away_score: row.away_score ? parseInt(row.away_score) : null,
              season: row.season || row.year?.toString() || new Date().getFullYear().toString(),
              year: row.year ? parseInt(row.year) : new Date().getFullYear(),
              festival_id: row.festival_id || null,
              is_derby: false,
              is_visible: true,
            }));

          console.log(`Importing ${fixtures.length} fixtures...`);

          // Insert in batches of 50 to avoid overwhelming the database
          const batchSize = 50;
          for (let i = 0; i < fixtures.length; i += batchSize) {
            const batch = fixtures.slice(i, i + batchSize);
            const { error } = await supabase
              .from('fixtures')
              .upsert(batch, { onConflict: 'id' });

            if (error) {
              console.error(`Error importing batch ${i / batchSize + 1}:`, error);
              throw error;
            }
          }

          toast({
            title: "Success!",
            description: `Imported ${fixtures.length} fixtures successfully`,
          });

          window.location.reload();
        } catch (error: any) {
          console.error('Error importing fixtures:', error);
          toast({
            title: "Import Failed",
            description: error.message,
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        toast({
          title: "Parse Error",
          description: "Failed to parse CSV file",
          variant: "destructive",
        });
        setLoading(false);
      },
    });
  };

  return (
    <div>
      <input
        type="file"
        accept=".csv"
        onChange={handleImport}
        style={{ display: 'none' }}
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
