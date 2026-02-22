import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { History } from "lucide-react";

interface MatchHistoryProps {
  homeSchoolId: string;
  awaySchoolId: string;
}

interface HistoricalFixture {
  id: string;
  match_date: string;
  home_score: number | null;
  away_score: number | null;
  home_school: { name: string };
  away_school: { name: string };
}

export const MatchHistory = ({ homeSchoolId, awaySchoolId }: MatchHistoryProps) => {
  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["match-history", homeSchoolId, awaySchoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixtures")
        .select(`
          id,
          match_date,
          home_score,
          away_score,
          home_school:schools!fixtures_home_school_id_fkey(name),
          away_school:schools!fixtures_away_school_id_fkey(name)
        `)
        .eq("is_visible", true)
        .neq("status", "upcoming")
        .or(
          `and(home_school_id.eq.${homeSchoolId},away_school_id.eq.${awaySchoolId}),and(home_school_id.eq.${awaySchoolId},away_school_id.eq.${homeSchoolId})`
        )
        .order("match_date", { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data || []) as unknown as HistoricalFixture[];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex items-center gap-2 p-4 text-muted-foreground text-sm">
        <History className="h-4 w-4" />
        <span>No previous matches between these schools</span>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Head-to-Head History
      </p>
      {matches.map((match) => {
        const homeWins =
          match.home_score !== null &&
          match.away_score !== null &&
          match.home_score > match.away_score;
        const awayWins =
          match.home_score !== null &&
          match.away_score !== null &&
          match.away_score > match.home_score;
        const isDraw =
          match.home_score !== null &&
          match.away_score !== null &&
          match.home_score === match.away_score;

        return (
          <div
            key={match.id}
            className="flex items-center justify-between text-sm py-1.5 border-b border-border/30 last:border-0"
          >
            <span className="text-xs text-muted-foreground w-20 shrink-0">
              {format(new Date(match.match_date), "d MMM yyyy")}
            </span>
            <div className="flex items-center gap-2 flex-1 justify-center text-center">
              <span className={homeWins ? "font-bold text-foreground" : "text-muted-foreground"}>
                {match.home_school?.name}
              </span>
              <span className={`font-mono font-bold ${isDraw ? "text-muted-foreground" : "text-foreground"}`}>
                {match.home_score ?? "–"} - {match.away_score ?? "–"}
              </span>
              <span className={awayWins ? "font-bold text-foreground" : "text-muted-foreground"}>
                {match.away_school?.name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
