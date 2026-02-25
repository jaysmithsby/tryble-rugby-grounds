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

import { Label } from "@/components/ui/label";
import { Check, ChevronsUpDown, ArrowRight, Plus, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { SchoolOption } from "@/lib/fixtureImportService";
import { saProvinces as SA_PROVINCES } from "@/data/saProvinces";

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
  allSchools: initialSchools,
  onConfirm,
}: SchoolMappingDialogProps) {
  const { toast } = useToast();
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});
  const [allSchools, setAllSchools] = useState<SchoolOption[]>(initialSchools);

  // Inline create state — tracks which unknown name has the create form open
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [createProvince, setCreateProvince] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Sync initial schools when dialog re-opens
  useState(() => {
    setAllSchools(initialSchools);
  });

  const schoolsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of allSchools) map.set(s.id, s.name);
    return map;
  }, [allSchools]);

  const allMapped = unknownSchools.every((name) => mappings[name]);

  const handleSelect = (unknownName: string, schoolId: string) => {
    setMappings((prev) => ({ ...prev, [unknownName]: schoolId }));
    setOpenPopovers((prev) => ({ ...prev, [unknownName]: false }));
  };

  const handleCreateSchool = async (csvName: string) => {
    setCreateLoading(true);
    try {
      const slug = csvName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const { data, error } = await supabase
        .from("schools")
        .insert({
          name: csvName.trim(),
          slug: slug || `school-${Date.now()}`,
          status: "approved",
          is_visible: true,
          province: createProvince || null,
        })
        .select("id, name")
        .single();

      if (error) throw error;

      // Add to local schools list and auto-map
      setAllSchools((prev) => [...prev, { id: data.id, name: data.name }]);
      setMappings((prev) => ({ ...prev, [csvName]: data.id }));
      setCreatingFor(null);
      setCreateProvince("");
      toast({ title: "School Created", description: `"${data.name}" added and mapped.` });
    } catch (err: any) {
      console.error("Failed to create school:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleConfirm = () => {
    if (allMapped) onConfirm(mappings);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Map Unknown Schools</DialogTitle>
          <DialogDescription>
            {unknownSchools.length} school name(s) from your CSV were not found. Map each to an existing school or create a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[50vh] -mx-6 px-6">
          <div className="space-y-3 py-2">
            {unknownSchools.map((name) => (
              <div key={name} className="rounded-md border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium min-w-0 truncate flex-1" title={name}>
                    "{name}"
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />

                  {mappings[name] ? (
                    <Button
                      variant="outline"
                      className="w-[200px] justify-between text-sm"
                      onClick={() => {
                        setMappings((prev) => {
                          const next = { ...prev };
                          delete next[name];
                          return next;
                        });
                      }}
                    >
                      <span className="truncate">{schoolsById.get(mappings[name]) ?? "Selected"}</span>
                      <Check className="ml-1 h-3 w-3 shrink-0 text-primary" />
                    </Button>
                  ) : (
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
                          Select school…
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
                  )}
                </div>

                {/* Create school inline */}
                {!mappings[name] && creatingFor !== name && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1 h-7"
                    onClick={() => { setCreatingFor(name); setCreateProvince(""); }}
                  >
                    <Plus className="h-3 w-3" />
                    Create "{name}" as new school
                  </Button>
                )}

                {creatingFor === name && !mappings[name] && (
                  <div className="flex items-end gap-2 pt-1">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Province (optional)</Label>
                      <Select value={createProvince} onValueChange={setCreateProvince}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select province…" />
                        </SelectTrigger>
                        <SelectContent>
                          {SA_PROVINCES.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      disabled={createLoading}
                      onClick={() => handleCreateSchool(name)}
                    >
                      {createLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setCreatingFor(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!allMapped}>
            Confirm Mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
