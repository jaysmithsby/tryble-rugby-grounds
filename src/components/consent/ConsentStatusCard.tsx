import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Shield,
  AlertCircle,
} from "lucide-react";
import { useConsentStatus } from "@/hooks/useConsentStatus";
import { UpdateParentEmailDialog } from "./UpdateParentEmailDialog";
import { supabase } from "@/integrations/supabase/client";

export function ConsentStatusCard() {
  const [updateEmailOpen, setUpdateEmailOpen] = useState(false);
  const [resending, setResending] = useState(false);
  
  const {
    isMinor,
    consentStatus,
    maskedEmail,
    canChangeEmail,
    changesRemaining,
    sendConsentEmail,
    isLoading,
  } = useConsentStatus();

  // Don't render if not a minor or still loading
  if (isLoading || !isMinor) {
    return null;
  }

  const handleResend = async () => {
    setResending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
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

  // Verified state
  if (consentStatus === "verified") {
    return (
      <Card className="bg-gradient-card border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Parental Consent: Verified
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Your account is fully activated.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-4 h-4" />
            Protected under POPIA guidelines.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pending state
  return (
    <>
      <Card className="bg-gradient-card border-warning/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-warning" />
            Parental Consent: Pending
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {maskedEmail ? (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                We've sent a request to:
              </p>
              <Badge variant="secondary" className="font-mono">
                {maskedEmail}
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">
                No parent email on file. Please update your email below.
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Some features are limited until your parent approves.
          </p>

          <div className="flex gap-2">
            {maskedEmail && (
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
            )}
            <Button
              variant={maskedEmail ? "outline" : "default"}
              size="sm"
              className="flex-1"
              onClick={() => setUpdateEmailOpen(true)}
            >
              {maskedEmail ? "Update Email" : "Add Parent Email"}
            </Button>
          </div>

          {canChangeEmail && changesRemaining < 3 && (
            <p className="text-xs text-muted-foreground text-center">
              Email changes remaining: {changesRemaining} of 3
            </p>
          )}
        </CardContent>
      </Card>

      <UpdateParentEmailDialog
        open={updateEmailOpen}
        onOpenChange={setUpdateEmailOpen}
      />
    </>
  );
}
