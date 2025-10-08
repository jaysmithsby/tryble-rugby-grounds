import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StepNameProps {
  firstName: string;
  onNext: (firstName: string) => void;
}

const StepName = ({ firstName: initialName, onNext }: StepNameProps) => {
  const [firstName, setFirstName] = useState(initialName);

  const handleNext = () => {
    if (firstName.trim()) {
      onNext(firstName.trim());
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Welcome to Tryble</h1>
        <p className="text-muted-foreground">Let's get you started with predictions and rankings</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">What's your first name?</Label>
          <Input
            id="firstName"
            type="text"
            placeholder="Enter your first name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleNext()}
            autoFocus
          />
        </div>

        <Button onClick={handleNext} className="w-full" disabled={!firstName.trim()}>
          Continue
        </Button>
      </div>
    </div>
  );
};

export default StepName;
