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

// Generate unique IDs for SVG defs to avoid conflicts
const generateId = () => Math.random().toString(36).substr(2, 9);

// ============ GEOMETRY CONSTANTS ============
const VIEWBOX_SIZE = 200;

const BODY = {
  topCenter: { x: 100, y: 48 },
  shoulderLeft: { x: 52, y: 58 },
  shoulderRight: { x: 148, y: 58 },
  waistLeft: { x: 50, y: 170 },
  waistRight: { x: 150, y: 170 },
  hemLeft: { x: 58, y: 178 },
  hemRight: { x: 142, y: 178 },
};

const SLEEVE = {
  leftTop: { x: 52, y: 58 },
  leftOuter: { x: 18, y: 75 },
  leftBottom: { x: 22, y: 108 },
  leftInner: { x: 50, y: 100 },
  rightTop: { x: 148, y: 58 },
  rightOuter: { x: 182, y: 75 },
  rightBottom: { x: 178, y: 108 },
  rightInner: { x: 150, y: 100 },
  bandStartY: 105,
  bandHeight: 7,
  bandGap: 3,
};

const STRIPE_ZONE = {
  top: 72,
  bottom: 172,
};

// ============ PATH GENERATORS ============

function getJerseyBodyPath(): string {
  return `
    M ${BODY.topCenter.x} ${BODY.topCenter.y}
    L ${BODY.shoulderLeft.x} ${BODY.shoulderLeft.y}
    L ${BODY.waistLeft.x} ${BODY.waistLeft.y}
    Q ${BODY.waistLeft.x} ${BODY.hemLeft.y} ${BODY.hemLeft.x} ${BODY.hemLeft.y}
    L ${BODY.hemRight.x} ${BODY.hemRight.y}
    Q ${BODY.waistRight.x} ${BODY.hemRight.y} ${BODY.waistRight.x} ${BODY.waistRight.y}
    L ${BODY.shoulderRight.x} ${BODY.shoulderRight.y}
    Z
  `;
}

function getLeftSleevePath(): string {
  return `
    M ${SLEEVE.leftTop.x} ${SLEEVE.leftTop.y}
    L ${SLEEVE.leftOuter.x} ${SLEEVE.leftOuter.y}
    Q ${SLEEVE.leftOuter.x - 2} ${SLEEVE.leftBottom.y + 2} ${SLEEVE.leftBottom.x} ${SLEEVE.leftBottom.y}
    L ${SLEEVE.leftInner.x} ${SLEEVE.leftInner.y}
    Z
  `;
}

function getRightSleevePath(): string {
  return `
    M ${SLEEVE.rightTop.x} ${SLEEVE.rightTop.y}
    L ${SLEEVE.rightOuter.x} ${SLEEVE.rightOuter.y}
    Q ${SLEEVE.rightOuter.x + 2} ${SLEEVE.rightBottom.y + 2} ${SLEEVE.rightBottom.x} ${SLEEVE.rightBottom.y}
    L ${SLEEVE.rightInner.x} ${SLEEVE.rightInner.y}
    Z
  `;
}

export function JerseyPreview({ 
  config = DEFAULT_JERSEY_CONFIG, 
  size = "lg",
  className 
}: JerseyPreviewProps) {
  const { width, height } = sizeMap[size];
  const uniqueId = generateId();
  
  const jerseyBodyPath = getJerseyBodyPath();
  const leftSleevePath = getLeftSleevePath();
  const rightSleevePath = getRightSleevePath();

  // ============ STRIPE RENDERING ============
  const renderStripes = () => {
    if (!config.stripes || config.stripes.length === 0) return null;
    const sortedStripes = [...config.stripes].sort((a, b) => a.order - b.order);
    
    if (config.layout === "horizontal_stripes") {
      const zoneHeight = STRIPE_ZONE.bottom - STRIPE_ZONE.top;
      const totalStripes = sortedStripes.length;
      const stripeHeight = zoneHeight / (totalStripes * 2 + 1);
      
      return sortedStripes.map((stripe, index) => {
        const y = STRIPE_ZONE.top + stripeHeight + (index * stripeHeight * 2);
        return (
          <rect
            key={`stripe-${index}`}
            x="0"
            y={y}
            width={VIEWBOX_SIZE}
            height={stripeHeight}
            fill={stripe.color}
          />
        );
      });
    }
    
    if (config.layout === "vertical_stripes") {
      const bodyWidth = BODY.waistRight.x - BODY.waistLeft.x;
      const stripeWidth = bodyWidth / (sortedStripes.length * 2 + 1);
      
      return sortedStripes.map((stripe, index) => {
        const x = BODY.waistLeft.x + stripeWidth + (index * stripeWidth * 2);
        return (
          <rect
            key={`stripe-${index}`}
            x={x}
            y="0"
            width={stripeWidth}
            height={VIEWBOX_SIZE}
            fill={stripe.color}
          />
        );
      });
    }
    
    return null;
  };

  // ============ SLEEVE BAND RENDERING ============
  const getSleeveBands = (): SleeveBandConfig[] => {
    if (config.sleeveBands && config.sleeveBands.length > 0) {
      return [...config.sleeveBands].sort((a, b) => a.order - b.order);
    }
    if (config.sleeveTrimColor && config.sleeveTrimColor !== config.baseColor) {
      return [{ color: config.sleeveTrimColor, order: 0 }];
    }
    return [];
  };

  const renderSleeveBands = () => {
    const bands = getSleeveBands();
    if (bands.length === 0) return null;

    return (
      <>
        {bands.map((band, index) => {
          const offset = index * (SLEEVE.bandHeight + SLEEVE.bandGap);
          const bottomY = SLEEVE.bandStartY - offset;
          const topY = bottomY - SLEEVE.bandHeight;
          
          const leftBandPath = `
            M ${SLEEVE.leftOuter.x + 4} ${topY - 12}
            L ${SLEEVE.leftInner.x - 2} ${topY - 4}
            L ${SLEEVE.leftInner.x - 2} ${bottomY - 4}
            L ${SLEEVE.leftOuter.x + 4} ${bottomY - 12}
            Z
          `;
          
          const rightBandPath = `
            M ${SLEEVE.rightOuter.x - 4} ${topY - 12}
            L ${SLEEVE.rightInner.x + 2} ${topY - 4}
            L ${SLEEVE.rightInner.x + 2} ${bottomY - 4}
            L ${SLEEVE.rightOuter.x - 4} ${bottomY - 12}
            Z
          `;
          
          return (
            <g key={`band-${index}`}>
              <path d={leftBandPath} fill={band.color} />
              <path d={rightBandPath} fill={band.color} />
            </g>
          );
        })}
      </>
    );
  };

  // ============ COLLAR RENDERING ============
  const renderPoloCollar = () => (
    <>
      {/* Inner neck shadow */}
      <path
        d="M 82 52 L 100 46 L 118 52 L 115 58 L 100 53 L 85 58 Z"
        fill="rgba(0,0,0,0.15)"
      />
      
      {/* Left collar wing */}
      <path
        d="M 70 54 L 96 50 L 96 58 L 82 68 L 70 60 Z"
        fill={config.collarColor}
      />
      <path
        d="M 82 68 L 96 58 L 96 60 L 84 69 Z"
        fill="rgba(0,0,0,0.1)"
      />
      
      {/* Right collar wing */}
      <path
        d="M 130 54 L 104 50 L 104 58 L 118 68 L 130 60 Z"
        fill={config.collarColor}
      />
      <path
        d="M 118 68 L 104 58 L 104 60 L 116 69 Z"
        fill="rgba(0,0,0,0.1)"
      />
      
      {/* Central placket */}
      <path
        d="M 96 58 L 100 54 L 104 58 L 104 78 L 100 82 L 96 78 Z"
        fill={config.collarColor}
      />
      <path
        d="M 100 54 L 104 58 L 104 78 L 100 82 Z"
        fill="rgba(0,0,0,0.08)"
      />
      <path
        d="M 98 60 L 100 58 L 102 60 L 102 74 L 100 77 L 98 74 Z"
        fill="rgba(0,0,0,0.18)"
      />
    </>
  );

  const renderVNeckCollar = () => (
    <>
      {/* Collar rim across shoulders */}
      <path
        d="M 65 54 L 100 46 L 135 54 L 130 62 L 100 56 L 70 62 Z"
        fill={config.collarColor}
      />
      <path
        d="M 100 46 L 135 54 L 130 62 L 100 56 Z"
        fill="rgba(0,0,0,0.06)"
      />
      
      {/* V-neck wrap */}
      <path
        d="M 78 62 L 100 56 L 122 62 L 100 88 Z"
        fill={config.collarColor}
      />
      <path
        d="M 100 56 L 122 62 L 100 88 Z"
        fill="rgba(0,0,0,0.08)"
      />
      
      {/* Inner neck opening */}
      <path
        d="M 85 65 L 100 60 L 115 65 L 100 82 Z"
        fill="rgba(0,0,0,0.2)"
      />
      <path
        d="M 92 68 L 100 64 L 108 68 L 100 78 Z"
        fill="rgba(0,0,0,0.1)"
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
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        width={width} 
        height={height}
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Clip path for torso stripes only */}
          <clipPath id={`torso-clip-${uniqueId}`}>
            <path d={jerseyBodyPath} />
          </clipPath>
          
          {/* Depth gradient */}
          <linearGradient id={`depth-gradient-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.05)" />
          </linearGradient>
          
          {/* Hem shadow */}
          <linearGradient id={`hem-gradient-${uniqueId}`} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="80%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.08)" />
          </linearGradient>
        </defs>
        
        {/* Base jersey body */}
        <path d={jerseyBodyPath} fill={config.baseColor} />
        
        {/* Base sleeves */}
        <path d={leftSleevePath} fill={config.baseColor} />
        <path d={rightSleevePath} fill={config.baseColor} />
        
        {/* Torso stripes (clipped to body only) */}
        <g clipPath={`url(#torso-clip-${uniqueId})`}>
          {renderStripes()}
        </g>
        
        {/* Sleeve bands */}
        {renderSleeveBands()}
        
        {/* Depth gradient overlay */}
        <path d={jerseyBodyPath} fill={`url(#depth-gradient-${uniqueId})`} />
        <path d={leftSleevePath} fill={`url(#depth-gradient-${uniqueId})`} />
        <path d={rightSleevePath} fill={`url(#depth-gradient-${uniqueId})`} />
        
        {/* Hem shadow */}
        <path d={jerseyBodyPath} fill={`url(#hem-gradient-${uniqueId})`} />
        
        {/* Subtle sleeve edge shadows */}
        <path 
          d={`M ${SLEEVE.leftOuter.x} ${SLEEVE.leftOuter.y} L ${SLEEVE.leftOuter.x + 3} ${SLEEVE.leftOuter.y + 1} L ${SLEEVE.leftBottom.x + 3} ${SLEEVE.leftBottom.y - 1} L ${SLEEVE.leftBottom.x} ${SLEEVE.leftBottom.y} Z`}
          fill="rgba(0,0,0,0.03)" 
        />
        <path 
          d={`M ${SLEEVE.rightOuter.x} ${SLEEVE.rightOuter.y} L ${SLEEVE.rightOuter.x - 3} ${SLEEVE.rightOuter.y + 1} L ${SLEEVE.rightBottom.x - 3} ${SLEEVE.rightBottom.y - 1} L ${SLEEVE.rightBottom.x} ${SLEEVE.rightBottom.y} Z`}
          fill="rgba(0,0,0,0.03)" 
        />
        
        {/* Collar */}
        {config.collarStyle === "v-neck" ? renderVNeckCollar() : renderPoloCollar()}
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
