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
import { AlertTriangle, School, Search, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChangeSchoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSchool: string;
  hasChangedSchool: boolean;
  onSchoolChanged: () => void;
}

interface SchoolOption {
  id: string;
  name: string;
  province: string | null;
}

export const ChangeSchoolDialog = ({
  open,
  onOpenChange,
  currentSchool,
  hasChangedSchool,
  onSchoolChanged,
}: ChangeSchoolDialogProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"warning" | "select">("warning");
  const [searchQuery, setSearchQuery] = useState("");
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<SchoolOption[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && step === "select") {
      fetchSchools();
    }
  }, [open, step]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredSchools(schools);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredSchools(
        schools.filter(
          (s) =>
            s.name.toLowerCase().includes(query) ||
            (s.province && s.province.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, schools]);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("id, name, province")
        .eq("status", "active")
        .eq("is_visible", true)
        .order("name");

      if (error) throw error;
      setSchools(data || []);
      setFilteredSchools(data || []);
    } catch (error) {
      console.error("Error fetching schools:", error);
      toast({
        variant: "destructive",
        title: "Error loading schools",
        description: "Please try again later",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmChange = async () => {
    if (!selectedSchool) return;

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          school_name: selectedSchool.name,
          school_changed_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "School updated",
        description: `Your school has been changed to ${selectedSchool.name}`,
      });

      onSchoolChanged();
      handleClose();
    } catch (error) {
      console.error("Error updating school:", error);
      toast({
        variant: "destructive",
        title: "Error updating school",
        description: "Please try again later",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setStep("warning");
    setSearchQuery("");
    setSelectedSchool(null);
    onOpenChange(false);
  };

  // If user has already changed school, show locked message
  if (hasChangedSchool) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              School Change Unavailable
            </DialogTitle>
            <DialogDescription>
              You have already used your one-time school change.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg bg-muted/50 border border-border p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p>
                    Each user is only allowed to change their school <strong>once</strong> to prevent misuse.
                  </p>
                  <p className="text-muted-foreground">
                    If you believe there has been an error, please contact support at{" "}
                    <a href="mailto:support@tryble.co.za" className="text-primary hover:underline">
                      support@tryble.co.za
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === "warning" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Important: One-Time Change Only
              </DialogTitle>
              <DialogDescription>
                Please read carefully before proceeding.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4">
                <div className="space-y-3 text-sm">
                  <p className="font-medium text-amber-600 dark:text-amber-400">
                    ⚠️ You can only change your school ONCE
                  </p>
                  <p>
                    This feature is intended for users who made a mistake during sign-up. 
                    After changing your school, you will not be able to change it again.
                  </p>
                  <p className="text-muted-foreground">
                    Your current school: <strong className="text-foreground">{currentSchool}</strong>
                  </p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Changing your school will:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Move you to a different school leaderboard</li>
                  <li>Update your display name</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={() => setStep("select")} className="w-full sm:w-auto">
                I Understand, Continue
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                Select Your New School
              </DialogTitle>
              <DialogDescription>
                Search and select your correct school below.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search schools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-64 rounded-md border">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Loading schools...</p>
                  </div>
                ) : filteredSchools.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No schools found</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredSchools.map((school) => (
                      <button
                        key={school.id}
                        onClick={() => setSelectedSchool(school)}
                        disabled={school.name === currentSchool}
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center justify-between ${
                          school.name === currentSchool
                            ? "bg-muted/50 text-muted-foreground cursor-not-allowed"
                            : selectedSchool?.id === school.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div>
                          <p className="font-medium">{school.name}</p>
                          {school.province && (
                            <p className={`text-xs ${
                              selectedSchool?.id === school.id 
                                ? "text-primary-foreground/70" 
                                : "text-muted-foreground"
                            }`}>
                              {school.province}
                            </p>
                          )}
                        </div>
                        {school.name === currentSchool && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">Current</span>
                        )}
                        {selectedSchool?.id === school.id && (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {selectedSchool && (
                <div className="rounded-lg bg-primary/10 border border-primary/30 p-3">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Changing to:</span>{" "}
                    <strong>{selectedSchool.name}</strong>
                  </p>
                </div>
              )}
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setStep("warning")} className="w-full sm:w-auto">
                Back
              </Button>
              <Button
                onClick={handleConfirmChange}
                disabled={!selectedSchool || saving}
                className="w-full sm:w-auto"
              >
                {saving ? "Updating..." : "Confirm Change"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
