import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Mail, RefreshCw } from "lucide-react";
import { useConsentStatus } from "@/hooks/useConsentStatus";
import { UpdateParentEmailDialog } from "./UpdateParentEmailDialog";

interface ConsentRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionDescription?: string;
}

export function ConsentRequiredDialog({
  open,
  onOpenChange,
  actionDescription = "this feature",
}: ConsentRequiredDialogProps) {
  const [updateEmailOpen, setUpdateEmailOpen] = useState(false);
  const [resending, setResending] = useState(false);
  const { maskedEmail, sendConsentEmail } = useConsentStatus();

  const handleResend = async () => {
    setResending(true);
    try {
      const { data: { user } } = await (await import("@/integrations/supabase/client")).supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await (await import("@/integrations/supabase/client")).supabase
        .from("profiles")
        .select("first_name, parent_email")
        .eq("id", user.id)
        .single();

      if (profile?.parent_email && profile?.first_name) {
        await sendConsentEmail(profile.parent_email, profile.first_name, false);
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-center">Parental Consent Required</DialogTitle>
            <DialogDescription className="text-center">
              To access {actionDescription}, we need your parent or guardian's permission.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/40">
              <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  Ask your parent or guardian to check their email
                </p>
                {maskedEmail && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Sent to: {maskedEmail}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Resend Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setUpdateEmailOpen(true)}
              >
                Update Email
              </Button>
            </div>

            <Button 
              className="w-full" 
              onClick={() => onOpenChange(false)}
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <UpdateParentEmailDialog
        open={updateEmailOpen}
        onOpenChange={setUpdateEmailOpen}
      />
    </>
  );
}
