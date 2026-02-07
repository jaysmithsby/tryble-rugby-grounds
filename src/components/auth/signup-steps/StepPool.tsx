import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Plus, Share2, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sanitizePoolName } from "@/lib/profanityFilter";
import { useSchoolsQuery } from "@/hooks/useSchoolsQuery";

interface Pool {
  id: string;
  name: string;
  schools: string[] | null;
  member_count?: number;
}

interface School {
  id: string;
  name: string;
  icon_url: string | null;
}

interface PoolTemplate {
  id: string;
  name: string;
  description: string | null;
  schools: string[];
}

interface StepPoolProps {
  schoolName: string;
  userType: string;
  userId: string;
  onComplete: () => void;
  onSkip: () => void;
}

// Generate smart pool name based on user type
const getDefaultPoolName = (schoolName: string, userType: string): string => {
  switch (userType) {
    case "alumni":
      return `${schoolName} Old Boys`;
    case "parent":
      return `${schoolName} Parents`;
    case "fan":
      return `${schoolName} Fans`;
    case "scholar":
    default:
      return `${schoolName} Predictions`;
  }
};

const StepPool = ({ schoolName, userType, userId, onComplete, onSkip }: StepPoolProps) => {
  const [mode, setMode] = useState<"choice" | "join" | "create">("choice");
  const [pools, setPools] = useState<Pool[]>([]);
  const [_loading, _setLoading] = useState(false);
  const [poolName, setPoolName] = useState(getDefaultPoolName(schoolName, userType));
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([schoolName]);
  const [poolTemplates, setPoolTemplates] = useState<PoolTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Use the simulation-aware hook for school list
  const { schools: availableSchools } = useSchoolsQuery<School>({
    select: "id, name, icon_url",
  });

  // Load pool templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from("pool_templates")
          .select("*")
          .eq("status", "approved")
          .order("name");
        
        if (error) throw error;
        setPoolTemplates(data || []);
      } catch (error) {
        console.error("Error loading pool templates:", error);
      }
    };

    if (mode === "create") {
      loadTemplates();
    }
  }, [mode]);

  useEffect(() => {
    const fetchPools = async () => {
      // Fetch public pools related to user's school
      // For now, we don't have a public pool discovery mechanism
      // This is a placeholder for future functionality
      setPools([]);
    };

    if (mode === "join") {
      fetchPools();
    }
  }, [mode, schoolName]);

  // Reset pool name when entering create mode
  useEffect(() => {
    if (mode === "create") {
      setPoolName(getDefaultPoolName(schoolName, userType));
      setSelectedSchools([schoolName]);
    }
  }, [mode, schoolName, userType]);

  const generateInviteCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const applyTemplate = (template: PoolTemplate) => {
    // Keep user's school and add template schools
    const newSchools = [schoolName, ...template.schools.filter(s => s !== schoolName)].slice(0, 10);
    setSelectedSchools(newSchools);
    toast({
      title: "Template applied",
      description: `${newSchools.length} schools selected from ${template.name}`
    });
  };

  const toggleSchool = (name: string) => {
    // Don't allow removing user's school
    if (name === schoolName) return;
    
    if (selectedSchools.includes(name)) {
      setSelectedSchools(selectedSchools.filter(s => s !== name));
    } else if (selectedSchools.length < 10) {
      setSelectedSchools([...selectedSchools, name]);
    }
  };

  const filteredSchools = availableSchools.filter(school =>
    school.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    school.name !== schoolName // Don't show user's school in search (already pre-selected)
  );

  const handleCreatePool = async () => {
    if (!poolName.trim() || !userId) return;

    // Validate pool name
    const validation = sanitizePoolName(poolName);
    if (!validation.isValid) {
      toast({ 
        title: "Invalid pool name", 
        description: validation.message, 
        variant: "destructive" 
      });
      return;
    }

    // Validate school count
    if (selectedSchools.length < 5) {
      toast({
        title: "Minimum schools required",
        description: "Please select at least 5 schools for your pool.",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      const inviteCode = generateInviteCode();

      // Create the pool with selected schools
      const { data: pool, error: poolError } = await supabase
        .from("pools")
        .insert({
          name: poolName.trim(),
          creator_id: userId,
          invite_code: inviteCode,
          schools: selectedSchools,
          is_active: true,
          is_voting_finalized: true,
          max_schools: 10,
        })
        .select()
        .single();

      if (poolError) throw poolError;

      // Add creator as member
      const { error: memberError } = await supabase.from("pool_members").insert({
        pool_id: pool.id,
        user_id: userId,
      });

      if (memberError) throw memberError;

      toast({
        title: "Pool created!",
        description: `Share code ${inviteCode} with friends to invite them.`,
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: "Failed to create pool",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinPool = async (poolId: string) => {
    if (!userId) return;

    setJoining(poolId);
    try {
      const { error } = await supabase.from("pool_members").insert({
        pool_id: poolId,
        user_id: userId,
      });

      if (error) throw error;

      toast({
        title: "Joined pool!",
        description: "You're now part of this prediction pool.",
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: "Failed to join",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setJoining(null);
    }
  };

  const isCreateValid = poolName.trim().length >= 3 && selectedSchools.length >= 5 && selectedSchools.length <= 10;

  if (mode === "choice") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Play with Others</h2>
          <p className="text-muted-foreground">
            Pools let you compete with friends and classmates
          </p>
        </div>

        <div className="grid gap-4">
          <button
            onClick={() => setMode("create")}
            className="flex items-center gap-4 p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Create a Pool</h3>
              <p className="text-sm text-muted-foreground">
                Start your own and invite friends
              </p>
            </div>
          </button>

          <button
            onClick={() => setMode("join")}
            className="flex items-center gap-4 p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Join Existing Pool</h3>
              <p className="text-sm text-muted-foreground">
                Enter an invite code from a friend
              </p>
            </div>
          </button>
        </div>

        <Button onClick={onSkip} variant="ghost" className="w-full text-muted-foreground">
          Skip for now
        </Button>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="space-y-5">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Create Your Pool</h2>
          <p className="text-muted-foreground text-sm">
            Select 5-10 schools to follow in your pool
          </p>
        </div>

        <div className="space-y-4">
          {/* Pool Name Input */}
          <div className="space-y-2">
            <Label htmlFor="poolName">Pool name</Label>
            <Input
              id="poolName"
              placeholder="e.g. Grey College 1st XV Pool"
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* Pool Packs */}
          {poolTemplates.length > 0 && (
            <div className="space-y-2">
              <Label>Pool Packs</Label>
              <ScrollArea className="h-24 border rounded-lg bg-muted/30">
                <div className="p-2 space-y-1.5">
                  {poolTemplates.map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate(template)}
                      className="w-full justify-start h-auto py-1.5 px-2"
                    >
                      <div className="text-left w-full">
                        <div className="font-medium text-xs">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-muted-foreground">
                            {template.schools.length} schools
                          </div>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* School Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Schools to Follow</Label>
              <span className="text-xs text-muted-foreground">
                {selectedSchools.length}/10
                {selectedSchools.length < 5 && (
                  <span className="text-destructive ml-1">(min. 5)</span>
                )}
              </span>
            </div>

            {/* Selected Schools Badges */}
            {selectedSchools.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg bg-muted/30 min-h-[40px]">
                {selectedSchools.map((school) => (
                  <Badge
                    key={school}
                    variant={school === schoolName ? "secondary" : "default"}
                    className={`cursor-pointer h-6 px-2 text-xs ${school === schoolName ? "cursor-default" : ""}`}
                    onClick={() => toggleSchool(school)}
                  >
                    {school}
                    {school !== schoolName && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            )}

            {/* Search and School List */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search schools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              <ScrollArea className="h-36 border rounded-lg bg-background">
                <div className="p-2 space-y-1">
                  {filteredSchools.length > 0 ? (
                    filteredSchools.map((school) => (
                      <Button
                        key={school.name}
                        variant={selectedSchools.includes(school.name) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleSchool(school.name)}
                        disabled={selectedSchools.length >= 10 && !selectedSchools.includes(school.name)}
                        className="w-full justify-start h-8 gap-2 text-xs"
                      >
                        {school.icon_url && (
                          <img 
                            src={school.icon_url} 
                            alt={`${school.name} jersey`}
                            className="w-5 h-5 object-contain flex-shrink-0"
                          />
                        )}
                        <span className="truncate">{school.name}</span>
                      </Button>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No schools found
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Validation Messages */}
            {selectedSchools.length > 0 && selectedSchools.length < 5 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center p-1.5 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800">
                Select {5 - selectedSchools.length} more school{5 - selectedSchools.length !== 1 ? 's' : ''} to continue
              </p>
            )}
          </div>

          <div className="bg-muted/50 p-2.5 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <Share2 className="w-3.5 h-3.5 inline-block mr-1" />
              You can invite friends with a code after creating
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleCreatePool}
            className="w-full"
            size="lg"
            disabled={!isCreateValid || creating}
          >
            {creating 
              ? "Creating..." 
              : selectedSchools.length < 5
                ? `Select ${5 - selectedSchools.length} More School${5 - selectedSchools.length !== 1 ? 's' : ''}`
                : "Create Pool"
            }
          </Button>

          <Button
            onClick={() => setMode("choice")}
            variant="ghost"
            className="w-full text-muted-foreground"
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "join") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Join a Pool</h2>
          <p className="text-muted-foreground">
            Enter an invite code from a friend, or browse available pools
          </p>
        </div>

        <JoinPoolByCode userId={userId} onSuccess={onComplete} />

        {pools.length > 0 && (
          <div className="space-y-3">
            <Label>Or join a pool from your school</Label>
            {pools.map((pool) => (
              <div
                key={pool.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <h3 className="font-medium">{pool.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {pool.member_count || 0} members
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleJoinPool(pool.id)}
                  disabled={joining === pool.id}
                >
                  {joining === pool.id ? "Joining..." : "Join"}
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={() => setMode("choice")}
          variant="ghost"
          className="w-full text-muted-foreground"
        >
          Back
        </Button>
      </div>
    );
  }

  return null;
};

// Subcomponent for joining by invite code
const JoinPoolByCode = ({
  userId,
  onSuccess,
}: {
  userId: string;
  onSuccess: () => void;
}) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleJoin = async () => {
    if (!code.trim() || !userId) return;

    setLoading(true);
    try {
      // Find pool by invite code
      const { data: pools, error: findError } = await supabase
        .rpc("get_pool_by_invite_code", { code: code.trim().toUpperCase() });

      if (findError) throw findError;
      if (!pools || pools.length === 0) {
        throw new Error("Invalid invite code");
      }

      const pool = pools[0];

      // Join the pool
      const { error: joinError } = await supabase.from("pool_members").insert({
        pool_id: pool.id,
        user_id: userId,
      });

      if (joinError) throw joinError;

      toast({
        title: "Joined pool!",
        description: `You're now part of ${pool.name}.`,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Failed to join",
        description: error.message || "Please check the code and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="inviteCode">Invite code</Label>
        <div className="flex gap-2">
          <Input
            id="inviteCode"
            placeholder="e.g. ABC123"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="flex-1 uppercase"
            maxLength={6}
          />
          <Button onClick={handleJoin} disabled={code.length < 4 || loading}>
            {loading ? "..." : "Join"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StepPool;
