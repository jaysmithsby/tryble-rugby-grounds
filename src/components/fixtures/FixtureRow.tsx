import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Lock, AlertCircle, Trophy } from "lucide-react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { TableRow, TableCell } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SchoolJerseyImage } from "@/components/ui/SchoolJerseyImage";
import { MatchHistory } from "./MatchHistory";
import { PredictionDialog } from "@/components/home/PredictionDialog";
import { cn } from "@/lib/utils";
import { resolveVenueName } from "@/lib/venueUtils";
import { supabase } from "@/integrations/supabase/client";

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

export interface FixtureRowProps {
  fixture: Fixture;
  variant?: "card" | "table";
  isPredicted?: boolean;
  predictedSchoolId?: string;
  predictedMargin?: number;
  onPredictionMade?: (schoolId: string, margin: number) => void;
  matchId?: string;
  appliesTo?: string[];
  hasHistory?: boolean;
  priority?: boolean;
  /** Pre-resolved venue string (used by card wrapper when venue is already resolved) */
  venueOverride?: string;
  /** When used inside FixtureTable, render only desktop or mobile layout (parent handles responsive wrapper) */
  responsiveMode?: "desktop" | "mobile";
}

// --- Helpers ---

function sortSchoolsAlpha(fixture: Fixture): [FixtureSchool, FixtureSchool, boolean] {
  const aName = fixture.school_a?.name || "";
  const bName = fixture.school_b?.name || "";
  if (aName.localeCompare(bName) <= 0) {
    return [fixture.school_a, fixture.school_b, true];
  }
  return [fixture.school_b, fixture.school_a, false];
}

function getShortName(name: string): string {
  const words = name.split(" ");
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  return words.map((w) => w[0]).join("").substring(0, 3).toUpperCase();
}

// --- Sub-components ---

const SchoolBlock = ({
  school,
  isHome,
  size,
  onNavigate,
  priority,
}: {
  school: FixtureSchool;
  isHome: boolean;
  size: "sm" | "md";
  onNavigate: (e: React.MouseEvent, slug: string) => void;
  priority?: boolean;
}) => (
  <button
    type="button"
    className="flex flex-col items-center gap-1.5 w-full hover:opacity-80 transition-opacity"
    onClick={(e) => onNavigate(e, school.slug)}
  >
    <SchoolJerseyImage
      src={school.jersey_url}
      alt={school.name}
      fallbackText={size === "sm" ? school.name?.substring(0, 2) || "" : getShortName(school.name)}
      size={size}
      variant={isHome ? "primary" : "accent"}
      priority={priority}
      containerClassName="border-border"
    />
    <span className={cn("text-xs text-center line-clamp-2 leading-tight font-medium h-[2lh]", size === "sm" ? "max-w-[120px]" : "")}>
      {school.name}
    </span>
  </button>
);

const CenterArea = ({
  isPredicted,
  onPredictionMade,
  predictedSchoolName,
  predictedMargin,
  compact,
}: {
  isPredicted?: boolean;
  onPredictionMade?: (schoolId: string, margin: number) => void;
  predictedSchoolName?: string;
  predictedMargin?: number;
  compact?: boolean;
}) => {
  const wrapClass = cn("flex flex-col items-center justify-center gap-1", compact ? "min-h-[36px]" : "min-h-[48px]");

  if (isPredicted) {
    return (
      <div className={wrapClass}>
        <Lock className={cn("text-primary", compact ? "w-4 h-4" : "w-5 h-5")} />
        <span className={cn("font-semibold text-primary text-center", compact ? "text-[10px]" : "text-xs")}>
          {predictedSchoolName} by {predictedMargin}
        </span>
      </div>
    );
  }
  if (onPredictionMade) {
    return (
      <div className={wrapClass}>
        <AlertCircle className={cn("text-destructive", compact ? "w-4 h-4" : "w-5 h-5")} />
        <span className={cn("font-semibold text-destructive", compact ? "text-[10px]" : "text-xs")}>Pick needed</span>
      </div>
    );
  }
  return (
    <div className={wrapClass}>
      <span className={cn("font-semibold text-muted-foreground", compact ? "text-sm" : "text-xl font-bold")}>VS</span>
    </div>
  );
};

// --- Main Component ---

export const FixtureRow = ({
  fixture,
  variant = "table",
  isPredicted = false,
  predictedSchoolId,
  predictedMargin,
  onPredictionMade,
  matchId,
  appliesTo = [],
  hasHistory,
  priority = false,
  venueOverride,
  responsiveMode,
}: FixtureRowProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [autoHasHistory, setAutoHasHistory] = useState<boolean | null>(null);

  const [left, right, leftIsA] = useMemo(() => sortSchoolsAlpha(fixture), [fixture]);

  useEffect(() => {
    if (hasHistory !== undefined) return;
    const aId = fixture.school_a_id;
    const bId = fixture.school_b_id;
    supabase
      .from("fixtures")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .or(`and(school_a_id.eq.${aId},school_b_id.eq.${bId}),and(school_a_id.eq.${bId},school_b_id.eq.${aId})`)
      .then(({ count }) => setAutoHasHistory((count ?? 0) > 0));
  }, [fixture.school_a_id, fixture.school_b_id, hasHistory]);

  const canExpand = hasHistory !== undefined ? hasHistory : autoHasHistory === true;

  const predictedSchoolName = predictedSchoolId === left.id
    ? left.name
    : predictedSchoolId === right.id
      ? right.name
      : undefined;

  const handleSchoolClick = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    navigate(`/school/${slug}`);
  };

  const handlePredictionSubmit = (schoolId: string, margin: number) => {
    onPredictionMade?.(schoolId, margin);
  };

  const venue = venueOverride ?? resolveVenueName(fixture);
  const dateStr = format(new Date(fixture.match_date), "EEE d MMM");
  const fixtureId = matchId || fixture.id;

  const historyContent = (
    <MatchHistory leftSchoolId={left.id} rightSchoolId={right.id} />
  );

  const centerArea = (
    <CenterArea
      isPredicted={isPredicted}
      onPredictionMade={onPredictionMade}
      predictedSchoolName={predictedSchoolName}
      predictedMargin={predictedMargin}
      compact={variant === "table"}
    />
  );

  const chevronIcon = canExpand ? (
    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
  ) : null;

  // ===== CARD VARIANT =====
  if (variant === "card") {
    return (
      <>
        {onPredictionMade && (
          <PredictionDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            homeTeam={left.name}
            awayTeam={right.name}
            homeTeamShort={getShortName(left.name)}
            awayTeamShort={getShortName(right.name)}
            homeTeamIcon={left.jersey_url}
            awayTeamIcon={right.jersey_url}
            homeSchoolId={left.id}
            awaySchoolId={right.id}
            matchId={fixtureId}
            appliesTo={appliesTo}
            onPredictionSubmit={handlePredictionSubmit}
          />
        )}
        <Collapsible open={open} onOpenChange={setOpen}>
          <Card
            className="bg-gradient-card border-border/40 shadow-card hover:shadow-glow transition-all duration-300 cursor-pointer"
            onClick={() => !isPredicted && onPredictionMade && setDialogOpen(true)}
          >
            <div className="p-4 space-y-3">
              {/* Date + Venue row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">{dateStr}</span>
                  {venue !== "TBD" && <span className="text-xs text-muted-foreground">{venue}</span>}
                </div>
                <div className="w-6 h-6 flex items-center justify-center -mr-1">
                  {canExpand ? (
                    <CollapsibleTrigger asChild>
                      <button type="button" className="p-1" onClick={(e) => e.stopPropagation()}>
                        {chevronIcon}
                      </button>
                    </CollapsibleTrigger>
                  ) : isPredicted ? (
                    <Lock className="w-4 h-4 text-primary" aria-label="Prediction Locked" />
                  ) : null}
                </div>
              </div>

              {fixture.tournament && fixture.venue_type !== "tournament" && (
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-3 h-3 text-primary" />
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    {fixture.tournament.name}
                  </span>
                </div>
              )}

              {/* Teams row */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col items-center gap-2 flex-1">
                  <SchoolBlock school={left} isHome={leftIsA} size="md" onNavigate={handleSchoolClick} priority={priority} />
                </div>
                <div className="flex flex-col items-center gap-1 min-w-[80px]">
                  {centerArea}
                </div>
                <div className="flex flex-col items-center gap-2 flex-1">
                  <SchoolBlock school={right} isHome={!leftIsA} size="md" onNavigate={handleSchoolClick} priority={priority} />
                </div>
              </div>
            </div>
          </Card>
          <CollapsibleContent>
            {left.id && right.id && (
              <div className="bg-muted/30 rounded-b-lg border border-t-0 border-border/40 -mt-1">
                {historyContent}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </>
    );
  }

  // ===== TABLE VARIANT =====
  const dateVenueContent = (
    <>
      <span className="font-bold">{dateStr}</span>
      {venue !== "TBD" && <span className="text-muted-foreground ml-2 text-xs">{venue}</span>}
      {fixture.tournament && fixture.venue_type !== "tournament" && (
        <span className="text-[10px] text-muted-foreground ml-1">({fixture.tournament.name})</span>
      )}
    </>
  );

  const matchGrid = (size: "sm" | "md") => (
    <div className={cn("grid items-center gap-2", size === "sm" ? "grid-cols-[1fr_60px_1fr]" : "grid-cols-[1fr_60px_1fr]")}>
      <SchoolBlock school={left} isHome={leftIsA} size={size} onNavigate={handleSchoolClick} />
      <div className="flex items-center justify-center">
        {centerArea}
      </div>
      <SchoolBlock school={right} isHome={!leftIsA} size={size} onNavigate={handleSchoolClick} />
    </div>
  );

  // Desktop table row
  const desktopRow = (
    <TableRow
      className={cn("hover:bg-muted/50", canExpand && "cursor-pointer")}
      onClick={() => !isPredicted && onPredictionMade && setDialogOpen(true)}
    >
      <TableCell className="text-sm align-middle">{dateVenueContent}</TableCell>
      <TableCell>{matchGrid("sm")}</TableCell>
      <TableCell className="align-middle w-[40px]">
        <div className="w-6 h-6 flex items-center justify-center">
          {canExpand && (
            <CollapsibleTrigger asChild>
              <button type="button" className="p-1" onClick={(e) => e.stopPropagation()}>
                {chevronIcon}
              </button>
            </CollapsibleTrigger>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  // Mobile card row
  const mobileRow = (
    <div
      className={cn("border border-border/40 rounded-lg p-3 hover:bg-muted/50 transition-colors", canExpand && "cursor-pointer")}
      onClick={() => !isPredicted && onPredictionMade && setDialogOpen(true)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs">{dateVenueContent}</span>
        <div className="w-6 h-6 flex items-center justify-center -mr-1">
          {canExpand ? (
            <CollapsibleTrigger asChild>
              <button type="button" className="p-1" onClick={(e) => e.stopPropagation()}>
                {chevronIcon}
              </button>
            </CollapsibleTrigger>
          ) : isPredicted ? (
            <Lock className="w-4 h-4 text-primary" aria-label="Prediction Locked" />
          ) : null}
        </div>
      </div>
      {matchGrid("sm")}
    </div>
  );

  const showDesktop = !responsiveMode || responsiveMode === "desktop";
  const showMobile = !responsiveMode || responsiveMode === "mobile";

  return (
    <>
      {onPredictionMade && (
        <PredictionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          homeTeam={left.name}
          awayTeam={right.name}
          homeTeamShort={getShortName(left.name)}
          awayTeamShort={getShortName(right.name)}
          homeTeamIcon={left.jersey_url}
          awayTeamIcon={right.jersey_url}
          homeSchoolId={left.id}
          awaySchoolId={right.id}
          matchId={fixtureId}
          appliesTo={appliesTo}
          onPredictionSubmit={handlePredictionSubmit}
        />
      )}
      {/* Desktop */}
      {showDesktop && (
        <Collapsible open={open} onOpenChange={setOpen} asChild>
          <>
            <CollapsibleTrigger asChild>{desktopRow}</CollapsibleTrigger>
            {canExpand && (
              <CollapsibleContent asChild>
                <tr>
                  <td colSpan={3} className="bg-muted/30 p-0">
                    {historyContent}
                  </td>
                </tr>
              </CollapsibleContent>
            )}
          </>
        </Collapsible>
      )}
      {/* Mobile */}
      {showMobile && (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>{mobileRow}</CollapsibleTrigger>
          {canExpand && (
            <CollapsibleContent>
              <div className="bg-muted/30 rounded-b-lg border border-t-0 border-border/40 -mt-1">
                {historyContent}
              </div>
            </CollapsibleContent>
          )}
        </Collapsible>
      )}
    </>
  );
};
