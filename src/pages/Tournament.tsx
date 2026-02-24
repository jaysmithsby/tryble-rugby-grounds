import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import GlobalHeader from "@/components/GlobalHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar, Star, Users, Trophy, Loader2, Search, X, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { format, startOfYear, endOfYear } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { FixtureCard } from "@/components/fixtures/FixtureCard";
import { FixturesDateSelector } from "@/components/fixtures/FixturesDateSelector";
import { useDebounce } from "@/hooks/use-debounce";
import { resolveVenueName } from "@/lib/venueUtils";

interface Tournament {
  id: string;
  name: string;
  // Edition-level fields
  host_school?: string | null;
  venue?: string | null;
  province?: string | null;
  format_notes?: string | null;
  sponsor_name?: string | null;
  sponsor_logo_url?: string | null;
  logo_url?: string | null;
  start_date?: string;
  end_date?: string;
  participating_schools?: string[];
  is_active?: boolean;
  edition_id?: string;
}

const FIXTURES_PER_PAGE = 8;

export default function Tournament() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [allFixtures, setAllFixtures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth & follow
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Predictions & history
  const [userPredictions, setUserPredictions] = useState<Record<string, { predictedSchoolId: string; predictedMargin: number }>>({});
  const [hasHistoryMap, setHasHistoryMap] = useState<Record<string, boolean>>({});

  // Filters
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ from: new Date(2026, 0, 1), to: endOfYear(new Date(2026, 0, 1)) });
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [fixturesPage, setFixturesPage] = useState(1);

  // Filtered fixtures
  const filteredFixtures = useMemo(() => {
    let list = allFixtures;

    // Multi-school filter
    if (selectedSchools.length > 0) {
      list = list.filter(f =>
        selectedSchools.includes(f.school_a?.name) ||
        selectedSchools.includes(f.school_b?.name)
      );
    }

    // Search filter (overrides date)
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      return list.filter(f =>
        f.school_a?.name?.toLowerCase().includes(q) ||
        f.school_b?.name?.toLowerCase().includes(q)
      );
    }

    // Date range filter
    return list.filter(f => {
      const d = new Date(f.match_date);
      return d >= dateRange.from && d <= dateRange.to;
    });
  }, [allFixtures, selectedSchools, debouncedSearch, dateRange]);

  // Reset page on filter changes
  useEffect(() => {
    setFixturesPage(1);
  }, [debouncedSearch, dateRange, selectedSchools]);

  const totalFixturePages = Math.max(1, Math.ceil(filteredFixtures.length / FIXTURES_PER_PAGE));
  const paginatedFixtures = filteredFixtures.slice(
    (fixturesPage - 1) * FIXTURES_PER_PAGE,
    fixturesPage * FIXTURES_PER_PAGE
  );

  useEffect(() => {
    if (tournamentId) {
      fetchTournament();
      fetchFixtures();
      loadUserFollowState();
    }
  }, [tournamentId]);

  const loadUserFollowState = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !tournamentId) return;
    setCurrentUserId(user.id);

    const { data: follow } = await supabase
      .from("user_tournament_follows")
      .select("id")
      .eq("user_id", user.id)
      .eq("tournament_id", tournamentId)
      .maybeSingle();
    setIsFollowing(!!follow);
  };

  const handleToggleFollow = async () => {
    if (!currentUserId || !tournament) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase
          .from("user_tournament_follows")
          .delete()
          .eq("user_id", currentUserId)
          .eq("tournament_id", tournament.id);
        setIsFollowing(false);
        sonnerToast(`Unfollowed ${tournament.name}`);
      } else {
        await supabase
          .from("user_tournament_follows")
          .insert({ user_id: currentUserId, tournament_id: tournament.id });
        setIsFollowing(true);
        sonnerToast(`Now following ${tournament.name}`);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setFollowLoading(false);
    }
  };

  const fetchTournament = async () => {
    try {
      // tournamentId could be an edition ID — try edition first, then tournament
      const { data: editionData } = await supabase
        .from("tournament_editions" as any)
        .select("*")
        .eq("id", tournamentId)
        .single();

      if (editionData) {
        const edition = editionData as any;
        const { data: tData, error: tError } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", edition.tournament_id)
          .single();
        if (tError) throw tError;
        setTournament({
          id: tData.id,
          name: tData.name,
          host_school: edition.host_school,
          venue: edition.venue,
          province: edition.province,
          format_notes: edition.format_notes,
          sponsor_name: edition.sponsor_name,
          sponsor_logo_url: edition.sponsor_logo_url,
          logo_url: edition.logo_url,
          start_date: edition.start_date,
          end_date: edition.end_date,
          participating_schools: edition.participating_schools || [],
          is_active: edition.is_active,
          edition_id: edition.id,
        });
      } else {
        // Fallback: try as tournament ID directly
        const { data, error } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", tournamentId)
          .single();
        if (error) throw error;
        setTournament({ id: data.id, name: data.name });
      }
    } catch (error) {
      console.error("Error fetching tournament:", error);
      toast({
        title: "Failed to Load Tournament",
        description: "Could not retrieve tournament details. Returning to home.",
        variant: "destructive",
      });
      navigate("/home");
    } finally {
      setLoading(false);
    }
  };

  const fetchFixtures = async () => {
    try {
      const { data, error } = await supabase
        .from("fixtures")
        .select(`
          id, match_date, venue_type, venue_id, school_a_id, school_b_id, status, is_derby,
          school_a:schools!fixtures_school_a_id_fkey(id, name, slug, jersey_url, province),
          school_b:schools!fixtures_school_b_id_fkey(id, name, slug, jersey_url, province),
          tournament:tournaments(id, name)
        `)
        .eq("tournament_id", tournamentId)
        .order("match_date", { ascending: true });

      if (error) throw error;
      const fixtures = (data || []) as any[];
      setAllFixtures(fixtures);

      loadMatchHistory(fixtures);

      const { data: { user } } = await supabase.auth.getUser();
      if (user && fixtures.length > 0) {
        loadPredictions(fixtures.map(f => f.id), user.id);
      }
    } catch (error) {
      console.error("Error fetching fixtures:", error);
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

  const toggleSchoolFilter = (school: string) => {
    setSelectedSchools(prev =>
      prev.includes(school)
        ? prev.filter(s => s !== school)
        : [...prev, school]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournament) {
    return null;
  }

  const logoSrc = tournament.logo_url || tournament.sponsor_logo_url;
  const participatingSchools = tournament.participating_schools || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <GlobalHeader />

      {/* Compact Header */}
      <div className="px-4 pt-4 pb-2 max-w-7xl mx-auto space-y-1">
        {/* Row 1: Logo + Name + Star */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted border border-border/40 flex items-center justify-center overflow-hidden shrink-0">
            {logoSrc ? (
              <img src={logoSrc} alt={tournament.name} className="w-full h-full object-cover" />
            ) : (
              <Trophy className="w-4 h-4 text-primary" />
            )}
          </div>
          <h1 className="text-lg font-bold truncate flex-1">{tournament.name}</h1>
          {currentUserId && (
            <button
              type="button"
              onClick={handleToggleFollow}
              disabled={followLoading}
              className="shrink-0 p-1 hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              <Star className={`w-5 h-5 ${isFollowing ? "text-primary fill-primary" : "text-muted-foreground"}`} />
            </button>
          )}
        </div>

        {/* Row 2: Venue + Host */}
        <p className="text-xs italic text-muted-foreground pl-11">
          {tournament.venue}{tournament.province && ` · ${tournament.province}`}
        </p>
        <p className="text-xs italic text-muted-foreground pl-11">
          Hosted by {tournament.host_school}
        </p>

        {/* Row 3: Metadata */}
        <div className="flex items-center gap-4 pl-11 text-xs text-muted-foreground">
          {tournament.start_date && tournament.end_date && !isNaN(new Date(tournament.start_date).getTime()) && !isNaN(new Date(tournament.end_date).getTime()) && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(tournament.start_date), "MMM d")} – {format(new Date(tournament.end_date), "MMM d, yyyy")}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {participatingSchools.length} Schools
          </span>
        </div>

        {/* Sponsor banner (compact) */}
        {tournament.sponsor_logo_url && (
          <div className="flex items-center gap-2 pl-11 pt-1">
            <img
              src={tournament.sponsor_logo_url}
              alt={tournament.sponsor_name || "Sponsor"}
              className="h-5 object-contain opacity-70"
            />
            {tournament.sponsor_name && (
              <span className="text-[10px] text-muted-foreground">Sponsored by {tournament.sponsor_name}</span>
            )}
          </div>
        )}
      </div>

      <main className="px-4 py-4 space-y-6 max-w-7xl mx-auto">

        {/* Format Notes (collapsible) */}
        {tournament.format_notes && (
          <section className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-primary" />
              Tournament Format
            </h2>
            <p className="text-xs text-muted-foreground">{tournament.format_notes}</p>
          </section>
        )}

        {/* Fixtures Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Tournament Fixtures
            {filteredFixtures.length > 0 && (
              <span className="text-xs font-normal ml-1">({filteredFixtures.length})</span>
            )}
          </h2>

          {/* Filter row: School filter + Search + Date picker */}
          <div className="flex items-center gap-2 mb-3">
            {/* Multi-school filter */}
            {participatingSchools.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-8 px-2.5 shrink-0"
                  >
                    <Filter className="h-3.5 w-3.5" />
                    {selectedSchools.length > 0
                      ? `Schools (${selectedSchools.length}/${participatingSchools.length})`
                      : "All Schools"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 max-h-64 overflow-y-auto" align="start">
                  <div className="space-y-2">
                    {participatingSchools.map((school) => (
                      <label
                        key={school}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
                      >
                        <Checkbox
                          checked={selectedSchools.includes(school)}
                          onCheckedChange={() => toggleSchoolFilter(school)}
                        />
                        <span className="truncate">{school}</span>
                      </label>
                    ))}
                  </div>
                  {selectedSchools.length > 0 && (
                    <button
                      onClick={() => setSelectedSchools([])}
                      className="text-xs text-primary mt-2 hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </PopoverContent>
              </Popover>
            )}

            {/* Date selector */}
            <FixturesDateSelector
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          </div>

          {/* Fixture cards */}
          {paginatedFixtures.length > 0 ? (
            <>
              <div className="space-y-3 mt-3">
                {paginatedFixtures.map((f) => {
                  const pred = userPredictions[f.id];
                  return isFollowing ? (
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
                : "No fixtures in this range"}
            </p>
          )}
        </section>


        {/* Sponsor footer (compact) */}
        {tournament.sponsor_logo_url && (
          <section className="flex flex-col items-center gap-2 py-4">
            <img
              src={tournament.sponsor_logo_url}
              alt={tournament.sponsor_name || "Sponsor"}
              className="h-10 object-contain opacity-60"
            />
            <p className="text-[10px] text-muted-foreground text-center">
              Thank you to our sponsor for making this tournament possible
            </p>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
