import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export const PullToRefreshIndicator = ({
  pullDistance,
  isRefreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) => {
  if (pullDistance === 0 && !isRefreshing) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
      style={{ height: pullDistance }}
    >
      <RefreshCw
        className={cn(
          "h-5 w-5 text-primary transition-opacity",
          isRefreshing && "animate-spin",
          progress < 0.3 && "opacity-30"
        )}
        style={!isRefreshing ? { transform: `rotate(${rotation}deg)` } : undefined}
      />
    </div>
  );
};
