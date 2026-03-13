import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shirt, Loader2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ProposedMatch {
  schoolId: string;
  schoolName: string;
  filename: string;
  jerseyUrl: string;
  matchMethod: string;
}

interface MatchJerseysButtonProps {
  onSuccess?: () => void;
}

export function MatchJerseysButton({ onSuccess }: MatchJerseysButtonProps) {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [matches, setMatches] = useState<ProposedMatch[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);

  const handleScan = async () => {
    setScanning(true);
    try {
      // List all files in the school-jerseys bucket
      const { data: files, error: filesError } = await supabase.storage
        .from("school-jerseys")
        .list("", { limit: 1000 });

      if (filesError) throw filesError;

      const jerseyFiles = (files || []).filter(
        (f) => !f.id?.endsWith("/") && (f.name.endsWith(".png") || f.name.endsWith(".svg") || f.name.endsWith(".jpg") || f.name.endsWith(".jpeg"))
      );

      // Fetch all schools
      const { data: schools, error: schoolsError } = await supabase
        .from("schools")
        .select("id, name, nickname, alias, jersey_url")
        .eq("is_archived", false);

      if (schoolsError) throw schoolsError;

      const proposed: ProposedMatch[] = [];
      const unmatchedFiles: string[] = [];

      const projectUrl = import.meta.env.VITE_SUPABASE_URL;

      for (const file of jerseyFiles) {
        const stem = file.name.replace(/\.[^.]+$/, "");
        const normalized = stem.replace(/_/g, " ").replace(/ë/g, "e").trim();
        const normalizedLower = normalized.toLowerCase();

        let matched = false;

        for (const school of schools || []) {
          // Skip schools that already have a jersey_url
          if (school.jersey_url) continue;

          // Check nickname (exact, case-insensitive)
          if (school.nickname && school.nickname.toLowerCase().replace(/ë/g, "e") === normalizedLower) {
            proposed.push({
              schoolId: school.id,
              schoolName: school.name,
              filename: file.name,
              jerseyUrl: `${projectUrl}/storage/v1/object/public/school-jerseys/${file.name}`,
              matchMethod: `nickname="${school.nickname}"`,
            });
            matched = true;
            break;
          }

          // Check name (contains, case-insensitive)
          if (school.name.toLowerCase().replace(/ë/g, "e").includes(normalizedLower)) {
            proposed.push({
              schoolId: school.id,
              schoolName: school.name,
              filename: file.name,
              jerseyUrl: `${projectUrl}/storage/v1/object/public/school-jerseys/${file.name}`,
              matchMethod: `name contains "${normalized}"`,
            });
            matched = true;
            break;
          }

          // Check alias array
          const aliases = Array.isArray(school.alias) ? school.alias : [];
          for (const a of aliases) {
            if (typeof a === "string" && a.toLowerCase() === normalizedLower) {
              proposed.push({
                schoolId: school.id,
                schoolName: school.name,
                filename: file.name,
                jerseyUrl: `${projectUrl}/storage/v1/object/public/school-jerseys/${file.name}`,
                matchMethod: `alias="${a}"`,
              });
              matched = true;
              break;
            }
          }
          if (matched) break;
        }

        if (!matched) {
          // Check if any school already has this file as jersey_url (already linked)
          const alreadyLinked = (schools || []).some(
            (s) => s.jersey_url && s.jersey_url.includes(file.name)
          );
          if (!alreadyLinked) {
            unmatchedFiles.push(file.name);
          }
        }
      }

      setMatches(proposed);
      setUnmatched(unmatchedFiles);
      setDialogOpen(true);

      if (proposed.length === 0) {
        toast({
          title: "No new matches found",
          description: `${unmatchedFiles.length} files couldn't be matched. All other jerseys are already linked.`,
        });
      }
    } catch (error: any) {
      console.error("Error scanning jerseys:", error);
      toast({
        title: "Scan failed",
        description: error.message || "Could not scan jersey files",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const handleApply = async () => {
    if (matches.length === 0) return;
    setApplying(true);

    let successCount = 0;
    let failCount = 0;

    for (const match of matches) {
      const { error } = await supabase
        .from("schools")
        .update({ jersey_url: match.jerseyUrl })
        .eq("id", match.schoolId);

      if (error) {
        console.error(`Failed to update ${match.schoolName}:`, error);
        failCount++;
      } else {
        successCount++;
      }
    }

    setApplying(false);
    setDialogOpen(false);

    toast({
      title: "Jerseys matched",
      description: `${successCount} schools updated${failCount > 0 ? `, ${failCount} failed` : ""}`,
    });

    if (successCount > 0) {
      onSuccess?.();
    }
  };

  return (
    <>
      <Button variant="outline" onClick={handleScan} disabled={scanning} className="gap-2">
        {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shirt className="h-4 w-4" />}
        Match Jerseys
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Auto-Match Jerseys</DialogTitle>
            <DialogDescription>
              {matches.length > 0
                ? `Found ${matches.length} new match${matches.length === 1 ? "" : "es"} to apply.`
                : "No new matches found."}
              {unmatched.length > 0 && ` ${unmatched.length} file${unmatched.length === 1 ? "" : "s"} unmatched.`}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px]">
            {matches.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Proposed matches:</h4>
                {matches.map((m) => (
                  <div key={m.schoolId} className="flex items-center gap-3 p-2 rounded-md border bg-muted/30">
                    <img
                      src={m.jerseyUrl}
                      alt={m.filename}
                      className="h-8 w-8 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.schoolName}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.filename} — {m.matchMethod}</p>
                    </div>
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  </div>
                ))}
              </div>
            )}

            {unmatched.length > 0 && (
              <div className="mt-4 space-y-1">
                <h4 className="text-sm font-medium text-muted-foreground">Unmatched files:</h4>
                <div className="flex flex-wrap gap-1">
                  {unmatched.map((f) => (
                    <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            {matches.length > 0 && (
              <Button onClick={handleApply} disabled={applying} className="gap-2">
                {applying && <Loader2 className="h-4 w-4 animate-spin" />}
                Apply {matches.length} match{matches.length === 1 ? "" : "es"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
