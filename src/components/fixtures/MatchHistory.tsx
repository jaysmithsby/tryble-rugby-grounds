import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { History } from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchHistoryProps {
  leftSchoolId: string;
  rightSchoolId: string;
}

interface HistoricalFixture {
  id: string;
  match_date: string;
  score_a: number | null;
  score_b: number | null;
  school_a_id: string;
  school_b_id: string;
}

export const MatchHistory = ({ leftSchoolId, rightSchoolId }: MatchHistoryProps) => {
  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["match-history", leftSchoolId, rightSchoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixtures")
        .select(`id, match_date, score_a, score_b, school_a_id, school_b_id`)
        .eq("is_visible", true)
        .neq("status", "upcoming")
        .or(
          `and(school_a_id.eq.${leftSchoolId},school_b_id.eq.${rightSchoolId}),and(school_a_id.eq.${rightSchoolId},school_b_id.eq.${leftSchoolId})`
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
        const leftIsA = match.school_a_id === leftSchoolId;
        const leftScore = leftIsA ? match.score_a : match.score_b;
        const rightScore = leftIsA ? match.score_b : match.score_a;

        return (
          <div
            key={match.id}
            className="grid grid-cols-[1fr_60px_1fr] items-center py-1.5 border-b border-border/30 last:border-0"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0">
                {format(new Date(match.match_date), "d MMM yyyy")}
              </span>
              <span className={cn("font-mono text-sm ml-auto", leftIsA ? "font-bold text-foreground" : "text-muted-foreground")}>
                {leftScore ?? "–"}
              </span>
            </div>
            <span className="text-xs text-muted-foreground text-center">-</span>
            <div className="flex items-center">
              <span className={cn("font-mono text-sm", !leftIsA ? "font-bold text-foreground" : "text-muted-foreground")}>
                {rightScore ?? "–"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
