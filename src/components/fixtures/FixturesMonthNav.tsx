import { useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

interface FixturesMonthNavProps {
  selectedYear: number;
  selectedMonth: number; // 0-11
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}

export const FixturesMonthNav = ({
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
}: FixturesMonthNavProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const currentYear = new Date().getFullYear();

  // Auto-scroll to selected month on mount/change
  useEffect(() => {
    const monthButton = monthRefs.current[selectedMonth];
    if (monthButton && scrollRef.current) {
      const container = scrollRef.current;
      const buttonRect = monthButton.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      const scrollLeft = monthButton.offsetLeft - container.offsetWidth / 2 + buttonRect.width / 2;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, [selectedMonth]);

  return (
    <div className="bg-card/50 border-b border-border/40">
      {/* Year Selector */}
      <div className="flex items-center justify-center gap-4 py-2 border-b border-border/20">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onYearChange(selectedYear - 1)}
          disabled={selectedYear <= currentYear - 2}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-2">
          {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
            <button
              key={year}
              onClick={() => onYearChange(year)}
              className={cn(
                "px-3 py-1 text-sm font-medium rounded-md transition-colors",
                selectedYear === year
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {year}
            </button>
          ))}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onYearChange(selectedYear + 1)}
          disabled={selectedYear >= currentYear + 2}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Month Selector */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide py-2 px-4 gap-1"
      >
        {MONTHS.map((month, index) => (
          <button
            key={month}
            ref={(el) => (monthRefs.current[index] = el)}
            onClick={() => onMonthChange(index)}
            className={cn(
              "flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-all",
              selectedMonth === index
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {month}
          </button>
        ))}
      </div>
    </div>
  );
};
