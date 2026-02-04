import { useSimulation } from "@/contexts/SimulationContext";
import { useMemo, useCallback } from "react";

export function useEffectiveDate() {
  const simulation = useSimulation();

  // All values are already memoized in the context - just destructure them
  const { 
    effectiveDate, 
    effectiveWeek, 
    effectiveYear, 
    weekendRange, 
    isSimulationMode 
  } = simulation;
  
  // Use stable timestamp for callback dependencies
  const dateTimestamp = effectiveDate.getTime();

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

  // Return stable object reference
  return useMemo(() => ({
    effectiveDate,
    weekNumber: effectiveWeek,
    seasonYear: effectiveYear,
    isSimulation: isSimulationMode,
    weekendRange,
    getSASTTime,
    isWithinSubmissionWindow,
  }), [
    effectiveDate,
    effectiveWeek,
    effectiveYear,
    isSimulationMode,
    weekendRange,
    getSASTTime,
    isWithinSubmissionWindow,
  ]);
}
