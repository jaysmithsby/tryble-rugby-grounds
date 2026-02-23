import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { format } from "date-fns";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SchoolJerseyImage } from "@/components/ui/SchoolJerseyImage";
import { MatchHistory } from "./MatchHistory";
import { cn } from "@/lib/utils";
import { resolveVenueName } from "@/lib/venueUtils";

export interface FixtureSchool {
  id: string;
  name: string;
  slug: string;
  jersey_url: string | null;
  province: string | null;
}

export interface Fixture {
  id: string;
  match_date: string;
  venue_type?: string | null;
  venue_id?: string | null;
  school_a_id: string;
  school_b_id: string;
  school_a: FixtureSchool;
  school_b: FixtureSchool;
  tournament?: { id: string; name: string } | null;
}

interface FixtureTableProps {
  fixtures: Fixture[];
  searchQuery?: string;
  hasHistoryMap?: Record<string, boolean>;
}

function sortSchoolsAlpha(fixture: Fixture): [FixtureSchool, FixtureSchool, boolean] {
  const aName = fixture.school_a?.name || "";
  const bName = fixture.school_b?.name || "";
  if (aName.localeCompare(bName) <= 0) {
    return [fixture.school_a, fixture.school_b, true];
  }
  return [fixture.school_b, fixture.school_a, false];
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
              <FixtureTableRow key={fixture.id} fixture={fixture} hasHistoryMap={hasHistoryMap} />
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="sm:hidden space-y-2">
        {filtered.map((fixture) => (
          <MobileFixtureCard key={fixture.id} fixture={fixture} hasHistoryMap={hasHistoryMap} />
        ))}
      </div>
    </>
  );
};

const SchoolBlock = ({
  school, isHome, onNavigate,
}: {
  school: FixtureSchool;
  isHome: boolean;
  onNavigate: (e: React.MouseEvent, slug: string) => void;
}) => (
  <button
    type="button"
    className="flex flex-col items-center gap-1.5 w-full hover:opacity-80 transition-opacity"
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
    <span className="text-xs text-center line-clamp-2 leading-tight max-w-[120px] font-medium">
      {school.name}
    </span>
  </button>
);

const FixtureTableRow = ({ fixture, hasHistoryMap }: { fixture: Fixture; hasHistoryMap?: Record<string, boolean> }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [left, right, leftIsA] = sortSchoolsAlpha(fixture);
  const canExpand = !hasHistoryMap || hasHistoryMap[fixture.id] !== false;

  const handleSchoolClick = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    navigate(`/school/${slug}`);
  };

  const rowContent = (
    <TableRow className={cn("hover:bg-muted/50", canExpand && "cursor-pointer")}>
      <TableCell className="text-sm align-middle">
        <span className="font-bold">{format(new Date(fixture.match_date), "EEE d MMM")}</span>
        {(() => { const v = resolveVenueName(fixture); return v !== "TBD" ? <span className="text-muted-foreground ml-2 text-xs">{v}</span> : null; })()}
        {fixture.tournament && fixture.venue_type !== "tournament" && (
          <span className="text-[10px] text-muted-foreground ml-1">
            ({fixture.tournament.name})
          </span>
        )}
      </TableCell>
      <TableCell>
        <div className="grid grid-cols-[1fr_60px_1fr] items-center gap-2">
          <SchoolBlock school={left} isHome={leftIsA} onNavigate={handleSchoolClick} />
          <div className="flex items-center justify-center">
            <span className="text-sm font-semibold text-muted-foreground">vs</span>
          </div>
          <SchoolBlock school={right} isHome={!leftIsA} onNavigate={handleSchoolClick} />
        </div>
      </TableCell>
      <TableCell className="align-middle">
        {canExpand && (
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        )}
      </TableCell>
    </TableRow>
  );

  if (!canExpand) {
    return rowContent;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <>
        <CollapsibleTrigger asChild>
          {rowContent}
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

const MobileFixtureCard = ({ fixture, hasHistoryMap }: { fixture: Fixture; hasHistoryMap?: Record<string, boolean> }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [left, right, leftIsA] = sortSchoolsAlpha(fixture);
  const canExpand = !hasHistoryMap || hasHistoryMap[fixture.id] !== false;

  const handleSchoolClick = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    navigate(`/school/${slug}`);
  };

  const cardContent = (
    <div className={cn("border border-border/40 rounded-lg p-3 hover:bg-muted/50 transition-colors", canExpand && "cursor-pointer")}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs">
         <span className="font-bold">{format(new Date(fixture.match_date), "EEE d MMM")}</span>
          {(() => { const v = resolveVenueName(fixture); return v !== "TBD" ? <span className="text-muted-foreground ml-2">{v}</span> : null; })()}
          {fixture.tournament && fixture.venue_type !== "tournament" && (
            <span className="text-[10px] text-muted-foreground ml-1">({fixture.tournament.name})</span>
          )}
        </span>
        {canExpand && (
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        )}
      </div>
      <div className="grid grid-cols-[1fr_60px_1fr] items-center gap-2">
        <SchoolBlock school={left} isHome={leftIsA} onNavigate={handleSchoolClick} />
        <div className="flex items-center justify-center">
          <span className="text-sm font-semibold text-muted-foreground">vs</span>
        </div>
        <SchoolBlock school={right} isHome={!leftIsA} onNavigate={handleSchoolClick} />
      </div>
    </div>
  );

  if (!canExpand) {
    return cardContent;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        {cardContent}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="bg-muted/30 rounded-b-lg border border-t-0 border-border/40 -mt-1">
          <MatchHistory leftSchoolId={left.id} rightSchoolId={right.id} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
