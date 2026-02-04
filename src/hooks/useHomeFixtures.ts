/**
 * Hook for fetching home page fixtures data
 * Extracts fixture loading logic from Home.tsx for better separation of concerns
 */

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [upcomingFixtures, setUpcomingFixtures] = useState<FixtureWithSchools[]>([]);
  const [recentFixtures, setRecentFixtures] = useState<FixtureWithSchools[]>([]);
  const [userSchoolFixture, setUserSchoolFixture] = useState<FixtureWithSchools | null>(null);
  const [hasNoPools, setHasNoPools] = useState(false);
  const [fixturesLoading, setFixturesLoading] = useState(true);

  // Store stable primitive timestamps for useCallback dependencies
  const effectiveDateTimestamp = effectiveDate.getTime();
  const weekendStartTimestamp = weekendStart.getTime();
  const weekendEndTimestamp = weekendEnd.getTime();

  const fetchFixtures = useCallback(async (currentUserId: string, schoolName?: string | null) => {
    setFixturesLoading(true);
    try {
      const now = new Date(effectiveDateTimestamp).toISOString();
      
      // Fetch the user's pools and their schools
      const { data: poolMemberships } = await supabase
        .from("pool_members")
        .select("pool_id")
        .eq("user_id", currentUserId);

      let poolSchoolNames: string[] = [];
      const userHasPools = poolMemberships && poolMemberships.length > 0;
      setHasNoPools(!userHasPools);
      
      if (userHasPools) {
        const poolIds = poolMemberships.map(pm => pm.pool_id);
        const { data: pools } = await supabase
          .from("pools")
          .select("schools")
          .in("id", poolIds)
          .eq("is_active", true);
        
        if (pools) {
          poolSchoolNames = pools
            .flatMap(p => p.schools || [])
            .filter((name, index, self) => self.indexOf(name) === index);
        }
      }

      // Get school IDs for the pool schools
      let poolSchoolIds: string[] = [];
      if (poolSchoolNames.length > 0) {
        const { data: schoolsData } = await supabase
          .from("schools")
          .select("id, name")
          .in("name", poolSchoolNames);
        
        if (schoolsData) {
          poolSchoolIds = schoolsData.map(s => s.id);
        }
      }

      // Fetch upcoming fixtures that involve pool schools
      const { data: allUpcoming, error: upcomingError } = await supabase
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

      if (upcomingError) {
        console.error("Error fetching upcoming fixtures:", upcomingError);
      } else {
        let filteredUpcoming = (allUpcoming || []);
        if (poolSchoolIds.length > 0) {
          filteredUpcoming = filteredUpcoming.filter(f => 
            poolSchoolIds.includes(f.home_school_id) || poolSchoolIds.includes(f.away_school_id)
          );
        }
        
        const formattedUpcoming = filteredUpcoming.slice(0, 10).map(f => ({
          id: f.id,
          match_date: f.match_date,
          venue: f.venue,
          status: f.status,
          home_score: f.home_score,
          away_score: f.away_score,
          is_derby: f.is_derby,
          home_school: f.home_school as unknown as FixtureWithSchools['home_school'],
          away_school: f.away_school as unknown as FixtureWithSchools['away_school'],
        }));
        setUpcomingFixtures(formattedUpcoming);
      }

      // Fetch recent completed fixtures (last 7 days from effective date)
      const sevenDaysAgo = new Date(effectiveDateTimestamp - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recent, error: recentError } = await supabase
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

      if (recentError) {
        console.error("Error fetching recent fixtures:", recentError);
      } else {
        const formattedRecent = (recent || []).map(f => ({
          ...f,
          home_school: f.home_school as unknown as FixtureWithSchools['home_school'],
          away_school: f.away_school as unknown as FixtureWithSchools['away_school'],
        }));
        setRecentFixtures(formattedRecent);
      }

      // Fetch user's school fixture for this weekend if they have a school
      if (schoolName) {
        const { data: schoolData } = await supabase
          .from("schools")
          .select("id")
          .eq("name", schoolName)
          .maybeSingle();

        if (schoolData) {
          const friday = new Date(weekendStartTimestamp);
          const sunday = new Date(weekendEndTimestamp);

          const { data: schoolFixture } = await supabase
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
            .gte("match_date", friday.toISOString())
            .lte("match_date", sunday.toISOString())
            .order("match_date", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (schoolFixture) {
            setUserSchoolFixture({
              ...schoolFixture,
              home_school: schoolFixture.home_school as unknown as FixtureWithSchools['home_school'],
              away_school: schoolFixture.away_school as unknown as FixtureWithSchools['away_school'],
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching fixtures:", error);
    } finally {
      setFixturesLoading(false);
    }
  }, [effectiveDateTimestamp, seasonYear, weekendStartTimestamp, weekendEndTimestamp]);

  // Fetch fixtures when profile is loaded and ready
  useEffect(() => {
    if (userId && profileLoaded) {
      fetchFixtures(userId, userSchoolName);
    }
  }, [fetchFixtures, userId, userSchoolName, profileLoaded]);

  return {
    upcomingFixtures,
    recentFixtures,
    userSchoolFixture,
    hasNoPools,
    fixturesLoading,
  };
}
