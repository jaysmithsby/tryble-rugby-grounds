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

interface FixturesFiltersProps {
  viewMode: "my-schools" | "all-schools";
  onViewModeChange: (mode: "my-schools" | "all-schools") => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedProvince?: string;
  onProvinceChange: (province: string | undefined) => void;
}

export const FixturesFilters = ({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchQueryChange,
  selectedProvince,
  onProvinceChange,
}: FixturesFiltersProps) => {
  const hasActiveFilters = selectedProvince;

  return (
    <div className="space-y-3 p-4 bg-card/50 border-b border-border/40">
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

      {/* Search Bar - always visible */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search by school name..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchQueryChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Province Filter - Only in All Schools mode */}
      {viewMode === "all-schools" && (
        <div className="flex gap-2">
          <Select
            value={selectedProvince || "all"}
            onValueChange={(value) => onProvinceChange(value === "all" ? undefined : value)}
          >
            <SelectTrigger
              className={cn(
                "w-[140px] h-9 text-sm",
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

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onProvinceChange(undefined)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
};