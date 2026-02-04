import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSimulation } from "@/contexts/SimulationContext";
import { CACHE_TIMES } from "@/lib/queryConfig";

interface SchoolBase {
  id: string;
  name: string;
  status?: string;
}

interface UseSchoolsQueryOptions<T extends SchoolBase> {
  select: string;
  orderBy?: string;
  additionalFilters?: (query: any) => any;
}

/**
 * Hook to fetch schools with simulation mode override.
 * When simulation mode is ON, all schools are treated as "verified" regardless of their actual status.
 * This allows testers to interact with all schools during testing without modifying the database.
 */
export function useSchoolsQuery<T extends SchoolBase>({
  select,
  orderBy = "name",
  additionalFilters,
}: UseSchoolsQueryOptions<T>) {
  const { isSimulationMode } = useSimulation();

  const { data: schools = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ["schools", select, orderBy, isSimulationMode, additionalFilters?.toString()],
    queryFn: async () => {
      let query = supabase.from("schools").select(select);

      // Always exclude archived schools
      query = query.eq("is_archived", false);

      // Only filter by status when NOT in simulation mode
      // In simulation mode, we want ALL schools regardless of status
      if (!isSimulationMode) {
        query = query.eq("status", "verified");
      }

      // Apply any additional filters
      if (additionalFilters) {
        query = additionalFilters(query);
      }

      query = query.order(orderBy);

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;
      return (data || []) as unknown as T[];
    },
    staleTime: CACHE_TIMES.STATIC, // Schools list is static reference data
  });

  return { schools, loading, error, refetch, isSimulationMode };
}

/**
 * Simple hook to get verified school names (or all in simulation mode)
 * Useful for validation purposes
 */
export function useVerifiedSchoolNames() {
  const { isSimulationMode } = useSimulation();

  const { data: schoolNames = [], isLoading: loading, refetch } = useQuery({
    queryKey: ["verified-school-names", isSimulationMode],
    queryFn: async () => {
      let query = supabase.from("schools").select("name").eq("is_archived", false);

      if (!isSimulationMode) {
        query = query.eq("status", "verified");
      }

      const { data, error } = await query;

      if (error) throw error;
      return data?.map((s) => s.name) || [];
    },
    staleTime: CACHE_TIMES.STATIC, // School names are static reference data
  });

  return { schoolNames, loading, isSimulationMode, refetch };
}
