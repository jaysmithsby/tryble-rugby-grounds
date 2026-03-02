import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { RecentResultsTable } from "@/components/fixtures/RecentResultsTable";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Star, Users, Trophy, Search, X, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { FixtureTable } from "@/components/fixtures/FixtureTable";
import { FixtureCard } from "@/components/fixtures/FixtureCard";
import { FixturesDateSelector } from "@/components/fixtures/FixturesDateSelector";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import GlobalHeader from "@/components/GlobalHeader";
import { resolveVenueName } from "@/lib/venueUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { SpringboksTable } from "@/components/school/SpringboksTable";

import { startOfYear, endOfYear, format } from "date-fns";

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
  const [springboksCount, setSpringboksCount] = useState<number | null>(null);
  const [springboksOpen, setSpringboksOpen] = useState(false);
  const springboksRef = useRef<HTMLDivElement>(null);

  // Search & month nav state
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ from: new Date(2026, 0, 1), to: endOfYear(new Date(2026, 0, 1)) });
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [fixturesPage, setFixturesPage] = useState(1);
  const FIXTURES_PER_PAGE = 8;

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
      return d >= dateRange.from && d <= dateRange.to;
    });
  }, [allUpcomingFixtures, debouncedSearch, dateRange, school]);

  // Reset page when filters change
  useEffect(() => {
    setFixturesPage(1);
  }, [debouncedSearch, dateRange]);

  const totalFixturePages = Math.max(1, Math.ceil(filteredFixtures.length / FIXTURES_PER_PAGE));
  const paginatedFixtures = filteredFixtures.slice(
    (fixturesPage - 1) * FIXTURES_PER_PAGE,
    fixturesPage * FIXTURES_PER_PAGE
  );

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
    if (fixtures.length === 0) return;
    const { data, error } = await supabase.rpc("get_match_history_batch", {
      p_fixture_ids: fixtures.map(f => f.id),
    });
    if (error || !data) { setHasHistoryMap({}); return; }
    const map: Record<string, boolean> = {};
    (data as { fixture_id: string; has_history: boolean }[]).forEach((row) => {
      map[row.fixture_id] = row.has_history;
    });
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
          tournament_edition:tournament_editions(id, tournament:tournaments(id, name))
        `)
        .eq("is_visible", true)
        .eq("venue_type", "school")
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
          <button
            type="button"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={() => {
              setSpringboksOpen(true);
              setTimeout(() => springboksRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            }}
          >
            <Trophy className="w-3.5 h-3.5" />
            {springboksCount ?? school.springboks_count ?? 0} Springboks
          </button>
        </div>
      </div>

      <main className="px-4 py-4 space-y-6 max-w-7xl mx-auto">

        {/* Upcoming Fixtures */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Upcoming Fixtures</h2>

          {/* Inline search + date picker row */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search school..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-sm rounded-full border-border"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {!debouncedSearch && (
              <FixturesDateSelector
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            )}
          </div>

          {/* Fixture list or empty state */}
          {paginatedFixtures.length > 0 ? (
            <>
              <div className="space-y-3 mt-3">
                {paginatedFixtures.map((f) => {
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
                      tournamentName={f.tournament_edition?.tournament?.name}
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
                      tournamentName={f.tournament_edition?.tournament?.name}
                      matchId={f.id}
                      hasHistory={hasHistoryMap[f.id]}
                    />
                  );
                })}
              </div>
              {/* Pagination */}
              {totalFixturePages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => setFixturesPage(p => Math.max(1, p - 1))}
                    disabled={fixturesPage === 1}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Prev
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {fixturesPage} / {totalFixturePages}
                  </span>
                  <button
                    onClick={() => setFixturesPage(p => Math.min(totalFixturePages, p + 1))}
                    disabled={fixturesPage === totalFixturePages}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">
              {debouncedSearch
                ? `No fixtures found for '${debouncedSearch}'`
                : `No fixtures in ${format(dateRange.from, "yyyy")}`}
            </p>
          )}
        </section>

        {/* Recent Results */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Recent Results</h2>
          <RecentResultsTable schoolId={school.id} />
        </section>

        {/* Springboks */}
        <section ref={springboksRef}>
          <Collapsible open={springboksOpen} onOpenChange={setSpringboksOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 group">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Springboks ({springboksCount ?? school.springboks_count ?? 0})
              </h2>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${springboksOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SpringboksTable schoolId={school.id} onCountLoaded={setSpringboksCount} />
            </CollapsibleContent>
          </Collapsible>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
