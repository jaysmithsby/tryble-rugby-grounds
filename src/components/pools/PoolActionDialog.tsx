import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, X, Search, UserPlus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sanitizePoolName } from "@/lib/profanityFilter";
import { useSchoolsQuery } from "@/hooks/useSchoolsQuery";
import { PoolIconSelector, type PoolIconConfig, getPoolIconComponent, getPoolColorValue } from "./PoolIconSelector";

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

interface PoolActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPoolCreated: () => void;
}

export function PoolActionDialog({ open, onOpenChange, onPoolCreated }: PoolActionDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  // --- Create tab state ---
  const [step, setStep] = useState<"configure" | "preview">("configure");
  const [poolName, setPoolName] = useState("");
  const [votingMode, setVotingMode] = useState(false);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [poolTemplates, setPoolTemplates] = useState<PoolTemplate[]>([]);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [iconConfig, setIconConfig] = useState<PoolIconConfig>({ iconId: "trophy", colorId: "green" });

  // --- Join tab state ---
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [foundPool, setFoundPool] = useState<{ id: string; name: string; is_active: boolean } | null>(null);
  const [joinError, setJoinError] = useState("");

  const { schools: availableSchools } = useSchoolsQuery<School>({ select: "id, name, icon_url" });

  useEffect(() => {
    if (open) loadTemplates();
  }, [open]);

  // Auto-verify join code
  useEffect(() => {
    setFoundPool(null);
    setJoinError("");
    if (joinCode.length === 6) {
      verifyCode(joinCode);
    }
  }, [joinCode]);

  const loadTemplates = async () => {
    try {
      const { data } = await supabase
        .from("pool_templates")
        .select("*")
        .eq("status", "approved")
        .order("name");
      setPoolTemplates(data || []);
    } catch (e) {
      console.error("Error loading templates:", e);
    }
  };

  const verifyCode = async (code: string) => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.rpc("get_pool_by_invite_code", { code: code.toUpperCase() });
      if (error || !data || data.length === 0) {
        setJoinError("Pool not found. Check the code and try again.");
      } else {
        setFoundPool(data[0]);
      }
    } catch {
      setJoinError("Something went wrong. Try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleJoinPool = async () => {
    if (!foundPool) return;
    setJoining(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("pool_members")
        .select("id")
        .eq("pool_id", foundPool.id)
        .eq("user_id", user.id)
        .single();

      if (existing) {
        toast({ title: "Already a member", description: "You're already in this pool!" });
        resetAndClose();
        return;
      }

      const { error } = await supabase
        .from("pool_members")
        .insert({ pool_id: foundPool.id, user_id: user.id });
      if (error) throw error;

      toast({ title: "Joined pool!", description: `Welcome to ${foundPool.name}` });
      resetAndClose();
      onPoolCreated();
    } catch (error: any) {
      toast({ title: "Error joining pool", description: error.message, variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  // --- Create tab logic (from CreatePoolDialog) ---
  const applyTemplate = (template: PoolTemplate) => {
    setSelectedSchools(template.schools);
    setVotingMode(false);
    toast({ title: "Template applied", description: `${template.schools.length} schools selected from ${template.name}` });
  };

  const toggleSchool = (schoolName: string) => {
    if (selectedSchools.includes(schoolName)) {
      setSelectedSchools(selectedSchools.filter(s => s !== schoolName));
    } else if (selectedSchools.length < 10) {
      setSelectedSchools([...selectedSchools, schoolName]);
    }
  };

  const filteredSchools = availableSchools.filter(s =>
    s.name.toLowerCase().includes(schoolSearch.toLowerCase())
  );

  const handleConfirmSchools = () => {
    const validation = sanitizePoolName(poolName);
    if (!validation.isValid) {
      toast({ title: "Invalid pool name", description: validation.message, variant: "destructive" });
      return;
    }
    if (!votingMode && selectedSchools.length < 5) {
      toast({ title: "Minimum schools required", description: "Please select at least 5 schools.", variant: "destructive" });
      return;
    }
    setStep("preview");
  };

  const createPool = async () => {
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      let votingClosesAt = null;
      if (votingMode) {
        const { data, error } = await supabase.rpc("get_next_friday_8pm", { from_time: new Date().toISOString() });
        if (error) throw error;
        votingClosesAt = data;
      }

      const { data: pool, error: poolError } = await supabase
        .from("pools")
        .insert({
          name: poolName,
          invite_code: inviteCode,
          creator_id: user.id,
          schools: votingMode ? [] : selectedSchools,
          voting_mode: votingMode,
          voting_closes_at: votingClosesAt,
          is_voting_finalized: !votingMode,
          max_schools: 10,
          icon_id: iconConfig.iconId,
          color_id: iconConfig.colorId,
        })
        .select()
        .single();

      if (poolError) throw poolError;

      await supabase.from("pool_members").insert({ pool_id: pool.id, user_id: user.id });

      toast({ title: "Pool created!", description: `Invite code: ${inviteCode}` });
      resetAndClose();
      navigate(`/pool/${pool.id}`);
      onPoolCreated();
    } catch (error: any) {
      toast({ title: "Error creating pool", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const resetAndClose = () => {
    setPoolName("");
    setSelectedSchools([]);
    setVotingMode(false);
    setStep("configure");
    setSchoolSearch("");
    setIconConfig({ iconId: "trophy", colorId: "green" });
    setJoinCode("");
    setFoundPool(null);
    setJoinError("");
    onOpenChange(false);
  };

  const isConfigureValid = poolName.trim().length >= 3 && (votingMode || (selectedSchools.length >= 5 && selectedSchools.length <= 10));

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetAndClose();
      else onOpenChange(true);
    }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Pools</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="create" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-2 grid w-auto grid-cols-2">
            <TabsTrigger value="create">Create</TabsTrigger>
            <TabsTrigger value="join">Join</TabsTrigger>
          </TabsList>

          {/* ===== CREATE TAB ===== */}
          <TabsContent value="create" className="flex-1 overflow-y-auto px-6 pb-6 mt-0">
            {step === "configure" && (
              <div className="space-y-5 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="poolNameAction">Pool Name</Label>
                  <Input
                    id="poolNameAction"
                    placeholder="e.g., MHS Rugby Fans 2025"
                    value={poolName}
                    onChange={(e) => setPoolName(e.target.value)}
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground">Choose a respectful, school-appropriate name</p>
                </div>

                <div className="space-y-2">
                  <Label>Pool Icon & Color</Label>
                  <PoolIconSelector config={iconConfig} onChange={setIconConfig} />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Voting Mode</Label>
                    <p className="text-xs text-muted-foreground">Let members vote on schools</p>
                  </div>
                  <Switch checked={votingMode} onCheckedChange={setVotingMode} />
                </div>

                {!votingMode && (
                  <div className="space-y-3">
                    {poolTemplates.length > 0 && (
                      <div className="space-y-2">
                        <Label>Pool Packs</Label>
                        <ScrollArea className="h-28 border rounded-lg bg-muted/30">
                          <div className="p-2 space-y-1">
                            {poolTemplates.map((t) => (
                              <Button key={t.id} variant="outline" size="sm" onClick={() => applyTemplate(t)} className="w-full justify-start h-auto py-2 px-3">
                                <div className="text-left w-full">
                                  <div className="font-medium text-sm">{t.name}</div>
                                  {t.description && <div className="text-xs text-muted-foreground mt-0.5">{t.description} · {t.schools.length} schools</div>}
                                </div>
                              </Button>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Select Schools (5–10)</Label>
                      <p className="text-xs text-muted-foreground">
                        {selectedSchools.length}/10 selected
                        {selectedSchools.length < 5 && <span className="text-destructive ml-1">(min 5)</span>}
                      </p>
                    </div>

                    {selectedSchools.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg bg-muted/30">
                        {selectedSchools.map((s) => (
                          <Badge key={s} variant="default" className="cursor-pointer h-6 px-2 text-xs" onClick={() => toggleSchool(s)}>
                            {s}<X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Search schools..." value={schoolSearch} onChange={(e) => setSchoolSearch(e.target.value)} className="pl-9 h-9" />
                      </div>
                      <ScrollArea className="h-44 border rounded-lg bg-background">
                        <div className="p-2 space-y-1">
                          {filteredSchools.length > 0 ? filteredSchools.map((school) => (
                            <Button
                              key={school.name}
                              variant={selectedSchools.includes(school.name) ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleSchool(school.name)}
                              disabled={selectedSchools.length >= 10 && !selectedSchools.includes(school.name)}
                              className="w-full justify-start h-9 gap-2"
                            >
                              {school.icon_url && <img src={school.icon_url} alt="" className="w-5 h-5 object-contain shrink-0" />}
                              <span className="truncate">{school.name}</span>
                            </Button>
                          )) : (
                            <p className="text-sm text-muted-foreground text-center py-6">No schools found</p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                )}

                {votingMode && (
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <p className="text-xs text-muted-foreground">🗳️ Members will vote on schools after joining. Top 10 by votes will be followed.</p>
                  </div>
                )}

                <Button onClick={handleConfirmSchools} className="w-full h-10" disabled={!isConfigureValid}>
                  {votingMode ? "Next →" : selectedSchools.length < 5 ? `Select ${5 - selectedSchools.length} More` : `Confirm ${selectedSchools.length} Schools →`}
                </Button>
              </div>
            )}

            {step === "preview" && (
              <div className="space-y-5 pt-4">
                <div className="p-5 border rounded-lg bg-card space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Pool Name</p>
                    <p className="font-semibold">{poolName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Mode</p>
                    <Badge variant={votingMode ? "default" : "secondary"}>
                      {votingMode ? "🗳️ Voting" : "✓ Pre-selected"}
                    </Badge>
                  </div>
                  {!votingMode && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Schools ({selectedSchools.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedSchools.map((s) => <Badge key={s} variant="outline" className="h-6 text-xs">{s}</Badge>)}
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={createPool} className="w-full h-10" disabled={creating}>
                  {creating ? "Creating..." : "Create Pool"}
                </Button>
                <Button onClick={() => setStep("configure")} variant="outline" className="w-full" disabled={creating}>
                  ← Back
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ===== JOIN TAB ===== */}
          <TabsContent value="join" className="flex-1 overflow-y-auto px-6 pb-6 mt-0">
            <div className="space-y-5 pt-4">
              <div className="space-y-2">
                <Label htmlFor="joinCodeAction">Invite Code</Label>
                <Input
                  id="joinCodeAction"
                  placeholder="e.g., ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  maxLength={6}
                  className="font-mono uppercase text-center text-lg tracking-widest h-12"
                />
                <p className="text-xs text-muted-foreground text-center">Enter the 6-character code from your friend</p>
              </div>

              {verifying && (
                <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Checking code...</span>
                </div>
              )}

              {joinError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{joinError}</p>
                </div>
              )}

              {foundPool && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{foundPool.name}</p>
                      <p className="text-xs text-muted-foreground">Pool found — ready to join</p>
                    </div>
                  </div>
                  <Button onClick={handleJoinPool} className="w-full h-10" disabled={joining}>
                    {joining ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Joining...</>
                    ) : (
                      <><UserPlus className="w-4 h-4 mr-2" />Join Pool</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
