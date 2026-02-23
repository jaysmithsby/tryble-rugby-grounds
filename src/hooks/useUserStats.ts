import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserStats {
  weeklyPoints: number | null;
  seasonPoints: number | null;
  accuracy: number | null;
  schoolRank: number | null;
  globalRank: number | null;
  currentStreak: number;
  predictionsCorrect: number | null;
  predictionsMade: number | null;
  badgeCount: number;
  isLoading: boolean;
  hasData: boolean;
}

export const useUserStats = (userId: string | undefined): UserStats => {
  const currentYear = new Date().getFullYear();

  // Fetch user stats from get_user_season_stats RPC
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["user-season-stats", userId, currentYear],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .rpc("get_user_season_stats", {
          p_user_id: userId,
          p_season_year: currentYear,
        });

      if (error) {
        console.error("Error fetching user season stats:", error);
        return null;
      }

      return data?.[0] || null;
    },
    enabled: !!userId,
  });

  // Fetch badge count
  const { data: badgeData, isLoading: badgesLoading } = useQuery({
    queryKey: ["user-badges-count", userId],
    queryFn: async () => {
      if (!userId) return { count: 0 };

      const { count, error } = await supabase
        .from("user_badges")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching badges:", error);
        return { count: 0 };
      }

      return { count: count || 0 };
    },
    enabled: !!userId,
  });

  const isLoading = statsLoading || badgesLoading;
  const hasData = !!stats && Number(stats.picks_made) > 0;

  return {
    weeklyPoints: null, // No longer tracked per-week; use seasonPoints
    seasonPoints: stats ? Number(stats.total_brags) : null,
    accuracy: stats ? Number(stats.accuracy_pct) : null,
    schoolRank: stats ? Number(stats.school_rank) || null : null,
    globalRank: stats ? Number(stats.global_rank) || null : null,
    currentStreak: stats ? Number(stats.current_streak) : 0,
    predictionsCorrect: stats ? Number(stats.picks_correct) : null,
    predictionsMade: stats ? Number(stats.picks_made) : null,
    badgeCount: badgeData?.count ?? 0,
    isLoading,
    hasData,
  };
};
