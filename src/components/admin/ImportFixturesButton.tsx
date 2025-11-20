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
          // First, fetch all schools to create name-to-ID mapping
          const { data: schools, error: schoolsError } = await supabase
            .from('schools')
            .select('id, name');

          if (schoolsError) throw schoolsError;

          // Create a case-insensitive mapping of school names to IDs
          const schoolNameToId = new Map<string, string>();
          schools?.forEach(school => {
            schoolNameToId.set(school.name.toLowerCase().trim(), school.id);
          });

          const fixtures = results.data
            .filter((row: any) => row.id && row.home_school_id && row.away_school_id)
            .map((row: any) => {
              // Check if home_school_id and away_school_id are UUIDs or names
              const isHomeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.home_school_id);
              const isAwayUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.away_school_id);

              // Map school names to IDs if they're not already UUIDs
              const homeSchoolId = isHomeUuid 
                ? row.home_school_id 
                : schoolNameToId.get(row.home_school_id.toLowerCase().trim());
              
              const awaySchoolId = isAwayUuid 
                ? row.away_school_id 
                : schoolNameToId.get(row.away_school_id.toLowerCase().trim());

              if (!homeSchoolId || !awaySchoolId) {
                console.warn(`Skipping fixture: Could not find school IDs for ${row.home_school_id} vs ${row.away_school_id}`);
                return null;
              }

              return {
                id: row.id,
                home_school_id: homeSchoolId,
                away_school_id: awaySchoolId,
                sport: row.sport || 'Rugby',
                match_date: row.match_date,
                venue: row.venue || 'TBD',
                status: row.status || 'upcoming',
                home_score: row.home_score ? parseInt(row.home_score) : null,
                away_score: row.away_score ? parseInt(row.away_score) : null,
                season: row.season || row.year?.toString() || new Date().getFullYear().toString(),
                year: row.year ? parseInt(row.year) : new Date().getFullYear(),
                festival_id: row.festival_id || null,
                round_name: row.round_name || null,
                is_derby: row.is_derby === 'true' || row.is_derby === true || false,
                is_visible: true,
              };
            })
            .filter((fixture: any) => fixture !== null);

          console.log(`Importing ${fixtures.length} fixtures...`);

          if (fixtures.length === 0) {
            toast({
              title: "No Fixtures to Import",
              description: "No valid fixtures found in the CSV file. Check that school names match your database.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

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
