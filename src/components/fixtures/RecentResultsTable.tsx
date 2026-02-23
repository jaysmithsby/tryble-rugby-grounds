import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePagination } from "@/hooks/usePagination";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface RecentResultsTableProps {
  schoolId: string;
}

interface ResultRow {
  id: string;
  match_date: string;
  score_a: number;
  score_b: number;
  school_a_id: string;
  school_b_id: string;
  school_a: { id: string; name: string } | null;
  school_b: { id: string; name: string } | null;
}

export function RecentResultsTable({ schoolId }: RecentResultsTableProps) {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { page, from, to, totalPages, setTotalCount, nextPage, prevPage, hasNextPage, hasPrevPage } =
    usePagination(1, 5);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);

      const baseFilter = (q: any) =>
        q
          .from("fixtures")
          .select("*", { count: "exact", head: true })
          .or(`school_a_id.eq.${schoolId},school_b_id.eq.${schoolId}`)
          .eq("status", "completed")
          .not("score_a", "is", null)
          .not("score_b", "is", null);

      const [countRes, dataRes] = await Promise.all([
        supabase
          .from("fixtures")
          .select("id", { count: "exact", head: true })
          .or(`school_a_id.eq.${schoolId},school_b_id.eq.${schoolId}`)
          .eq("status", "completed")
          .not("score_a", "is", null)
          .not("score_b", "is", null),
        supabase
          .from("fixtures")
          .select(`
            id, match_date, score_a, score_b, school_a_id, school_b_id,
            school_a:schools!fixtures_school_a_id_fkey(id, name),
            school_b:schools!fixtures_school_b_id_fkey(id, name)
          `)
          .or(`school_a_id.eq.${schoolId},school_b_id.eq.${schoolId}`)
          .eq("status", "completed")
          .not("score_a", "is", null)
          .not("score_b", "is", null)
          .order("match_date", { ascending: false })
          .range(from, to),
      ]);

      setTotalCount(countRes.count ?? 0);
      setResults((dataRes.data as unknown as ResultRow[]) ?? []);
      setLoading(false);
    };

    fetchResults();
  }, [schoolId, page, from, to, setTotalCount]);

  if (loading) {
    return <p className="text-xs text-muted-foreground text-center py-4">Loading results…</p>;
  }

  if (results.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">No results yet.</p>;
  }

  return (
    <div>
      <Table>
        <TableBody>
          {results.map((r) => {
            const isSchoolA = r.school_a_id === schoolId;
            const myScore = isSchoolA ? r.score_a : r.score_b;
            const oppScore = isSchoolA ? r.score_b : r.score_a;
            const opponent = isSchoolA
              ? (r.school_b ?? { id: r.school_b_id, name: "Unknown" })
              : (r.school_a ?? { id: r.school_a_id, name: "Unknown" });
            const won = myScore > oppScore;
            const draw = myScore === oppScore;

            return (
              <TableRow key={r.id}>
                <TableCell className="text-xs text-muted-foreground px-2 py-1.5 whitespace-nowrap">
                  {format(new Date(r.match_date), "d MMM yy")}
                </TableCell>
                <TableCell className="text-xs text-center font-mono w-20 px-0 py-1.5">
                  <span className={won ? "font-semibold" : draw ? "" : "text-muted-foreground"}>{myScore}</span>
                  {" - "}
                  <span className={!won && !draw ? "font-semibold" : draw ? "" : "text-muted-foreground"}>{oppScore}</span>
                  {draw && <span className="text-muted-foreground ml-1">(D)</span>}
                </TableCell>
                <TableCell className="text-xs text-left px-2 py-1.5">
                  {opponent.name}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-3 pb-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={!hasPrevPage}
            onClick={prevPage}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={!hasNextPage}
            onClick={nextPage}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
