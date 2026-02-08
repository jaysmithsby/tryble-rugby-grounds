import { useNavigate, useLocation } from "react-router-dom";
import { Home, Users, User } from "lucide-react";
import { usePrefetch } from "@/hooks/usePrefetch";

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { prefetchForRoute } = usePrefetch();

  const isActive = (path: string) => location.pathname === path;
  
  const isPoolsActive = () => 
    isActive("/pools") || 
    location.pathname.startsWith("/pool/") || 
    isActive("/leaderboard");

  /**
   * Prefetch data when user hovers or focuses a nav item.
   * This warms the cache so page transitions feel instant.
   */
  const handlePrefetch = (path: string) => () => {
    prefetchForRoute(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border/40 bg-background/95 backdrop-blur-sm z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-around items-center">
          <button
            onClick={() => navigate("/home")}
            onMouseEnter={handlePrefetch("/home")}
            onFocus={handlePrefetch("/home")}
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
            onClick={() => navigate("/pools")}
            onMouseEnter={handlePrefetch("/pools")}
            onFocus={handlePrefetch("/pools")}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isPoolsActive()
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-xs font-medium">Pools</span>
          </button>
          
          <button
            onClick={() => navigate("/profile")}
            onMouseEnter={handlePrefetch("/profile")}
            onFocus={handlePrefetch("/profile")}
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
