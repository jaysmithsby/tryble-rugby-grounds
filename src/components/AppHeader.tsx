import { useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  showBackButton?: boolean;
  backTo?: string;
  backLabel?: string;
  onSignOut?: () => void;
  children?: React.ReactNode;
}

const AppHeader = ({
  showBackButton = false,
  backTo = "/home",
  backLabel = "Back to Home",
  onSignOut,
  children,
}: AppHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" />
          <span className="text-2xl font-bold text-primary">Trybal</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {showBackButton && (
            <Button variant="ghost" onClick={() => navigate(backTo)}>
              {backLabel}
            </Button>
          )}
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
      {children}
    </header>
  );
};

export default AppHeader;
