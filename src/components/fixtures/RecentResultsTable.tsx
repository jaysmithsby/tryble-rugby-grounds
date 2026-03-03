import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePagination } from "@/hooks/usePagination";
import { format, endOfYear } from "date-fns";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FixturesDateSelector } from "@/components/fixtures/FixturesDateSelector";
import { useDebounce } from "@/hooks/use-debounce";

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
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [dateRange, setDateRange] = useState({
    from: new Date(2025, 0, 1),
    to: endOfYear(new Date(2025, 0, 1)),
  });
  const { page, from, to, totalPages, setTotalCount, nextPage, prevPage, hasNextPage, hasPrevPage, goToPage } =
    usePagination(1, 5);

  // Reset page on filter change
  useEffect(() => {
    goToPage(1);
  }, [debouncedSearch, dateRange, goToPage]);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);

      // If searching, find matching school IDs first
      let matchingSchoolIds: string[] | null = null;
      if (debouncedSearch) {
        const { data: matchedSchools } = await supabase
          .from("schools")
          .select("id")
          .ilike("name", `%${debouncedSearch}%`);
        matchingSchoolIds = matchedSchools?.map(s => s.id) || [];
      }

      const buildQuery = (forCount: boolean) => {
        let q = supabase
          .from("fixtures")
          .select(
            forCount
              ? "id"
              : `id, match_date, score_a, score_b, school_a_id, school_b_id,
                 school_a:schools!fixtures_school_a_id_fkey(id, name),
                 school_b:schools!fixtures_school_b_id_fkey(id, name)`,
            forCount ? { count: "exact", head: true } : undefined
          )
          .or(`school_a_id.eq.${schoolId},school_b_id.eq.${schoolId}`)
          .eq("status", "completed")
          .not("score_a", "is", null)
          .not("score_b", "is", null);

        // Apply date range filter (always)
        q = q
          .gte("match_date", dateRange.from.toISOString())
          .lte("match_date", dateRange.to.toISOString());

        // Apply opponent search filter
        if (matchingSchoolIds !== null) {
          if (matchingSchoolIds.length === 0) {
            // No matches — force empty result
            q = q.in("school_a_id", ["00000000-0000-0000-0000-000000000000"]);
          } else {
            const idList = matchingSchoolIds.join(",");
            q = q.or(`school_a_id.in.(${idList}),school_b_id.in.(${idList})`);
          }
        }

        return q;
      };

      const countQuery = buildQuery(true);
      const dataQuery = buildQuery(false)
        .order("match_date", { ascending: false })
        .range(from, to);

      const [countRes, dataRes] = await Promise.all([countQuery, dataQuery]);

      setTotalCount(countRes.count ?? 0);
      setResults((dataRes.data as unknown as ResultRow[]) ?? []);
      setLoading(false);
    };

    fetchResults();
  }, [schoolId, page, from, to, setTotalCount, debouncedSearch, dateRange]);

  const yearLabel = format(dateRange.from, "yyyy");

  return (
    <div>
      {/* Search + date filter row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search opponent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-sm rounded-full border-border"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <FixturesDateSelector
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-4">Loading results…</p>
      ) : results.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          {debouncedSearch
            ? `No results for '${debouncedSearch}'`
            : `No results in ${yearLabel}`}
        </p>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
