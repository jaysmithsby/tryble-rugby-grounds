import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Phone } from "lucide-react";

interface StepContactProps {
  contactMethod: "email" | "mobile";
  contactValue: string;
  onNext: (method: "email" | "mobile", value: string) => void;
  onBack: () => void;
}

const StepContact = ({ contactMethod: initialMethod, contactValue: initialValue, onNext, onBack }: StepContactProps) => {
  const [method, setMethod] = useState<"email" | "mobile">(initialMethod);
  const [value, setValue] = useState(initialValue);

  const handleNext = () => {
    if (value.trim()) {
      onNext(method, value.trim());
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">How should we reach you?</h2>
        <p className="text-muted-foreground">Choose your preferred contact method</p>
      </div>

      <div className="space-y-4">
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
          <Input
            id="contact"
            type={method === "email" ? "email" : "tel"}
            placeholder={method === "email" ? "your@email.com" : "+27 XX XXX XXXX"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleNext()}
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button onClick={handleNext} className="flex-1" disabled={!value.trim()}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StepContact;
