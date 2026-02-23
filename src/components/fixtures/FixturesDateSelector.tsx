import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, isSameDay } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DateRange } from "react-day-picker";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface FixturesDateSelectorProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}

export const FixturesDateSelector = ({
  dateRange,
  onDateRangeChange,
}: FixturesDateSelectorProps) => {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [yearInView, setYearInView] = useState(dateRange.from.getFullYear());

  // Detect if the current range is a full year (Jan 1 – Dec 31)
  const isFullYear = useMemo(() => {
    const soy = startOfYear(dateRange.from);
    const eoy = endOfYear(dateRange.from);
    return isSameDay(dateRange.from, soy) && isSameDay(dateRange.to, eoy);
  }, [dateRange]);

  // Detect if the current range is a full month
  const isFullMonth = useMemo(() => {
    if (isFullYear) return false;
    const som = startOfMonth(dateRange.from);
    const eom = endOfMonth(dateRange.from);
    return isSameDay(dateRange.from, som) && isSameDay(dateRange.to, eom);
  }, [dateRange, isFullYear]);

  const selectedMonthIndex = isFullMonth ? dateRange.from.getMonth() : null;

  const triggerLabel = useMemo(() => {
    if (isFullYear) {
      return `${dateRange.from.getFullYear()}`;
    }
    if (isFullMonth) {
      return `${MONTHS[dateRange.from.getMonth()]} ${dateRange.from.getFullYear()}`;
    }
    const fromStr = format(dateRange.from, "MMM d");
    const toStr = format(dateRange.to, "MMM d");
    return `${fromStr} – ${toStr}`;
  }, [dateRange, isFullMonth, isFullYear]);

  const handleMonthClick = (monthIndex: number) => {
    // If already selected, deselect to year-only
    if (selectedMonthIndex === monthIndex && dateRange.from.getFullYear() === yearInView) {
      const from = new Date(yearInView, 0, 1);
      const to = endOfYear(from);
      onDateRangeChange({ from, to });
      setOpen(false);
      return;
    }
    const from = new Date(yearInView, monthIndex, 1);
    const to = endOfMonth(from);
    onDateRangeChange({ from, to });
    setOpen(false);
  };

  const handleYearClick = () => {
    // Clicking the year label selects the full year
    const from = new Date(yearInView, 0, 1);
    const to = endOfYear(from);
    onDateRangeChange({ from, to });
    setOpen(false);
  };

  const handleCustomRangeSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      onDateRangeChange({ from: range.from, to: range.to });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5 font-medium text-xs shrink-0 h-8 px-2.5",
            !isFullMonth && !isFullYear && "text-primary border-primary/40"
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Tabs defaultValue={isFullMonth || isFullYear ? "month" : "custom"} className="w-full">
          <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
            <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
            <TabsTrigger value="custom" className="text-xs">Custom Range</TabsTrigger>
          </TabsList>

          <TabsContent value="month" className="p-3 space-y-3 m-0">
            {/* Year stepper */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setYearInView((y) => y - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                onClick={handleYearClick}
                className={cn(
                  "text-sm font-semibold px-3 py-1 rounded-md transition-colors",
                  isFullYear && dateRange.from.getFullYear() === yearInView
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                {yearInView}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setYearInView((y) => y + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* 4×3 month grid */}
            <div className="grid grid-cols-4 gap-1.5">
              {MONTHS.map((month, index) => {
                const isSelected =
                  selectedMonthIndex === index &&
                  dateRange.from.getFullYear() === yearInView;
                const isCurrent =
                  now.getMonth() === index &&
                  now.getFullYear() === yearInView;

                return (
                  <button
                    key={month}
                    onClick={() => handleMonthClick(index)}
                    className={cn(
                      "px-2 py-2 text-sm rounded-md font-medium transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : isCurrent
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted text-foreground"
                    )}
                  >
                    {month}
                  </button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="p-0 m-0">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={handleCustomRangeSelect}
              numberOfMonths={1}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
