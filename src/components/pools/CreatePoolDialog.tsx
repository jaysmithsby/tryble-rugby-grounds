import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sanitizePoolName } from "@/lib/profanityFilter";

interface CreatePoolDialogProps {
  onPoolCreated: () => void;
}

export const CreatePoolDialog = ({ onPoolCreated }: CreatePoolDialogProps) => {
  const [open, setOpen] = useState(false);
  const [poolName, setPoolName] = useState("");
  const [votingMode, setVotingMode] = useState(false);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [availableSchools, setAvailableSchools] = useState<string[]>([]);
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
    } else {
      toast({
        title: "Maximum schools reached",
        description: "You can select up to 10 schools.",
        variant: "destructive"
      });
    }
  };

  const createPool = async () => {
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Users className="w-4 h-4 mr-2" />
          Create Pool
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Create a New Pool</DialogTitle>
          <DialogDescription>
            Create a private leaderboard for your friends or school circle
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <Label htmlFor="poolName">Pool Name</Label>
            <Input
              id="poolName"
              placeholder="e.g., MHS Rugby Fans 2025"
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Choose a respectful, school-appropriate name
            </p>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label>Enable Voting Mode</Label>
              <p className="text-sm text-muted-foreground">
                Let members vote on which schools to follow
              </p>
            </div>
            <Switch
              checked={votingMode}
              onCheckedChange={setVotingMode}
            />
          </div>

          {!votingMode && (
            <div>
              <Label>Select Schools to Follow (up to 10)</Label>
              <p className="text-xs text-muted-foreground mb-3">
                {selectedSchools.length}/10 schools selected
              </p>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedSchools.map((school) => (
                  <Badge
                    key={school}
                    variant="default"
                    className="cursor-pointer"
                    onClick={() => toggleSchool(school)}
                  >
                    {school}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>

              <ScrollArea className="h-48 border rounded-lg p-3">
                <div className="grid grid-cols-2 gap-2">
                  {availableSchools.map((school) => (
                    <Button
                      key={school}
                      variant={selectedSchools.includes(school) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleSchool(school)}
                      className="justify-start"
                    >
                      {school}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {votingMode && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm">
                🗳️ Members will vote on which schools to follow. The top 10 schools by votes will be included in this pool's predictions.
              </p>
            </div>
          )}

          <Button 
            onClick={createPool} 
            className="w-full" 
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Pool"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            💡 Pool activity is visible in the Parent Dashboard
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
