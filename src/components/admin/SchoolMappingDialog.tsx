import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronsUpDown, ArrowRight } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { SchoolOption } from "@/lib/fixtureImportService";

interface SchoolMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unknownSchools: string[];
  allSchools: SchoolOption[];
  onConfirm: (mappings: Record<string, string>) => void;
}

export function SchoolMappingDialog({
  open,
  onOpenChange,
  unknownSchools,
  allSchools,
  onConfirm,
}: SchoolMappingDialogProps) {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});

  const schoolsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of allSchools) map.set(s.id, s.name);
    return map;
  }, [allSchools]);

  const mappedCount = unknownSchools.filter((name) => mappings[name]).length;
  const skippedCount = unknownSchools.length - mappedCount;

  const handleSelect = (unknownName: string, schoolId: string) => {
    setMappings((prev) => ({ ...prev, [unknownName]: schoolId }));
    setOpenPopovers((prev) => ({ ...prev, [unknownName]: false }));
  };

  const handleConfirm = () => {
    // Only pass mapped entries; unmapped schools will cause their fixtures to be skipped
    const validMappings: Record<string, string> = {};
    for (const [name, id] of Object.entries(mappings)) {
      if (id) validMappings[name] = id;
    }
    onConfirm(validMappings);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Map Unknown Schools</DialogTitle>
          <DialogDescription>
            {unknownSchools.length} school name(s) from your CSV were not found. Map each to an existing school — this alias will be remembered for future imports.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[50vh] -mx-6 px-6">
          <div className="space-y-3 py-2">
            {unknownSchools.map((name) => (
              <div
                key={name}
                className="flex items-center gap-2 rounded-md border border-border p-3"
              >
                <span className="text-sm font-medium min-w-0 truncate flex-1" title={name}>
                  "{name}"
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Popover
                  open={openPopovers[name] ?? false}
                  onOpenChange={(o) =>
                    setOpenPopovers((prev) => ({ ...prev, [name]: o }))
                  }
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-[200px] justify-between text-sm"
                    >
                      {mappings[name]
                        ? schoolsById.get(mappings[name]) ?? "Selected"
                        : "Select school…"}
                      <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Search schools…" />
                      <CommandList>
                        <CommandEmpty>No school found.</CommandEmpty>
                        <CommandGroup>
                          {allSchools.map((school) => (
                            <CommandItem
                              key={school.id}
                              value={school.name}
                              onSelect={() => handleSelect(name, school.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  mappings[name] === school.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {school.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {skippedCount > 0 && (
            <p className="text-xs text-muted-foreground mr-auto self-center">
              {skippedCount} unmapped — their fixtures will be skipped
            </p>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={mappedCount === 0}>
            {mappedCount === unknownSchools.length
              ? "Confirm Mapping"
              : `Import (skip ${skippedCount} unmapped)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
