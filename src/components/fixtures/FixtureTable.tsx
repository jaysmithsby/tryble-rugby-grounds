import { useMemo } from "react";
import {
  Table, TableBody, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FixtureRow } from "./FixtureRow";
import type { Fixture, FixtureSchool } from "./FixtureRow";

export type { Fixture, FixtureSchool };

interface FixtureTableProps {
  fixtures: Fixture[];
  searchQuery?: string;
  hasHistoryMap?: Record<string, boolean>;
}

export const FixtureTable = ({ fixtures, searchQuery = "", hasHistoryMap }: FixtureTableProps) => {
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return fixtures;
    const q = searchQuery.toLowerCase();
    return fixtures.filter(
      (f) =>
        f.school_a?.name?.toLowerCase().includes(q) ||
        f.school_b?.name?.toLowerCase().includes(q)
    );
  }, [fixtures, searchQuery]);

  if (filtered.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        {searchQuery ? "No fixtures match your search." : "No fixtures to display."}
      </p>
    );
  }

  return (
    <>
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead className="text-center">Match</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((fixture) => (
              <FixtureRow
                key={fixture.id}
                fixture={fixture}
                variant="table"
                hasHistory={hasHistoryMap?.[fixture.id]}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="sm:hidden space-y-2">
        {filtered.map((fixture) => (
          <FixtureRow
            key={fixture.id}
            fixture={fixture}
            variant="table"
            hasHistory={hasHistoryMap?.[fixture.id]}
          />
        ))}
      </div>
    </>
  );
};
