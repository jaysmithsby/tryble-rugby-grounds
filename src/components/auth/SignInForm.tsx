import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone } from "lucide-react";
import { countryCodes } from "@/data/countryCodes";
import { z } from "zod";
import ForgotPasswordDialog from "./ForgotPasswordDialog";

const emailSignInSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const phoneSignInSchema = z.object({
  phone: z.string().trim().min(1, "Phone number is required"),
  password: z.string().min(1, "Password is required"),
});

interface SignInFormProps {
  onSwitchToSignUp: () => void;
}

const SignInForm = ({ onSwitchToSignUp }: SignInFormProps) => {
  const [method, setMethod] = useState<"email" | "mobile">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+27");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      let authData;
      
      if (method === "email") {
        const validated = emailSignInSchema.parse({ email, password });
        authData = await supabase.auth.signInWithPassword({
          email: validated.email,
          password: validated.password,
        });
      } else {
        const fullPhone = `${countryCode}${phone}`;
        const validated = phoneSignInSchema.parse({ phone: fullPhone, password });
        authData = await supabase.auth.signInWithPassword({
          phone: validated.phone,
          password: validated.password,
        });
      }

      const { data, error } = authData;
      
      if (error) throw error;

      if (data.user) {
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
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

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Welcome Back</h1>
        <p className="text-muted-foreground">Sign in to continue to Trybal</p>
      </div>

      <form onSubmit={handleSignIn} className="space-y-4">
        {/* Method Toggle */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMethod("email")}
            className={`p-4 rounded-lg border-2 transition-all ${
              method === "email"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <Mail className="w-6 h-6 mx-auto mb-2" />
            <div className="text-sm font-medium">Email</div>
          </button>
          <button
            type="button"
            onClick={() => setMethod("mobile")}
            className={`p-4 rounded-lg border-2 transition-all ${
              method === "mobile"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <Phone className="w-6 h-6 mx-auto mb-2" />
            <div className="text-sm font-medium">Mobile</div>
          </button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact">
            {method === "email" ? "Email Address" : "Mobile Number"}
          </Label>
          {method === "mobile" ? (
            <div className="flex gap-2">
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countryCodes.map((country) => (
                    <SelectItem key={country.code} value={country.dialCode}>
                      <span className="flex items-center gap-2">
                        <span>{country.flag}</span>
                        <span>{country.dialCode}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="contact"
                type="tel"
                placeholder="XX XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="flex-1"
                required
              />
            </div>
          ) : (
            <Input
              id="contact"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {method === "email" && (
              <button
                type="button"
                onClick={() => setForgotPasswordOpen(true)}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Forgot Password?
              </button>
            )}
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <ForgotPasswordDialog
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
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
