import { useState, useCallback, useMemo } from "react";
import { CalendarDays, Search } from "lucide-react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { BottomNav } from "@/components/BottomNav";
import { FixturesDateSelector } from "@/components/fixtures/FixturesDateSelector";
import { FixturesFilters } from "@/components/fixtures/FixturesFilters";
import { FixtureDateGroup } from "@/components/fixtures/FixtureDateGroup";
import { FixtureListCard } from "@/components/fixtures/FixtureListCard";
import { FixtureTable } from "@/components/fixtures/FixtureTable";
import { useFixturesData, useAllSchools } from "@/hooks/useFixturesData";
import { usePreloadJerseyImages } from "@/components/ui/SchoolJerseyImage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

const Fixtures = () => {
  const { toast } = useToast();
  const now = new Date();

  const [dateRange, setDateRange] = useState({
    from: startOfMonth(now),
    to: endOfMonth(now),
  });
  const [viewMode, setViewMode] = useState<"my-schools" | "all-schools">("my-schools");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | undefined>();
  const [selectedProvince, setSelectedProvince] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");

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
    selectedSchoolId,
    selectedProvince,
  });

  const { data: allSchools = [], isLoading: isLoadingSchools } = useAllSchools();

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

      const fixture = groupedFixtures.flatMap(g => g.fixtures).find(f => f.id === fixtureId);
      const predictedTeam = fixture && schoolId === fixture.school_a_id ? "school_a" : "school_b";

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
              predicted_team: predictedTeam,
              predicted_margin: margin,
              predicted_school_id: schoolId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("predictions").insert({
            fixture_id: fixtureId,
            user_id: userId,
            predicted_team: predictedTeam,
            predicted_margin: margin,
            predicted_school_id: schoolId,
          });
        }
      } catch (error) {
        console.error("Failed to save prediction:", error);
        toast({ title: "Prediction Failed", description: "Could not save your prediction. Please try again.", variant: "destructive" });
      }
    },
    [userId, toast, groupedFixtures]
  );

  const dateLabel = useMemo(() => {
    return format(dateRange.from, "MMMM yyyy");
  }, [dateRange.from]);

  const showEmptyMySchools = viewMode === "my-schools" && userSchoolIds.length === 0 && !isLoading;
  const showEmptyNoFixtures = !isLoading && groupedFixtures.length === 0 && !showEmptyMySchools;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">Fixtures</h1>
            </div>
            <div className="flex items-center gap-2">
              {viewMode === "all-schools" && (
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search school..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-sm w-40"
                  />
                </div>
              )}
              <FixturesDateSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
            </div>
          </div>

          {viewMode === "all-schools" && (
            <div className="relative mt-2 sm:hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by school name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
        </div>
      </header>

      <FixturesFilters
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedSchoolId={selectedSchoolId}
        onSchoolChange={setSelectedSchoolId}
        selectedProvince={selectedProvince}
        onProvinceChange={setSelectedProvince}
        schools={allSchools}
        isLoadingSchools={isLoadingSchools}
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
          groupedFixtures.map((group) => (
            <FixtureDateGroup key={group.date.toISOString()} date={group.date} fixtureCount={group.fixtures.length}>
              {group.fixtures.map((fixture) => (
                <FixtureListCard
                  key={fixture.id}
                  fixture={{
                    id: fixture.id,
                    match_date: fixture.match_date,
                    venue_type: fixture.venue_type,
                    venue_id: fixture.venue_id,
                    status: fixture.status,
                    school_a: fixture.school_a,
                    school_b: fixture.school_b,
                    tournament: fixture.tournament,
                  }}
                  isPredicted={!!predictionsMap[fixture.id]}
                  userPrediction={predictionsMap[fixture.id]}
                  onPredictionSubmit={handlePredictionSubmit}
                />
              ))}
            </FixtureDateGroup>
          ))}

        {viewMode === "all-schools" && !isLoading && (
          <FixtureTable fixtures={fixtures} searchQuery={searchQuery} />
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Fixtures;
