import { cn } from "@/lib/utils";
import { JerseyConfig, DEFAULT_JERSEY_CONFIG } from "./types";

interface JerseyPreviewProps {
  config: JerseyConfig;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: { width: 48, height: 48 },
  md: { width: 64, height: 64 },
  lg: { width: 96, height: 96 },
  xl: { width: 128, height: 128 },
};

export function JerseyPreview({ 
  config = DEFAULT_JERSEY_CONFIG, 
  size = "lg",
  className 
}: JerseyPreviewProps) {
  const { width, height } = sizeMap[size];
  const viewBox = "0 0 100 100";
  
  // Generate stripes pattern
  const renderStripes = () => {
    if (!config.stripes || config.stripes.length === 0) return null;
    
    const sortedStripes = [...config.stripes].sort((a, b) => a.order - b.order);
    
    if (config.layout === "horizontal_stripes") {
      const stripeHeight = 60 / (sortedStripes.length + 1);
      return sortedStripes.map((stripe, index) => (
        <rect
          key={index}
          x="15"
          y={25 + (index + 1) * stripeHeight - stripeHeight / 2}
          width="70"
          height={stripeHeight * 0.8}
          fill={stripe.color}
          rx="1"
        />
      ));
    }
    
    if (config.layout === "vertical_stripes") {
      const stripeWidth = 60 / (sortedStripes.length + 1);
      return sortedStripes.map((stripe, index) => (
        <rect
          key={index}
          x={20 + (index + 1) * stripeWidth - stripeWidth / 2}
          y="20"
          width={stripeWidth * 0.8}
          height="60"
          fill={stripe.color}
          rx="1"
        />
      ));
    }
    
    return null;
  };

  return (
    <div 
      className={cn(
        "rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center border border-primary overflow-hidden",
        className
      )}
      style={{ width, height }}
    >
      <svg 
        viewBox={viewBox} 
        width={width * 0.75} 
        height={height * 0.75}
        className="drop-shadow-sm"
      >
        {/* Jersey body - main shape with rounded shoulders */}
        <path
          d={`
            M 30 20
            Q 30 15 35 15
            L 50 10
            L 65 15
            Q 70 15 70 20
            L 85 30
            L 85 40
            L 70 35
            L 70 85
            Q 70 90 65 90
            L 35 90
            Q 30 90 30 85
            L 30 35
            L 15 40
            L 15 30
            Z
          `}
          fill={config.baseColor}
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="0.5"
        />
        
        {/* Stripes overlay */}
        <clipPath id="jersey-clip">
          <path
            d={`
              M 30 20
              Q 30 15 35 15
              L 50 10
              L 65 15
              Q 70 15 70 20
              L 85 30
              L 85 40
              L 70 35
              L 70 85
              Q 70 90 65 90
              L 35 90
              Q 30 90 30 85
              L 30 35
              L 15 40
              L 15 30
              Z
            `}
          />
        </clipPath>
        
        <g clipPath="url(#jersey-clip)">
          {renderStripes()}
        </g>
        
        {/* Collar */}
        <ellipse
          cx="50"
          cy="15"
          rx="8"
          ry="4"
          fill={config.collarColor}
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="0.5"
        />
        
        {/* Left sleeve trim */}
        <path
          d={`M 15 30 L 30 20 L 30 24 L 17 33 Z`}
          fill={config.sleeveTrimColor}
          opacity="0.9"
        />
        
        {/* Right sleeve trim */}
        <path
          d={`M 85 30 L 70 20 L 70 24 L 83 33 Z`}
          fill={config.sleeveTrimColor}
          opacity="0.9"
        />
        
        {/* Subtle 3D effect - highlight */}
        <path
          d={`
            M 30 20
            Q 30 15 35 15
            L 50 10
            L 50 85
            L 35 85
            Q 30 85 30 80
            Z
          `}
          fill="rgba(255,255,255,0.08)"
        />
        
        {/* Subtle 3D effect - shadow */}
        <path
          d={`
            M 70 20
            Q 70 15 65 15
            L 50 10
            L 50 85
            L 65 85
            Q 70 85 70 80
            Z
          `}
          fill="rgba(0,0,0,0.05)"
        />
      </svg>
    </div>
  );
}

// Standalone preview for use across the app (e.g., fixture cards)
export function JerseyIcon({ 
  config, 
  size = "sm",
  className 
}: { 
  config?: JerseyConfig | null; 
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  if (!config) return null;
  
  return (
    <JerseyPreview 
      config={config} 
      size={size} 
      className={className}
    />
  );
}
