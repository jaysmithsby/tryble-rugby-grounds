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
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { TournamentOption, LookupMaps } from "@/lib/fixtureImportService";

interface TournamentMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unknownTournaments: string[];
  allTournaments: TournamentOption[];
  maps: LookupMaps;
  seasons: string[];
  onConfirm: (tournamentMappings: Record<string, string>) => void;
}

export function TournamentMappingDialog({
  open,
  onOpenChange,
  unknownTournaments,
  allTournaments,
  maps,
  seasons,
  onConfirm,
}: TournamentMappingDialogProps) {
  const { toast } = useToast();
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});
  const [creatingTournament, setCreatingTournament] = useState<string | null>(null);
  const [newTournaments, setNewTournaments] = useState<TournamentOption[]>([]);

  const combinedTournaments = useMemo(
    () => [...allTournaments, ...newTournaments],
    [allTournaments, newTournaments]
  );

  const tournamentsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of combinedTournaments) map.set(t.id, t.name);
    return map;
  }, [combinedTournaments]);

  const mappedCount = unknownTournaments.filter((name) => mappings[name]).length;
  const skippedCount = unknownTournaments.length - mappedCount;

  const handleSelect = (unknownName: string, tournamentId: string) => {
    setMappings((prev) => ({ ...prev, [unknownName]: tournamentId }));
    setOpenPopovers((prev) => ({ ...prev, [unknownName]: false }));
  };

  const handleCreateTournament = async (csvName: string) => {
    setCreatingTournament(csvName);
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .insert({ name: csvName })
        .select("id, name")
        .single();

      if (error) throw error;

      const newTournament: TournamentOption = { id: data.id, name: data.name };
      setNewTournaments((prev) => [...prev, newTournament]);
      // Update the lookup maps so edition auto-creation works during import
      maps.tournamentNameToId.set(csvName.toLowerCase().trim(), data.id);
      setMappings((prev) => ({ ...prev, [csvName]: data.id }));
      toast({ title: "Tournament Created", description: `"${csvName}" created. Editions will be auto-created for each season.` });
    } catch (err: any) {
      console.error("Error creating tournament:", err);
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setCreatingTournament(null);
    }
  };

  const handleConfirm = () => {
    // For mapped tournaments, update the lookup maps so import can resolve them
    const validMappings: Record<string, string> = {};
    for (const [csvName, tournamentId] of Object.entries(mappings)) {
      if (tournamentId) {
        validMappings[csvName] = tournamentId;
        maps.tournamentNameToId.set(csvName.toLowerCase().trim(), tournamentId);
      }
    }
    onConfirm(validMappings);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Step 2: Map Unknown Tournaments</DialogTitle>
          <DialogDescription>
            {unknownTournaments.length} tournament name(s) not found. Map to an existing tournament, create a new one, or skip.
            {seasons.length > 0 && (
              <span className="block mt-1 text-xs">
                Seasons detected: {seasons.join(", ")}. Editions will be auto-created for mapped/created tournaments.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[50vh] -mx-6 px-6">
          <div className="space-y-3 py-2">
            {unknownTournaments.map((name) => {
              const isMapped = !!mappings[name];
              const isCreating = creatingTournament === name;

              return (
                <div
                  key={name}
                  className={cn(
                    "flex items-center gap-2 rounded-md border p-3",
                    isMapped ? "border-green-500/50 bg-green-500/5" : "border-border"
                  )}
                >
                  <span
                    className="text-sm font-medium min-w-0 flex-1 break-words"
                    title={name}
                  >
                    "{name}"
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />

                  {isMapped ? (
                    <span className="text-sm text-green-500 truncate max-w-[180px]" title={tournamentsById.get(mappings[name])}>
                      ✓ {tournamentsById.get(mappings[name])}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
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
                            size="sm"
                            className="w-[160px] justify-between text-xs"
                          >
                            <span className="truncate">Select tournament…</span>
                            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="end">
                          <Command>
                            <CommandInput placeholder="Search tournaments…" />
                            <CommandList>
                              <CommandEmpty>No tournament found.</CommandEmpty>
                              <CommandGroup>
                                {combinedTournaments.map((tournament) => (
                                  <CommandItem
                                    key={tournament.id}
                                    value={tournament.name}
                                    onSelect={() => handleSelect(name, tournament.id)}
                                    title={tournament.name}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4 shrink-0",
                                        mappings[name] === tournament.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="break-words">{tournament.name}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title={`Create "${name}" as a new tournament`}
                        disabled={isCreating}
                        onClick={() => handleCreateTournament(name)}
                      >
                        {isCreating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {skippedCount > 0 && (
            <p className="text-xs text-muted-foreground mr-auto self-center">
              {skippedCount} unmapped — their tournament links will be skipped
            </p>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            {mappedCount === unknownTournaments.length
              ? "Confirm & Import"
              : mappedCount === 0
                ? `Import (skip all ${skippedCount} unmapped)`
                : `Import (skip ${skippedCount} unmapped)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
