import { useState, useCallback, useMemo, useEffect } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { startOfMonth, endOfMonth } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import GlobalHeader from "@/components/GlobalHeader";
import { FixturesFilters } from "@/components/fixtures/FixturesFilters";
import { FixtureDateGroup } from "@/components/fixtures/FixtureDateGroup";
import { FixtureListCard } from "@/components/fixtures/FixtureListCard";
import { SwipeableFixtureCard } from "@/components/fixtures/SwipeableFixtureCard";
import { FixtureTable } from "@/components/fixtures/FixtureTable";
import { useFixturesData } from "@/hooks/useFixturesData";
import { usePreloadJerseyImages } from "@/components/ui/SchoolJerseyImage";
import { supabase } from "@/integrations/supabase/client";
import { useConsentStatus } from "@/hooks/useConsentStatus";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";

const Fixtures = () => {
  const { toast } = useToast();
  const consentStatus = useConsentStatus();
  const now = new Date();

  const [dateRange, setDateRange] = useState({
    from: startOfMonth(now),
    to: endOfMonth(now),
  });
  const [viewMode, setViewMode] = useState<"my-schools" | "all-schools">("my-schools");
  const [selectedProvince, setSelectedProvince] = useState<string | undefined>();
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const startDate = useMemo(() => dateRange.from.toISOString(), [dateRange.from]);
  const endDate = useMemo(
    () => new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate(), 23, 59, 59).toISOString(),
    [dateRange.to]
  );

  const {
    fixtures,
    groupedFixtures,
    predictionsMap,
    isLoading,
    userSchoolIds,
    userId,
  } = useFixturesData({
    startDate,
    endDate,
    viewMode,
    selectedProvince,
  });

  const jerseyUrls = groupedFixtures.flatMap((group) =>
    group.fixtures.flatMap((f) => [
      f.school_a?.jersey_url,
      f.school_b?.jersey_url,
    ])
  );
  usePreloadJerseyImages(jerseyUrls);

  const handlePredictionSubmit = useCallback(
    async (fixtureId: string, schoolId: string, margin: number) => {
      if (!userId) {
        toast({ title: "Sign in required", description: "Please sign in to make predictions.", variant: "destructive" });
        return;
      }

      // Defense-in-depth: block minors without consent on non-school fixtures
      if (consentStatus.needsConsent) {
        const fixture = fixtures.find(f => f.id === fixtureId);
        if (fixture) {
          const isUserSchool = fixture.school_a_id === consentStatus.userSchoolId || fixture.school_b_id === consentStatus.userSchoolId;
          if (!isUserSchool) return;
        }
      }

      const isDraw = schoolId === "draw";

      try {
        const { data: existing } = await supabase
          .from("predictions")
          .select("id")
          .eq("fixture_id", fixtureId)
          .eq("user_id", userId)
          .single();

        if (existing) {
          await supabase
            .from("predictions")
            .update({
              predicted_margin: margin,
              predicted_school_id: isDraw ? null : schoolId,
              updated_at: new Date().toISOString(),
            } as any)
            .eq("id", existing.id);
        } else {
          await supabase.from("predictions").insert({
            fixture_id: fixtureId,
            user_id: userId,
            predicted_margin: margin,
            predicted_school_id: isDraw ? null : schoolId,
          } as any);
        }
      } catch (error) {
        console.error("Failed to save prediction:", error);
        toast({ title: "Prediction Failed", description: "Could not save your prediction. Please try again.", variant: "destructive" });
      }
    },
    [userId, toast, fixtures, consentStatus.needsConsent, consentStatus.userSchoolId]
  );

  const showEmptyMySchools = viewMode === "my-schools" && userSchoolIds.length === 0 && !isLoading;
  const showEmptyNoFixtures = !isLoading && groupedFixtures.length === 0 && !showEmptyMySchools;

  // Filter grouped fixtures by search query for my-schools view
  const filteredGroupedFixtures = useMemo(() => {
    if (!searchQuery) return groupedFixtures;
    const q = searchQuery.toLowerCase();
    return groupedFixtures
      .map((group) => ({
        ...group,
        fixtures: group.fixtures.filter(
          (f) =>
            f.school_a?.name?.toLowerCase().includes(q) ||
            f.school_b?.name?.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.fixtures.length > 0);
  }, [groupedFixtures, searchQuery]);

  // Flatten all fixtures for pagination
  const FIXTURES_PER_PAGE = 8;
  const [page, setPage] = useState(1);

  // Reset page on filter changes
  useEffect(() => { setPage(1); setDismissedIds(new Set()); }, [dateRange, viewMode, selectedProvince, searchQuery]);

  // My-schools: filter dismissed, then paginate, then re-group
  const allMyFixtures = useMemo(() =>
    filteredGroupedFixtures.flatMap(g => g.fixtures).filter(f => !dismissedIds.has(f.id)),
    [filteredGroupedFixtures, dismissedIds]
  );
  const totalMyPages = Math.max(1, Math.ceil(allMyFixtures.length / FIXTURES_PER_PAGE));
  const paginatedMyFixtures = allMyFixtures.slice((page - 1) * FIXTURES_PER_PAGE, page * FIXTURES_PER_PAGE);
  const paginatedMyGroups = useMemo(() => {
    const groups: typeof filteredGroupedFixtures = [];
    for (const f of paginatedMyFixtures) {
      const dateKey = new Date(f.match_date).toDateString();
      const existing = groups.find(g => g.date.toDateString() === dateKey);
      if (existing) {
        existing.fixtures.push(f);
      } else {
        groups.push({ date: new Date(f.match_date), fixtures: [f] });
      }
    }
    return groups;
  }, [paginatedMyFixtures]);

  // All-schools: filter dismissed, then paginate
  const filteredAllFixtures = useMemo(() => {
    let list = fixtures.filter(f => !dismissedIds.has(f.id));
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(f =>
      f.school_a?.name?.toLowerCase().includes(q) ||
      f.school_b?.name?.toLowerCase().includes(q)
    );
  }, [fixtures, searchQuery, dismissedIds]);
  const totalAllPages = Math.max(1, Math.ceil(filteredAllFixtures.length / FIXTURES_PER_PAGE));
  const paginatedAllFixtures = filteredAllFixtures.slice((page - 1) * FIXTURES_PER_PAGE, page * FIXTURES_PER_PAGE);

  const totalPages = viewMode === "my-schools" ? totalMyPages : totalAllPages;
  const showPagination = !isLoading && totalPages > 1;

  const queryClient = useQueryClient();
  const handleRefresh = useCallback(async () => {
    setDismissedIds(new Set());
    await queryClient.invalidateQueries({ queryKey: ["fixtures"] });
    await queryClient.invalidateQueries({ queryKey: ["fixture-predictions"] });
  }, [queryClient]);

  const { containerRef, pullDistance, isRefreshing } = usePullToRefresh({ onRefresh: handleRefresh });

  return (
    <div ref={containerRef} className="min-h-screen bg-background pb-24">
      <GlobalHeader />
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

      <FixturesFilters
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        selectedProvince={selectedProvince}
        onProvinceChange={setSelectedProvince}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {isLoading && (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {showEmptyMySchools && (
          <div className="text-center py-12">
            <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Followed Schools</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Join a pool or follow schools to see personalized fixtures here. Switch to "All Schools" to browse all fixtures.
            </p>
          </div>
        )}

        {showEmptyNoFixtures && (
          <div className="text-center py-12">
            <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Fixtures</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              No fixtures scheduled for this date range. Try selecting a different period.
            </p>
          </div>
        )}

        {viewMode === "my-schools" &&
          paginatedMyGroups.map((group) => (
            <FixtureDateGroup key={group.date.toISOString()} date={group.date} fixtureCount={group.fixtures.length}>
              {group.fixtures.map((fixture) => (
                <SwipeableFixtureCard
                  key={fixture.id}
                  fixtureId={fixture.id}
                  onDismiss={(id) => setDismissedIds(prev => new Set(prev).add(id))}
                >
                  <FixtureListCard
                    fixture={{
                      id: fixture.id,
                      match_date: fixture.match_date,
                      venue_type: fixture.venue_type,
                      venue_id: fixture.venue_id,
                      status: fixture.status,
                      score_a: fixture.score_a,
                      score_b: fixture.score_b,
                      school_a: fixture.school_a,
                      school_b: fixture.school_b,
                      tournament: fixture.tournament_edition?.tournament ?? null,
                    }}
                    isPredicted={!!predictionsMap[fixture.id]}
                    userPrediction={predictionsMap[fixture.id]}
                    onPredictionSubmit={handlePredictionSubmit}
                  />
                </SwipeableFixtureCard>
              ))}
            </FixtureDateGroup>
          ))}

        {viewMode === "all-schools" && !isLoading && (
          <FixtureTable fixtures={paginatedAllFixtures} />
        )}

        {showPagination && (
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <span className="text-xs text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Fixtures;
