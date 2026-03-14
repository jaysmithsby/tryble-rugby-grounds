import { useNavigate, useLocation } from "react-router-dom";
import { Home, CalendarDays, Users, Trophy, School } from "lucide-react";
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
    <nav className="fixed bottom-0 left-0 right-0 border-t border-nav-bar/20 bg-nav-bar backdrop-blur-sm z-50">
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
            onClick={() => navigate("/fixtures")}
            onMouseEnter={handlePrefetch("/fixtures")}
            onFocus={handlePrefetch("/fixtures")}
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
            onClick={() => navigate("/logs")}
            onMouseEnter={handlePrefetch("/logs")}
            onFocus={handlePrefetch("/logs")}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive("/logs")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trophy className="w-5 h-5" />
            <span className="text-xs font-medium">Logs</span>
          </button>
          
          <button
            onClick={() => navigate("/schools")}
            onMouseEnter={handlePrefetch("/schools")}
            onFocus={handlePrefetch("/schools")}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive("/schools")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <School className="w-5 h-5" />
            <span className="text-xs font-medium">Discover</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
