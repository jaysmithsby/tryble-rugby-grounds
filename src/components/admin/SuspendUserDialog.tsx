import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SuspendUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onSuccess: () => void;
}

export function SuspendUserDialog({ open, onOpenChange, user, onSuccess }: SuspendUserDialogProps) {
  const [duration, setDuration] = useState<string>("7");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSuspend = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for the suspension");
      return;
    }

    try {
      setLoading(true);
      
      const durationDays = parseInt(duration);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      // Get current admin user
      const { data: { user: admin } } = await supabase.auth.getUser();
      if (!admin) throw new Error("Not authenticated");

      // Create sanction
      const { error: sanctionError } = await supabase
        .from('user_sanctions')
        .insert({
          user_id: user.id,
          sanction_type: 'suspension',
          duration_days: durationDays,
          reason: reason.trim(),
          sanctioned_by: admin.id,
          expires_at: expiresAt.toISOString(),
          is_active: true,
        });

      if (sanctionError) throw sanctionError;

      // Log admin action
      const { error: logError } = await supabase
        .from('admin_audit_log')
        .insert({
          admin_user_id: admin.id,
          action_type: 'suspend_user',
          target_user_id: user.id,
          details: {
            duration_days: durationDays,
            reason: reason.trim(),
            expires_at: expiresAt.toISOString(),
          },
        });

      if (logError) throw logError;

      toast.success(`User suspended for ${durationDays} days`);
      onOpenChange(false);
      onSuccess();
      setReason("");
      setDuration("7");
    } catch (error: any) {
      console.error('Error suspending user:', error);
      toast.error(error.message || "Failed to suspend user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend User</DialogTitle>
          <DialogDescription>
            Temporarily suspend {user.profile?.display_name || user.email} from using the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Suspension Duration</Label>
            <RadioGroup value={duration} onValueChange={setDuration}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="7" id="7days" />
                <Label htmlFor="7days" className="cursor-pointer">7 days</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="14" id="14days" />
                <Label htmlFor="14days" className="cursor-pointer">14 days</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="30" id="30days" />
                <Label htmlFor="30days" className="cursor-pointer">30 days</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Suspension *</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Display name policy violation, inappropriate behavior..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This reason will be logged and may be shared with the user.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSuspend} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Suspend User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}