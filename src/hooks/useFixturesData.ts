import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FixtureSchool {
  id: string;
  name: string;
  slug: string;
  jersey_url: string | null;
  province: string | null;
}

interface FixtureWithSchools {
  id: string;
  match_date: string;
  venue: string;
  status: string;
  home_school_id: string;
  away_school_id: string;
  home_school: FixtureSchool;
  away_school: FixtureSchool;
  tournament: { id: string; name: string } | null;
}

interface UserPrediction {
  fixture_id: string;
  predicted_team: string;
  predicted_margin: number;
}

interface UseFixturesDataOptions {
  year: number;
  month: number;
  viewMode: "my-schools" | "all-schools";
  selectedSchoolId?: string;
  selectedProvince?: string;
}

export const useFixturesData = ({
  year,
  month,
  viewMode,
  selectedSchoolId,
  selectedProvince,
}: UseFixturesDataOptions) => {
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);

  // Fetch user profile and followed schools
  const { data: userSchoolIds = [] } = useQuery({
    queryKey: ["user-followed-schools", userId],
    queryFn: async () => {
      if (!userId) return [];

      const schoolIds: string[] = [];

      // 1. Get user's school from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_name")
        .eq("id", userId)
        .single();

      if (profile?.school_name) {
        const { data: userSchool } = await supabase
          .from("schools")
          .select("id")
          .eq("name", profile.school_name)
          .single();
        if (userSchool) schoolIds.push(userSchool.id);
      }

      // 2. Get schools from user's pools
      const { data: poolMembers } = await supabase
        .from("pool_members")
        .select("pool_id")
        .eq("user_id", userId);

      if (poolMembers?.length) {
        const poolIds = poolMembers.map((pm) => pm.pool_id);
        const { data: pools } = await supabase
          .from("pools")
          .select("schools")
          .in("id", poolIds);

        if (pools) {
          for (const pool of pools) {
            if (pool.schools) {
              // Get school IDs by name
              const { data: poolSchools } = await supabase
                .from("schools")
                .select("id")
                .in("name", pool.schools);
              if (poolSchools) {
                schoolIds.push(...poolSchools.map((s) => s.id));
              }
            }
          }
        }
      }

      // 3. Get schools from followed tournaments
      const { data: tournamentFollows } = await supabase
        .from("user_tournament_follows")
        .select("tournament_id")
        .eq("user_id", userId);

      if (tournamentFollows?.length) {
        const tournamentIds = tournamentFollows.map((tf) => tf.tournament_id);
        const { data: tournaments } = await supabase
          .from("tournaments")
          .select("participating_schools")
          .in("id", tournamentIds);

        if (tournaments) {
          for (const tournament of tournaments) {
            if (tournament.participating_schools) {
              const { data: tournamentSchools } = await supabase
                .from("schools")
                .select("id")
                .in("name", tournament.participating_schools);
              if (tournamentSchools) {
                schoolIds.push(...tournamentSchools.map((s) => s.id));
              }
            }
          }
        }
      }

      return [...new Set(schoolIds)]; // Remove duplicates
    },
    enabled: viewMode === "my-schools" && !!userId,
  });

  // Fetch fixtures for the selected month
  const { data: fixtures = [], isLoading: isLoadingFixtures } = useQuery({
    queryKey: ["fixtures", year, month, viewMode, selectedSchoolId, selectedProvince, userSchoolIds],
    queryFn: async () => {
      const startOfMonth = new Date(year, month, 1).toISOString();
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      let query = supabase
        .from("fixtures")
        .select(`
          id,
          match_date,
          venue,
          status,
          home_school_id,
          away_school_id,
          home_school:schools!fixtures_home_school_id_fkey(id, name, slug, jersey_url, province),
          away_school:schools!fixtures_away_school_id_fkey(id, name, slug, jersey_url, province),
          tournament:tournaments(id, name)
        `)
        .eq("is_visible", true)
        .gte("match_date", startOfMonth)
        .lte("match_date", endOfMonth)
        .order("match_date", { ascending: true });

      // Apply "My Schools" filter
      if (viewMode === "my-schools" && userSchoolIds.length > 0) {
        const schoolFilter = userSchoolIds
          .map((id) => `home_school_id.eq.${id},away_school_id.eq.${id}`)
          .join(",");
        query = query.or(schoolFilter);
      }

      // Apply specific school filter
      if (viewMode === "all-schools" && selectedSchoolId) {
        query = query.or(`home_school_id.eq.${selectedSchoolId},away_school_id.eq.${selectedSchoolId}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by province if selected (post-query filtering since we can't filter nested)
      let result = (data || []) as unknown as FixtureWithSchools[];
      
      if (selectedProvince) {
        result = result.filter(
          (f) =>
            f.home_school?.province === selectedProvince ||
            f.away_school?.province === selectedProvince
        );
      }

      return result;
    },
  });

  // Fetch user's predictions for these fixtures
  const fixtureIds = fixtures.map((f) => f.id);
  
  const { data: predictions = [] } = useQuery({
    queryKey: ["fixture-predictions", fixtureIds, userId],
    queryFn: async () => {
      if (!userId || fixtureIds.length === 0) return [];

      const { data, error } = await supabase
        .from("predictions")
        .select("fixture_id, predicted_team, predicted_margin")
        .eq("user_id", userId)
        .in("fixture_id", fixtureIds);

      if (error) throw error;
      return data as UserPrediction[];
    },
    enabled: !!userId && fixtureIds.length > 0,
  });

  // Create predictions map
  const predictionsMap = useMemo(() => {
    const map: Record<string, { team: "home" | "away"; margin: number }> = {};
    for (const pred of predictions) {
      map[pred.fixture_id] = {
        team: pred.predicted_team as "home" | "away",
        margin: pred.predicted_margin,
      };
    }
    return map;
  }, [predictions]);

  // Group fixtures by date
  const groupedFixtures = useMemo(() => {
    const groups: Record<string, FixtureWithSchools[]> = {};
    
    for (const fixture of fixtures) {
      const dateKey = new Date(fixture.match_date).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(fixture);
    }

    // Convert to sorted array of groups
    return Object.entries(groups)
      .map(([dateKey, fixtures]) => ({
        date: new Date(dateKey),
        fixtures,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [fixtures]);

  return {
    fixtures,
    groupedFixtures,
    predictionsMap,
    isLoading: isLoadingFixtures,
    userSchoolIds,
    userId,
  };
};

// Fetch all schools for the filter dropdown
export const useAllSchools = () => {
  return useQuery({
    queryKey: ["all-schools-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("id, name, province")
        .eq("is_visible", true)
        .eq("is_archived", false)
        .eq("status", "verified")
        .order("name");

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
