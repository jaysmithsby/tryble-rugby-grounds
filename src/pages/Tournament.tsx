import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import GlobalHeader from "@/components/GlobalHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar, Star, Users, Trophy, Loader2, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { format, endOfYear } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { FixtureCard } from "@/components/fixtures/FixtureCard";
import { SwipeableFixtureCard } from "@/components/fixtures/SwipeableFixtureCard";
import { FixturesDateSelector } from "@/components/fixtures/FixturesDateSelector";
import { useDebounce } from "@/hooks/use-debounce";
import { resolveVenueName } from "@/lib/venueUtils";

interface Edition {
  id: string;
  tournament_id: string;
  year: number;
  start_date: string;
  end_date: string;
  host_school?: string | null;
  venue?: string | null;
  province?: string | null;
  format_notes?: string | null;
  sponsor_name?: string | null;
  sponsor_logo_url?: string | null;
  logo_url?: string | null;
  participating_schools?: string[] | null;
  is_active?: boolean | null;
}

const FIXTURES_PER_PAGE = 8;

export default function Tournament() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Core state
  const [tournamentName, setTournamentName] = useState("");
  const [parentTournamentId, setParentTournamentId] = useState<string | null>(null);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedEdition = useMemo(
    () => editions.find((e) => e.id === selectedEditionId) ?? null,
    [editions, selectedEditionId]
  );

  // Auth & follow
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Fixtures
  const [allFixtures, setAllFixtures] = useState<any[]>([]);
  const [userPredictions, setUserPredictions] = useState<Record<string, { predictedSchoolId: string; predictedMargin: number }>>({});
  const [hasHistoryMap, setHasHistoryMap] = useState<Record<string, boolean>>({});
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Filters
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ from: new Date(new Date().getFullYear(), 0, 1), to: endOfYear(new Date()) });
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [fixturesPage, setFixturesPage] = useState(1);

  // Derive participating schools from fixtures
  const participatingSchools = useMemo(() => {
    const names = new Set<string>();
    allFixtures.forEach(f => {
      if (f.school_a?.name) names.add(f.school_a.name);
      if (f.school_b?.name) names.add(f.school_b.name);
    });
    return [...names].sort();
  }, [allFixtures]);

  // Filtered fixtures
  const filteredFixtures = useMemo(() => {
    let list = allFixtures;
    if (selectedSchools.length > 0) {
      list = list.filter(f =>
        selectedSchools.includes(f.school_a?.name) ||
        selectedSchools.includes(f.school_b?.name)
      );
    }
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      return list.filter(f =>
        f.school_a?.name?.toLowerCase().includes(q) ||
        f.school_b?.name?.toLowerCase().includes(q)
      );
    }
    return list.filter(f => {
      const d = new Date(f.match_date);
      return d >= dateRange.from && d <= dateRange.to;
    });
  }, [allFixtures, selectedSchools, debouncedSearch, dateRange]);

  useEffect(() => { setFixturesPage(1); setDismissedIds(new Set()); }, [debouncedSearch, dateRange, selectedSchools]);

  const totalFixturePages = Math.max(1, Math.ceil(filteredFixtures.length / FIXTURES_PER_PAGE));
  const paginatedFixtures = filteredFixtures.slice(
    (fixturesPage - 1) * FIXTURES_PER_PAGE,
    fixturesPage * FIXTURES_PER_PAGE
  );

  // ── Resolve tournament + editions on mount ──
  useEffect(() => {
    if (tournamentId) {
      resolveTournament();
      loadUserFollowState();
    }
  }, [tournamentId]);

  // ── When selected edition changes, reload fixtures and update date range ──
  useEffect(() => {
    if (selectedEditionId) {
      fetchFixtures(selectedEditionId);
    }
  }, [selectedEditionId]);

  useEffect(() => {
    if (!selectedEdition) return;
    const start = new Date(selectedEdition.start_date);
    const end = new Date(selectedEdition.end_date);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      setDateRange({ from: start, to: end });
    } else {
      setDateRange({
        from: new Date(selectedEdition.year, 0, 1),
        to: endOfYear(new Date(selectedEdition.year, 0, 1)),
      });
    }
  }, [selectedEdition]);

  const resolveTournament = async () => {
    setLoading(true);
    try {
      // 1. Try as edition ID first
      const { data: editionData } = await supabase
        .from("tournament_editions")
        .select("*")
        .eq("id", tournamentId)
        .maybeSingle();

      let ptId: string;
      let preselectedEditionId: string | null = null;

      if (editionData) {
        // It's an edition ID — resolve parent
        ptId = (editionData as any).tournament_id;
        preselectedEditionId = (editionData as any).id;
      } else {
        // Treat as parent tournament ID
        ptId = tournamentId!;
      }

      // 2. Fetch parent tournament name
      const { data: tData, error: tError } = await supabase
        .from("tournaments")
        .select("id, name")
        .eq("id", ptId)
        .single();
      if (tError) throw tError;

      setParentTournamentId(tData.id);
      setTournamentName(tData.name);

      // 3. Fetch all editions
      const { data: allEditions, error: eError } = await supabase
        .from("tournament_editions")
        .select("*")
        .eq("tournament_id", ptId)
        .order("year", { ascending: false });
      if (eError) throw eError;

      const editionsList = (allEditions || []) as unknown as Edition[];
      setEditions(editionsList);

      // 4. Default-select edition
      if (preselectedEditionId) {
        setSelectedEditionId(preselectedEditionId);
      } else if (editionsList.length > 0) {
        // Pick latest active, or just latest
        const active = editionsList.find((e) => e.is_active);
        setSelectedEditionId(active?.id ?? editionsList[0].id);
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

  const loadUserFollowState = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !tournamentId) return;
    setCurrentUserId(user.id);

    // Follows are on parent tournament — we need to figure out the parent ID.
    // We'll check after resolveTournament sets parentTournamentId.
  };

  // Re-check follow when parentTournamentId is resolved
  useEffect(() => {
    if (currentUserId && parentTournamentId) {
      checkFollow();
    }
  }, [currentUserId, parentTournamentId]);

  const checkFollow = async () => {
    if (!currentUserId || !parentTournamentId) return;
    const { data: follow } = await supabase
      .from("user_tournament_follows")
      .select("id")
      .eq("user_id", currentUserId)
      .eq("tournament_id", parentTournamentId)
      .maybeSingle();
    setIsFollowing(!!follow);
  };

  const handleToggleFollow = async () => {
    if (!currentUserId || !parentTournamentId) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase
          .from("user_tournament_follows")
          .delete()
          .eq("user_id", currentUserId)
          .eq("tournament_id", parentTournamentId);
        setIsFollowing(false);
        sonnerToast(`Unfollowed ${tournamentName}`);
      } else {
        await supabase
          .from("user_tournament_follows")
          .insert({ user_id: currentUserId, tournament_id: parentTournamentId });
        setIsFollowing(true);
        sonnerToast(`Now following ${tournamentName}`);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setFollowLoading(false);
    }
  };

  const fetchFixtures = async (editionId: string) => {
    try {
      const { data, error } = await supabase
        .from("fixtures")
        .select(`
          id, match_date, venue_type, venue_id, school_a_id, school_b_id, status, is_derby, score_a, score_b,
          school_a:schools!fixtures_school_a_id_fkey(id, name, slug, jersey_url, province),
          school_b:schools!fixtures_school_b_id_fkey(id, name, slug, jersey_url, province)
        `)
        .eq("tournament_id", editionId)
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
      prev.includes(school) ? prev.filter(s => s !== school) : [...prev, school]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournamentName) return null;

  const logoSrc = selectedEdition?.logo_url || selectedEdition?.sponsor_logo_url;

  return (
    <div className="min-h-screen bg-background pb-20">
      <GlobalHeader />

      {/* Compact Header */}
      <div className="px-4 pt-4 pb-2 max-w-7xl mx-auto space-y-1">
        {/* Row 1: Logo + Name + Star */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted border border-border/40 flex items-center justify-center overflow-hidden shrink-0">
            {logoSrc ? (
              <img src={logoSrc} alt={tournamentName} className="w-full h-full object-cover" />
            ) : (
              <Trophy className="w-4 h-4 text-primary" />
            )}
          </div>
          <h1 className="text-lg font-bold truncate flex-1">{tournamentName}</h1>
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

        {/* Year Selector Pills */}
        {editions.length > 1 && (
          <div className="flex items-center gap-1.5 pl-11 pt-1">
            {editions.map((edition) => (
              <button
                key={edition.id}
                onClick={() => setSelectedEditionId(edition.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  edition.id === selectedEditionId
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {edition.year}
              </button>
            ))}
          </div>
        )}

        {/* Row 2: Venue + Host (from selected edition) */}
        {selectedEdition && (
          <>
            {selectedEdition.venue && (
              <p className="text-xs italic text-muted-foreground pl-11">
                {selectedEdition.venue}{selectedEdition.province && ` · ${selectedEdition.province}`}
              </p>
            )}
            {selectedEdition.host_school && (
              <p className="text-xs italic text-muted-foreground pl-11">
                Hosted by {selectedEdition.host_school}
              </p>
            )}

            {/* Row 3: Metadata */}
            <div className="flex items-center gap-4 pl-11 text-xs text-muted-foreground">
              {selectedEdition.start_date && selectedEdition.end_date && !isNaN(new Date(selectedEdition.start_date).getTime()) && !isNaN(new Date(selectedEdition.end_date).getTime()) && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(selectedEdition.start_date), "MMM d")} – {format(new Date(selectedEdition.end_date), "MMM d, yyyy")}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {participatingSchools.length} Schools
              </span>
            </div>

            {/* Sponsor banner */}
            {selectedEdition.sponsor_logo_url && (
              <div className="flex items-center gap-2 pl-11 pt-1">
                <img
                  src={selectedEdition.sponsor_logo_url}
                  alt={selectedEdition.sponsor_name || "Sponsor"}
                  className="h-5 object-contain opacity-70"
                />
                {selectedEdition.sponsor_name && (
                  <span className="text-[10px] text-muted-foreground">Sponsored by {selectedEdition.sponsor_name}</span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <main className="px-4 py-4 space-y-6 max-w-7xl mx-auto">

        {/* Format Notes */}
        {selectedEdition?.format_notes && (
          <section className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-primary" />
              Tournament Format
            </h2>
            <p className="text-xs text-muted-foreground">{selectedEdition.format_notes}</p>
          </section>
        )}

        {/* No editions message */}
        {editions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No editions found for this tournament.
          </p>
        )}

        {/* Fixtures Section */}
        {selectedEdition && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              Tournament Fixtures
              {filteredFixtures.length > 0 && (
                <span className="text-xs font-normal ml-1">({filteredFixtures.length})</span>
              )}
            </h2>

            {/* Filter row */}
            <div className="flex items-center gap-2 mb-3">
              {participatingSchools.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 px-2.5 shrink-0">
                      <Filter className="h-3.5 w-3.5" />
                      {selectedSchools.length > 0
                        ? `Schools (${selectedSchools.length}/${participatingSchools.length})`
                        : "All Schools"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3 max-h-64 overflow-y-auto" align="start">
                    <div className="space-y-2">
                      {participatingSchools.map((school) => (
                        <label key={school} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                          <Checkbox
                            checked={selectedSchools.includes(school)}
                            onCheckedChange={() => toggleSchoolFilter(school)}
                          />
                          <span className="truncate">{school}</span>
                        </label>
                      ))}
                    </div>
                    {selectedSchools.length > 0 && (
                      <button onClick={() => setSelectedSchools([])} className="text-xs text-primary mt-2 hover:underline">
                        Clear all
                      </button>
                    )}
                  </PopoverContent>
                </Popover>
              )}
              
            </div>

            {/* Fixture cards */}
            {paginatedFixtures.length > 0 ? (
              <>
                <div className="space-y-3 mt-3">
                  {paginatedFixtures.map((f) => {
                    const pred = userPredictions[f.id];
                    return (
                      <SwipeableFixtureCard
                        key={f.id}
                        fixtureId={f.id}
                        onDismiss={(id) => setDismissedIds(prev => new Set(prev).add(id))}
                      >
                        <FixtureCard
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
                          tournamentName={tournamentName}
                          matchId={f.id}
                          isPredicted={isFollowing ? !!pred : undefined}
                          predictedSchoolId={isFollowing ? pred?.predictedSchoolId : undefined}
                          predictedMargin={isFollowing ? pred?.predictedMargin : undefined}
                          onPredictionMade={isFollowing ? (schoolId, margin) => {
                            setUserPredictions(prev => ({
                              ...prev,
                              [f.id]: { predictedSchoolId: schoolId, predictedMargin: margin }
                            }));
                          } : undefined}
                          hasHistory={hasHistoryMap[f.id]}
                        />
                      </SwipeableFixtureCard>
                    );
                  })}
                </div>

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
        )}

        {/* Sponsor footer */}
        {selectedEdition?.sponsor_logo_url && (
          <section className="flex flex-col items-center gap-2 py-4">
            <img
              src={selectedEdition.sponsor_logo_url}
              alt={selectedEdition.sponsor_name || "Sponsor"}
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
