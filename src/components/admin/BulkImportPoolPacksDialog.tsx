import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Download } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { useVerifiedSchoolNames } from "@/hooks/useSchoolsQuery";

const downloadTemplate = () => {
  const template = `name,description,status,province,competitive_level,tags,schools
KZN Elite,Top rugby schools in KwaZulu-Natal,approved,KwaZulu-Natal,Elite,"regional,competitive",Glenwood High School|Maritzburg College|Kearsney College|Hilton College|Westville Boys High
Western Cape Top 5,Best Western Cape schools,draft,Western Cape,Elite,regional,Paul Roos Gymnasium|Paarl Gimnasium|Bishops|Wynberg Boys High|Rondebosch Boys High
Gauteng Powerhouses,Elite Gauteng rugby schools,approved,Gauteng,Elite,"competitive,urban",Affies|Grey College Bloemfontein|Monument|Jeppe|KES`;

  const blob = new Blob([template], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pool_packs_template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  toast.success("Template downloaded");
};

interface ParsedPack {
  name: string;
  description: string;
  status: string;
  province: string;
  competitive_level: string;
  tags: string[];
  schools: string[];
  valid: boolean;
  errors: string[];
}

interface BulkImportPoolPacksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const BulkImportPoolPacksDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: BulkImportPoolPacksDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedPacks, setParsedPacks] = useState<ParsedPack[]>([]);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [loading, setLoading] = useState(false);

  // Use the simulation-aware hook for valid school names
  const { schoolNames: validSchools, isSimulationMode } = useVerifiedSchoolNames();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setFile(selectedFile);
    await parseCSV(selectedFile);
  };

  const parseCSV = async (file: File) => {
    setLoading(true);
    try {
      // Use validSchools from the hook (simulation-aware)

      // Parse CSV
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const packs: ParsedPack[] = results.data.map((row: any) => {
            const errors: string[] = [];
            
            // Validate name
            if (!row.name || row.name.trim().length < 3) {
              errors.push("Name must be at least 3 characters");
            }

            // Parse schools (pipe-separated or comma-separated)
            const schoolsStr = row.schools || "";
            const schools = schoolsStr
              .split(/[|,]/)
              .map((s: string) => s.trim())
              .filter(Boolean);

            // Validate schools count
            if (schools.length < 5) {
              errors.push(`Need at least 5 schools (has ${schools.length})`);
            }
            if (schools.length > 10) {
              errors.push(`Maximum 10 schools allowed (has ${schools.length})`);
            }

            // Validate schools exist (uses validSchools from hook)
            const invalidSchools = schools.filter(
              (s: string) => !validSchools.includes(s)
            );
            if (invalidSchools.length > 0) {
              errors.push(
                `Invalid schools: ${invalidSchools.slice(0, 3).join(", ")}${
                  invalidSchools.length > 3 ? "..." : ""
                }`
              );
            }

            // Validate status
            const status = row.status?.toLowerCase() || "draft";
            if (!["draft", "approved", "archived"].includes(status)) {
              errors.push("Status must be: draft, approved, or archived");
            }

            // Parse tags
            const tagsStr = row.tags || "";
            const tags = tagsStr
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean);

            return {
              name: row.name?.trim() || "",
              description: row.description?.trim() || "",
              status: status,
              province: row.province?.trim() || "",
              competitive_level: row.competitive_level?.trim() || "",
              tags,
              schools,
              valid: errors.length === 0,
              errors,
            };
          });

          setParsedPacks(packs);
          setStep("preview");
          setLoading(false);
        },
        error: (error) => {
          toast.error(`CSV parsing error: ${error.message}`);
          setLoading(false);
        },
      });
    } catch (error: any) {
      toast.error("Failed to process CSV file");
      console.error("Error processing CSV:", error);
      setLoading(false);
    }
  };

  const handleImport = async () => {
    const validPacks = parsedPacks.filter((p) => p.valid);
    if (validPacks.length === 0) {
      toast.error("No valid packs to import");
      return;
    }

    setLoading(true);
    try {
      const packsToInsert = validPacks.map((pack) => ({
        name: pack.name,
        description: pack.description || null,
        schools: pack.schools,
        status: pack.status,
        metadata: {
          province: pack.province || null,
          competitive_level: pack.competitive_level || null,
          tags: pack.tags,
        },
      }));

      const { error } = await supabase
        .from("pool_templates")
        .insert(packsToInsert);

      if (error) throw error;

      toast.success(`Successfully imported ${validPacks.length} Pool Packs`);
      onOpenChange(false);
      onSuccess();
      resetDialog();
    } catch (error: any) {
      toast.error("Failed to import Pool Packs");
      console.error("Error importing packs:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetDialog = () => {
    setFile(null);
    setParsedPacks([]);
    setStep("upload");
  };

  const validCount = parsedPacks.filter((p) => p.valid).length;
  const invalidCount = parsedPacks.length - validCount;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) resetDialog();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import Pool Packs</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple Pool Packs at once
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <Alert className="flex-1">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>CSV Format Requirements:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>
                      <strong>name</strong> (required): Pack name, 3+ characters
                    </li>
                    <li>
                      <strong>description</strong> (optional): Brief description
                    </li>
                    <li>
                      <strong>status</strong> (optional): draft, approved, or
                      archived (default: draft)
                    </li>
                    <li>
                      <strong>province</strong> (optional): Province name
                    </li>
                    <li>
                      <strong>competitive_level</strong> (optional): Elite,
                      Emerging, etc.
                    </li>
                    <li>
                      <strong>tags</strong> (optional): Comma-separated tags
                    </li>
                    <li>
                      <strong>schools</strong> (required): 5-10 school names,
                      separated by pipes (|) or commas
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>

            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="w-full gap-2"
            >
              <Download className="h-4 w-4" />
              Download CSV Template
            </Button>

            <div className="space-y-2">
              <Label htmlFor="csv-file">Upload CSV File</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={loading}
                />
                {file && (
                  <Badge variant="secondary" className="flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    {file.name}
                  </Badge>
                )}
              </div>
            </div>

            <Alert variant="default" className="bg-muted">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Example CSV row:</strong>
                <pre className="mt-2 text-xs bg-background p-2 rounded overflow-x-auto">
                  KZN Elite,Top rugby schools in
                  KwaZulu-Natal,approved,KwaZulu-Natal,Elite,"regional,competitive",Glenwood
                  High School|Maritzburg College|Kearsney College|Hilton
                  College|Westville Boys High
                </pre>
              </AlertDescription>
            </Alert>

            {loading && (
              <p className="text-sm text-muted-foreground text-center">
                Processing CSV file...
              </p>
            )}
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {validCount} Valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    {invalidCount} Invalid
                  </Badge>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-4 space-y-3">
                {parsedPacks.map((pack, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg ${
                      pack.valid ? "bg-card" : "bg-destructive/10 border-destructive"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {pack.valid ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          <h4 className="font-semibold">{pack.name || "(No name)"}</h4>
                          <Badge variant="outline" className="text-xs">
                            {pack.status}
                          </Badge>
                        </div>

                        {pack.description && (
                          <p className="text-sm text-muted-foreground">
                            {pack.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2 text-xs">
                          {pack.province && (
                            <Badge variant="secondary">{pack.province}</Badge>
                          )}
                          {pack.competitive_level && (
                            <Badge variant="secondary">
                              {pack.competitive_level}
                            </Badge>
                          )}
                          {pack.tags.map((tag, i) => (
                            <Badge key={i} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {pack.schools.length} schools:{" "}
                          {pack.schools.slice(0, 3).join(", ")}
                          {pack.schools.length > 3 && "..."}
                        </div>

                        {pack.errors.length > 0 && (
                          <div className="space-y-1">
                            {pack.errors.map((error, i) => (
                              <p key={i} className="text-xs text-destructive">
                                • {error}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload");
                  setParsedPacks([]);
                }}
              >
                ← Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={loading || validCount === 0}
              >
                {loading
                  ? "Importing..."
                  : `Import ${validCount} Pack${validCount !== 1 ? "s" : ""}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
