import { useState, useRef, useCallback, useEffect } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (isRefreshing || e.touches.length !== 1) return;
      const el = containerRef.current;
      if (!el || el.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    },
    [isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!pulling.current || isRefreshing || e.touches.length !== 1) return;

      const el = containerRef.current;
      if (!el || el.scrollTop > 0) {
        pulling.current = false;
        setPullDistance(0);
        return;
      }

      const deltaY = e.touches[0].clientY - startY.current;

      if (deltaY <= 0) {
        setPullDistance(0);
        return;
      }

      const dampened = Math.min(Math.sqrt(deltaY) * 4, maxPull);
      setPullDistance(dampened);

      if (dampened > 10) {
        e.preventDefault();
      }
    },
    [isRefreshing, maxPull]
  );

  const finishPull = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.6);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
      return;
    }

    setPullDistance(0);
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  const handleTouchEnd = useCallback(() => {
    void finishPull();
  }, [finishPull]);

  const handleTouchCancel = useCallback(() => {
    pulling.current = false;
    setPullDistance(0);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);
    el.addEventListener("touchcancel", handleTouchCancel);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  return { containerRef, pullDistance, isRefreshing };
}
