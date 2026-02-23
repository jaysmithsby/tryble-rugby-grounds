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
      {children}
    </div>
  );
};
