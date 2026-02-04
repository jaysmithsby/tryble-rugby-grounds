import { useEffect } from "react";
import { Trophy, Sparkles } from "lucide-react";

interface StepWelcomeProps {
  firstName: string;
  onContinue: () => void;
}

const StepWelcome = ({ firstName, onContinue }: StepWelcomeProps) => {
  // Auto-advance after 1.5 seconds
  useEffect(() => {
    const timer = setTimeout(onContinue, 1500);
    return () => clearTimeout(timer);
  }, [onContinue]);

  return (
    <div 
      className="flex flex-col items-center justify-center space-y-6 py-12 cursor-pointer"
      onClick={onContinue}
    >
      <div className="relative">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
          <Trophy className="w-12 h-12 text-primary" />
        </div>
        <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-500 animate-bounce" />
      </div>

      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold">
          Welcome to Trybal, {firstName}! 🎉
        </h1>
        <p className="text-lg text-muted-foreground">
          Let's get you set up for your next match.
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
        <span>Tap anywhere to continue</span>
      </div>
    </div>
  );
};

export default StepWelcome;
