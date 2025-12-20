import { JerseyConfig, DEFAULT_JERSEY_CONFIG, StripeConfig, SleeveBandConfig } from "./types";

/**
 * Rugby Jersey Icon Generator
 * 
 * Design specs (matching reference images exactly):
 * - Clean, flat vector icons with subtle gradients
 * - Boxy silhouette with rounded bottom corners
 * - Wide, short sleeves angled ~12° downward
 * - Polo: raised collar wings + central placket
 * - V-neck: soft wrapping neckband (NOT triangular)
 * - Horizontal torso stripes BELOW shoulder seam only
 * - Horizontal sleeve bands wrapping AROUND sleeve (not along it)
 */

// ============ GEOMETRY CONSTANTS ============
// All measurements in viewBox units (200x200)

const VIEWBOX_SIZE = 200;

// Jersey body shape
const BODY = {
  topCenter: { x: 100, y: 48 },     // Neck center point
  shoulderLeft: { x: 52, y: 58 },   // Left shoulder
  shoulderRight: { x: 148, y: 58 }, // Right shoulder
  waistLeft: { x: 50, y: 170 },     // Left bottom before curve
  waistRight: { x: 150, y: 170 },   // Right bottom before curve
  hemLeft: { x: 58, y: 178 },       // Left hem after curve
  hemRight: { x: 142, y: 178 },     // Right hem after curve
  cornerRadius: 10,                  // Bottom corner radius
};

// Sleeve dimensions (wider, shorter, angled)
const SLEEVE = {
  // Left sleeve
  leftTop: { x: 52, y: 58 },        // Connects to shoulder
  leftOuter: { x: 18, y: 75 },      // Outer top corner
  leftBottom: { x: 22, y: 108 },    // Outer bottom
  leftInner: { x: 50, y: 100 },     // Inner connection to body
  
  // Right sleeve (mirrored)
  rightTop: { x: 148, y: 58 },
  rightOuter: { x: 182, y: 75 },
  rightBottom: { x: 178, y: 108 },
  rightInner: { x: 150, y: 100 },
  
  // Band positioning
  bandStartY: 105,                   // Where bands start from bottom
  bandHeight: 7,                     // Height of each band
  bandGap: 3,                        // Gap between bands
};

// Stripe zone (torso only, below shoulders)
const STRIPE_ZONE = {
  top: 72,      // Below shoulder seam
  bottom: 172,  // Above hem curve
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

// ============ STRIPE RENDERING ============

function renderHorizontalStripes(stripes: StripeConfig[]): string {
  if (stripes.length === 0) return "";
  
  const sortedStripes = [...stripes].sort((a, b) => a.order - b.order);
  const zoneHeight = STRIPE_ZONE.bottom - STRIPE_ZONE.top;
  
  // Evenly distribute stripes with gaps between them
  const totalStripes = sortedStripes.length;
  const stripeHeight = zoneHeight / (totalStripes * 2 + 1);
  
  return sortedStripes.map((stripe, index) => {
    const y = STRIPE_ZONE.top + stripeHeight + (index * stripeHeight * 2);
    // Full width rect - will be clipped to jersey body only
    return `<rect x="0" y="${y}" width="${VIEWBOX_SIZE}" height="${stripeHeight}" fill="${stripe.color}"/>`;
  }).join("\n");
}

function renderVerticalStripes(stripes: StripeConfig[]): string {
  if (stripes.length === 0) return "";
  
  const sortedStripes = [...stripes].sort((a, b) => a.order - b.order);
  const bodyWidth = BODY.waistRight.x - BODY.waistLeft.x;
  const stripeWidth = bodyWidth / (sortedStripes.length * 2 + 1);
  
  return sortedStripes.map((stripe, index) => {
    const x = BODY.waistLeft.x + stripeWidth + (index * stripeWidth * 2);
    return `<rect x="${x}" y="0" width="${stripeWidth}" height="${VIEWBOX_SIZE}" fill="${stripe.color}"/>`;
  }).join("\n");
}

function renderStripes(config: JerseyConfig): string {
  if (!config.stripes || config.stripes.length === 0) return "";
  
  if (config.layout === "horizontal_stripes") {
    return renderHorizontalStripes(config.stripes);
  }
  
  if (config.layout === "vertical_stripes") {
    return renderVerticalStripes(config.stripes);
  }
  
  return "";
}

// ============ SLEEVE BAND RENDERING ============
// Bands wrap HORIZONTALLY around sleeve, parallel to torso stripes

function getSleeveBands(config: JerseyConfig): SleeveBandConfig[] {
  if (config.sleeveBands && config.sleeveBands.length > 0) {
    return [...config.sleeveBands].sort((a, b) => a.order - b.order);
  }
  if (config.sleeveTrimColor && config.sleeveTrimColor !== config.baseColor) {
    return [{ color: config.sleeveTrimColor, order: 0 }];
  }
  return [];
}

function renderSleeveBands(config: JerseyConfig): string {
  const bands = getSleeveBands(config);
  if (bands.length === 0) return "";
  
  return bands.map((band, index) => {
    const offset = index * (SLEEVE.bandHeight + SLEEVE.bandGap);
    const bottomY = SLEEVE.bandStartY - offset;
    const topY = bottomY - SLEEVE.bandHeight;
    
    // Calculate band positions on angled sleeve
    // Bands are horizontal rectangles that follow the sleeve angle
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
    
    return `
      <path d="${leftBandPath}" fill="${band.color}"/>
      <path d="${rightBandPath}" fill="${band.color}"/>
    `;
  }).join("\n");
}

// ============ COLLAR RENDERING ============

function renderPoloCollar(collarColor: string): string {
  // Polo collar: Two raised collar wings meeting at a central placket
  // Matches reference: visible collar rim, central opening
  return `
    <!-- Inner neck shadow -->
    <path d="M 82 52 L 100 46 L 118 52 L 115 58 L 100 53 L 85 58 Z" fill="rgba(0,0,0,0.15)"/>
    
    <!-- Left collar wing - raised, folded outward -->
    <path d="M 70 54 L 96 50 L 96 58 L 82 68 L 70 60 Z" fill="${collarColor}"/>
    <!-- Left collar inner shadow -->
    <path d="M 82 68 L 96 58 L 96 60 L 84 69 Z" fill="rgba(0,0,0,0.1)"/>
    
    <!-- Right collar wing - raised, folded outward -->
    <path d="M 130 54 L 104 50 L 104 58 L 118 68 L 130 60 Z" fill="${collarColor}"/>
    <!-- Right collar inner shadow -->
    <path d="M 118 68 L 104 58 L 104 60 L 116 69 Z" fill="rgba(0,0,0,0.1)"/>
    
    <!-- Central placket -->
    <path d="M 96 58 L 100 54 L 104 58 L 104 78 L 100 82 L 96 78 Z" fill="${collarColor}"/>
    <!-- Placket right shadow -->
    <path d="M 100 54 L 104 58 L 104 78 L 100 82 Z" fill="rgba(0,0,0,0.08)"/>
    <!-- Placket inner opening -->
    <path d="M 98 60 L 100 58 L 102 60 L 102 74 L 100 77 L 98 74 Z" fill="rgba(0,0,0,0.18)"/>
  `;
}

function renderVNeckCollar(collarColor: string): string {
  // V-neck: Soft, wrapping neckband - NOT triangular
  // The V wraps around the neck opening like a thick ribbed band
  // Matches reference: smooth curves, visible thickness
  return `
    <!-- Collar rim across shoulders - thick visible band -->
    <path d="M 65 54 L 100 46 L 135 54 L 130 62 L 100 56 L 70 62 Z" fill="${collarColor}"/>
    <!-- Collar rim right shadow -->
    <path d="M 100 46 L 135 54 L 130 62 L 100 56 Z" fill="rgba(0,0,0,0.06)"/>
    
    <!-- V-neck wrap - soft V shape that wraps around -->
    <path d="M 78 62 L 100 56 L 122 62 L 100 88 Z" fill="${collarColor}"/>
    <!-- V-neck right shadow -->
    <path d="M 100 56 L 122 62 L 100 88 Z" fill="rgba(0,0,0,0.08)"/>
    
    <!-- Inner neck opening - darker V -->
    <path d="M 85 65 L 100 60 L 115 65 L 100 82 Z" fill="rgba(0,0,0,0.2)"/>
    <!-- Deeper inner V -->
    <path d="M 92 68 L 100 64 L 108 68 L 100 78 Z" fill="rgba(0,0,0,0.1)"/>
  `;
}

// ============ MAIN SVG GENERATOR ============

export function generateJerseySvg(config: JerseyConfig = DEFAULT_JERSEY_CONFIG): string {
  const jerseyBodyPath = getJerseyBodyPath();
  const leftSleevePath = getLeftSleevePath();
  const rightSleevePath = getRightSleevePath();
  
  const collarSvg = config.collarStyle === "v-neck" 
    ? renderVNeckCollar(config.collarColor) 
    : renderPoloCollar(config.collarColor);
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}" width="${VIEWBOX_SIZE}" height="${VIEWBOX_SIZE}">
  <defs>
    <!-- Clip path for torso stripes only (not sleeves) -->
    <clipPath id="torso-clip">
      <path d="${jerseyBodyPath}"/>
    </clipPath>
    
    <!-- Subtle depth gradient (top-left light to bottom-right dark) -->
    <linearGradient id="depth-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.08)"/>
      <stop offset="50%" stop-color="rgba(255,255,255,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.05)"/>
    </linearGradient>
    
    <!-- Hem shadow gradient -->
    <linearGradient id="hem-gradient" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="80%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.08)"/>
    </linearGradient>
  </defs>
  
  <!-- Base jersey body -->
  <path d="${jerseyBodyPath}" fill="${config.baseColor}"/>
  
  <!-- Base sleeves -->
  <path d="${leftSleevePath}" fill="${config.baseColor}"/>
  <path d="${rightSleevePath}" fill="${config.baseColor}"/>
  
  <!-- Torso stripes (clipped to body only, not sleeves) -->
  <g clip-path="url(#torso-clip)">
    ${renderStripes(config)}
  </g>
  
  <!-- Sleeve bands (horizontal wrapping) -->
  ${renderSleeveBands(config)}
  
  <!-- Depth gradient overlay -->
  <path d="${jerseyBodyPath}" fill="url(#depth-gradient)"/>
  <path d="${leftSleevePath}" fill="url(#depth-gradient)"/>
  <path d="${rightSleevePath}" fill="url(#depth-gradient)"/>
  
  <!-- Hem shadow -->
  <path d="${jerseyBodyPath}" fill="url(#hem-gradient)"/>
  
  <!-- Subtle sleeve shadows -->
  <path d="M ${SLEEVE.leftOuter.x} ${SLEEVE.leftOuter.y} L ${SLEEVE.leftOuter.x + 3} ${SLEEVE.leftOuter.y + 1} L ${SLEEVE.leftBottom.x + 3} ${SLEEVE.leftBottom.y - 1} L ${SLEEVE.leftBottom.x} ${SLEEVE.leftBottom.y} Z" fill="rgba(0,0,0,0.03)"/>
  <path d="M ${SLEEVE.rightOuter.x} ${SLEEVE.rightOuter.y} L ${SLEEVE.rightOuter.x - 3} ${SLEEVE.rightOuter.y + 1} L ${SLEEVE.rightBottom.x - 3} ${SLEEVE.rightBottom.y - 1} L ${SLEEVE.rightBottom.x} ${SLEEVE.rightBottom.y} Z" fill="rgba(0,0,0,0.03)"/>
  
  <!-- Collar -->
  ${collarSvg}
</svg>`;
}

/**
 * Converts SVG string to a Blob for uploading
 */
export function svgToBlob(svgString: string): Blob {
  return new Blob([svgString], { type: "image/svg+xml" });
}

/**
 * Generates a unique filename for the jersey SVG
 */
export function generateJerseyFilename(schoolSlug: string): string {
  const timestamp = Date.now();
  return `jerseys/${schoolSlug}-${timestamp}.svg`;
}
