import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { getWeek, getYear, addDays } from "date-fns";

interface WeekendRange {
  start: Date;
  end: Date;
}

interface SimulationContextType {
  isSimulationMode: boolean;
  setIsSimulationMode: (value: boolean) => void;
  simulatedDate: Date;
  setSimulatedDate: (date: Date) => void;
  // Stable memoized values - use these instead of getters
  effectiveDate: Date;
  effectiveWeek: number;
  effectiveYear: number;
  weekendRange: WeekendRange;
  // Actions
  advanceToNextWeek: () => void;
  goToPreviousWeek: () => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

const SIMULATION_STORAGE_KEY = "trybal_simulation_state";

interface SimulationState {
  isSimulationMode: boolean;
  simulatedDate: string;
}

// Helper to calculate weekend range from a date
function calculateWeekendRange(date: Date): WeekendRange {
  const dayOfWeek = date.getDay();
  
  // Calculate Friday of the current week
  const friday = new Date(date);
  const daysSinceFriday = dayOfWeek >= 5 ? dayOfWeek - 5 : 7 - (5 - dayOfWeek);
  
  if (dayOfWeek >= 5) {
    // We're on Friday or later - go back to this Friday
    friday.setDate(date.getDate() - daysSinceFriday);
  } else {
    // We're before Friday - this is previous week's window, go back to last Friday
    friday.setDate(date.getDate() - daysSinceFriday - 7);
  }
  friday.setHours(0, 0, 0, 0);

  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  sunday.setHours(23, 59, 59, 999);

  return { start: friday, end: sunday };
}

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [isSimulationMode, setIsSimulationModeState] = useState(false);
  const [simulatedDate, setSimulatedDateState] = useState(() => new Date(2025, 2, 1)); // March 1, 2025
  // Stable current date that only updates periodically (every minute) to prevent infinite re-renders
  const [stableCurrentDate, setStableCurrentDate] = useState(() => new Date());

  // Update the current date every minute (not every render) when NOT in simulation mode
  useEffect(() => {
    if (!isSimulationMode) {
      const interval = setInterval(() => {
        setStableCurrentDate(new Date());
      }, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [isSimulationMode]);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIMULATION_STORAGE_KEY);
      if (saved) {
        const state: SimulationState = JSON.parse(saved);
        setIsSimulationModeState(state.isSimulationMode);
        setSimulatedDateState(new Date(state.simulatedDate));
      }
    } catch (error) {
      console.error("Error loading simulation state:", error);
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    try {
      const state: SimulationState = {
        isSimulationMode,
        simulatedDate: simulatedDate.toISOString(),
      };
      localStorage.setItem(SIMULATION_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Error saving simulation state:", error);
    }
  }, [isSimulationMode, simulatedDate]);

  const setIsSimulationMode = (value: boolean) => {
    setIsSimulationModeState(value);
  };

  const setSimulatedDate = (date: Date) => {
    setSimulatedDateState(date);
  };

  // STABLE MEMOIZED VALUES - these only change when their dependencies change
  const effectiveDate = useMemo(() => {
    return isSimulationMode ? simulatedDate : stableCurrentDate;
  }, [isSimulationMode, simulatedDate, stableCurrentDate]);

  const effectiveWeek = useMemo(() => {
    return getWeek(effectiveDate, { weekStartsOn: 1 });
  }, [effectiveDate]);

  const effectiveYear = useMemo(() => {
    return getYear(effectiveDate);
  }, [effectiveDate]);

  const weekendRange = useMemo(() => {
    return calculateWeekendRange(effectiveDate);
  }, [effectiveDate]);

  const advanceToNextWeek = () => {
    setSimulatedDateState((prev) => addDays(prev, 7));
  };

  const goToPreviousWeek = () => {
    setSimulatedDateState((prev) => addDays(prev, -7));
  };

  const contextValue = useMemo(() => ({
    isSimulationMode,
    setIsSimulationMode,
    simulatedDate,
    setSimulatedDate,
    effectiveDate,
    effectiveWeek,
    effectiveYear,
    weekendRange,
    advanceToNextWeek,
    goToPreviousWeek,
  }), [
    isSimulationMode,
    simulatedDate,
    effectiveDate,
    effectiveWeek,
    effectiveYear,
    weekendRange,
  ]);

  return (
    <SimulationContext.Provider value={contextValue}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error("useSimulation must be used within a SimulationProvider");
  }
  return context;
}
