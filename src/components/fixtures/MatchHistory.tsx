import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { History } from "lucide-react";

interface MatchHistoryProps {
  /** The school displayed on the left in the fixture row */
  leftSchoolId: string;
  /** The school displayed on the right in the fixture row */
  rightSchoolId: string;
}

interface HistoricalFixture {
  id: string;
  match_date: string;
  home_score: number | null;
  away_score: number | null;
  home_school_id: string;
  away_school_id: string;
}

export const MatchHistory = ({ leftSchoolId, rightSchoolId }: MatchHistoryProps) => {
  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["match-history", leftSchoolId, rightSchoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixtures")
        .select(`id, match_date, home_score, away_score, home_school_id, away_school_id`)
        .eq("is_visible", true)
        .neq("status", "upcoming")
        .or(
          `and(home_school_id.eq.${leftSchoolId},away_school_id.eq.${rightSchoolId}),and(home_school_id.eq.${rightSchoolId},away_school_id.eq.${leftSchoolId})`
        )
        .order("match_date", { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data || []) as HistoricalFixture[];
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
        // Map scores to left/right school order (matching the fixture row)
        const leftIsHome = match.home_school_id === leftSchoolId;
        const leftScore = leftIsHome ? match.home_score : match.away_score;
        const rightScore = leftIsHome ? match.away_score : match.home_score;
        const homeIsLeft = leftIsHome;

        return (
          <div
            key={match.id}
            className="flex items-center justify-between text-sm py-1.5 border-b border-border/30 last:border-0"
          >
            <span className="text-xs text-muted-foreground w-20 shrink-0">
              {format(new Date(match.match_date), "d MMM yyyy")}
            </span>
            <div className="flex items-center gap-3 flex-1 justify-center">
              <span className={`font-mono ${homeIsLeft ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                {leftScore ?? "–"}
              </span>
              <span className="text-xs text-muted-foreground">-</span>
              <span className={`font-mono ${!homeIsLeft ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                {rightScore ?? "–"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
