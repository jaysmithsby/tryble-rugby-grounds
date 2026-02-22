import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_TIMES } from "@/lib/queryConfig";

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
  venue_legacy: string;
  venue_type: string | null;
  venue_id: string | null;
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
  predicted_school_id: string;
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

  // Fetch user's followed school IDs from user_school_follows
  const { data: userSchoolIds = [] } = useQuery({
    queryKey: ["user-followed-schools", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("user_school_follows")
        .select("school_id")
        .eq("user_id", userId);

      if (error) throw error;
      return data?.map((f) => f.school_id) || [];
    },
    enabled: viewMode === "my-schools" && !!userId,
    staleTime: CACHE_TIMES.USER_PROFILE,
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
          venue_legacy,
          venue_type,
          venue_id,
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
    staleTime: CACHE_TIMES.DYNAMIC, // Fixtures data is moderately dynamic
  });

  // Fetch user's predictions for these fixtures
  const fixtureIds = fixtures.map((f) => f.id);
  
  const { data: predictions = [] } = useQuery({
    queryKey: ["fixture-predictions", fixtureIds, userId],
    queryFn: async () => {
      if (!userId || fixtureIds.length === 0) return [];

      const { data, error } = await supabase
        .from("predictions")
        .select("fixture_id, predicted_team, predicted_margin, predicted_school_id")
        .eq("user_id", userId)
        .in("fixture_id", fixtureIds);

      if (error) throw error;
      return data as UserPrediction[];
    },
    enabled: !!userId && fixtureIds.length > 0,
    staleTime: CACHE_TIMES.DYNAMIC, // Predictions may update during match weekends
  });

  // Create predictions map
  const predictionsMap = useMemo(() => {
    const map: Record<string, { schoolId: string; margin: number }> = {};
    for (const pred of predictions) {
      map[pred.fixture_id] = {
        schoolId: pred.predicted_school_id,
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
    staleTime: CACHE_TIMES.STATIC, // Schools list is static reference data
  });
};
