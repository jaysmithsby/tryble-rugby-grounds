import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { School, X, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSchoolsQuery } from "@/hooks/useSchoolsQuery";

interface SchoolData {
  id: string;
  name: string;
  icon_url: string | null;
}

interface PoolSchoolsListProps {
  schools: string[];
  poolId: string;
  isAdmin: boolean;
  onSchoolsUpdated: () => void;
}

export const PoolSchoolsList = ({
  schools,
  poolId,
  isAdmin,
  onSchoolsUpdated,
}: PoolSchoolsListProps) => {
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSchools, setSelectedSchools] = useState<string[]>(schools);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { schools: availableSchools } = useSchoolsQuery<SchoolData>({
    select: "id, name, icon_url",
  });

  const canEdit = isAdmin && isEditable;

  const filteredSchools = availableSchools.filter((school) =>
    school.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSchool = (schoolName: string) => {
    if (selectedSchools.includes(schoolName)) {
      if (selectedSchools.length > 5) {
        setSelectedSchools(selectedSchools.filter((s) => s !== schoolName));
      } else {
        toast({
          title: "Minimum schools required",
          description: "You must have at least 5 schools in your pool.",
          variant: "destructive",
        });
      }
    } else if (selectedSchools.length < 10) {
      setSelectedSchools([...selectedSchools, schoolName]);
    } else {
      toast({
        title: "Maximum schools reached",
        description: "You can have a maximum of 10 schools in your pool.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (selectedSchools.length < 5) {
      toast({
        title: "Not enough schools",
        description: "Please select at least 5 schools.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("pools")
        .update({ schools: selectedSchools })
        .eq("id", poolId);

      if (error) throw error;

      toast({
        title: "Schools updated",
        description: "Your pool schools have been updated.",
      });

      setIsEditDialogOpen(false);
      onSchoolsUpdated();
    } catch (error: any) {
      toast({
        title: "Error updating schools",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openEditDialog = () => {
    setSelectedSchools(schools);
    setSearchQuery("");
    setIsEditDialogOpen(true);
  };

  if (schools.length === 0) {
    return (
      <div className="text-center py-8">
        <School className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground text-sm">No schools selected</p>
        {canEdit && (
          <Button variant="outline" size="sm" className="mt-3" onClick={openEditDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Schools
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {schools.map((school) => (
            <Badge key={school} variant="outline" className="h-8 px-3 gap-1.5">
              {school}
            </Badge>
          ))}
        </div>

        {canEdit && (
          <Button variant="outline" size="sm" onClick={openEditDialog}>
            Edit Schools
          </Button>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Pool Schools</DialogTitle>
            <DialogDescription>
              Select 5–10 schools for your pool. Changes will apply to future predictions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {selectedSchools.length}/10 schools selected
              </span>
              {selectedSchools.length < 5 && (
                <span className="text-destructive">
                  Need {5 - selectedSchools.length} more
                </span>
              )}
            </div>

            {selectedSchools.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
                {selectedSchools.map((school) => (
                  <Badge
                    key={school}
                    variant="default"
                    className="cursor-pointer h-7 px-3"
                    onClick={() => toggleSchool(school)}
                  >
                    {school}
                    <X className="w-3 h-3 ml-1.5" />
                  </Badge>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search schools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-48 border rounded-lg bg-background">
              <div className="p-3 space-y-2">
                {filteredSchools.length > 0 ? (
                  filteredSchools.map((school) => (
                    <Button
                      key={school.id}
                      variant={
                        selectedSchools.includes(school.name) ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => toggleSchool(school.name)}
                      disabled={
                        selectedSchools.length >= 10 &&
                        !selectedSchools.includes(school.name)
                      }
                      className="w-full justify-start h-10 gap-2"
                    >
                      {school.icon_url && (
                        <img
                          src={school.icon_url}
                          alt={`${school.name} jersey`}
                          className="w-6 h-6 object-contain flex-shrink-0"
                        />
                      )}
                      <span className="truncate">{school.name}</span>
                    </Button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No schools found
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={isSaving || selectedSchools.length < 5}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
