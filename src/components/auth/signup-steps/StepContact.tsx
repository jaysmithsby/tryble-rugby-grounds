import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone } from "lucide-react";
import { countryCodes } from "@/data/countryCodes";

interface StepContactProps {
  contactMethod: "email" | "mobile";
  contactValue: string;
  countryCode?: string;
  onNext: (method: "email" | "mobile", value: string, countryCode?: string) => void;
  onBack: () => void;
}

const StepContact = ({ 
  contactMethod: initialMethod, 
  contactValue: initialValue, 
  countryCode: initialCountryCode = "+27",
  onNext, 
  onBack 
}: StepContactProps) => {
  const [method, setMethod] = useState<"email" | "mobile">(initialMethod);
  const [value, setValue] = useState(initialValue);
  const [selectedCountryCode, setSelectedCountryCode] = useState(initialCountryCode);

  const handleNext = () => {
    if (value.trim()) {
      const finalValue = method === "mobile" 
        ? `${selectedCountryCode}${value.trim()}` 
        : value.trim();
      onNext(method, finalValue, selectedCountryCode);
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
          {method === "mobile" ? (
            <div className="flex gap-2">
              <Select value={selectedCountryCode} onValueChange={setSelectedCountryCode}>
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
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === "Enter" && handleNext()}
                className="flex-1"
              />
            </div>
          ) : (
            <Input
              id="contact"
              type="email"
              placeholder="your@email.com"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNext()}
            />
          )}
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
