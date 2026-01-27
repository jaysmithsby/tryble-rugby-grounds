import { useSimulation } from "@/contexts/SimulationContext";
import { getWeek, getYear } from "date-fns";
import { useMemo, useCallback } from "react";

export function useEffectiveDate() {
  const simulation = useSimulation();

  // Get the stable effectiveDate from context (now properly memoized in SimulationContext)
  const effectiveDate = simulation.getEffectiveDate();
  
  // Use timestamp for stable comparisons
  const dateTimestamp = effectiveDate.getTime();
  
  // Memoize all derived values using the stable timestamp
  const weekNumber = useMemo(() => 
    getWeek(effectiveDate, { weekStartsOn: 1 }), 
    [dateTimestamp]
  );
  
  const seasonYear = useMemo(() => 
    getYear(effectiveDate), 
    [dateTimestamp]
  );
  
  const isSimulation = simulation.isSimulationMode;
  
  // Memoize weekendRange to prevent infinite re-renders
  const weekendRange = useMemo(() => {
    return simulation.getWeekendRange();
  }, [dateTimestamp]);

  // Get SAST time helper - memoized
  const getSASTTime = useCallback((date: Date = effectiveDate) => {
    const sastOffset = 2 * 60; // minutes
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
    return new Date(utcTime + sastOffset * 60000);
  }, [dateTimestamp]);

  // Check if current effective time is within submission window (Fri 5PM - Sun 11:59PM SAST)
  const isWithinSubmissionWindow = useCallback(() => {
    const sastTime = getSASTTime();
    const dayOfWeek = sastTime.getDay();
    const hour = sastTime.getHours();

    if (dayOfWeek === 5 && hour >= 17) return true; // Friday 5 PM or later
    if (dayOfWeek === 6) return true; // Saturday
    if (dayOfWeek === 0 && hour < 24) return true; // Sunday before midnight
    return false;
  }, [getSASTTime]);

  return {
    effectiveDate,
    weekNumber,
    seasonYear,
    isSimulation,
    weekendRange,
    getSASTTime,
    isWithinSubmissionWindow,
  };
}
