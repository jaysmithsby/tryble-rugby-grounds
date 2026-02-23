import { useState, useEffect, useCallback, useMemo } from "react";
import { RecentResultsTable } from "@/components/fixtures/RecentResultsTable";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Star, Users, Trophy, Search, X } from "lucide-react";
import { FixtureTable } from "@/components/fixtures/FixtureTable";
import { FixtureCard } from "@/components/fixtures/FixtureCard";
import { FixturesMonthNav } from "@/components/fixtures/FixturesMonthNav";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import GlobalHeader from "@/components/GlobalHeader";
import { resolveVenueName } from "@/lib/venueUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function SchoolProfile() {
  const { schoolSlug } = useParams();
  const { toast } = useToast();
  const [school, setSchool] = useState<any>(null);
  const [allUpcomingFixtures, setAllUpcomingFixtures] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [primarySchoolId, setPrimarySchoolId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [hasHistoryMap, setHasHistoryMap] = useState<Record<string, boolean>>({});
  const [userPredictions, setUserPredictions] = useState<Record<string, { predictedSchoolId: string; predictedMargin: number }>>({});

  // Search & month nav state
  const [searchQuery, setSearchQuery] = useState("");
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Filtered fixtures
  const filteredFixtures = useMemo(() => {
    if (!school) return [];
    if (debouncedSearch) {
      return allUpcomingFixtures.filter(f => {
        const opponent = f.school_a_id === school.id ? f.school_b : f.school_a;
        return opponent?.name?.toLowerCase().includes(debouncedSearch.toLowerCase());
      });
    }
    return allUpcomingFixtures.filter(f => {
      const d = new Date(f.match_date);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [allUpcomingFixtures, debouncedSearch, selectedYear, selectedMonth, school]);

  useEffect(() => {
    loadSchoolData();
    loadUserFollowState();
  }, [schoolSlug]);

  const loadUserFollowState = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !schoolSlug) return;
    setCurrentUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();
    setPrimarySchoolId(profile?.school_id || null);

    const { data: schoolData } = await supabase
      .from("schools")
      .select("id")
      .eq("slug", schoolSlug)
      .maybeSingle();
    if (!schoolData) return;

    const { data: follow } = await supabase
      .from("user_school_follows")
      .select("id")
      .eq("user_id", user.id)
      .eq("school_id", schoolData.id)
      .maybeSingle();
    setIsFollowing(!!follow);
  };

  const handleToggleFollow = async () => {
    if (!currentUserId || !school) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase
          .from("user_school_follows")
          .delete()
          .eq("user_id", currentUserId)
          .eq("school_id", school.id);
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        sonnerToast(`Unfollowed ${school.name}`);
      } else {
        await supabase
          .from("user_school_follows")
          .insert({ user_id: currentUserId, school_id: school.id });
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        sonnerToast(`Now following ${school.name}`);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setFollowLoading(false);
    }
  };

  const loadMatchHistory = useCallback(async (fixtures: any[]) => {
    const map: Record<string, boolean> = {};
    await Promise.all(
      fixtures.map(async (f) => {
        const aId = f.school_a_id;
        const bId = f.school_b_id;
        const { count } = await supabase
          .from("fixtures")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed")
          .or(`and(school_a_id.eq.${aId},school_b_id.eq.${bId}),and(school_a_id.eq.${bId},school_b_id.eq.${aId})`);
        map[f.id] = (count ?? 0) > 0;
      })
    );
    setHasHistoryMap(map);
  }, []);

  const loadPredictions = useCallback(async (fixtureIds: string[], userId: string) => {
    if (fixtureIds.length === 0) return;
    const { data } = await supabase
      .from("predictions")
      .select("fixture_id, predicted_school_id, predicted_margin")
      .eq("user_id", userId)
      .in("fixture_id", fixtureIds);
    if (data) {
      const preds: Record<string, { predictedSchoolId: string; predictedMargin: number }> = {};
      data.forEach((p) => {
        preds[p.fixture_id] = { predictedSchoolId: p.predicted_school_id, predictedMargin: p.predicted_margin };
      });
      setUserPredictions(preds);
    }
  }, []);

  const loadSchoolData = async () => {
    if (!schoolSlug) return;
    
    setLoading(true);
    try {
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("*")
        .eq("slug", schoolSlug)
        .maybeSingle();

      if (schoolError) throw schoolError;
      setSchool(schoolData);

      if (!schoolData) return;

      const schoolId = schoolData.id;

      // Follower count
      const { count: fCount } = await supabase
        .from("user_school_follows")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId);
      setFollowerCount(fCount ?? 0);

      const { data: upcomingData } = await supabase
        .from("fixtures")
        .select(`
          id, match_date, venue_type, venue_id, school_a_id, school_b_id, status, is_derby,
          school_a:schools!fixtures_school_a_id_fkey(id, name, slug, jersey_url, province),
          school_b:schools!fixtures_school_b_id_fkey(id, name, slug, jersey_url, province),
          tournament:tournaments(id, name)
        `)
        .or(`school_a_id.eq.${schoolId},school_b_id.eq.${schoolId}`)
        .in("status", ["upcoming", "holding"])
        .order("match_date", { ascending: true });

      const upcoming = (upcomingData || []) as any[];
      setAllUpcomingFixtures(upcoming);

      // Load history map for all fixtures
      loadMatchHistory(upcoming);

      // Load predictions for all fixtures if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (user && upcoming.length > 0) {
        loadPredictions(upcoming.map(f => f.id), user.id);
      }

    } catch (error: any) {
      toast({
        title: "Error loading school",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading school profile...</p>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">School not found</p>
      </div>
    );
  }

  const isPrimarySchool = primarySchoolId === school.id;
  const showInteractive = isFollowing || isPrimarySchool;
  const logoSrc = school.emblem_url || school.jersey_url || school.icon_url;

  return (
    <div className="min-h-screen bg-background pb-20">
      <GlobalHeader />

      <div className="px-4 pt-4 pb-2 max-w-7xl mx-auto space-y-1">
        {/* Row 1: Logo + Name + Star */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted border border-border/40 flex items-center justify-center overflow-hidden shrink-0">
            {logoSrc ? (
              <img src={logoSrc} alt={school.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-primary">
                {school.name?.substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <h1 className="text-lg font-bold truncate flex-1">{school.name}</h1>
          {currentUserId && (
            isPrimarySchool ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Star className="w-5 h-5 text-primary fill-primary shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>Primary School</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <button
                type="button"
                onClick={handleToggleFollow}
                disabled={followLoading}
                className="shrink-0 p-1 hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                <Star className={`w-5 h-5 ${isFollowing ? "text-primary fill-primary" : "text-muted-foreground"}`} />
              </button>
            )
          )}
        </div>

        {/* Row 2: Motto */}
        {school.motto && (
          <p className="text-xs italic text-muted-foreground pl-11">"{school.motto}"</p>
        )}

        {/* Row 3: Metadata */}
        {(school.province || school.established_year) && (
          <p className="text-xs text-muted-foreground pl-11">
            {[school.province, school.established_year ? `Est. ${school.established_year}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}

        {/* Inline Stats */}
        <div className="flex items-center gap-4 pl-11 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {followerCount} Followers
          </span>
          <span className="flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5" />
            {school.springboks_count ?? 0} Springboks
          </span>
        </div>
      </div>

      <main className="px-4 py-4 space-y-6 max-w-7xl mx-auto">

        {/* Upcoming Fixtures */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Upcoming Fixtures</h2>

          {/* Search bar */}
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search opponent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Month/Year nav (hidden during search) */}
          {!debouncedSearch && (
            <FixturesMonthNav
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onYearChange={setSelectedYear}
              onMonthChange={setSelectedMonth}
            />
          )}

          {/* Fixture list or empty state */}
          {filteredFixtures.length > 0 ? (
            <div className="space-y-3 mt-3">
              {filteredFixtures.map((f) => {
                const pred = userPredictions[f.id];
                return showInteractive ? (
                  <FixtureCard
                    key={f.id}
                    homeTeam={f.school_a?.name || "TBD"}
                    awayTeam={f.school_b?.name || "TBD"}
                    homeTeamShort={f.school_a?.name?.substring(0, 3) || "TBD"}
                    awayTeamShort={f.school_b?.name?.substring(0, 3) || "TBD"}
                    homeTeamIcon={f.school_a?.jersey_url}
                    awayTeamIcon={f.school_b?.jersey_url}
                    homeSchoolId={f.school_a_id}
                    awaySchoolId={f.school_b_id}
                    homeSchoolSlug={f.school_a?.slug}
                    awaySchoolSlug={f.school_b?.slug}
                    matchDate={f.match_date}
                    time=""
                    venue={resolveVenueName(f)}
                    tournamentName={f.tournament?.name}
                    matchId={f.id}
                    isPredicted={!!pred}
                    predictedSchoolId={pred?.predictedSchoolId}
                    predictedMargin={pred?.predictedMargin}
                    onPredictionMade={(schoolId, margin) => {
                      setUserPredictions(prev => ({
                        ...prev,
                        [f.id]: { predictedSchoolId: schoolId, predictedMargin: margin }
                      }));
                    }}
                    hasHistory={hasHistoryMap[f.id]}
                  />
                ) : (
                  <FixtureCard
                    key={f.id}
                    homeTeam={f.school_a?.name || "TBD"}
                    awayTeam={f.school_b?.name || "TBD"}
                    homeTeamShort={f.school_a?.name?.substring(0, 3) || "TBD"}
                    awayTeamShort={f.school_b?.name?.substring(0, 3) || "TBD"}
                    homeTeamIcon={f.school_a?.jersey_url}
                    awayTeamIcon={f.school_b?.jersey_url}
                    homeSchoolId={f.school_a_id}
                    awaySchoolId={f.school_b_id}
                    homeSchoolSlug={f.school_a?.slug}
                    awaySchoolSlug={f.school_b?.slug}
                    matchDate={f.match_date}
                    time=""
                    venue={resolveVenueName(f)}
                    tournamentName={f.tournament?.name}
                    matchId={f.id}
                    hasHistory={hasHistoryMap[f.id]}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">
              {debouncedSearch
                ? `No fixtures found for '${debouncedSearch}'`
                : `No fixtures in ${MONTHS[selectedMonth]} ${selectedYear}`}
            </p>
          )}
        </section>

        {/* Recent Results */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Recent Results</h2>
          <RecentResultsTable schoolId={school.id} />
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
