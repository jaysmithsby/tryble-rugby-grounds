import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, UserCheck, Heart } from "lucide-react";

type UserType = "scholar" | "alumni" | "parent" | "fan";

interface StepRoleProps {
  userType?: UserType;
  onNext: (userType: UserType) => void;
  onBack: () => void;
}

const roles = [
  {
    value: "scholar" as UserType,
    label: "Scholar",
    description: "Current student",
    icon: GraduationCap,
  },
  {
    value: "alumni" as UserType,
    label: "Alumni",
    description: "Former student",
    icon: UserCheck,
  },
  {
    value: "parent" as UserType,
    label: "Parent",
    description: "Guardian of a student",
    icon: Users,
  },
  {
    value: "fan" as UserType,
    label: "Fan",
    description: "School rugby supporter",
    icon: Heart,
  },
];

const StepRole = ({ userType: initialType, onNext, onBack }: StepRoleProps) => {
  const [selected, setSelected] = useState<UserType | undefined>(initialType);

  const handleNext = () => {
    if (selected) {
      onNext(selected);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">What brings you to Tryble?</h2>
        <p className="text-muted-foreground">Select your connection to school rugby</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <button
              key={role.value}
              type="button"
              onClick={() => setSelected(role.value)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selected === role.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <Icon className="w-8 h-8 mb-2" />
              <div className="font-medium">{role.label}</div>
              <div className="text-xs text-muted-foreground">{role.description}</div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={handleNext} className="flex-1" disabled={!selected}>
          Continue
        </Button>
      </div>
    </div>
  );
};

export default StepRole;
