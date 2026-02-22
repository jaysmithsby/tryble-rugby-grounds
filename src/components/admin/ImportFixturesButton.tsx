import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import Papa from "papaparse";

interface ImportFixturesButtonProps {
  onSuccess?: () => void;
}

export function ImportFixturesButton({ onSuccess }: ImportFixturesButtonProps) {
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
          const { data: schools, error: schoolsError } = await supabase
            .from('schools')
            .select('id, name');

          if (schoolsError) throw schoolsError;

          const { data: tournaments, error: tournamentsError } = await supabase
            .from('tournaments')
            .select('id, name');

          if (tournamentsError) throw tournamentsError;

          const schoolNameToId = new Map<string, string>();
          schools?.forEach(school => {
            schoolNameToId.set(school.name.toLowerCase().trim(), school.id);
          });

          const tournamentNameToId = new Map<string, string>();
          tournaments?.forEach(tournament => {
            tournamentNameToId.set(tournament.name.toLowerCase().trim(), tournament.id);
          });

          const fixtures = results.data
            .filter((row: any) => row.home_school_id && row.away_school_id)
            .map((row: any) => {
              const isHomeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.home_school_id);
              const isAwayUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.away_school_id);

              const schoolAId = isHomeUuid 
                ? row.home_school_id 
                : schoolNameToId.get(row.home_school_id.toLowerCase().trim());
              
              const schoolBId = isAwayUuid 
                ? row.away_school_id 
                : schoolNameToId.get(row.away_school_id.toLowerCase().trim());

              if (!schoolAId || !schoolBId) {
                console.warn(`Skipping fixture: Could not find school IDs for ${row.home_school_id} vs ${row.away_school_id}`);
                return null;
              }

              let tournamentId = null;
              if (row.festival_id || row.tournament_id) {
                const tournamentValue = row.tournament_id || row.festival_id;
                const isTournamentUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tournamentValue);
                
                if (isTournamentUuid) {
                  tournamentId = tournamentValue;
                } else {
                  tournamentId = tournamentNameToId.get(tournamentValue.toLowerCase().trim());
                  if (!tournamentId) {
                    console.warn(`Tournament not found: ${tournamentValue}`);
                  }
                }
              }

              let matchDate = row.match_date;
              if (matchDate) {
                matchDate = matchDate.replace(/−/g, '-');
              }

              const fixture: any = {
                school_a_id: schoolAId,
                school_b_id: schoolBId,
                sport: row.sport || 'Rugby',
                match_date: matchDate,
                venue_legacy: row.venue || 'TBD',
                venue_type: tournamentId ? 'tournament' : 'school',
                venue_id: tournamentId || schoolAId,
                status: row.status || 'upcoming',
                score_a: row.home_score ? parseInt(row.home_score) : null,
                score_b: row.away_score ? parseInt(row.away_score) : null,
                season: row.season || row.year?.toString() || new Date().getFullYear().toString(),
                year: row.year ? parseInt(row.year) : new Date().getFullYear(),
                tournament_id: tournamentId,
                festival_id: null,
                round_name: row.round_name || null,
                is_derby: row.is_derby === 'true' || row.is_derby === true || false,
                is_visible: true,
              };

              if (row.id) {
                fixture.id = row.id;
              }

              return fixture;
            })
            .filter((fixture: any) => fixture !== null);

          console.log(`Parsed ${fixtures.length} fixtures from CSV...`);

          if (fixtures.length === 0) {
            toast({
              title: "No Fixtures to Import",
              description: "No valid fixtures found in the CSV file. Check that school names match your database.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          const fixturesWithIds = fixtures.filter((f: any) => f.id);
          let newFixtures = fixtures;
          let duplicateCount = 0;

          if (fixturesWithIds.length > 0) {
            const fixtureIds = fixturesWithIds.map((f: any) => f.id);
            const { data: existingFixtures, error: fetchError } = await supabase
              .from('fixtures')
              .select('id')
              .in('id', fixtureIds);

            if (fetchError) throw fetchError;

            const existingIds = new Set(existingFixtures?.map(f => f.id) || []);
            
            newFixtures = fixtures.filter((fixture: any) => !fixture.id || !existingIds.has(fixture.id));
            duplicateCount = fixtures.length - newFixtures.length;
          }

          if (newFixtures.length === 0) {
            toast({
              title: "No New Fixtures",
              description: `All ${duplicateCount} fixture(s) already exist in the database.`,
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          console.log(`Importing ${newFixtures.length} new fixtures (${duplicateCount} duplicates skipped)...`);

          const batchSize = 50;
          for (let i = 0; i < newFixtures.length; i += batchSize) {
            const batch = newFixtures.slice(i, i + batchSize);
            const { error } = await supabase
              .from('fixtures')
              .insert(batch);

            if (error) {
              console.error(`Error importing batch ${i / batchSize + 1}:`, error);
              throw error;
            }
          }

          const successMessage = duplicateCount > 0 
            ? `Imported ${newFixtures.length} new fixture(s). ${duplicateCount} duplicate(s) skipped.`
            : `Imported ${newFixtures.length} fixture(s) successfully.`;

          toast({
            title: "Success!",
            description: successMessage,
          });

          onSuccess?.();
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
