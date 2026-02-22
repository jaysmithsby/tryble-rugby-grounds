import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import GlobalHeader from "@/components/GlobalHeader";
import SignUpFlow from "@/components/auth/SignUpFlow";
import SignInForm from "@/components/auth/SignInForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const Auth = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">(
    (location.state as any)?.mode || "signup"
  );
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Handle verification token from URL
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      handleVerification(token);
    }
  }, [searchParams]);

  const handleVerification = async (token: string) => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-email-verification", {
        body: { token },
      });

      if (error) throw error;
      
      if (data.success) {
        setVerified(true);
        toast({
          title: "Email verified! 🎉",
          description: "Let's set up your profile.",
        });
        
        // Refresh the session to get updated user data
        await supabase.auth.refreshSession();
        
        // Clear the token from URL
        window.history.replaceState({}, "", "/auth");
      } else {
        throw new Error(data.error || "Verification failed");
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      toast({
        title: "Verification failed",
        description: error.message || "Please try again or request a new verification email.",
        variant: "destructive",
      });
      // Clear the token from URL
      window.history.replaceState({}, "", "/auth");
    } finally {
      setVerifying(false);
    }
  };

  // Show loading state while verifying
  if (verifying) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <GlobalHeader />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center space-y-4">
              <Skeleton className="h-16 w-16 rounded-full mx-auto" />
              <Skeleton className="h-8 w-48 mx-auto" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader />

      {/* Auth Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {mode === "signup" ? (
            <SignUpFlow 
              onSwitchToSignIn={() => setMode("signin")} 
              initialVerified={verified}
            />
          ) : (
            <SignInForm onSwitchToSignUp={() => setMode("signup")} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
