import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Mail, ExternalLink } from "lucide-react";
import { useConsentStatus } from "@/hooks/useConsentStatus";
import { supabase } from "@/integrations/supabase/client";

interface UpdateParentEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateParentEmailDialog({
  open,
  onOpenChange,
}: UpdateParentEmailDialogProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    canChangeEmail,
    changesRemaining,
    nextChangeAt,
    sendConsentEmail,
    refetch,
  } = useConsentStatus();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setEmail("");
      setError(null);
    }
  }, [open]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single();

      const success = await sendConsentEmail(
        email, 
        profile?.first_name || "Your child", 
        true
      );

      if (success) {
        refetch();
        onOpenChange(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update email");
    } finally {
      setLoading(false);
    }
  };

  const formatNextChangeTime = () => {
    if (!nextChangeAt) return "";
    return nextChangeAt.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (!canChangeEmail) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Parent Email</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Change limit reached
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  You can try again at {formatNextChangeTime()}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border/40">
              <p className="text-sm">
                Need help sooner? Contact our support team.
              </p>
              <a
                href="mailto:support@trybal.app"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
              >
                <Mail className="w-4 h-4" />
                support@trybal.app
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Parent Email</DialogTitle>
          <DialogDescription>
            Enter your parent or guardian's correct email address. A new consent request will be sent.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="parentEmail">Parent/Guardian Email</Label>
            <Input
              id="parentEmail"
              type="email"
              placeholder="parent@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
            />
            {changesRemaining < 3 && (
              <p className="text-xs text-muted-foreground">
                Changes remaining: {changesRemaining} of 3
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || !email.trim()}
            >
              {loading ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
