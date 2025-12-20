import { cn } from "@/lib/utils";
import { JerseyConfig, DEFAULT_JERSEY_CONFIG, StripeConfig, SleeveBandConfig } from "./types";

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

// Helper to generate unique IDs for SVG defs
const generateId = () => Math.random().toString(36).substr(2, 9);

export function JerseyPreview({ 
  config = DEFAULT_JERSEY_CONFIG, 
  size = "lg",
  className 
}: JerseyPreviewProps) {
  const { width, height } = sizeMap[size];
  const viewBox = "0 0 200 200";
  const uniqueId = generateId();
  
  // Jersey body path - classic rugby shape with rounded corners and wider angled sleeves
  const jerseyBodyPath = `
    M 60 55
    L 100 45
    L 140 55
    L 180 70
    L 180 100
    L 155 95
    L 155 165
    Q 155 175 145 175
    L 55 175
    Q 45 175 45 165
    L 45 95
    L 20 100
    L 20 70
    Z
  `;

  // Left sleeve path - wider, boxy with slight angle
  const leftSleevePath = `
    M 20 70
    L 60 55
    L 60 75
    L 45 95
    L 20 100
    Z
  `;

  // Right sleeve path - wider, boxy with slight angle
  const rightSleevePath = `
    M 180 70
    L 140 55
    L 140 75
    L 155 95
    L 180 100
    Z
  `;

  // Render stripes based on layout
  const renderStripes = (stripes: StripeConfig[], layout: string) => {
    if (!stripes || stripes.length === 0) return null;
    const sortedStripes = [...stripes].sort((a, b) => a.order - b.order);
    
    if (layout === "horizontal_stripes") {
      // Full-width horizontal stripes across the jersey body
      const bodyHeight = 120; // From y=55 to y=175
      const stripeHeight = bodyHeight / (sortedStripes.length * 2 + 1);
      
      return sortedStripes.map((stripe, index) => {
        const y = 55 + stripeHeight + (index * stripeHeight * 2);
        return (
          <rect
            key={`stripe-${index}`}
            x="0"
            y={y}
            width="200"
            height={stripeHeight}
            fill={stripe.color}
          />
        );
      });
    }
    
    if (layout === "vertical_stripes") {
      const bodyWidth = 110; // From x=45 to x=155
      const stripeWidth = bodyWidth / (sortedStripes.length * 2 + 1);
      
      return sortedStripes.map((stripe, index) => {
        const x = 45 + stripeWidth + (index * stripeWidth * 2);
        return (
          <rect
            key={`stripe-${index}`}
            x={x}
            y="0"
            width={stripeWidth}
            height="200"
            fill={stripe.color}
          />
        );
      });
    }
    
    return null;
  };

  // Get sleeve bands - use new sleeveBands array or fallback to legacy sleeveTrimColor
  const getSleeveBands = (): SleeveBandConfig[] => {
    if (config.sleeveBands && config.sleeveBands.length > 0) {
      return [...config.sleeveBands].sort((a, b) => a.order - b.order);
    }
    // Fallback for legacy configs
    if (config.sleeveTrimColor && config.sleeveTrimColor !== config.baseColor) {
      return [{ color: config.sleeveTrimColor, order: 0 }];
    }
    return [];
  };

  // Render multiple sleeve bands (up to 3) - horizontal bands across sleeves
  const renderSleeveBands = () => {
    const bands = getSleeveBands();
    if (bands.length === 0) return null;

    const bandHeight = 6;
    const bandGap = 3;
    const startY = 72;

    return (
      <>
        {bands.map((band, index) => {
          const yOffset = index * (bandHeight + bandGap);
          const y = startY + yOffset;
          return (
            <g key={`band-${index}`}>
              {/* Left sleeve band - horizontal */}
              <path
                d={`M 20 ${y + 15 + yOffset * 0.3} L 58 ${y} L 58 ${y + bandHeight} L 20 ${y + 15 + bandHeight + yOffset * 0.3} Z`}
                fill={band.color}
              />
              {/* Right sleeve band - horizontal */}
              <path
                d={`M 180 ${y + 15 + yOffset * 0.3} L 142 ${y} L 142 ${y + bandHeight} L 180 ${y + 15 + bandHeight + yOffset * 0.3} Z`}
                fill={band.color}
              />
            </g>
          );
        })}
      </>
    );
  };

  // Polo collar with placket
  const renderPoloCollar = () => (
    <>
      {/* Collar back shadow */}
      <path
        d="M 78 48 L 100 42 L 122 48 L 122 52 L 100 46 L 78 52 Z"
        fill="rgba(0,0,0,0.15)"
      />
      
      {/* Left collar wing */}
      <path
        d="M 78 45 L 96 48 L 96 58 L 87 66 L 78 54 Z"
        fill={config.collarColor}
      />
      
      {/* Right collar wing */}
      <path
        d="M 122 45 L 104 48 L 104 58 L 113 66 L 122 54 Z"
        fill={config.collarColor}
      />
      
      {/* Collar inner shadow */}
      <path
        d="M 87 66 L 96 58 L 96 68 L 91 73 Z"
        fill="rgba(0,0,0,0.1)"
      />
      <path
        d="M 113 66 L 104 58 L 104 68 L 109 73 Z"
        fill="rgba(0,0,0,0.1)"
      />
      
      {/* Placket */}
      <path
        d="M 96 58 L 100 55 L 104 58 L 104 78 L 100 83 L 96 78 Z"
        fill={config.collarColor}
      />
      
      {/* Placket shadow */}
      <path
        d="M 100 55 L 104 58 L 104 78 L 100 83 Z"
        fill="rgba(0,0,0,0.08)"
      />
      
      {/* Placket inner shadow */}
      <path
        d="M 97.5 61 L 100 59 L 102.5 61 L 102.5 75 L 100 78 L 97.5 75 Z"
        fill={config.baseColor}
        opacity="0.4"
      />
    </>
  );

  // V-neck collar
  const renderVNeckCollar = () => (
    <>
      {/* Collar back/rim */}
      <path
        d="M 73 50 L 100 44 L 127 50 L 123 55 L 100 50 L 77 55 Z"
        fill={config.collarColor}
      />
      
      {/* V-neck opening */}
      <path
        d="M 86 55 L 100 52 L 114 55 L 100 82 Z"
        fill={config.collarColor}
      />
      
      {/* Inner shadow */}
      <path
        d="M 100 52 L 114 55 L 100 82 Z"
        fill="rgba(0,0,0,0.1)"
      />
      
      {/* Inner neck darkness */}
      <path
        d="M 91 59 L 100 56 L 109 59 L 100 76 Z"
        fill="rgba(0,0,0,0.2)"
      />
    </>
  );

  return (
    <div 
      className={cn(
        "flex items-center justify-center",
        className
      )}
      style={{ width, height }}
    >
      <svg 
        viewBox={viewBox} 
        width={width} 
        height={height}
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Jersey body clip path */}
          <clipPath id={`jersey-clip-${uniqueId}`}>
            <path d={jerseyBodyPath} />
            <path d={leftSleevePath} />
            <path d={rightSleevePath} />
          </clipPath>
          
          {/* Top-left lighting gradient for body */}
          <linearGradient id={`body-gradient-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.08)" />
          </linearGradient>
          
          {/* Subtle inner shadow for depth */}
          <linearGradient id={`inner-shadow-${uniqueId}`} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.05)" />
            <stop offset="10%" stopColor="rgba(0,0,0,0)" />
            <stop offset="90%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
          </linearGradient>
        </defs>
        
        {/* Base jersey body */}
        <path d={jerseyBodyPath} fill={config.baseColor} />
        
        {/* Sleeves */}
        <path d={leftSleevePath} fill={config.baseColor} />
        <path d={rightSleevePath} fill={config.baseColor} />
        
        {/* Stripes clipped to jersey */}
        <g clipPath={`url(#jersey-clip-${uniqueId})`}>
          {renderStripes(config.stripes, config.layout)}
        </g>
        
        {/* Sleeve bands */}
        {renderSleeveBands()}
        
        {/* Top-left lighting gradient overlay */}
        <path d={jerseyBodyPath} fill={`url(#body-gradient-${uniqueId})`} />
        <path d={leftSleevePath} fill={`url(#body-gradient-${uniqueId})`} />
        <path d={rightSleevePath} fill={`url(#body-gradient-${uniqueId})`} />
        
        {/* Inner shadow for depth */}
        <path d={jerseyBodyPath} fill={`url(#inner-shadow-${uniqueId})`} />
        
        {/* Collar - render based on style */}
        {config.collarStyle === "polo" ? renderPoloCollar() : renderVNeckCollar()}
        
        {/* Hem shadow */}
        <path
          d="M 55 170 Q 100 175 145 170 L 145 175 Q 100 180 55 175 Z"
          fill="rgba(0,0,0,0.08)"
        />
        
        {/* Sleeve edge shadows for depth */}
        <path d="M 20 70 L 20 100 L 22 99 L 22 71 Z" fill="rgba(0,0,0,0.06)" />
        <path d="M 180 70 L 180 100 L 178 99 L 178 71 Z" fill="rgba(0,0,0,0.06)" />
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
