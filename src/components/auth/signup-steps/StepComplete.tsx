import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface StepCompleteProps {
  userData: {
    firstName: string;
    contactMethod: "email" | "mobile";
    contactValue: string;
    userType: string;
    schoolName: string;
  };
  onComplete: () => void;
}

const StepComplete = ({ userData, onComplete }: StepCompleteProps) => {
  const formatUserType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle2 className="w-16 h-16 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Welcome to Trybal, {userData.firstName}!</h2>
        <p className="text-muted-foreground">Your account has been created successfully</p>
      </div>

      <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Name:</span>
          <span className="font-medium">{userData.firstName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Contact:</span>
          <span className="font-medium">{userData.contactValue}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Role:</span>
          <span className="font-medium">{formatUserType(userData.userType)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">School:</span>
          <span className="font-medium">{userData.schoolName}</span>
        </div>
      </div>

      <Button onClick={onComplete} className="w-full" size="lg">
        Let's Predict! 🏆
      </Button>
    </div>
  );
};

export default StepComplete;
