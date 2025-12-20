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
  
  // Main jersey body - boxy with rounded bottom corners
  const jerseyBodyPath = `
    M 50 62
    L 50 168
    Q 50 178 60 178
    L 140 178
    Q 150 178 150 168
    L 150 62
    L 100 50
    Z
  `;

  // Left sleeve - wide, boxy, angled ~12° downward
  const leftSleevePath = `
    M 50 62
    L 100 50
    L 100 55
    L 58 65
    L 20 80
    L 20 110
    Q 20 115 25 115
    L 50 108
    Z
  `;

  // Right sleeve - mirror of left
  const rightSleevePath = `
    M 150 62
    L 100 50
    L 100 55
    L 142 65
    L 180 80
    L 180 110
    Q 180 115 175 115
    L 150 108
    Z
  `;

  // Shoulder seam line Y position - stripes must stay below this
  const shoulderLineY = 65;

  // Render stripes based on layout
  const renderStripes = (stripes: StripeConfig[], layout: string) => {
    if (!stripes || stripes.length === 0) return null;
    const sortedStripes = [...stripes].sort((a, b) => a.order - b.order);
    
    if (layout === "horizontal_stripes") {
      const stripeAreaTop = shoulderLineY + 5;
      const stripeAreaBottom = 175;
      const stripeAreaHeight = stripeAreaBottom - stripeAreaTop;
      
      const totalStripes = sortedStripes.length;
      const stripeHeight = stripeAreaHeight / (totalStripes * 2 + 1);
      
      return sortedStripes.map((stripe, index) => {
        const y = stripeAreaTop + stripeHeight + (index * stripeHeight * 2);
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
      const bodyWidth = 100;
      const stripeWidth = bodyWidth / (sortedStripes.length * 2 + 1);
      
      return sortedStripes.map((stripe, index) => {
        const x = 50 + stripeWidth + (index * stripeWidth * 2);
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

  // Get sleeve bands configuration
  const getSleeveBands = (): SleeveBandConfig[] => {
    if (config.sleeveBands && config.sleeveBands.length > 0) {
      return [...config.sleeveBands].sort((a, b) => a.order - b.order);
    }
    if (config.sleeveTrimColor && config.sleeveTrimColor !== config.baseColor) {
      return [{ color: config.sleeveTrimColor, order: 0 }];
    }
    return [];
  };

  // Render horizontal sleeve bands
  const renderSleeveBands = () => {
    const bands = getSleeveBands();
    if (bands.length === 0) return null;

    const bandHeight = 8;
    const bandGap = 2;
    const sleeveBottomY = 108;

    return (
      <>
        {bands.map((band, index) => {
          const offset = index * (bandHeight + bandGap);
          const bottomY = sleeveBottomY - offset;
          const topY = bottomY - bandHeight;
          
          return (
            <g key={`band-${index}`}>
              {/* Left sleeve band */}
              <path
                d={`M 20 ${94 - offset - bandHeight * 0.3} L 50 ${topY - 6} L 50 ${bottomY - 6} L 20 ${94 - offset + bandHeight * 0.7} Z`}
                fill={band.color}
              />
              {/* Right sleeve band */}
              <path
                d={`M 180 ${94 - offset - bandHeight * 0.3} L 150 ${topY - 6} L 150 ${bottomY - 6} L 180 ${94 - offset + bandHeight * 0.7} Z`}
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
      {/* Collar back (inner neck) */}
      <path
        d="M 80 52 L 100 46 L 120 52 L 118 56 L 100 51 L 82 56 Z"
        fill="rgba(0,0,0,0.12)"
      />
      
      {/* Left collar wing */}
      <path
        d="M 72 55 L 95 52 L 95 60 L 84 70 L 72 62 Z"
        fill={config.collarColor}
      />
      <path
        d="M 84 70 L 95 60 L 95 62 L 86 71 Z"
        fill="rgba(0,0,0,0.08)"
      />
      
      {/* Right collar wing */}
      <path
        d="M 128 55 L 105 52 L 105 60 L 116 70 L 128 62 Z"
        fill={config.collarColor}
      />
      <path
        d="M 116 70 L 105 60 L 105 62 L 114 71 Z"
        fill="rgba(0,0,0,0.08)"
      />
      
      {/* Placket */}
      <path
        d="M 95 60 L 100 56 L 105 60 L 105 82 L 100 86 L 95 82 Z"
        fill={config.collarColor}
      />
      <path
        d="M 100 56 L 105 60 L 105 82 L 100 86 Z"
        fill="rgba(0,0,0,0.06)"
      />
      <path
        d="M 97 62 L 100 59 L 103 62 L 103 78 L 100 82 L 97 78 Z"
        fill="rgba(0,0,0,0.15)"
      />
    </>
  );

  // V-neck collar
  const renderVNeckCollar = () => (
    <>
      {/* Collar rim */}
      <path
        d="M 68 56 L 100 48 L 132 56 L 128 62 L 100 55 L 72 62 Z"
        fill={config.collarColor}
      />
      <path
        d="M 100 48 L 132 56 L 128 62 L 100 55 Z"
        fill="rgba(0,0,0,0.05)"
      />
      
      {/* V-neck opening */}
      <path
        d="M 82 62 L 100 56 L 118 62 L 100 92 Z"
        fill={config.collarColor}
      />
      <path
        d="M 100 56 L 118 62 L 100 92 Z"
        fill="rgba(0,0,0,0.08)"
      />
      
      {/* Inner neck shadows */}
      <path
        d="M 88 66 L 100 61 L 112 66 L 100 85 Z"
        fill="rgba(0,0,0,0.18)"
      />
      <path
        d="M 93 70 L 100 66 L 107 70 L 100 80 Z"
        fill="rgba(0,0,0,0.12)"
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
          <clipPath id={`jersey-clip-${uniqueId}`}>
            <path d={jerseyBodyPath} />
            <path d={leftSleevePath} />
            <path d={rightSleevePath} />
          </clipPath>
          
          <linearGradient id={`body-gradient-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
            <stop offset="40%" stopColor="rgba(255,255,255,0.02)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.06)" />
          </linearGradient>
          
          <linearGradient id={`hem-shadow-${uniqueId}`} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="85%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.08)" />
          </linearGradient>
        </defs>
        
        {/* Jersey body */}
        <path d={jerseyBodyPath} fill={config.baseColor} />
        
        {/* Sleeves */}
        <path d={leftSleevePath} fill={config.baseColor} />
        <path d={rightSleevePath} fill={config.baseColor} />
        
        {/* Stripes */}
        <g clipPath={`url(#jersey-clip-${uniqueId})`}>
          {renderStripes(config.stripes, config.layout)}
        </g>
        
        {/* Sleeve bands */}
        {renderSleeveBands()}
        
        {/* Gradient overlays */}
        <path d={jerseyBodyPath} fill={`url(#body-gradient-${uniqueId})`} />
        <path d={leftSleevePath} fill={`url(#body-gradient-${uniqueId})`} />
        <path d={rightSleevePath} fill={`url(#body-gradient-${uniqueId})`} />
        
        {/* Hem shadow */}
        <path d={jerseyBodyPath} fill={`url(#hem-shadow-${uniqueId})`} />
        
        {/* Collar */}
        {config.collarStyle === "polo" ? renderPoloCollar() : renderVNeckCollar()}
        
        {/* Sleeve edge shadows */}
        <path d="M 20 80 L 22 81 L 22 108 L 20 110 Z" fill="rgba(0,0,0,0.04)" />
        <path d="M 180 80 L 178 81 L 178 108 L 180 110 Z" fill="rgba(0,0,0,0.04)" />
      </svg>
    </div>
  );
}

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
