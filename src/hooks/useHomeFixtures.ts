/**
 * Hook for fetching home page fixtures data with React Query caching
 * 
 * Provides cached fixture data for the home page, including:
 * - Upcoming fixtures from followed pools
 * - Recent completed fixtures
 * - User's school fixture for the current weekend
 * - Tournament fixtures from followed tournaments (merged chronologically)
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_TIMES } from "@/lib/queryConfig";

export interface FixtureWithSchools {
  id: string;
  match_date: string;
  venue: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  is_derby: boolean | null;
  home_school: {
    id: string;
    name: string;
    slug: string;
    jersey_url: string | null;
  };
  away_school: {
    id: string;
    name: string;
    slug: string;
    jersey_url: string | null;
  };
}

interface UseHomeFixturesParams {
  userId: string | null;
  userSchoolName: string | null;
  effectiveDate: Date;
  weekendStart: Date;
  weekendEnd: Date;
  seasonYear: number;
  profileLoaded: boolean;
}

interface UseHomeFixturesResult {
  upcomingFixtures: FixtureWithSchools[];
  recentFixtures: FixtureWithSchools[];
  userSchoolFixture: FixtureWithSchools | null;
  hasNoPools: boolean;
  fixturesLoading: boolean;
  tournamentFixtures: FixtureWithSchools[];
}

export function useHomeFixtures({
  userId,
  userSchoolName,
  effectiveDate,
  weekendStart,
  weekendEnd,
  seasonYear,
  profileLoaded,
}: UseHomeFixturesParams): UseHomeFixturesResult {
  // Use stable timestamps for query keys to prevent unnecessary refetches
  const effectiveDateStr = effectiveDate.toISOString().split("T")[0];
  const weekendStartStr = weekendStart.toISOString().split("T")[0];
  const weekendEndStr = weekendEnd.toISOString().split("T")[0];

  // Fetch user's pool school IDs
  const { data: poolData } = useQuery({
    queryKey: ["home-pool-schools", userId],
    queryFn: async () => {
      if (!userId) return { poolSchoolIds: [], hasNoPools: true };

      const { data: poolMemberships } = await supabase
        .from("pool_members")
        .select("pool_id")
        .eq("user_id", userId);

      if (!poolMemberships || poolMemberships.length === 0) {
        return { poolSchoolIds: [], hasNoPools: true };
      }

      const poolIds = poolMemberships.map((pm) => pm.pool_id);
      const { data: pools } = await supabase
        .from("pools")
        .select("schools")
        .in("id", poolIds)
        .eq("is_active", true);

      if (!pools) return { poolSchoolIds: [], hasNoPools: false };

      const poolSchoolNames = pools
        .flatMap((p) => p.schools || [])
        .filter((name, index, self) => self.indexOf(name) === index);

      if (poolSchoolNames.length === 0) {
        return { poolSchoolIds: [], hasNoPools: false };
      }

      const { data: schoolsData } = await supabase
        .from("schools")
        .select("id")
        .in("name", poolSchoolNames);

      return {
        poolSchoolIds: schoolsData?.map((s) => s.id) || [],
        hasNoPools: false,
      };
    },
    enabled: !!userId && profileLoaded,
    staleTime: CACHE_TIMES.REFERENCE, // Pool memberships don't change often
  });

  const poolSchoolIds = poolData?.poolSchoolIds || [];
  const hasNoPools = poolData?.hasNoPools ?? true;

  // Fetch upcoming fixtures
  const { data: upcomingFixtures = [], isLoading: upcomingLoading } = useQuery({
    queryKey: ["home-upcoming-fixtures", seasonYear, effectiveDateStr, poolSchoolIds],
    queryFn: async () => {
      const now = effectiveDate.toISOString();

      const { data, error } = await supabase
        .from("fixtures")
        .select(`
          id,
          match_date,
          venue,
          status,
          home_score,
          away_score,
          is_derby,
          home_school_id,
          away_school_id,
          home_school:schools!fixtures_home_school_id_fkey(id, name, slug, jersey_url),
          away_school:schools!fixtures_away_school_id_fkey(id, name, slug, jersey_url)
        `)
        .eq("is_visible", true)
        .eq("status", "upcoming")
        .eq("year", seasonYear)
        .gte("match_date", now)
        .order("match_date", { ascending: true })
        .limit(20);

      if (error) {
        console.error("Error fetching upcoming fixtures:", error);
        return [];
      }

      let filtered = data || [];
      if (poolSchoolIds.length > 0) {
        filtered = filtered.filter(
          (f) =>
            poolSchoolIds.includes(f.home_school_id) ||
            poolSchoolIds.includes(f.away_school_id)
        );
      }

      return filtered.slice(0, 10).map((f) => ({
        id: f.id,
        match_date: f.match_date,
        venue: f.venue,
        status: f.status,
        home_score: f.home_score,
        away_score: f.away_score,
        is_derby: f.is_derby,
        home_school: f.home_school as unknown as FixtureWithSchools["home_school"],
        away_school: f.away_school as unknown as FixtureWithSchools["away_school"],
      }));
    },
    enabled: !!userId && profileLoaded,
    staleTime: CACHE_TIMES.DYNAMIC, // Fixtures update during match days
  });

  // Fetch recent completed fixtures
  const { data: recentFixtures = [], isLoading: recentLoading } = useQuery({
    queryKey: ["home-recent-fixtures", seasonYear, effectiveDateStr],
    queryFn: async () => {
      const now = effectiveDate.toISOString();
      const sevenDaysAgo = new Date(
        effectiveDate.getTime() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data, error } = await supabase
        .from("fixtures")
        .select(`
          id,
          match_date,
          venue,
          status,
          home_score,
          away_score,
          is_derby,
          home_school:schools!fixtures_home_school_id_fkey(id, name, slug, jersey_url),
          away_school:schools!fixtures_away_school_id_fkey(id, name, slug, jersey_url)
        `)
        .eq("is_visible", true)
        .eq("status", "completed")
        .eq("year", seasonYear)
        .gte("match_date", sevenDaysAgo)
        .lte("match_date", now)
        .order("match_date", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching recent fixtures:", error);
        return [];
      }

      return (data || []).map((f) => ({
        ...f,
        home_school: f.home_school as unknown as FixtureWithSchools["home_school"],
        away_school: f.away_school as unknown as FixtureWithSchools["away_school"],
      }));
    },
    enabled: !!userId && profileLoaded,
    staleTime: CACHE_TIMES.DYNAMIC,
  });

  // Fetch user's school fixture for this weekend
  const { data: userSchoolFixture = null } = useQuery({
    queryKey: ["home-user-school-fixture", userSchoolName, weekendStartStr, weekendEndStr, seasonYear],
    queryFn: async () => {
      if (!userSchoolName) return null;

      const { data: schoolData } = await supabase
        .from("schools")
        .select("id")
        .eq("name", userSchoolName)
        .maybeSingle();

      if (!schoolData) return null;

      const { data: fixture } = await supabase
        .from("fixtures")
        .select(`
          id,
          match_date,
          venue,
          status,
          home_score,
          away_score,
          is_derby,
          home_school:schools!fixtures_home_school_id_fkey(id, name, slug, jersey_url),
          away_school:schools!fixtures_away_school_id_fkey(id, name, slug, jersey_url)
        `)
        .eq("is_visible", true)
        .eq("year", seasonYear)
        .or(`home_school_id.eq.${schoolData.id},away_school_id.eq.${schoolData.id}`)
        .gte("match_date", weekendStart.toISOString())
        .lte("match_date", weekendEnd.toISOString())
        .order("match_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!fixture) return null;

      return {
        ...fixture,
        home_school: fixture.home_school as unknown as FixtureWithSchools["home_school"],
        away_school: fixture.away_school as unknown as FixtureWithSchools["away_school"],
      };
    },
    enabled: !!userId && !!userSchoolName && profileLoaded,
    staleTime: CACHE_TIMES.DYNAMIC,
  });

  // Fetch user's followed tournament IDs
  const { data: tournamentData } = useQuery({
    queryKey: ["home-tournament-follows", userId],
    queryFn: async () => {
      if (!userId) return { tournamentIds: [] };

      const { data: follows } = await supabase
        .from("user_tournament_follows")
        .select("tournament_id")
        .eq("user_id", userId);

      return {
        tournamentIds: follows?.map(f => f.tournament_id) || []
      };
    },
    enabled: !!userId && profileLoaded,
    staleTime: CACHE_TIMES.REFERENCE,
  });

  // Fetch fixtures for followed tournaments
  const { data: rawTournamentFixtures = [], isLoading: tournamentLoading } = useQuery({
    queryKey: ["home-tournament-fixtures", seasonYear, effectiveDateStr, tournamentData?.tournamentIds],
    queryFn: async () => {
      const tournamentIds = tournamentData?.tournamentIds || [];
      if (tournamentIds.length === 0) return [];

      const now = effectiveDate.toISOString();

      const { data, error } = await supabase
        .from("fixtures")
        .select(`
          id,
          match_date,
          venue,
          status,
          home_score,
          away_score,
          is_derby,
          home_school_id,
          away_school_id,
          home_school:schools!fixtures_home_school_id_fkey(id, name, slug, jersey_url),
          away_school:schools!fixtures_away_school_id_fkey(id, name, slug, jersey_url)
        `)
        .eq("is_visible", true)
        .eq("status", "upcoming")
        .eq("year", seasonYear)
        .in("tournament_id", tournamentIds)
        .gte("match_date", now)
        .order("match_date", { ascending: true })
        .limit(20);

      if (error) {
        console.error("Error fetching tournament fixtures:", error);
        return [];
      }

      return (data || []).map((f) => ({
        id: f.id,
        match_date: f.match_date,
        venue: f.venue,
        status: f.status,
        home_score: f.home_score,
        away_score: f.away_score,
        is_derby: f.is_derby,
        home_school: f.home_school as unknown as FixtureWithSchools["home_school"],
        away_school: f.away_school as unknown as FixtureWithSchools["away_school"],
      }));
    },
    enabled: (tournamentData?.tournamentIds?.length ?? 0) > 0,
    staleTime: CACHE_TIMES.DYNAMIC,
  });

  // Merge and deduplicate all upcoming fixtures (pools/school + tournaments)
  const mergedUpcomingFixtures = useMemo(() => {
    const existingIds = new Set(upcomingFixtures.map(f => f.id));
    
    // Add tournament fixtures that aren't already in the pool/school fixtures
    const uniqueTournamentFixtures = rawTournamentFixtures.filter(
      tf => !existingIds.has(tf.id)
    );
    
    const allFixtures = [...upcomingFixtures, ...uniqueTournamentFixtures];
    
    // Sort chronologically and limit to 10
    return allFixtures
      .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
      .slice(0, 10);
  }, [upcomingFixtures, rawTournamentFixtures]);

  const fixturesLoading = upcomingLoading || recentLoading || tournamentLoading;

  return {
    upcomingFixtures: mergedUpcomingFixtures,
    recentFixtures,
    userSchoolFixture,
    hasNoPools,
    fixturesLoading,
    tournamentFixtures: rawTournamentFixtures,
  };
}
