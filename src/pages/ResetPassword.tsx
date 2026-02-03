import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";

const passwordSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setValidSession(!!session);
      setCheckingSession(false);
    };

    // Listen for auth state changes (when user clicks reset link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidSession(true);
        setCheckingSession(false);
      }
    });

    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = passwordSchema.parse({ password, confirmPassword });
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: validated.password,
      });

      if (error) throw error;

      toast({
        title: "Password updated",
        description: "Your password has been successfully reset. You can now sign in.",
      });

      // Sign out and redirect to auth page
      await supabase.auth.signOut();
      navigate("/auth", { state: { mode: "signin" } });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to reset password. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!validSession) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/40">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <button onClick={() => navigate("/")} className="text-2xl font-bold text-primary">
              Trybal
            </button>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center space-y-4">
            <h1 className="text-2xl font-bold">Invalid or Expired Link</h1>
            <p className="text-muted-foreground">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Button onClick={() => navigate("/auth", { state: { mode: "signin" } })}>
              Back to Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-2xl font-bold text-primary">
            Trybal
          </button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Set New Password</h1>
            <p className="text-muted-foreground">
              Enter your new password below
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Reset Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
