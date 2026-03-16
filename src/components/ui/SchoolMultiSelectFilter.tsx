import { useState, useMemo } from "react";
import { Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SchoolMultiSelectFilterProps {
  schools: string[];
  selectedSchools: string[];
  onSelectionChange: (schools: string[]) => void;
  label?: string;
}

export function SchoolMultiSelectFilter({
  schools,
  selectedSchools,
  onSelectionChange,
  label = "Schools",
}: SchoolMultiSelectFilterProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return schools;
    const q = search.toLowerCase();
    return schools.filter((s) => s.toLowerCase().includes(q));
  }, [schools, search]);

  const toggle = (school: string) => {
    onSelectionChange(
      selectedSchools.includes(school)
        ? selectedSchools.filter((s) => s !== school)
        : [...selectedSchools, school]
    );
  };

  const buttonLabel =
    selectedSchools.length > 0
      ? `${label} (${selectedSchools.length}/${schools.length})`
      : `All ${label}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-8 px-2.5 shrink-0"
        >
          <Filter className="h-3.5 w-3.5" />
          {buttonLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        {schools.length > 5 && (
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 h-7 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
        <div className="max-h-52 overflow-y-auto space-y-1">
          {filtered.map((school) => (
            <label
              key={school}
              className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
            >
              <Checkbox
                checked={selectedSchools.includes(school)}
                onCheckedChange={() => toggle(school)}
              />
              <span className="truncate">{school}</span>
            </label>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              No schools found
            </p>
          )}
        </div>
        {selectedSchools.length > 0 && (
          <button
            onClick={() => onSelectionChange([])}
            className="text-xs text-primary mt-2 hover:underline"
          >
            Clear all
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
