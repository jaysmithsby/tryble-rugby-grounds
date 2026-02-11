import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sanitizePoolName } from "@/lib/profanityFilter";
import { PoolIconSelector, type PoolIconConfig } from "./PoolIconSelector";

interface EditPoolDialogProps {
  pool: {
    id: string;
    name: string;
    icon_id?: string | null;
    color_id?: string | null;
  };
  isEditable: boolean;
  lockReason?: string;
  onPoolUpdated: () => void;
}

export const EditPoolDialog = ({
  pool,
  isEditable,
  lockReason,
  onPoolUpdated,
}: EditPoolDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [poolName, setPoolName] = useState(pool.name);
  const [iconConfig, setIconConfig] = useState<PoolIconConfig>({
    iconId: pool.icon_id || "trophy",
    colorId: pool.color_id || "green",
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const validation = sanitizePoolName(poolName);
    if (!validation.isValid) {
      toast({
        title: "Invalid pool name",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }

    if (poolName.trim().length < 3) {
      toast({
        title: "Name too short",
        description: "Pool name must be at least 3 characters.",
        variant: "destructive",
      });
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
        })
        .eq("id", pool.id);

      if (error) throw error;

      toast({
        title: "Pool updated",
        description: "Your pool has been updated.",
      });

      setOpen(false);
      onPoolUpdated();
    } catch (error: any) {
      toast({
        title: "Error updating pool",
        description: error.message,
        variant: "destructive",
      });
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Edit Pool
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Pool</DialogTitle>
          <DialogDescription>
            Update your pool's name and icon. Changes take effect immediately.
            {lockReason && (
              <span className="block mt-2 text-warning">
                ⚠️ {lockReason}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="poolName">Pool Name</Label>
            <Input
              id="poolName"
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
              placeholder="Enter pool name"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              Choose a respectful, school-appropriate name
            </p>
          </div>

          <div className="space-y-2">
            <Label>Pool Icon & Color</Label>
            <PoolIconSelector config={iconConfig} onChange={setIconConfig} />
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setOpen(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={isSaving || poolName.trim().length < 3}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
