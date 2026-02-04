import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { Eye, EyeOff, Check, X, Mail, Lock } from "lucide-react";

const emailSchema = z.string().email("Please enter a valid email address");

const passwordRequirements = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  { label: "One special character", test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

interface StepAccountProps {
  email: string;
  onNext: (email: string, password: string) => void;
  onSwitchToSignIn: () => void;
  loading?: boolean;
  error?: string | null;
}

const StepAccount = ({ email: initialEmail, onNext, onSwitchToSignIn, loading, error }: StepAccountProps) => {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const validateEmail = (value: string) => {
    try {
      emailSchema.parse(value);
      setEmailError(null);
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        setEmailError(e.errors[0].message);
      }
      return false;
    }
  };

  const allRequirementsMet = passwordRequirements.every((req) => req.test(password));
  const isValid = !emailError && email.length > 0 && allRequirementsMet;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateEmail(email) && allRequirementsMet) {
      onNext(email, password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Create your account</h2>
        <p className="text-muted-foreground">Enter your email and create a password</p>
      </div>

      <div className="space-y-4">
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (touched) validateEmail(e.target.value);
              }}
              onBlur={() => {
                setTouched(true);
                validateEmail(email);
              }}
              className="pl-10"
              autoComplete="email"
              autoFocus
            />
          </div>
          {emailError && touched && (
            <p className="text-sm text-destructive">{emailError}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10"
              autoComplete="new-password"
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

        {/* Password Requirements Checklist */}
        {password.length > 0 && (
          <div className="space-y-1.5 p-3 bg-muted/50 rounded-lg">
            {passwordRequirements.map((req, index) => {
              const passed = req.test(password);
              return (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {passed ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={passed ? "text-green-500" : "text-muted-foreground"}>
                    {req.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
            {error.toLowerCase().includes("already") && (
              <button
                type="button"
                onClick={onSwitchToSignIn}
                className="text-sm text-primary font-medium mt-1 hover:underline"
              >
                Log in instead →
              </button>
            )}
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={!isValid || loading}>
        {loading ? "Creating account..." : "Continue"}
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Already have an account? <span className="text-primary font-medium">Sign In</span>
        </button>
      </div>
    </form>
  );
};

export default StepAccount;
