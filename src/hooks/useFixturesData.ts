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
  venue_type: string | null;
  venue_id: string | null;
  status: string;
  school_a_id: string;
  school_b_id: string;
  school_a: FixtureSchool;
  school_b: FixtureSchool;
  tournament_edition: { id: string; tournament: { id: string; name: string } | null } | null;
}

interface UserPrediction {
  fixture_id: string;
  predicted_margin: number;
  predicted_school_id: string | null;
}

interface UseFixturesDataOptions {
  startDate: string;
  endDate: string;
  viewMode: "my-schools" | "all-schools";
  selectedProvince?: string;
}

export const useFixturesData = ({
  startDate,
  endDate,
  viewMode,
  selectedProvince,
}: UseFixturesDataOptions) => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);

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

  const { data: fixtures = [], isLoading: isLoadingFixtures } = useQuery({
    queryKey: ["fixtures", startDate, endDate, viewMode, selectedProvince, userSchoolIds],
    queryFn: async () => {
      let query = supabase
        .from("fixtures")
        .select(`
          id,
          match_date,
          venue_type,
          venue_id,
          status,
          score_a,
          score_b,
          school_a_id,
          school_b_id,
          school_a:schools!fixtures_school_a_id_fkey(id, name, slug, jersey_url, province),
          school_b:schools!fixtures_school_b_id_fkey(id, name, slug, jersey_url, province),
          tournament_edition:tournament_editions(id, tournament:tournaments(id, name))
        `)
        .eq("is_visible", true)
        .eq("venue_type", "school")
        .gte("match_date", startDate)
        .lte("match_date", endDate)
        .order("match_date", { ascending: true });

      if (viewMode === "my-schools" && userSchoolIds.length > 0) {
        const schoolFilter = userSchoolIds
          .map((id) => `school_a_id.eq.${id},school_b_id.eq.${id}`)
          .join(",");
        query = query.or(schoolFilter);
      }



      const { data, error } = await query;
      if (error) throw error;

      let result = (data || []) as unknown as FixtureWithSchools[];
      
      if (selectedProvince) {
        result = result.filter(
          (f) =>
            f.school_a?.province === selectedProvince ||
            f.school_b?.province === selectedProvince
        );
      }

      return result;
    },
    staleTime: CACHE_TIMES.DYNAMIC,
  });

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
    staleTime: CACHE_TIMES.DYNAMIC,
  });

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

  const groupedFixtures = useMemo(() => {
    const groups: Record<string, FixtureWithSchools[]> = {};
    for (const fixture of fixtures) {
      const dateKey = new Date(fixture.match_date).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(fixture);
    }
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
    staleTime: CACHE_TIMES.STATIC,
  });
};
