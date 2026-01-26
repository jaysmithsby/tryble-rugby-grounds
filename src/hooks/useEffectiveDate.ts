import { useSimulation } from "@/contexts/SimulationContext";
import { getWeek, getYear } from "date-fns";
import { useMemo } from "react";

export function useEffectiveDate() {
  const simulation = useSimulation();

  const effectiveDate = simulation.getEffectiveDate();
  const weekNumber = getWeek(effectiveDate, { weekStartsOn: 1 });
  const seasonYear = getYear(effectiveDate);
  const isSimulation = simulation.isSimulationMode;
  
  // Memoize weekendRange to prevent infinite re-renders
  // Only recalculate when effectiveDate changes (compared by timestamp)
  const weekendRange = useMemo(() => {
    return simulation.getWeekendRange();
  }, [effectiveDate.getTime()]);

  // Get SAST time helper
  const getSASTTime = (date: Date = effectiveDate) => {
    const sastOffset = 2 * 60; // minutes
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
    return new Date(utcTime + sastOffset * 60000);
  };

  // Check if current effective time is within submission window (Fri 5PM - Sun 11:59PM SAST)
  const isWithinSubmissionWindow = () => {
    const sastTime = getSASTTime();
    const dayOfWeek = sastTime.getDay();
    const hour = sastTime.getHours();

    if (dayOfWeek === 5 && hour >= 17) return true; // Friday 5 PM or later
    if (dayOfWeek === 6) return true; // Saturday
    if (dayOfWeek === 0 && hour < 24) return true; // Sunday before midnight
    return false;
  };

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
