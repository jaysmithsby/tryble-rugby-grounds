import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SchoolJerseyImage } from "@/components/ui/SchoolJerseyImage";
import { MatchHistory } from "./MatchHistory";
import { cn } from "@/lib/utils";

interface FixtureSchool {
  id: string;
  name: string;
  slug: string;
  jersey_url: string | null;
  province: string | null;
}

interface Fixture {
  id: string;
  match_date: string;
  venue_legacy: string;
  home_school_id: string;
  away_school_id: string;
  home_school: FixtureSchool;
  away_school: FixtureSchool;
  tournament?: { id: string; name: string } | null;
}

interface FixtureTableProps {
  fixtures: Fixture[];
  searchQuery: string;
}

function sortSchoolsAlpha(fixture: Fixture): [FixtureSchool, FixtureSchool, boolean] {
  const homeName = fixture.home_school?.name || "";
  const awayName = fixture.away_school?.name || "";
  if (homeName.localeCompare(awayName) <= 0) {
    return [fixture.home_school, fixture.away_school, true];
  }
  return [fixture.away_school, fixture.home_school, false];
}

export const FixtureTable = ({ fixtures, searchQuery }: FixtureTableProps) => {
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return fixtures;
    const q = searchQuery.toLowerCase();
    return fixtures.filter(
      (f) =>
        f.home_school?.name?.toLowerCase().includes(q) ||
        f.away_school?.name?.toLowerCase().includes(q)
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
      {/* Desktop table */}
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
              <FixtureTableRow key={fixture.id} fixture={fixture} />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile stacked cards */}
      <div className="sm:hidden space-y-2">
        {filtered.map((fixture) => (
          <MobileFixtureCard key={fixture.id} fixture={fixture} />
        ))}
      </div>
    </>
  );
};

/** Shared school column: jersey on top, name below */
const SchoolBlock = ({
  school,
  isHome,
  onNavigate,
}: {
  school: FixtureSchool;
  isHome: boolean;
  onNavigate: (e: React.MouseEvent, slug: string) => void;
}) => (
  <button
    type="button"
    className="flex flex-col items-center gap-1 min-w-[80px] max-w-[120px] hover:opacity-80 transition-opacity"
    onClick={(e) => onNavigate(e, school.slug)}
  >
    <SchoolJerseyImage
      src={school.jersey_url}
      alt={school.name}
      fallbackText={school.name?.substring(0, 2) || ""}
      size="sm"
      variant={isHome ? "primary" : "accent"}
      containerClassName="border-border"
    />
    <span
      className={cn(
        "text-xs text-center line-clamp-2 leading-tight",
        isHome ? "font-bold" : "font-medium"
      )}
    >
      {school.name}
    </span>
  </button>
);

const FixtureTableRow = ({ fixture }: { fixture: Fixture }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [left, right, leftIsHome] = sortSchoolsAlpha(fixture);

  const handleSchoolClick = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    navigate(`/school/${slug}`);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <>
        <CollapsibleTrigger asChild>
          <TableRow className="cursor-pointer hover:bg-muted/50">
            <TableCell className="text-sm text-muted-foreground align-middle">
              {format(new Date(fixture.match_date), "EEE d MMM")}
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-center gap-4">
                <SchoolBlock school={left} isHome={leftIsHome} onNavigate={handleSchoolClick} />

                <div className="flex flex-col items-center min-w-[40px]">
                  <span className="text-sm font-semibold text-muted-foreground">vs</span>
                  {fixture.tournament && (
                    <span className="text-[10px] text-muted-foreground leading-tight text-center truncate max-w-[100px]">
                      {fixture.tournament.name}
                    </span>
                  )}
                </div>

                <SchoolBlock school={right} isHome={!leftIsHome} onNavigate={handleSchoolClick} />
              </div>
            </TableCell>
            <TableCell className="align-middle">
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  open && "rotate-180"
                )}
              />
            </TableCell>
          </TableRow>
        </CollapsibleTrigger>
        <CollapsibleContent asChild>
          <tr>
            <td colSpan={3} className="bg-muted/30 p-0">
              <MatchHistory leftSchoolId={left.id} rightSchoolId={right.id} />
            </td>
          </tr>
        </CollapsibleContent>
      </>
    </Collapsible>
  );
};

const MobileFixtureCard = ({ fixture }: { fixture: Fixture }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [left, right, leftIsHome] = sortSchoolsAlpha(fixture);

  const handleSchoolClick = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    navigate(`/school/${slug}`);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="border border-border/40 rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              {format(new Date(fixture.match_date), "EEE d MMM")}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
            />
          </div>
          <div className="flex items-center justify-center gap-3">
            <SchoolBlock school={left} isHome={leftIsHome} onNavigate={handleSchoolClick} />

            <div className="flex flex-col items-center">
              <span className="text-sm font-semibold text-muted-foreground">vs</span>
              {fixture.tournament && (
                <span className="text-[10px] text-muted-foreground leading-tight text-center truncate max-w-[80px]">
                  {fixture.tournament.name}
                </span>
              )}
            </div>

            <SchoolBlock school={right} isHome={!leftIsHome} onNavigate={handleSchoolClick} />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="bg-muted/30 rounded-b-lg border border-t-0 border-border/40 -mt-1">
          <MatchHistory leftSchoolId={left.id} rightSchoolId={right.id} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
