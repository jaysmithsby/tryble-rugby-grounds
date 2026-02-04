import { useState, useMemo } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { saProvinces } from "@/data/saProvinces";

interface School {
  id: string;
  name: string;
  province?: string | null;
}

interface FixturesFiltersProps {
  viewMode: "my-schools" | "all-schools";
  onViewModeChange: (mode: "my-schools" | "all-schools") => void;
  selectedSchoolId?: string;
  onSchoolChange: (schoolId: string | undefined) => void;
  selectedProvince?: string;
  onProvinceChange: (province: string | undefined) => void;
  schools: School[];
  isLoadingSchools?: boolean;
}

export const FixturesFilters = ({
  viewMode,
  onViewModeChange,
  selectedSchoolId,
  onSchoolChange,
  selectedProvince,
  onProvinceChange,
  schools,
  isLoadingSchools = false,
}: FixturesFiltersProps) => {
  const [schoolSearchOpen, setSchoolSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedSchool = useMemo(
    () => schools.find((s) => s.id === selectedSchoolId),
    [schools, selectedSchoolId]
  );

  const filteredSchools = useMemo(() => {
    if (!searchQuery) return schools.slice(0, 50);
    const query = searchQuery.toLowerCase();
    return schools
      .filter((s) => s.name.toLowerCase().includes(query))
      .slice(0, 50);
  }, [schools, searchQuery]);

  const hasActiveFilters = selectedSchoolId || selectedProvince;

  const clearFilters = () => {
    onSchoolChange(undefined);
    onProvinceChange(undefined);
    setSearchQuery("");
  };

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

      {/* Filters - Only show in All Schools mode */}
      {viewMode === "all-schools" && (
        <div className="flex gap-2 flex-wrap">
          {/* School Search */}
          <Popover open={schoolSearchOpen} onOpenChange={setSchoolSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "min-w-[140px] justify-between",
                  selectedSchoolId && "border-primary text-primary"
                )}
              >
                {selectedSchool ? (
                  <span className="truncate max-w-[120px]">{selectedSchool.name}</span>
                ) : (
                  <>
                    <Search className="h-3.5 w-3.5 mr-1" />
                    School
                  </>
                )}
                <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search schools..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList>
                  <CommandEmpty>
                    {isLoadingSchools ? "Loading..." : "No schools found."}
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredSchools.map((school) => (
                      <CommandItem
                        key={school.id}
                        value={school.name}
                        onSelect={() => {
                          onSchoolChange(school.id);
                          setSchoolSearchOpen(false);
                          setSearchQuery("");
                        }}
                      >
                        <span className="truncate">{school.name}</span>
                        {school.province && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {school.province}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Province Filter */}
          <Select
            value={selectedProvince || "all"}
            onValueChange={(value) => onProvinceChange(value === "all" ? undefined : value)}
          >
            <SelectTrigger 
              className={cn(
                "w-[130px] h-9 text-sm",
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

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
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
