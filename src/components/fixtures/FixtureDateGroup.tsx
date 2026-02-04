import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FixtureDateGroupProps {
  date: Date;
  fixtureCount: number;
  children: React.ReactNode;
  className?: string;
}

export const FixtureDateGroup = ({
  date,
  fixtureCount,
  children,
  className,
}: FixtureDateGroupProps) => {
  const dateString = format(date, "EEEE d MMMM");
  const matchLabel = fixtureCount === 1 ? "Match" : "Matches";

  return (
    <div className={cn("space-y-3", className)}>
      {/* Date Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-base font-semibold text-foreground">
          {dateString}
        </h3>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary/60" />
          {fixtureCount} {matchLabel}
        </span>
      </div>

      {/* Fixture Cards */}
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
};
