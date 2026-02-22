/**
 * Navigation Prefetching Hook
 * 
 * Prefetches data for common navigation routes to enable
 * instant page transitions on mobile and desktop.
 */

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_TIMES } from "@/lib/queryConfig";

/**
 * Hook that provides prefetch functions for common navigation routes.
 * Call these on hover/focus of nav items to warm the cache.
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  /**
   * Prefetch schools list - used by Fixtures, Leaderboard, Profile
   */
  const prefetchSchools = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ["all-schools-list"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("schools")
          .select("id, name, province, slug, jersey_url")
          .eq("is_visible", true)
          .eq("is_archived", false)
          .eq("status", "verified")
          .order("name");

        if (error) throw error;
        return data;
      },
      staleTime: CACHE_TIMES.STATIC,
    });
  }, [queryClient]);

  /**
   * Prefetch user's pools - used by Leaderboard, Profile
   */
  const prefetchUserPools = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    queryClient.prefetchQuery({
      queryKey: ["user-pools", user.id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("pool_members")
          .select(`
            pool_id,
            pools (
              id,
              name,
              invite_code,
              schools,
              voting_mode,
              pool_members(count)
            )
          `)
          .eq("user_id", user.id);

        if (error) throw error;
        return data?.map(d => d.pools) || [];
      },
      staleTime: CACHE_TIMES.REFERENCE,
    });
  }, [queryClient]);

  /**
   * Prefetch user profile - used across most authenticated pages
   */
  const prefetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    queryClient.prefetchQuery({
      queryKey: ["user-profile", user.id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, school_name, display_name, province, user_type, year_of_birth, consent_status")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        return data;
      },
      staleTime: CACHE_TIMES.USER_PROFILE,
    });
  }, [queryClient]);

  /**
   * Prefetch current month's fixtures
   */
  const prefetchFixtures = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startOfMonth = new Date(year, month, 1).toISOString();
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    queryClient.prefetchQuery({
      queryKey: ["fixtures", year, month, "all-schools", undefined, undefined, []],
      queryFn: async () => {
        const { data, error } = await supabase
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

        if (error) throw error;
        return data || [];
      },
      staleTime: CACHE_TIMES.DYNAMIC,
    });
  }, [queryClient]);

  /**
   * Prefetch data for a specific navigation target
   */
  const prefetchForRoute = useCallback((route: string) => {
    switch (route) {
      case "/home":
        prefetchProfile();
        prefetchUserPools();
        break;
      case "/pools":
        prefetchUserPools();
        prefetchSchools();
        break;
      case "/fixtures":
        prefetchSchools();
        prefetchFixtures();
        break;
      case "/leaderboard":
        prefetchSchools();
        prefetchUserPools();
        break;
      case "/profile":
        prefetchProfile();
        prefetchUserPools();
        break;
      default:
        break;
    }
  }, [prefetchProfile, prefetchUserPools, prefetchSchools, prefetchFixtures]);

  return {
    prefetchSchools,
    prefetchUserPools,
    prefetchProfile,
    prefetchFixtures,
    prefetchForRoute,
  };
}
