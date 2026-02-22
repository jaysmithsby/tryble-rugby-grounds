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
  venue: string; // mapped from venue_legacy
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
  venue_legacy,
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
    venue: f.venue_legacy || 'TBD',
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
  userSchoolId: string | null;
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
  predictionsMap: Record<string, { schoolId: string; margin: number }>;
}

export function useHomeFixtures({
  userId,
  userSchoolName,
  userSchoolId,
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
  const sevenDaysFromNow = new Date(effectiveDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const sevenDaysStr = sevenDaysFromNow.toISOString().split("T")[0];

  // Fetch user's followed school IDs from user_school_follows + pool schools
  const { data: followedData } = useQuery({
    queryKey: ["home-followed-schools", userId],
    queryFn: async () => {
      if (!userId) return { schoolIds: [], hasNoPools: true };

      // Get schools from user_school_follows
      const { data: follows } = await supabase
        .from("user_school_follows")
        .select("school_id")
        .eq("user_id", userId);

      const followIds = follows?.map((f) => f.school_id) || [];

      // Also get schools from pools
      const { data: poolMemberships } = await supabase
        .from("pool_members")
        .select("pool_id")
        .eq("user_id", userId);

      let poolSchoolIds: string[] = [];
      const hasNoPools = !poolMemberships || poolMemberships.length === 0;

      if (!hasNoPools) {
        const poolIds = poolMemberships!.map((pm) => pm.pool_id);
        const { data: pools } = await supabase
          .from("pools")
          .select("schools")
          .in("id", poolIds)
          .eq("is_active", true);

        if (pools) {
          const poolSchoolNames = pools
            .flatMap((p) => p.schools || [])
            .filter((name, index, self) => self.indexOf(name) === index);

          if (poolSchoolNames.length > 0) {
            const { data: schoolsData } = await supabase
              .from("schools")
              .select("id")
              .in("name", poolSchoolNames);
            poolSchoolIds = schoolsData?.map((s) => s.id) || [];
          }
        }
      }

      // Merge and deduplicate
      const allIds = [...new Set([...followIds, ...poolSchoolIds])];
      return { schoolIds: allIds, hasNoPools };
    },
    enabled: !!userId && profileLoaded,
    staleTime: CACHE_TIMES.REFERENCE,
  });

  const allSchoolIds = followedData?.schoolIds || [];
  const hasNoPools = followedData?.hasNoPools ?? true;

  // Fetch upcoming fixtures
  const { data: upcomingFixtures = [], isLoading: upcomingLoading } = useQuery({
    queryKey: ["home-upcoming-fixtures", seasonYear, effectiveDateStr, sevenDaysStr, allSchoolIds],
    queryFn: async () => {
      const now = effectiveDate.toISOString();

      const { data, error } = await supabase
        .from("fixtures")
        .select(FIXTURE_SELECT)
        .eq("is_visible", true)
        .eq("status", "upcoming")
        .eq("year", seasonYear)
        .gte("match_date", now)
        .lte("match_date", sevenDaysFromNow.toISOString())
        .order("match_date", { ascending: true })
        .limit(50);

      if (error) {
        console.error("Error fetching upcoming fixtures:", error);
        return [];
      }

      let filtered = data || [];
      if (allSchoolIds.length > 0) {
        filtered = filtered.filter(
          (f: any) =>
            allSchoolIds.includes(f.home_school_id) ||
            allSchoolIds.includes(f.away_school_id)
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

  // Fetch user's school fixture for this weekend using school_id directly
  const { data: userSchoolFixture = null } = useQuery({
    queryKey: ["home-user-school-fixture", userSchoolId, weekendStartStr, weekendEndStr, seasonYear],
    queryFn: async () => {
      if (!userSchoolId) return null;

      const { data: fixture } = await supabase
        .from("fixtures")
        .select(FIXTURE_SELECT)
        .eq("is_visible", true)
        .eq("year", seasonYear)
        .or(`home_school_id.eq.${userSchoolId},away_school_id.eq.${userSchoolId}`)
        .gte("match_date", weekendStart.toISOString())
        .lte("match_date", weekendEnd.toISOString())
        .order("match_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!fixture) return null;

      return mapFixture(fixture);
    },
    enabled: !!userId && !!userSchoolId && profileLoaded,
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
    queryKey: ["home-tournament-fixtures", seasonYear, effectiveDateStr, sevenDaysStr, tournamentData?.tournamentIds],
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
        .lte("match_date", sevenDaysFromNow.toISOString())
        .order("match_date", { ascending: true })
        .limit(50);

      if (error) {
        console.error("Error fetching tournament fixtures:", error);
        return [];
      }

      return (data || []).map(mapFixture);
    },
    enabled: (tournamentData?.tournamentIds?.length ?? 0) > 0,
    staleTime: CACHE_TIMES.DYNAMIC,
  });

  // Merge, deduplicate by ID, and sort chronologically
  const mergedUpcomingFixtures = useMemo(() => {
    const seenIds = new Set<string>();
    const all: FixtureWithSchools[] = [];

    for (const f of [...upcomingFixtures, ...rawTournamentFixtures]) {
      if (!seenIds.has(f.id)) {
        seenIds.add(f.id);
        all.push(f);
      }
    }

    return all.sort(
      (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    );
  }, [upcomingFixtures, rawTournamentFixtures]);

  // Collect all fixture IDs (upcoming + user school fixture) for predictions query
  const allFixtureIds = useMemo(() => {
    const ids = mergedUpcomingFixtures.map(f => f.id);
    if (userSchoolFixture && !ids.includes(userSchoolFixture.id)) {
      ids.push(userSchoolFixture.id);
    }
    return ids;
  }, [mergedUpcomingFixtures, userSchoolFixture]);

  // Fetch user's existing predictions for displayed fixtures
  const { data: dbPredictions = [] } = useQuery({
    queryKey: ["home-predictions", userId, allFixtureIds],
    queryFn: async () => {
      if (!userId || allFixtureIds.length === 0) return [];

      const { data, error } = await supabase
        .from("predictions")
        .select("fixture_id, predicted_team, predicted_margin, predicted_school_id")
        .eq("user_id", userId)
        .in("fixture_id", allFixtureIds);

      if (error) {
        console.error("Error fetching home predictions:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!userId && allFixtureIds.length > 0,
    staleTime: CACHE_TIMES.DYNAMIC,
  });

  // Build predictions map from DB data
  const predictionsMap = useMemo(() => {
    const map: Record<string, { schoolId: string; margin: number }> = {};
    for (const pred of dbPredictions) {
      map[pred.fixture_id] = {
        schoolId: pred.predicted_school_id,
        margin: pred.predicted_margin,
      };
    }
    return map;
  }, [dbPredictions]);

  const fixturesLoading = upcomingLoading || recentLoading || tournamentLoading;

  return {
    upcomingFixtures: mergedUpcomingFixtures,
    recentFixtures,
    userSchoolFixture,
    hasNoPools,
    fixturesLoading,
    tournamentFixtures: rawTournamentFixtures,
    predictionsMap,
  };
}
