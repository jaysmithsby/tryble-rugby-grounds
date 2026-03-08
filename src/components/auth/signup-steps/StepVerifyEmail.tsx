import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StepVerifyEmailProps {
  email: string;
  onVerified: () => void;
  onChangeEmail: () => void;
}

const StepVerifyEmail = ({ email, onVerified, onChangeEmail }: StepVerifyEmailProps) => {
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  // Poll for email verification
  useEffect(() => {
    const checkVerification = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) return;
        
        if (user?.email_confirmed_at) {
          // Show success animation before advancing
          setShowSuccess(true);
          setTimeout(() => {
            onVerified();
          }, 1500);
        }
      } catch (e) {
        // Silently handle errors during polling
      }
    };

    // Check immediately
    checkVerification();

    // Poll every 3 seconds
    const interval = setInterval(checkVerification, 3000);

    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'USER_UPDATED' && session?.user?.email_confirmed_at) {
        setShowSuccess(true);
        setTimeout(() => {
          onVerified();
        }, 1500);
      }
    });

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [onVerified]);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    setResending(true);
    try {
      // Use our custom edge function to resend
      const { error } = await supabase.functions.invoke("send-verification-email", {
        body: { email },
      });

      if (error) throw error;

      toast({
        title: "Email sent!",
        description: "Check your inbox for the verification link.",
      });
      setCountdown(60); // 60 second cooldown
    } catch (error: any) {
      toast({
        title: "Failed to resend",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const handleCheckManually = async () => {
    setChecking(true);
    try {
      // Refresh the session first to get latest user state
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        // Try getUser as fallback
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        if (user?.email_confirmed_at) {
          setShowSuccess(true);
          setTimeout(() => {
            onVerified();
          }, 1500);
          return;
        }
      } else if (session?.user?.email_confirmed_at) {
        setShowSuccess(true);
        setTimeout(() => {
          onVerified();
        }, 1500);
        return;
      }
      
      toast({
        title: "Not verified yet",
        description: "Please click the link in your email to verify your account.",
        variant: "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Error checking verification",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  // Success state
  if (showSuccess) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-300">
              <CheckCircle2 className="w-10 h-10 text-primary animate-in zoom-in-50 duration-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold animate-in fade-in-50 duration-300">Email verified! 🎉</h2>
          <p className="text-muted-foreground animate-in fade-in-50 duration-500">
            Let's set up your profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Verify your email</h2>
        <p className="text-muted-foreground">
          We've sent a verification link to:
        </p>
        <p className="font-medium text-foreground">{email}</p>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg space-y-3">
        <p className="text-sm text-muted-foreground text-center">
          Click the link in the email to verify your account and continue.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Waiting for verification...</span>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={handleResendEmail}
          disabled={resending || countdown > 0}
        >
          {resending ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : countdown > 0 ? (
            `Resend email (${countdown}s)`
          ) : (
            "Resend verification email"
          )}
        </Button>

        <Button
          variant="ghost"
          className="w-full"
          onClick={handleCheckManually}
          disabled={checking}
        >
          {checking ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              I've verified my email
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={onChangeEmail}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Use a different email
        </Button>
      </div>
    </div>
  );
};

export default StepVerifyEmail;
