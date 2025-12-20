import { cn } from "@/lib/utils";
import { JerseyConfig, DEFAULT_JERSEY_CONFIG, StripeConfig } from "./types";

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
  
  // Jersey body path - classic rugby shape with rounded corners and angled sleeves
  const jerseyBodyPath = `
    M 60 55
    L 100 45
    L 140 55
    L 175 75
    L 175 95
    L 155 90
    L 155 165
    Q 155 175 145 175
    L 55 175
    Q 45 175 45 165
    L 45 90
    L 25 95
    L 25 75
    Z
  `;

  // Left sleeve path
  const leftSleevePath = `
    M 25 75
    L 60 55
    L 60 70
    L 45 90
    L 25 95
    Z
  `;

  // Right sleeve path  
  const rightSleevePath = `
    M 175 75
    L 140 55
    L 140 70
    L 155 90
    L 175 95
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

  // Sleeve band stripes
  const renderSleeveBands = () => {
    if (config.sleeveTrimColor === config.baseColor) return null;
    
    return (
      <>
        {/* Left sleeve bands */}
        <path
          d="M 25 85 L 45 80 L 45 88 L 25 92 Z"
          fill={config.sleeveTrimColor}
        />
        
        {/* Right sleeve bands */}
        <path
          d="M 175 85 L 155 80 L 155 88 L 175 92 Z"
          fill={config.sleeveTrimColor}
        />
      </>
    );
  };

  // Polo collar with placket
  const renderPoloCollar = () => (
    <>
      {/* Collar back shadow */}
      <path
        d="M 75 48 L 100 42 L 125 48 L 125 52 L 100 46 L 75 52 Z"
        fill="rgba(0,0,0,0.15)"
      />
      
      {/* Left collar wing */}
      <path
        d="M 75 45 L 95 48 L 95 58 L 85 68 L 75 55 Z"
        fill={config.collarColor}
      />
      
      {/* Right collar wing */}
      <path
        d="M 125 45 L 105 48 L 105 58 L 115 68 L 125 55 Z"
        fill={config.collarColor}
      />
      
      {/* Collar inner shadow */}
      <path
        d="M 85 68 L 95 58 L 95 70 L 90 75 Z"
        fill="rgba(0,0,0,0.1)"
      />
      <path
        d="M 115 68 L 105 58 L 105 70 L 110 75 Z"
        fill="rgba(0,0,0,0.1)"
      />
      
      {/* Placket */}
      <path
        d="M 95 58 L 100 55 L 105 58 L 105 80 L 100 85 L 95 80 Z"
        fill={config.collarColor}
      />
      
      {/* Placket shadow */}
      <path
        d="M 100 55 L 105 58 L 105 80 L 100 85 Z"
        fill="rgba(0,0,0,0.08)"
      />
      
      {/* Placket inner shadow */}
      <path
        d="M 97 62 L 100 60 L 103 62 L 103 78 L 100 80 L 97 78 Z"
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
        d="M 70 50 L 100 44 L 130 50 L 125 55 L 100 50 L 75 55 Z"
        fill={config.collarColor}
      />
      
      {/* V-neck opening */}
      <path
        d="M 85 55 L 100 52 L 115 55 L 100 85 Z"
        fill={config.collarColor}
      />
      
      {/* Inner shadow */}
      <path
        d="M 100 52 L 115 55 L 100 85 Z"
        fill="rgba(0,0,0,0.1)"
      />
      
      {/* Inner neck darkness */}
      <path
        d="M 90 60 L 100 57 L 110 60 L 100 78 Z"
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
