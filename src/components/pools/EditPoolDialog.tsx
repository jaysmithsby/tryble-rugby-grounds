import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings, Loader2, CheckCircle2, X, Search } from "lucide-react";
import { toast } from "sonner";
import { sanitizePoolName } from "@/lib/profanityFilter";
import { type PoolIconConfig, getPoolIconComponent, getPoolColorValue } from "./PoolIconSelector";
import { useSchoolsQuery } from "@/hooks/useSchoolsQuery";
import { cn } from "@/lib/utils";

import {
  Shield, Trophy, Swords, Flag, Star, Zap, Target, Crown,
  Flame, Medal, Mountain, Castle, Users, GraduationCap,
  Anchor, BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_OPTIONS: { id: string; icon: LucideIcon; label: string }[] = [
  { id: "shield", icon: Shield, label: "Shield" },
  { id: "trophy", icon: Trophy, label: "Trophy" },
  { id: "swords", icon: Swords, label: "Swords" },
  { id: "flag", icon: Flag, label: "Flag" },
  { id: "star", icon: Star, label: "Star" },
  { id: "zap", icon: Zap, label: "Lightning" },
  { id: "target", icon: Target, label: "Target" },
  { id: "crown", icon: Crown, label: "Crown" },
  { id: "flame", icon: Flame, label: "Flame" },
  { id: "medal", icon: Medal, label: "Medal" },
  { id: "mountain", icon: Mountain, label: "Mountain" },
  { id: "castle", icon: Castle, label: "Castle" },
  { id: "users", icon: Users, label: "Team" },
  { id: "graduation-cap", icon: GraduationCap, label: "Scholar" },
  { id: "anchor", icon: Anchor, label: "Anchor" },
  { id: "book-open", icon: BookOpen, label: "Book" },
];

const COLOR_OPTIONS = [
  { id: "green", value: "#10B981" },
  { id: "red", value: "#EF4444" },
  { id: "blue", value: "#3B82F6" },
  { id: "gold", value: "#F59E0B" },
  { id: "white", value: "#FFFFFF" },
];

interface School {
  id: string;
  name: string;
  icon_url: string | null;
}

interface EditPoolDialogProps {
  pool: {
    id: string;
    name: string;
    icon_id?: string | null;
    color_id?: string | null;
    schools?: string[] | null;
  };
  isEditable: boolean;
  lockReason?: string;
  onPoolUpdated: () => void;
  triggerElement?: React.ReactNode;
}

export const EditPoolDialog = ({
  pool,
  isEditable,
  lockReason,
  onPoolUpdated,
  triggerElement,
}: EditPoolDialogProps) => {
  const [open, setOpen] = useState(false);
  const [poolName, setPoolName] = useState(pool.name);
  const [iconConfig, setIconConfig] = useState<PoolIconConfig>({
    iconId: pool.icon_id || "trophy",
    colorId: pool.color_id || "green",
  });
  const [selectedSchools, setSelectedSchools] = useState<string[]>(pool.schools || []);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { schools: availableSchools } = useSchoolsQuery<School>({ select: "id, name, icon_url" });

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

  const handleSave = async () => {
    const validation = sanitizePoolName(poolName);
    if (!validation.isValid) {
      toast.error(validation.message || "Invalid pool name");
      return;
    }

    if (poolName.trim().length < 3) {
      toast.error("Pool name must be at least 3 characters.");
      return;
    }

    if (selectedSchools.length < 5) {
      toast.error("Please select at least 5 schools.");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("pools")
        .update({
          name: poolName.trim(),
          icon_id: iconConfig.iconId,
          color_id: iconConfig.colorId,
          schools: selectedSchools,
        })
        .eq("id", pool.id);

      if (error) throw error;

      toast.success("Pool updated!");
      setOpen(false);
      onPoolUpdated();
    } catch (error: any) {
      toast.error(error.message || "Error updating pool");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditable) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Settings className="w-4 h-4 mr-2" />
        Locked
      </Button>
    );
  }

  const SelectedIcon = getPoolIconComponent(iconConfig.iconId);
  const selectedColor = getPoolColorValue(iconConfig.colorId);
  const isValid = poolName.trim().length >= 3 && selectedSchools.length >= 5 && selectedSchools.length <= 10;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setPoolName(pool.name);
        setIconConfig({
          iconId: pool.icon_id || "trophy",
          colorId: pool.color_id || "green",
        });
        setSelectedSchools(pool.schools || []);
        setSchoolSearch("");
      }
      setOpen(isOpen);
    }}>
      <DialogTrigger asChild>
        {triggerElement || (
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Edit Pool
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm max-h-[80vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Edit Pool</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-4 pt-4">
            {lockReason && (
              <p className="text-xs text-warning bg-warning/10 border border-warning/20 rounded p-2">
                ⚠️ {lockReason}
              </p>
            )}

            {/* Icon + Name row */}
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors hover:opacity-80"
                    style={{ borderColor: selectedColor, backgroundColor: `${selectedColor}15` }}
                  >
                    <SelectedIcon className="w-4 h-4" style={{ color: selectedColor }} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {ICON_OPTIONS.map(({ id, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setIconConfig(c => ({ ...c, iconId: id }))}
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                          iconConfig.iconId === id ? "ring-2 bg-muted/30" : "hover:bg-muted/20"
                        )}
                        style={iconConfig.iconId === id ? { "--tw-ring-color": selectedColor } as React.CSSProperties : undefined}
                      >
                        <Icon
                          className="w-4 h-4"
                          style={{ color: iconConfig.iconId === id ? selectedColor : "hsl(var(--muted-foreground))" }}
                        />
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-center pt-2 border-t">
                    {COLOR_OPTIONS.map(({ id, value }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setIconConfig(c => ({ ...c, colorId: id }))}
                        className={cn(
                          "w-6 h-6 rounded-full transition-all flex items-center justify-center",
                          iconConfig.colorId === id ? "ring-2 ring-offset-1 ring-offset-background" : "hover:scale-110"
                        )}
                        style={{
                          backgroundColor: value,
                          "--tw-ring-color": iconConfig.colorId === id ? value : undefined,
                        } as React.CSSProperties}
                      >
                        {iconConfig.colorId === id && (
                          <CheckCircle2 className="w-3 h-3" style={{ color: id === "white" ? "#000" : "#fff" }} />
                        )}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Input
                placeholder="Enter pool name..."
                value={poolName}
                onChange={(e) => setPoolName(e.target.value)}
                maxLength={50}
                className="flex-1 h-9"
              />
            </div>

            {/* School selection — same as PoolActionDialog */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {selectedSchools.length}/10 schools
                  {selectedSchools.length < 5 && <span className="text-destructive ml-1">(min 5)</span>}
                </p>
                {selectedSchools.length >= 10 && (
                  <p className="text-xs text-destructive font-medium">Max reached</p>
                )}
              </div>
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

            <Button
              onClick={handleSave}
              className="w-full h-9"
              disabled={isSaving || !isValid}
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
