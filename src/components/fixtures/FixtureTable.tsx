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
}

interface FixtureTableProps {
  fixtures: Fixture[];
  searchQuery: string;
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
              <TableHead>Teams</TableHead>
              <TableHead className="w-[180px]">Venue</TableHead>
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

const FixtureTableRow = ({ fixture }: { fixture: Fixture }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleSchoolClick = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    navigate(`/school/${slug}`);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <>
        <CollapsibleTrigger asChild>
          <TableRow className="cursor-pointer hover:bg-muted/50">
            <TableCell className="text-sm text-muted-foreground">
              {format(new Date(fixture.match_date), "EEE d MMM")}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <SchoolJerseyImage
                  src={fixture.home_school?.jersey_url}
                  alt={fixture.home_school?.name}
                  fallbackText={fixture.home_school?.name?.substring(0, 2) || ""}
                  size="sm"
                  variant="primary"
                  onClick={(e) => handleSchoolClick(e, fixture.home_school.slug)}
                  containerClassName="border-border"
                />
                <button
                  type="button"
                  className="text-sm font-medium hover:text-primary hover:underline text-left"
                  onClick={(e) => handleSchoolClick(e, fixture.home_school.slug)}
                >
                  {fixture.home_school?.name}
                </button>
                <span className="text-xs text-muted-foreground mx-1">vs</span>
                <SchoolJerseyImage
                  src={fixture.away_school?.jersey_url}
                  alt={fixture.away_school?.name}
                  fallbackText={fixture.away_school?.name?.substring(0, 2) || ""}
                  size="sm"
                  variant="accent"
                  onClick={(e) => handleSchoolClick(e, fixture.away_school.slug)}
                  containerClassName="border-border"
                />
                <button
                  type="button"
                  className="text-sm font-medium hover:text-primary hover:underline text-left"
                  onClick={(e) => handleSchoolClick(e, fixture.away_school.slug)}
                >
                  {fixture.away_school?.name}
                </button>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground ml-auto shrink-0 transition-transform",
                    open && "rotate-180"
                  )}
                />
              </div>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]">
              {fixture.venue_legacy}
            </TableCell>
          </TableRow>
        </CollapsibleTrigger>
        <CollapsibleContent asChild>
          <tr>
            <td colSpan={3} className="bg-muted/30 p-0">
              <MatchHistory
                homeSchoolId={fixture.home_school_id}
                awaySchoolId={fixture.away_school_id}
              />
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
          <div className="flex items-center gap-2">
            <SchoolJerseyImage
              src={fixture.home_school?.jersey_url}
              alt={fixture.home_school?.name}
              fallbackText={fixture.home_school?.name?.substring(0, 2) || ""}
              size="sm"
              variant="primary"
              onClick={(e) => handleSchoolClick(e, fixture.home_school.slug)}
              containerClassName="border-border"
            />
            <button
              type="button"
              className="text-xs font-medium hover:text-primary hover:underline text-left flex-1 truncate"
              onClick={(e) => handleSchoolClick(e, fixture.home_school.slug)}
            >
              {fixture.home_school?.name}
            </button>
            <span className="text-xs text-muted-foreground">vs</span>
            <button
              type="button"
              className="text-xs font-medium hover:text-primary hover:underline text-right flex-1 truncate"
              onClick={(e) => handleSchoolClick(e, fixture.away_school.slug)}
            >
              {fixture.away_school?.name}
            </button>
            <SchoolJerseyImage
              src={fixture.away_school?.jersey_url}
              alt={fixture.away_school?.name}
              fallbackText={fixture.away_school?.name?.substring(0, 2) || ""}
              size="sm"
              variant="accent"
              onClick={(e) => handleSchoolClick(e, fixture.away_school.slug)}
              containerClassName="border-border"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 truncate">
            {fixture.venue_legacy}
          </p>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="bg-muted/30 rounded-b-lg border border-t-0 border-border/40 -mt-1">
          <MatchHistory
            homeSchoolId={fixture.home_school_id}
            awaySchoolId={fixture.away_school_id}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
