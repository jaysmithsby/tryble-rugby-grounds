import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getWeek, getYear, startOfWeek, endOfWeek, addDays, format } from "date-fns";

interface SimulationContextType {
  isSimulationMode: boolean;
  setIsSimulationMode: (value: boolean) => void;
  simulatedDate: Date;
  setSimulatedDate: (date: Date) => void;
  getEffectiveDate: () => Date;
  getEffectiveWeek: () => number;
  getEffectiveYear: () => number;
  advanceToNextWeek: () => void;
  goToPreviousWeek: () => void;
  getWeekendRange: () => { start: Date; end: Date };
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

const SIMULATION_STORAGE_KEY = "tryble_simulation_state";

interface SimulationState {
  isSimulationMode: boolean;
  simulatedDate: string;
}

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [isSimulationMode, setIsSimulationModeState] = useState(false);
  const [simulatedDate, setSimulatedDateState] = useState(new Date(2025, 2, 1)); // March 1, 2025

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

  const getEffectiveDate = () => {
    return isSimulationMode ? simulatedDate : new Date();
  };

  const getEffectiveWeek = () => {
    return getWeek(getEffectiveDate(), { weekStartsOn: 1 });
  };

  const getEffectiveYear = () => {
    return getYear(getEffectiveDate());
  };

  const advanceToNextWeek = () => {
    setSimulatedDateState((prev) => addDays(prev, 7));
  };

  const goToPreviousWeek = () => {
    setSimulatedDateState((prev) => addDays(prev, -7));
  };

  const getWeekendRange = () => {
    const effectiveDate = getEffectiveDate();
    const dayOfWeek = effectiveDate.getDay();
    
    // Calculate Friday of the current week
    const friday = new Date(effectiveDate);
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    const daysSinceFriday = dayOfWeek >= 5 ? dayOfWeek - 5 : 7 - (5 - dayOfWeek);
    
    if (dayOfWeek >= 5) {
      // We're on Friday or later - go back to this Friday
      friday.setDate(effectiveDate.getDate() - daysSinceFriday);
    } else {
      // We're before Friday - this is previous week's window, go back to last Friday
      friday.setDate(effectiveDate.getDate() - daysSinceFriday - 7);
    }
    friday.setHours(0, 0, 0, 0);

    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);
    sunday.setHours(23, 59, 59, 999);

    return { start: friday, end: sunday };
  };

  return (
    <SimulationContext.Provider
      value={{
        isSimulationMode,
        setIsSimulationMode,
        simulatedDate,
        setSimulatedDate,
        getEffectiveDate,
        getEffectiveWeek,
        getEffectiveYear,
        advanceToNextWeek,
        goToPreviousWeek,
        getWeekendRange,
      }}
    >
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
