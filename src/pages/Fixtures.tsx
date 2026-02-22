import { useState, useCallback } from "react";
import { CalendarDays, Search } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { FixturesMonthNav } from "@/components/fixtures/FixturesMonthNav";
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
  
  // State
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [viewMode, setViewMode] = useState<"my-schools" | "all-schools">("my-schools");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | undefined>();
  const [selectedProvince, setSelectedProvince] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");

  // Data fetching
  const {
    fixtures,
    groupedFixtures,
    predictionsMap,
    isLoading,
    userSchoolIds,
    userId,
  } = useFixturesData({
    year: selectedYear,
    month: selectedMonth,
    viewMode,
    selectedSchoolId,
    selectedProvince,
  });

  const { data: allSchools = [], isLoading: isLoadingSchools } = useAllSchools();

  // Preload jersey images for visible fixtures
  const jerseyUrls = groupedFixtures.flatMap((group) =>
    group.fixtures.flatMap((f) => [
      f.home_school?.jersey_url,
      f.away_school?.jersey_url,
    ])
  );
  usePreloadJerseyImages(jerseyUrls);

  // Handle prediction submission
  const handlePredictionSubmit = useCallback(
    async (fixtureId: string, schoolId: string, margin: number) => {
      if (!userId) {
        toast({
          title: "Sign in required",
          description: "Please sign in to make predictions.",
          variant: "destructive",
        });
        return;
      }

      // Derive predicted_team from schoolId for DB compatibility
      const fixture = groupedFixtures.flatMap(g => g.fixtures).find(f => f.id === fixtureId);
      const predictedTeam = fixture && schoolId === fixture.home_school_id ? "home" : "away";

      try {
        // Check if prediction exists
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
        toast({
          title: "Prediction Failed",
          description: "Could not save your prediction. Please try again.",
          variant: "destructive",
        });
      }
    },
    [userId, toast]
  );

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const showEmptyMySchools = viewMode === "my-schools" && userSchoolIds.length === 0 && !isLoading;
  const showEmptyNoFixtures = !isLoading && groupedFixtures.length === 0 && !showEmptyMySchools;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Fixtures</h1>
          </div>
        </div>
      </header>

      {/* Filters */}
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

      {/* Search input for all-schools mode */}
      {viewMode === "all-schools" && (
        <div className="container mx-auto px-4 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by school name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      {/* Month Navigation */}
      <FixturesMonthNav
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onYearChange={setSelectedYear}
        onMonthChange={setSelectedMonth}
      />

      {/* Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Loading State */}
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

        {/* Empty State: No followed schools */}
        {showEmptyMySchools && (
          <div className="text-center py-12">
            <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Followed Schools</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Join a pool or follow schools to see personalized fixtures here.
              Switch to "All Schools" to browse all fixtures.
            </p>
          </div>
        )}

        {/* Empty State: No fixtures for month */}
        {showEmptyNoFixtures && (
          <div className="text-center py-12">
            <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Fixtures</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              No fixtures scheduled for {monthNames[selectedMonth]} {selectedYear}.
              Try browsing other months.
            </p>
          </div>
        )}

        {/* Fixture Groups (my-schools mode) */}
        {viewMode === "my-schools" &&
          groupedFixtures.map((group) => (
            <FixtureDateGroup
              key={group.date.toISOString()}
              date={group.date}
              fixtureCount={group.fixtures.length}
            >
              {group.fixtures.map((fixture) => (
                <FixtureListCard
                  key={fixture.id}
                  fixture={{
                    id: fixture.id,
                    match_date: fixture.match_date,
                    venue_legacy: fixture.venue_legacy,
                    venue_type: fixture.venue_type,
                    venue_id: fixture.venue_id,
                    status: fixture.status,
                    home_school: fixture.home_school,
                    away_school: fixture.away_school,
                    tournament: fixture.tournament,
                  }}
                  isPredicted={!!predictionsMap[fixture.id]}
                  userPrediction={predictionsMap[fixture.id]}
                  onPredictionSubmit={handlePredictionSubmit}
                />
              ))}
            </FixtureDateGroup>
          ))}

        {/* All schools table view */}
        {viewMode === "all-schools" && !isLoading && (
          <FixtureTable fixtures={fixtures} searchQuery={searchQuery} />
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Fixtures;
