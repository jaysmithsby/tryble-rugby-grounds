import { useSimulation } from "@/contexts/SimulationContext";
import { FlaskConical, Calendar } from "lucide-react";
import { format } from "date-fns";

export function SimulationBanner() {
  const { isSimulationMode, simulatedDate, getEffectiveWeek, getEffectiveYear } = useSimulation();

  if (!isSimulationMode) {
    return null;
  }

  return (
    <div className="bg-primary text-primary-foreground px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 flex-wrap">
      <FlaskConical className="h-4 w-4" />
      <span>Simulation Mode Active</span>
      <span className="opacity-75">•</span>
      <Calendar className="h-3.5 w-3.5" />
      <span>{format(simulatedDate, "MMM d, yyyy")}</span>
      <span className="opacity-75">•</span>
      <span>Week {getEffectiveWeek()} of {getEffectiveYear()}</span>
      <span className="opacity-75 hidden sm:inline">•</span>
      <span className="text-xs opacity-90 hidden sm:inline">All schools visible</span>
    </div>
  );
}
