import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import ForgotPasswordDialog from "./ForgotPasswordDialog";
import BiometricPromptDialog from "./BiometricPromptDialog";
import {
  isBiometricAvailable,
  getBiometricPreference,
  setBiometricPreference,
  saveSessionToSecureStorage,
} from "@/lib/biometricAuth";

const emailSignInSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

interface SignInFormProps {
  onSwitchToSignUp: () => void;
}

const SignInForm = ({ onSwitchToSignUp }: SignInFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [showBiometricDialog, setShowBiometricDialog] = useState(false);
  const [pendingSession, setPendingSession] = useState<{ access_token: string; refresh_token: string } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const validated = emailSignInSchema.parse({ email, password });
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });
      
      if (error) throw error;

      if (data.user && data.session) {
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });

        // Check if we should prompt for biometric opt-in
        if (!getBiometricPreference()) {
          const available = await isBiometricAvailable();
          if (available) {
            setPendingSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            });
            setShowBiometricDialog(true);
            return; // Don't navigate yet — wait for dialog
          }
        } else if (data.session) {
          // User already opted in — update stored tokens silently
          await saveSessionToSecureStorage(
            data.session.access_token,
            data.session.refresh_token
          );
        }

        navigate("/home");
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sign in failed",
          description: error.message || "Please check your credentials and try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricEnable = async () => {
    if (pendingSession) {
      await saveSessionToSecureStorage(
        pendingSession.access_token,
        pendingSession.refresh_token
      );
      setBiometricPreference(true);
    }
    setShowBiometricDialog(false);
    setPendingSession(null);
    navigate("/home");
  };

  const handleBiometricSkip = () => {
    setShowBiometricDialog(false);
    setPendingSession(null);
    navigate("/home");
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Welcome Back</h1>
        <p className="text-muted-foreground">Sign in to continue to Trybal</p>
      </div>

      <form onSubmit={handleSignIn} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              onClick={() => setForgotPasswordOpen(true)}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Forgot Password?
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <ForgotPasswordDialog
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
      />

      <BiometricPromptDialog
        open={showBiometricDialog}
        onEnable={handleBiometricEnable}
        onSkip={handleBiometricSkip}
      />

      <div className="text-center">
        <button
          onClick={onSwitchToSignUp}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Don't have an account? <span className="text-primary font-medium">Sign Up</span>
        </button>
      </div>
    </div>
  );
};

export default SignInForm;
