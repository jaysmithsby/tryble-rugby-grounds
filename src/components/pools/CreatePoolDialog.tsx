import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, X, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sanitizePoolName } from "@/lib/profanityFilter";

interface CreatePoolDialogProps {
  onPoolCreated: () => void;
}

export const CreatePoolDialog = ({ onPoolCreated }: CreatePoolDialogProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"configure" | "preview">("configure");
  const [poolName, setPoolName] = useState("");
  const [votingMode, setVotingMode] = useState(false);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [availableSchools, setAvailableSchools] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("name")
        .eq("status", "verified")
        .order("name");

      if (error) throw error;
      setAvailableSchools(data?.map(s => s.name) || []);
    } catch (error) {
      console.error("Error loading schools:", error);
    }
  };

  const toggleSchool = (school: string) => {
    if (selectedSchools.includes(school)) {
      setSelectedSchools(selectedSchools.filter(s => s !== school));
    } else if (selectedSchools.length < 10) {
      setSelectedSchools([...selectedSchools, school]);
    }
  };

  const filteredSchools = availableSchools.filter(school =>
    school.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConfirmSchools = () => {
    const validation = sanitizePoolName(poolName);
    if (!validation.isValid) {
      toast({ 
        title: "Invalid pool name", 
        description: validation.message, 
        variant: "destructive" 
      });
      return;
    }

    if (!votingMode && selectedSchools.length === 0) {
      toast({
        title: "Select schools",
        description: "Please select at least one school to follow.",
        variant: "destructive"
      });
      return;
    }

    setStep("preview");
  };

  const createPool = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: pool, error: poolError } = await supabase
        .from("pools")
        .insert({
          name: poolName,
          invite_code: inviteCode,
          creator_id: user.id,
          schools: votingMode ? [] : selectedSchools,
          voting_mode: votingMode,
          max_schools: 10
        })
        .select()
        .single();

      if (poolError) throw poolError;

      // Auto-join creator as member
      const { error: memberError } = await supabase
        .from("pool_members")
        .insert({
          pool_id: pool.id,
          user_id: user.id
        });

      if (memberError) throw memberError;

      toast({
        title: "Pool created!",
        description: `Invite code: ${inviteCode}`
      });

      setPoolName("");
      setSelectedSchools([]);
      setVotingMode(false);
      setStep("configure");
      setOpen(false);
      onPoolCreated();
    } catch (error: any) {
      toast({
        title: "Error creating pool",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep("configure");
  };

  const isConfigureValid = poolName.trim().length >= 3 && (votingMode || selectedSchools.length > 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setStep("configure");
        setPoolName("");
        setSelectedSchools([]);
        setVotingMode(false);
        setSearchQuery("");
      }
    }}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Users className="w-4 h-4 mr-2" />
          Create Pool
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === "configure" ? "Create a New Pool" : "Review Your Pool"}
          </DialogTitle>
          <DialogDescription>
            {step === "configure" 
              ? "Create a private leaderboard for your friends or school circle"
              : "Review pool details before creating"
            }
          </DialogDescription>
        </DialogHeader>

        {step === "configure" && (
          <div className="space-y-6 py-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label htmlFor="poolName">Pool Name</Label>
              <Input
                id="poolName"
                placeholder="e.g., MHS Rugby Fans 2025"
                value={poolName}
                onChange={(e) => setPoolName(e.target.value)}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                Choose a respectful, school-appropriate name
              </p>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Enable Voting Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Let members vote on which schools to follow
                </p>
              </div>
              <Switch
                checked={votingMode}
                onCheckedChange={setVotingMode}
              />
            </div>

            {!votingMode && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Schools to Follow (up to 10)</Label>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {selectedSchools.length}/10 schools selected
                    </p>
                    {selectedSchools.length >= 10 && (
                      <p className="text-xs text-destructive font-medium">
                        Maximum reached
                      </p>
                    )}
                  </div>
                </div>
                
                {selectedSchools.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30 min-h-[60px]">
                    {selectedSchools.map((school) => (
                      <Badge
                        key={school}
                        variant="default"
                        className="cursor-pointer h-7 px-3 animate-scale-in"
                        onClick={() => toggleSchool(school)}
                      >
                        {school}
                        <X className="w-3 h-3 ml-1.5" />
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search schools..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <ScrollArea className="h-56 border rounded-lg bg-background">
                    <div className="p-3 space-y-2">
                      {filteredSchools.length > 0 ? (
                        filteredSchools.map((school) => (
                          <Button
                            key={school}
                            variant={selectedSchools.includes(school) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleSchool(school)}
                            disabled={selectedSchools.length >= 10 && !selectedSchools.includes(school)}
                            className="w-full justify-start h-10"
                          >
                            {school}
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

                {selectedSchools.length >= 10 && (
                  <p className="text-xs text-muted-foreground text-center p-2 bg-muted/50 rounded">
                    ℹ️ You can only follow up to 10 schools per pool
                  </p>
                )}
              </div>
            )}

            {votingMode && (
              <div className="p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm text-muted-foreground">
                  🗳️ Members will vote on which schools to include after joining the pool. The top 10 schools by votes will be included in predictions.
                </p>
              </div>
            )}

            <div className="sticky bottom-0 bg-background pt-4 border-t space-y-3">
              <Button 
                onClick={handleConfirmSchools} 
                className="w-full h-11" 
                disabled={!isConfigureValid}
              >
                {votingMode ? "Next →" : `Confirm ${selectedSchools.length} School${selectedSchools.length !== 1 ? 's' : ''} →`}
              </Button>
              {votingMode && (
                <p className="text-xs text-muted-foreground text-center">
                  Schools will be selected after pool creation by member vote
                </p>
              )}
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-6 py-4">
            <div className="p-6 border rounded-lg bg-card space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pool Name</p>
                <p className="text-lg font-semibold">{poolName}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Voting Mode</p>
                <Badge variant={votingMode ? "default" : "secondary"}>
                  {votingMode ? "🗳️ Voting Enabled" : "✓ Schools Pre-selected"}
                </Badge>
              </div>

              {!votingMode && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Selected Schools ({selectedSchools.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedSchools.map((school) => (
                      <Badge key={school} variant="outline" className="h-7">
                        {school}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {votingMode && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    Pool members will vote on schools after joining. Top 10 schools by votes will be followed.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button 
                onClick={createPool} 
                className="w-full h-11" 
                disabled={loading}
              >
                {loading ? "Creating Pool..." : "Create Pool"}
              </Button>
              
              <Button 
                onClick={handleBack} 
                variant="outline"
                className="w-full" 
                disabled={loading}
              >
                ← Back to Edit
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              💡 Pool activity is visible in the Parent Dashboard
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
