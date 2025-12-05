import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SchoolJerseyImageProps {
  src?: string | null;
  alt: string;
  fallbackText: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "accent";
  priority?: boolean;
  className?: string;
  containerClassName?: string;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
}

const sizeClasses = {
  sm: "w-12 h-12",
  md: "w-14 h-14",
  lg: "w-20 h-20",
};

const paddingClasses = {
  sm: "p-1",
  md: "p-1",
  lg: "p-2",
};

const textSizeClasses = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
};

export const SchoolJerseyImage = ({
  src,
  alt,
  fallbackText,
  size = "md",
  variant = "primary",
  priority = false,
  className,
  containerClassName,
  onClick,
  disabled = false,
}: SchoolJerseyImageProps) => {
  const [imageState, setImageState] = useState<"loading" | "loaded" | "error">(
    src ? "loading" : "error"
  );
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  // Preload image when src changes
  useEffect(() => {
    if (!src) {
      setImageState("error");
      setImageSrc(null);
      return;
    }

    setImageState("loading");
    
    const img = new Image();
    
    // Set priority hint for above-the-fold images
    if (priority) {
      img.fetchPriority = "high";
    }
    
    img.onload = () => {
      setImageSrc(src);
      setImageState("loaded");
    };
    
    img.onerror = () => {
      setImageState("error");
      setImageSrc(null);
    };
    
    img.src = src;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, priority]);

  const variantColors = {
    primary: {
      bg: "bg-primary/20",
      border: "border-primary",
      text: "text-primary",
      shimmer: "from-primary/5 via-primary/10 to-primary/5",
    },
    accent: {
      bg: "bg-accent/20",
      border: "border-accent",
      text: "text-accent",
      shimmer: "from-accent/5 via-accent/10 to-accent/5",
    },
  };

  const colors = variantColors[variant];

  const containerClass = cn(
    sizeClasses[size],
    "rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center border overflow-hidden transition-all relative",
    colors.border,
    onClick && !disabled && "cursor-pointer hover:ring-2 hover:ring-primary",
    containerClassName
  );

  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      disabled={disabled}
      className={containerClass}
      type={onClick ? "button" : undefined}
    >
      {/* Shimmer placeholder */}
      {imageState === "loading" && (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-r animate-pulse",
            colors.shimmer
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        </div>
      )}

      {/* Loaded image */}
      {imageState === "loaded" && imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={cn(
            "w-full h-full object-contain animate-fade-in",
            paddingClasses[size],
            className
          )}
          loading={priority ? "eager" : "lazy"}
        />
      )}

      {/* Fallback text */}
      {imageState === "error" && (
        <span className={cn("font-bold", textSizeClasses[size], colors.text)}>
          {fallbackText}
        </span>
      )}
    </Component>
  );
};

// Image preloader hook for batch preloading
export const usePreloadJerseyImages = (urls: (string | null | undefined)[]) => {
  useEffect(() => {
    const validUrls = urls.filter((url): url is string => !!url);
    
    validUrls.forEach((url) => {
      const img = new Image();
      img.fetchPriority = "high";
      img.src = url;
    });
  }, [urls]);
};
