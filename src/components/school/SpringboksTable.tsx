import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePagination } from "@/hooks/usePagination";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface SpringboksTableProps {
  schoolId: string;
  onCountLoaded?: (count: number) => void;
}

interface SpringbokRow {
  id: string;
  cap_number: number;
  player_name: string;
  debut_year: number;
}

export function SpringboksTable({ schoolId, onCountLoaded }: SpringboksTableProps) {
  const [players, setPlayers] = useState<SpringbokRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { page, from, to, totalPages, setTotalCount, nextPage, prevPage, hasNextPage, hasPrevPage } =
    usePagination(1, 5);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [countRes, dataRes] = await Promise.all([
        supabase
          .from("springboks")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId),
        supabase
          .from("springboks")
          .select("id, cap_number, player_name, debut_year")
          .eq("school_id", schoolId)
          .order("cap_number", { ascending: false })
          .range(from, to),
      ]);
      const count = countRes.count ?? 0;
      setTotalCount(count);
      onCountLoaded?.(count);
      setPlayers((dataRes.data as SpringbokRow[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, [schoolId, page, from, to, setTotalCount]);

  if (loading) {
    return <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>;
  }

  if (players.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">No Springboks on record.</p>;
  }

  return (
    <div>
      <Table>
        <TableBody>
          {players.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="text-xs text-muted-foreground px-2 py-1.5 w-14 font-mono">
                #{p.cap_number}
              </TableCell>
              <TableCell className="text-xs px-2 py-1.5 font-medium">
                {p.player_name}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground px-2 py-1.5 text-right whitespace-nowrap">
                {p.debut_year}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-3 pb-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!hasPrevPage} onClick={prevPage}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!hasNextPage} onClick={nextPage}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
