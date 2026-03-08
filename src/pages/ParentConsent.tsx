import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Shield, 
  ExternalLink,
  Trophy,
  Clock,
} from "lucide-react";

type ConsentState = 
  | "loading"
  | "ready"
  | "processing"
  | "success"
  | "already_verified"
  | "expired"
  | "invalid"
  | "error";

const ParentConsent = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<ConsentState>("loading");
  const [childName, setChildName] = useState<string>("Your child");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setState("invalid");
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      // First, just check if the token exists and is valid
      const { data, error } = await supabase.functions.invoke("verify-parental-consent", {
        body: { token, dryRun: true },
      });

      // For dry run, we just want to know if it's valid
      // We'll do the actual verification when user clicks confirm
      if (error) {
        throw error;
      }

      if (!data.success && data.code === "INVALID_TOKEN") {
        setState("invalid");
        return;
      }

      if (!data.success && data.code === "TOKEN_EXPIRED") {
        setState("expired");
        return;
      }

      if (data.alreadyVerified) {
        setChildName(data.childFirstName || "Your child");
        setState("already_verified");
        return;
      }

      setChildName(data.childFirstName || "Your child");
      setState("ready");
    } catch (err: any) {
      console.error("Error verifying token:", err);
      // Check if it's an invalid token vs a server error
      if (err.message?.includes("Invalid") || err.message?.includes("expired")) {
        setState("invalid");
      } else {
        setState("ready"); // Assume valid and let confirmation handle errors
      }
    }
  };

  const handleConfirmConsent = async () => {
    setState("processing");
    try {
      const { data, error } = await supabase.functions.invoke("verify-parental-consent", {
        body: { token },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        if (data.code === "TOKEN_EXPIRED") {
          setState("expired");
        } else if (data.code === "INVALID_TOKEN") {
          setState("invalid");
        } else {
          setErrorMessage(data.error || "Failed to verify consent");
          setState("error");
        }
        return;
      }

      setChildName(data.childFirstName || "Your child");
      setState("success");
    } catch (err: any) {
      console.error("Error confirming consent:", err);
      setErrorMessage(err.message || "Something went wrong. Please try again.");
      setState("error");
    }
  };

  // Loading state
  if (state === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Verifying consent request...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token
  if (state === "invalid") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground mb-6">
              This consent link is invalid or has been used. Please ask your child to send a new request.
            </p>
            <Link to="/">
              <Button variant="outline">Go to Trybal</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired token
  if (state === "expired") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-warning" />
            <h2 className="text-xl font-semibold mb-2">Link Expired</h2>
            <p className="text-muted-foreground mb-6">
              This consent link has expired. Please ask your child to resend the request from their profile.
            </p>
            <Link to="/">
              <Button variant="outline">Go to Trybal</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already verified
  if (state === "already_verified") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Already Verified</CardTitle>
            <CardDescription>
              Consent for {childName} has already been verified.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Want to join the fun?
              </h3>
              <p className="text-sm text-muted-foreground">
                Create your own Trybal account and compete alongside your child!
              </p>
              <Link to="/auth">
                <Button className="w-full">Create My Account</Button>
              </Link>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Trybal is safe for the whole family.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (state === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Consent Confirmed!</CardTitle>
            <CardDescription>
              {childName}'s account is now fully activated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground text-center">
              They can now access all features including creating pools, joining friends' pools, and making predictions on all matches.
            </p>

            <div className="border-t border-border pt-6">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Want to join the fun?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Create your own Trybal account and compete alongside your child!
                </p>
                <Link to="/auth">
                  <Button className="w-full">Create My Account</Button>
                </Link>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Trybal is safe for the whole family.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Something Went Wrong</h2>
            <p className="text-muted-foreground mb-6">{errorMessage}</p>
            <Button onClick={() => verifyToken()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ready state - show consent form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <span className="text-3xl">🏉</span>
          </div>
          <CardTitle className="text-2xl">Parental Consent Request</CardTitle>
          <CardDescription className="text-base mt-2">
            Your child, <strong>{childName}</strong>, is requesting permission to use Trybal, a safe predictions app for South African schoolboy rugby.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Safety highlights */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Why Trybal is safe:
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                No gambling, no prizes, no fees
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                POPIA-compliant — minimal data collection
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                All content is moderated
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                No addictive mechanics
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                Built by parents, for families
              </li>
            </ul>
          </div>

          {/* Links */}
          <div className="flex flex-col sm:flex-row gap-3 text-sm">
            <Link 
              to="/for-parents" 
              className="flex items-center gap-1 text-primary hover:underline"
            >
              📚 Read our Safety Guide
              <ExternalLink className="w-3 h-3" />
            </Link>
            <a 
              href="mailto:safety@trybal.co.za"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              📧 Contact safety@trybal.co.za
            </a>
          </div>

          {/* Consent button */}
          <Button 
            onClick={handleConfirmConsent}
            className="w-full h-12 text-lg"
            size="lg"
            disabled={state === "processing"}
          >
            {state === "processing" ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                I Give My Consent
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By consenting, you allow {childName} to create pools, join pools, and make predictions on all fixtures.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentConsent;
