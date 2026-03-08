import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import GlobalHeader from "@/components/GlobalHeader";
import SignUpFlow from "@/components/auth/SignUpFlow";
import SignInForm from "@/components/auth/SignInForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getBiometricPreference,
  promptBiometric,
  getSessionFromSecureStorage,
} from "@/lib/biometricAuth";

const Auth = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">(
    (location.state as any)?.mode || "signup"
  );
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [hashProcessing, setHashProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Detect if URL contains Supabase hash-based auth redirect
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes("access_token") || hash.includes("type=signup") || hash.includes("type=recovery"))) {
      setHashProcessing(true);
    }
  }, []);

  // Listen for auth state changes — handles hash-based redirects from Supabase verification emails
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          if (session.user.email_confirmed_at) {
            // User arrived via verification link and is now verified
            setVerified(true);
            setHashProcessing(false);
            setMode("signup"); // Ensure we're in signup flow to continue onboarding
          } else {
            setHashProcessing(false);
          }
        }

        if (event === "TOKEN_REFRESHED" && session?.user?.email_confirmed_at) {
          setVerified(true);
          setHashProcessing(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Attempt biometric login on mount
  useEffect(() => {
    // Skip biometric if we're processing a hash redirect
    if (hashProcessing) return;

    let cancelled = false;

    const attemptBiometricLogin = async () => {
      if (!getBiometricPreference()) return;

      setBiometricLoading(true);
      try {
        const success = await promptBiometric();
        if (!success || cancelled) {
          setBiometricLoading(false);
          return;
        }

        const tokens = await getSessionFromSecureStorage();
        if (!tokens || cancelled) {
          setBiometricLoading(false);
          return;
        }

        const { error } = await supabase.auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });

        if (cancelled) return;

        if (!error) {
          navigate("/home");
          return;
        }
      } catch {
        // Any failure → fall through to normal sign-in UI
      }
      if (!cancelled) setBiometricLoading(false);
    };

    attemptBiometricLogin();
    return () => { cancelled = true; };
  }, [navigate, hashProcessing]);

  // Handle custom verification token from URL (?token=...)
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      handleVerification(token);
    }
  }, [searchParams]);

  // Safety timeout for hash processing — if onAuthStateChange doesn't fire within 5s, stop waiting
  useEffect(() => {
    if (!hashProcessing) return;
    const timeout = setTimeout(() => {
      setHashProcessing(false);
    }, 5000);
    return () => clearTimeout(timeout);
  }, [hashProcessing]);

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
        
        await supabase.auth.refreshSession();
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
      window.history.replaceState({}, "", "/auth");
    } finally {
      setVerifying(false);
    }
  };

  // Show loading state while verifying, doing biometric auth, or processing hash redirect
  if (verifying || biometricLoading || hashProcessing) {
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
