import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SignUpFlow from "@/components/auth/SignUpFlow";
import SignInForm from "@/components/auth/SignInForm";
import { Button } from "@/components/ui/button";

const Auth = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-2xl font-bold text-primary">
            Tryble
          </button>
          <Button variant="ghost" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </div>
      </header>

      {/* Auth Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {mode === "signup" ? (
            <SignUpFlow onSwitchToSignIn={() => setMode("signin")} />
          ) : (
            <SignInForm onSwitchToSignUp={() => setMode("signup")} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
