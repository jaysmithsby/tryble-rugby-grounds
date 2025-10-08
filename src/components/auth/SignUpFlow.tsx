import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import StepName from "./signup-steps/StepName";
import StepContact from "./signup-steps/StepContact";
import StepRole from "./signup-steps/StepRole";
import StepSchool from "./signup-steps/StepSchool";
import StepPassword from "./signup-steps/StepPassword";
import StepComplete from "./signup-steps/StepComplete";

const signUpSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  contactMethod: z.enum(["email", "mobile"]),
  contactValue: z.string().trim().min(1, "Contact information is required"),
  countryCode: z.string().optional(),
  userType: z.enum(["scholar", "alumni", "parent", "fan"]),
  schoolName: z.string().trim().min(1, "School name is required").max(200),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignUpData = z.infer<typeof signUpSchema>;

interface SignUpFlowProps {
  onSwitchToSignIn: () => void;
}

const SignUpFlow = ({ onSwitchToSignIn }: SignUpFlowProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<SignUpData>>({
    contactMethod: "email",
    countryCode: "+27",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const updateFormData = (data: Partial<SignUpData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleSignUp = async (password: string) => {
    try {
      setLoading(true);
      
      const dataToValidate = { ...formData, password };
      const validated = signUpSchema.parse(dataToValidate);
      
      const { data, error } = await supabase.auth.signUp({
        email: validated.contactMethod === "email" ? validated.contactValue : `${Date.now()}@tryble.app`,
        password: validated.password,
        phone: validated.contactMethod === "mobile" ? validated.contactValue : undefined,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: validated.firstName,
            contact_method: validated.contactMethod,
            contact_value: validated.contactValue,
            user_type: validated.userType,
            school_name: validated.schoolName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Move to completion step instead of navigating immediately
        setStep(6);
      }
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "Please check your details and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <StepName
            firstName={formData.firstName || ""}
            onNext={(firstName) => {
              updateFormData({ firstName });
              setStep(2);
            }}
          />
        );
      case 2:
        return (
          <StepContact
            contactMethod={formData.contactMethod || "email"}
            contactValue={formData.contactValue || ""}
            countryCode={formData.countryCode}
            onNext={(method, value, countryCode) => {
              updateFormData({ contactMethod: method, contactValue: value, countryCode });
              setStep(3);
            }}
            onBack={() => setStep(1)}
          />
        );
      case 3:
        return (
          <StepRole
            userType={formData.userType}
            onNext={(userType) => {
              updateFormData({ userType });
              setStep(4);
            }}
            onBack={() => setStep(2)}
          />
        );
      case 4:
        return (
          <StepSchool
            schoolName={formData.schoolName || ""}
            onNext={(schoolName) => {
              updateFormData({ schoolName });
              setStep(5);
            }}
            onBack={() => setStep(3)}
          />
        );
      case 5:
        return (
          <StepPassword
            onNext={(password) => {
              handleSignUp(password);
            }}
            onBack={() => setStep(4)}
            loading={loading}
          />
        );
      case 6:
        return (
          <StepComplete
            userData={{
              firstName: formData.firstName || "",
              contactMethod: formData.contactMethod || "email",
              contactValue: formData.contactValue || "",
              userType: formData.userType || "fan",
              schoolName: formData.schoolName || "",
            }}
            onComplete={() => navigate("/home")}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator - only show for steps 1-5 */}
      {step <= 5 && (
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1.5 w-12 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      )}

      {renderStep()}

      {/* Only show sign in link on steps 1-5 */}
      {step <= 5 && (
        <div className="text-center">
          <button
            onClick={onSwitchToSignIn}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Already have an account? <span className="text-primary font-medium">Sign In</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default SignUpFlow;
