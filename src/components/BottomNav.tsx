import { useNavigate, useLocation } from "react-router-dom";
import { Home, Trophy, CalendarDays, User } from "lucide-react";

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border/40 bg-background/95 backdrop-blur-sm z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-around items-center">
          <button
            onClick={() => navigate("/home")}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive("/home")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">Home</span>
          </button>
          
          <button
            onClick={() => navigate("/leaderboard")}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive("/leaderboard") || location.pathname.startsWith("/pool/")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trophy className="w-5 h-5" />
            <span className="text-xs font-medium">Leaderboards</span>
          </button>

          <button
            onClick={() => navigate("/fixtures")}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive("/fixtures")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarDays className="w-5 h-5" />
            <span className="text-xs font-medium">Fixtures</span>
          </button>
          
          <button
            onClick={() => navigate("/profile")}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive("/profile")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
