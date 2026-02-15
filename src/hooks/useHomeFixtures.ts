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
  tournament_id: string | null;
  tournament_name: string | null;
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

const FIXTURE_SELECT = `
  id,
  match_date,
  venue,
  status,
  home_score,
  away_score,
  is_derby,
  tournament_id,
  home_school_id,
  away_school_id,
  home_school:schools!fixtures_home_school_id_fkey(id, name, slug, jersey_url),
  away_school:schools!fixtures_away_school_id_fkey(id, name, slug, jersey_url),
  tournament:tournaments!fixtures_tournament_id_fkey(name)
`;

function mapFixture(f: any): FixtureWithSchools {
  return {
    id: f.id,
    match_date: f.match_date,
    venue: f.venue,
    status: f.status,
    home_score: f.home_score,
    away_score: f.away_score,
    is_derby: f.is_derby,
    tournament_id: f.tournament_id ?? null,
    tournament_name: f.tournament?.name ?? null,
    home_school: f.home_school as FixtureWithSchools["home_school"],
    away_school: f.away_school as FixtureWithSchools["away_school"],
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
    staleTime: CACHE_TIMES.REFERENCE,
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
        .select(FIXTURE_SELECT)
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
          (f: any) =>
            poolSchoolIds.includes(f.home_school_id) ||
            poolSchoolIds.includes(f.away_school_id)
        );
      }

      return filtered.slice(0, 10).map(mapFixture);
    },
    enabled: !!userId && profileLoaded,
    staleTime: CACHE_TIMES.DYNAMIC,
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
        .select(FIXTURE_SELECT)
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

      return (data || []).map(mapFixture);
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
        .select(FIXTURE_SELECT)
        .eq("is_visible", true)
        .eq("year", seasonYear)
        .or(`home_school_id.eq.${schoolData.id},away_school_id.eq.${schoolData.id}`)
        .gte("match_date", weekendStart.toISOString())
        .lte("match_date", weekendEnd.toISOString())
        .order("match_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!fixture) return null;

      return mapFixture(fixture);
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
        .select(FIXTURE_SELECT)
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

      return (data || []).map(mapFixture);
    },
    enabled: (tournamentData?.tournamentIds?.length ?? 0) > 0,
    staleTime: CACHE_TIMES.DYNAMIC,
  });

  // Merge, deduplicate, and limit upcoming fixtures
  const mergedUpcomingFixtures = useMemo(() => {
    const existingIds = new Set(upcomingFixtures.map(f => f.id));
    
    // Add tournament fixtures that aren't already in the pool/school fixtures
    const uniqueTournamentFixtures = rawTournamentFixtures.filter(
      tf => !existingIds.has(tf.id)
    );
    
    const allFixtures = [...upcomingFixtures, ...uniqueTournamentFixtures];
    
    // Sort chronologically
    const sorted = allFixtures.sort(
      (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    );

    // Deduplicate: one next game per school, with tournament exception
    const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;
    const seenSchools = new Map<string, number>(); // schoolId -> earliest match timestamp
    const result: FixtureWithSchools[] = [];

    for (const fixture of sorted) {
      const homeId = fixture.home_school.id;
      const awayId = fixture.away_school.id;
      const matchTime = new Date(fixture.match_date).getTime();

      const homeSeen = seenSchools.has(homeId);
      const awaySeen = seenSchools.has(awayId);

      if (!homeSeen || !awaySeen) {
        // At least one school hasn't been seen yet — include
        result.push(fixture);
        if (!homeSeen) seenSchools.set(homeId, matchTime);
        if (!awaySeen) seenSchools.set(awayId, matchTime);
      } else if (fixture.tournament_id) {
        // Both schools seen, but this is a tournament fixture — check 6-day window
        const homeEarliest = seenSchools.get(homeId)!;
        const awayEarliest = seenSchools.get(awayId)!;
        if (
          matchTime - homeEarliest <= SIX_DAYS_MS ||
          matchTime - awayEarliest <= SIX_DAYS_MS
        ) {
          result.push(fixture);
        }
      }
      // else: both schools already represented and not a qualifying tournament fixture — skip
    }

    return result.slice(0, 10);
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
