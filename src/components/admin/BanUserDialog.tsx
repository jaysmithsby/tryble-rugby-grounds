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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BanUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onSuccess: () => void;
}

export function BanUserDialog({ open, onOpenChange, user, onSuccess }: BanUserDialogProps) {
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const isMinor = user.profile?.account_type === 'minor';

  const handleBan = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for the ban");
      return;
    }

    if (!confirmed) {
      toast.error("Please confirm the permanent ban");
      return;
    }

    try {
      setLoading(true);
      
      // Get current admin user
      const { data: { user: admin } } = await supabase.auth.getUser();
      if (!admin) throw new Error("Not authenticated");

      // Create ban sanction
      const { error: sanctionError } = await supabase
        .from('user_sanctions')
        .insert({
          user_id: user.id,
          sanction_type: 'ban',
          reason: reason.trim(),
          sanctioned_by: admin.id,
          is_active: true,
        });

      if (sanctionError) throw sanctionError;

      // Log admin action
      const { error: logError } = await supabase
        .from('admin_audit_log')
        .insert({
          admin_user_id: admin.id,
          action_type: 'ban_user',
          target_user_id: user.id,
          details: {
            reason: reason.trim(),
            is_minor: isMinor,
          },
        });

      if (logError) throw logError;

      toast.success("User has been permanently banned");
      onOpenChange(false);
      onSuccess();
      setReason("");
      setConfirmed(false);
    } catch (error: any) {
      console.error('Error banning user:', error);
      toast.error(error.message || "Failed to ban user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Permanent Ban
          </DialogTitle>
          <DialogDescription>
            This is a permanent action that will prevent {user.profile?.display_name || user.email} from accessing the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isMinor && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This is a minor account. Consider initiating a 2-person review process and notifying the school's safeguarding contact.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="ban-reason">Reason for Permanent Ban *</Label>
            <Textarea
              id="ban-reason"
              placeholder="Provide detailed reason for permanent ban..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This will be logged in the audit trail and may be shared with authorities if required.
            </p>
          </div>

          <div className="flex items-start space-x-2 rounded-lg border border-destructive/50 p-4 bg-destructive/5">
            <Checkbox
              id="confirm-ban"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="confirm-ban"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I confirm this permanent ban
              </label>
              <p className="text-xs text-muted-foreground">
                This action cannot be undone. The user will be immediately logged out and prevented from signing in.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleBan} disabled={loading || !confirmed}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Permanent Ban
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}