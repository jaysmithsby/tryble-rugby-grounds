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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onSuccess: () => void;
}

export function DeleteUserDialog({ open, onOpenChange, user, onSuccess }: DeleteUserDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirmed) {
      toast.error("Please confirm the account deletion");
      return;
    }

    try {
      setLoading(true);
      
      // Get current admin user
      const { data: { user: admin } } = await supabase.auth.getUser();
      if (!admin) throw new Error("Not authenticated");

      // Log admin action before deletion
      const { error: logError } = await supabase
        .from('admin_audit_log')
        .insert({
          admin_user_id: admin.id,
          action_type: 'delete_user',
          target_user_id: user.id,
          details: {
            email: user.email,
            display_name: user.profile?.display_name,
            school_name: user.profile?.school_name, // already resolved
          },
        });

      if (logError) throw logError;

      // Delete user via admin API
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) throw deleteError;

      toast.success("User account has been permanently deleted");
      onOpenChange(false);
      onSuccess();
      setConfirmed(false);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || "Failed to delete user account");
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
            Delete User Account
          </DialogTitle>
          <DialogDescription>
            This will permanently delete {user.profile?.display_name || user.email}'s account and all associated data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>This action cannot be undone.</strong> All user data including predictions, scores, badges, and pool memberships will be permanently deleted.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 text-sm">
            <p className="font-medium">The following data will be deleted:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>User profile and personal information</li>
              <li>All predictions and scores</li>
              <li>Pool memberships and votes</li>
              <li>Earned badges and achievements</li>
              <li>Sanctions and moderation history</li>
            </ul>
          </div>

          <div className="flex items-start space-x-2 rounded-lg border border-destructive/50 p-4 bg-destructive/5">
            <Checkbox
              id="confirm-delete"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="confirm-delete"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I understand this is permanent
              </label>
              <p className="text-xs text-muted-foreground">
                Confirm that you want to permanently delete this user account and all associated data.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading || !confirmed}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}