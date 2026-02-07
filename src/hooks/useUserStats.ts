import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getISOWeek } from "date-fns";

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
  const currentWeek = getISOWeek(new Date());
  const currentYear = new Date().getFullYear();

  // Fetch user scores for current week
  const { data: scores, isLoading: scoresLoading } = useQuery({
    queryKey: ["user-stats", userId, currentWeek, currentYear],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("user_scores")
        .select("*")
        .eq("user_id", userId)
        .eq("season_year", currentYear)
        .order("week_number", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching user scores:", error);
        return null;
      }

      return data?.[0] || null;
    },
    enabled: !!userId,
  });

  // Calculate current win streak from predictions
  const { data: streakData, isLoading: streakLoading } = useQuery({
    queryKey: ["user-streak", userId],
    queryFn: async () => {
      if (!userId) return { streak: 0 };

      // Get recent scored predictions ordered by fixture date
      const { data: predictions, error } = await supabase
        .from("predictions")
        .select(`
          id,
          points_earned,
          fixture_id,
          fixtures!inner(match_date, status)
        `)
        .eq("user_id", userId)
        .not("points_earned", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching predictions for streak:", error);
        return { streak: 0 };
      }

      if (!predictions || predictions.length === 0) return { streak: 0 };

      // Count consecutive wins (points_earned > 0 means correct winner prediction)
      let streak = 0;
      for (const pred of predictions) {
        if (pred.points_earned && pred.points_earned > 0) {
          streak++;
        } else {
          break;
        }
      }

      return { streak };
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

  const isLoading = scoresLoading || streakLoading || badgesLoading;
  const hasData = !!scores;

  return {
    weeklyPoints: scores?.weekly_points ?? null,
    seasonPoints: scores?.season_points ?? null,
    accuracy: scores?.accuracy_percentage ? Number(scores.accuracy_percentage) : null,
    schoolRank: scores?.rank_school ?? null,
    globalRank: scores?.rank_global ?? null,
    currentStreak: streakData?.streak ?? 0,
    predictionsCorrect: scores?.predictions_correct ?? null,
    predictionsMade: scores?.predictions_made ?? null,
    badgeCount: badgeData?.count ?? 0,
    isLoading,
    hasData,
  };
};
