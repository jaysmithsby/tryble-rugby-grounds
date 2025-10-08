import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StepSchoolProps {
  schoolName: string;
  onNext: (schoolName: string) => void;
  onBack: () => void;
}

const StepSchool = ({ schoolName: initialSchool, onNext, onBack }: StepSchoolProps) => {
  const [schoolName, setSchoolName] = useState(initialSchool);

  const handleNext = () => {
    if (schoolName.trim()) {
      onNext(schoolName.trim());
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Which school do you represent?</h2>
        <p className="text-muted-foreground">Show your school pride</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="school">School Name</Label>
          <Input
            id="school"
            type="text"
            placeholder="e.g., Grey College, Paarl Boys' High"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleNext()}
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button onClick={handleNext} className="flex-1" disabled={!schoolName.trim()}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StepSchool;
