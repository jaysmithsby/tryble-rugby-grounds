import { cn } from "@/lib/utils";
import { saProvinces } from "@/data/saProvinces";
import { FixturesDateSelector } from "@/components/fixtures/FixturesDateSelector";
import { SchoolMultiSelectFilter } from "@/components/ui/SchoolMultiSelectFilter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface FixturesFiltersProps {
  viewMode: "my-schools" | "all-schools";
  onViewModeChange: (mode: "my-schools" | "all-schools") => void;
  schools: string[];
  selectedSchools: string[];
  onSelectedSchoolsChange: (schools: string[]) => void;
  selectedProvince?: string;
  onProvinceChange: (province: string | undefined) => void;
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}

export const FixturesFilters = ({
  viewMode,
  onViewModeChange,
  schools,
  selectedSchools,
  onSelectedSchoolsChange,
  selectedProvince,
  onProvinceChange,
  dateRange,
  onDateRangeChange,
}: FixturesFiltersProps) => {
  return (
    <div className="space-y-2 p-4 bg-card/50 border-b border-border/40">
      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === "my-schools" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewModeChange("my-schools")}
          className="flex-1"
        >
          My Schools
        </Button>
        <Button
          variant={viewMode === "all-schools" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewModeChange("all-schools")}
          className="flex-1"
        >
          All Schools
        </Button>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2">
        <SchoolMultiSelectFilter
          schools={schools}
          selectedSchools={selectedSchools}
          onSelectionChange={onSelectedSchoolsChange}
        />

        <FixturesDateSelector dateRange={dateRange} onDateRangeChange={onDateRangeChange} />

        {viewMode === "all-schools" && (
          <Select
            value={selectedProvince || "all"}
            onValueChange={(value) => onProvinceChange(value === "all" ? undefined : value)}
          >
            <SelectTrigger
              className={cn(
                "w-auto h-8 text-xs gap-1 shrink-0",
                selectedProvince && "border-primary text-primary"
              )}
            >
              <SelectValue placeholder="Province" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Provinces</SelectItem>
              {saProvinces.map((province) => (
                <SelectItem key={province} value={province}>
                  {province}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
};
