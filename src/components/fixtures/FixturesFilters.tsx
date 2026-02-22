import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { saProvinces } from "@/data/saProvinces";
import { FixturesDateSelector } from "@/components/fixtures/FixturesDateSelector";

interface FixturesFiltersProps {
  viewMode: "my-schools" | "all-schools";
  onViewModeChange: (mode: "my-schools" | "all-schools") => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedProvince?: string;
  onProvinceChange: (province: string | undefined) => void;
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}

export const FixturesFilters = ({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchQueryChange,
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

      {/* Search + Date + Province in one row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search school..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchQueryChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

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