import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import StepAccount from "./signup-steps/StepAccount";
import StepVerifyEmail from "./signup-steps/StepVerifyEmail";
import StepProfile from "./signup-steps/StepProfile";
import StepWelcome from "./signup-steps/StepWelcome";
import StepNextMatch from "./signup-steps/StepNextMatch";
import StepTournament from "./signup-steps/StepTournament";
import StepPool from "./signup-steps/StepPool";
import { Skeleton } from "@/components/ui/skeleton";

const STORAGE_KEY = "trybal_onboarding_state";

interface OnboardingState {
  step: number;
  email: string;
  firstName: string;
  userType?: string;
  yearOfBirth?: number;
  schoolName: string;
  parentEmail?: string;
  userId?: string;
}

const defaultState: OnboardingState = {
  step: 1,
  email: "",
  firstName: "",
  schoolName: "",
};

interface SignUpFlowProps {
  onSwitchToSignIn: () => void;
  initialVerified?: boolean;
}

const SignUpFlow = ({ onSwitchToSignIn, initialVerified = false }: SignUpFlowProps) => {
  const [state, setState] = useState<OnboardingState>(defaultState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const prevStepRef = useRef<number>(1);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load persisted state on mount - only once
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setState(parsed);
        prevStepRef.current = parsed.step;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, []);

  // Persist state changes - but only after initial check is done to prevent overwriting with defaults
  useEffect(() => {
    if (state.step > 1 && initialCheckDone) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, initialCheckDone]);

  // Handle verification success from URL token
  useEffect(() => {
    if (initialVerified && initialCheckDone) {
      // User just verified their email, advance to profile step
      setState(prev => ({ ...prev, step: 3 }));
    }
  }, [initialVerified, initialCheckDone]);

  // Check if user is already authenticated and verified - run only once on mount
  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!isMounted) return;
      
      if (user) {
        // Only advance past verification if email is actually confirmed
        if (user.email_confirmed_at) {
          // User is verified, check if profile is complete
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, onboarding_completed_at")
            .eq("id", user.id)
            .single();

          if (!isMounted) return;

          if (profile?.onboarding_completed_at) {
            // Onboarding complete, go to home
            localStorage.removeItem(STORAGE_KEY);
            navigate("/home");
            return;
          } else if (profile?.first_name) {
            // Has profile but not completed onboarding
            setState(prev => ({
              ...prev,
              userId: user.id,
              email: user.email || "",
              firstName: profile.first_name,
              step: 4, // Go to welcome
            }));
          } else {
            // Verified but no profile yet
            setState(prev => ({
              ...prev,
              userId: user.id,
              email: user.email || "",
              step: 3, // Go to profile setup
            }));
          }
        } else {
          // User exists but is NOT verified
          setState(prev => {
            // Only update if we're on step 1 to avoid disrupting other flows
            if (prev.step === 1) {
              return {
                ...prev,
                userId: user.id,
                email: user.email || "",
                step: 2, // Stay on/go to verification step
              };
            }
            return prev;
          });
        }
      }
      
      setInitialCheckDone(true);
    };

    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // Smooth transitions between steps
  const updateStepWithTransition = useCallback((newStep: number) => {
    setTransitioning(true);
    setTimeout(() => {
      setState(prev => ({ ...prev, step: newStep }));
      prevStepRef.current = newStep;
      setTimeout(() => setTransitioning(false), 50);
    }, 150);
  }, []);

  const updateState = (updates: Partial<OnboardingState>) => {
    if (updates.step !== undefined && updates.step !== state.step) {
      setTransitioning(true);
      setTimeout(() => {
        setState(prev => ({ ...prev, ...updates }));
        prevStepRef.current = updates.step!;
        setTimeout(() => setTransitioning(false), 50);
      }, 150);
    } else {
      setState(prev => ({ ...prev, ...updates }));
    }
  };

  // Step 1: Create Account
  const handleAccountSubmit = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("This email already has an account. Log in instead.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      if (data.user) {
        // Store the state first
        const newState = {
          ...state,
          email,
          userId: data.user.id,
          step: 2,
        };
        
        // Send verification email via our custom edge function
        try {
          const { error: emailError } = await supabase.functions.invoke("send-verification-email", {});
          
          if (emailError) {
            console.error("Failed to send verification email:", emailError);
            toast({
              title: "Account created",
              description: "Please check your email for the verification link. If you don't see it, you can request a new one.",
            });
          }
        } catch (emailErr) {
          console.error("Error calling send-verification-email:", emailErr);
        }
        
        updateState(newState);
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Email Verified
  const handleVerified = useCallback(() => {
    updateState({ step: 3 });
  }, []);

  // Step 2: Change Email (go back to step 1)
  const handleChangeEmail = async () => {
    // Sign out the unverified user
    await supabase.auth.signOut();
    setState(defaultState);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Step 3: Profile Setup Complete
  const handleProfileComplete = async (data: {
    firstName: string;
    userType: string;
    yearOfBirth: number;
    schoolName: string;
    parentEmail?: string;
  }) => {
    if (!state.userId) return;

    setLoading(true);
    try {
      // Determine if user is a minor
      const currentYear = new Date().getFullYear();
      const isMinor = currentYear - data.yearOfBirth < 18;
      
      // Update the profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          first_name: data.firstName,
          user_type: data.userType,
          year_of_birth: data.yearOfBirth,
          school_name: data.schoolName,
          contact_method: "email",
          contact_value: state.email,
          // Set account type and consent fields for minors
          account_type: isMinor ? "minor" : "adult",
          parent_email: isMinor ? data.parentEmail : null,
          consent_status: isMinor ? "pending" : null,
        })
        .eq("id", state.userId);

      if (updateError) throw updateError;

      // If minor, trigger consent email
      if (isMinor && data.parentEmail) {
        try {
          await supabase.functions.invoke("send-parental-consent", {
            body: {
              parentEmail: data.parentEmail,
              childFirstName: data.firstName,
            },
          });
        } catch (emailError) {
          console.error("Failed to send consent email:", emailError);
          // Don't block onboarding if email fails
        }
      }

      updateState({
        firstName: data.firstName,
        userType: data.userType,
        yearOfBirth: data.yearOfBirth,
        schoolName: data.schoolName,
        parentEmail: data.parentEmail,
        step: 4,
      });
    } catch (e: any) {
      toast({
        title: "Error saving profile",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Welcome auto-advance
  const handleWelcomeContinue = useCallback(() => {
    updateState({ step: 5 });
  }, []);

  // Step 5: Next Match CTAs
  const handleFollowTournament = () => {
    updateState({ step: 6 });
  };

  const handleCreatePool = () => {
    updateState({ step: 7 });
  };

  // Step 6: Tournament follow complete
  const handleTournamentNext = () => {
    updateState({ step: 7 });
  };

  // Step 7: Pool complete - finish onboarding
  const handleOnboardingComplete = async () => {
    if (!state.userId) return;

    try {
      // Mark onboarding as complete
      await supabase
        .from("profiles")
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq("id", state.userId);

      localStorage.removeItem(STORAGE_KEY);
      navigate("/home");
    } catch (e) {
      // Still navigate even if update fails
      localStorage.removeItem(STORAGE_KEY);
      navigate("/home");
    }
  };

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return (
          <StepAccount
            email={state.email}
            onNext={handleAccountSubmit}
            onSwitchToSignIn={onSwitchToSignIn}
            loading={loading}
            error={error}
          />
        );

      case 2:
        return (
          <StepVerifyEmail
            email={state.email}
            onVerified={handleVerified}
            onChangeEmail={handleChangeEmail}
          />
        );

      case 3:
        return (
          <StepProfile
            firstName={state.firstName}
            userType={state.userType}
            yearOfBirth={state.yearOfBirth}
            schoolName={state.schoolName}
            parentEmail={state.parentEmail}
            onNext={handleProfileComplete}
            loading={loading}
          />
        );

      case 4:
        return (
          <StepWelcome
            firstName={state.firstName}
            onContinue={handleWelcomeContinue}
          />
        );

      case 5:
        return (
          <StepNextMatch
            schoolName={state.schoolName}
            onFollowTournament={handleFollowTournament}
            onCreatePool={handleCreatePool}
          />
        );

      case 6:
        return (
          <StepTournament
            schoolName={state.schoolName}
            userId={state.userId || ""}
            onNext={handleTournamentNext}
            onSkip={handleTournamentNext}
          />
        );

      case 7:
        return (
          <StepPool
            schoolName={state.schoolName}
            userId={state.userId || ""}
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingComplete}
          />
        );

      default:
        return null;
    }
  };

  // Show loading skeleton during initial auth check
  if (!initialCheckDone) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-1.5 w-10 rounded-full" />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <div className="space-y-3 pt-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full mt-4" />
          </div>
        </div>
      </div>
    );
  }

  // Progress indicator (hide for verification step and welcome)
  const showProgress = state.step !== 2 && state.step !== 4;
  const progressSteps = [1, 3, 5, 6, 7]; // Skip verification (2) and welcome (4) in progress
  const currentProgressIndex = progressSteps.indexOf(state.step);

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      {showProgress && currentProgressIndex >= 0 && (
        <div className="flex justify-center gap-2">
          {progressSteps.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 w-10 rounded-full transition-colors ${
                index <= currentProgressIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      )}

      {/* Step Content with Transition */}
      <div 
        className={`transition-all duration-200 ease-out ${
          transitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
        }`}
      >
        {renderStep()}
      </div>
    </div>
  );
};

export default SignUpFlow;
