import { useRef, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const TAB_ROUTES = ["/home", "/fixtures", "/pools", "/schools"];
const SWIPE_THRESHOLD = 60;
const SWIPE_MAX_Y = 80; // ignore if vertical swipe is too large

/**
 * Hook that enables horizontal swipe navigation between bottom-nav tabs
 * and swipe-right-from-edge to go back.
 */
export function useSwipeNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const startX = useRef(0);
  const startY = useRef(0);
  const swiping = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    swiping.current = true;
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!swiping.current) return;
      swiping.current = false;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - startX.current;
      const deltaY = Math.abs(endY - startY.current);

      // Ignore if vertical movement is larger (user is scrolling)
      if (deltaY > SWIPE_MAX_Y || Math.abs(deltaX) < SWIPE_THRESHOLD) return;

      const currentTabIndex = TAB_ROUTES.indexOf(location.pathname);

      if (currentTabIndex >= 0) {
        // On a tab route — swipe between tabs
        if (deltaX < -SWIPE_THRESHOLD && currentTabIndex < TAB_ROUTES.length - 1) {
          // Swipe left → next tab
          navigate(TAB_ROUTES[currentTabIndex + 1]);
        } else if (deltaX > SWIPE_THRESHOLD && currentTabIndex > 0) {
          // Swipe right → previous tab
          navigate(TAB_ROUTES[currentTabIndex - 1]);
        }
      } else {
        // On a non-tab route — swipe right from left edge to go back
        if (deltaX > SWIPE_THRESHOLD && startX.current < 40) {
          navigate(-1);
        }
      }
    },
    [location.pathname, navigate]
  );

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd);
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);
}
