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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { useSchoolsQuery } from "@/hooks/useSchoolsQuery";

interface School {
  id: string;
  name: string;
  province: string | null;
  icon_url: string | null;
}

interface CreatePoolPackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreatePoolPackDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreatePoolPackDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "approved">("draft");
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [metadata, setMetadata] = useState({
    province: "",
    competitive_level: "",
    tags: "",
  });
  const [loading, setLoading] = useState(false);

  // Use the simulation-aware hook
  const { schools, refetch } = useSchoolsQuery<School>({
    select: "id, name, province, icon_url",
  });

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open]);

  const toggleSchool = (schoolName: string) => {
    if (selectedSchools.includes(schoolName)) {
      setSelectedSchools(selectedSchools.filter((s) => s !== schoolName));
    } else if (selectedSchools.length < 10) {
      setSelectedSchools([...selectedSchools, schoolName]);
    } else {
      toast.error("Maximum 10 schools allowed per Pack");
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a pack name");
      return;
    }

    if (selectedSchools.length < 5) {
      toast.error("Please select at least 5 schools");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("pool_templates").insert({
        name: name.trim(),
        description: description.trim() || null,
        schools: selectedSchools,
        status,
        metadata: {
          province: metadata.province || null,
          competitive_level: metadata.competitive_level || null,
          tags: metadata.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
      });

      if (error) throw error;

      toast.success("Pool Pack created successfully");
      onOpenChange(false);
      onSuccess();
      resetForm();
    } catch (error: any) {
      toast.error("Failed to create Pool Pack");
      console.error("Error creating pack:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setStatus("draft");
    setSelectedSchools([]);
    setSearchTerm("");
    setMetadata({ province: "", competitive_level: "", tags: "" });
  };

  const filteredSchools = schools.filter((school) =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Pool Pack</DialogTitle>
          <DialogDescription>
            Create a curated collection of schools for users to follow
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto pr-2">
          <div className="space-y-2">
            <Label htmlFor="name">Pack Name *</Label>
            <Input
              id="name"
              placeholder="e.g., KZN Top, Western Cape Elite"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of this pack..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Visibility Status</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="province">Province (Optional)</Label>
              <Input
                id="province"
                placeholder="e.g., KwaZulu-Natal"
                value={metadata.province}
                onChange={(e) =>
                  setMetadata({ ...metadata, province: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Competitive Level (Optional)</Label>
              <Input
                id="level"
                placeholder="e.g., Elite, Emerging"
                value={metadata.competitive_level}
                onChange={(e) =>
                  setMetadata({ ...metadata, competitive_level: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="e.g., derby, regional"
                value={metadata.tags}
                onChange={(e) =>
                  setMetadata({ ...metadata, tags: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Select Schools * ({selectedSchools.length}/10, min 5 required)
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search schools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <ScrollArea className="h-[200px] border rounded-lg p-4">
              <div className="space-y-2">
                {filteredSchools.map((school) => (
                  <div
                    key={school.id}
                    className="flex items-center space-x-2 p-2 hover:bg-muted rounded-lg"
                  >
                    <Checkbox
                      id={school.id}
                      checked={selectedSchools.includes(school.name)}
                      onCheckedChange={() => toggleSchool(school.name)}
                      disabled={
                        selectedSchools.length >= 10 &&
                        !selectedSchools.includes(school.name)
                      }
                    />
                    <label
                      htmlFor={school.id}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      {school.name}
                      {school.province && (
                        <span className="text-muted-foreground ml-2">
                          ({school.province})
                        </span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "Creating..." : "Create Pool Pack"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
