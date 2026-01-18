import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSimulation } from "@/contexts/SimulationContext";

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
  const [schools, setSchools] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { isSimulationMode } = useSimulation();

  useEffect(() => {
    fetchSchools();
  }, [isSimulationMode]);

  const fetchSchools = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase.from("schools").select(select);

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
      // Cast through unknown to satisfy TypeScript
      setSchools((data || []) as unknown as T[]);
    } catch (err) {
      console.error("Error fetching schools:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchSchools();
  };

  return { schools, loading, error, refetch, isSimulationMode };
}

/**
 * Simple hook to get verified school names (or all in simulation mode)
 * Useful for validation purposes
 */
export function useVerifiedSchoolNames() {
  const [schoolNames, setSchoolNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { isSimulationMode } = useSimulation();

  useEffect(() => {
    fetchSchoolNames();
  }, [isSimulationMode]);

  const fetchSchoolNames = async () => {
    setLoading(true);
    try {
      let query = supabase.from("schools").select("name");

      if (!isSimulationMode) {
        query = query.eq("status", "verified");
      }

      const { data, error } = await query;

      if (error) throw error;
      setSchoolNames(data?.map((s) => s.name) || []);
    } catch (error) {
      console.error("Error fetching school names:", error);
    } finally {
      setLoading(false);
    }
  };

  return { schoolNames, loading, isSimulationMode, refetch: fetchSchoolNames };
}
