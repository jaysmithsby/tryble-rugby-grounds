import { JerseyConfig, DEFAULT_JERSEY_CONFIG, StripeConfig, SleeveBandConfig } from "./types";

/**
 * Generates a standalone SVG string from a JerseyConfig
 * Design: Clean, flat vector rugby jersey icon matching reference style
 * - Boxy shape with rounded bottom corners
 * - Wide angled sleeves (~10-15° downward)
 * - Polo collar with raised placket or soft V-neck
 * - Horizontal stripes that stay below shoulder line
 * - Horizontal sleeve bands wrapping around sleeve edge
 */
export function generateJerseySvg(config: JerseyConfig = DEFAULT_JERSEY_CONFIG): string {
  const sortedStripes = [...(config.stripes || [])].sort((a, b) => a.order - b.order);
  
  // Main jersey body - boxy with rounded bottom corners
  // Matches reference: straight sides, rounded bottom, no torso tapering
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
  // Starts at shoulder line (y=62), extends outward and down
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

  // Generate horizontal stripes (below shoulder seam)
  const renderStripes = (): string => {
    if (!config.stripes || config.stripes.length === 0) return "";
    
    if (config.layout === "horizontal_stripes") {
      // Stripes start below shoulder seam, end at hem
      const stripeAreaTop = shoulderLineY + 5;
      const stripeAreaBottom = 175;
      const stripeAreaHeight = stripeAreaBottom - stripeAreaTop;
      
      // Calculate stripe height and spacing
      const totalStripes = sortedStripes.length;
      const stripeHeight = stripeAreaHeight / (totalStripes * 2 + 1);
      
      return sortedStripes.map((stripe, index) => {
        const y = stripeAreaTop + stripeHeight + (index * stripeHeight * 2);
        // Full width rect, will be clipped to jersey shape
        return `<rect x="0" y="${y}" width="200" height="${stripeHeight}" fill="${stripe.color}"/>`;
      }).join("");
    }
    
    if (config.layout === "vertical_stripes") {
      const bodyWidth = 100; // From x=50 to x=150
      const stripeWidth = bodyWidth / (sortedStripes.length * 2 + 1);
      
      return sortedStripes.map((stripe, index) => {
        const x = 50 + stripeWidth + (index * stripeWidth * 2);
        return `<rect x="${x}" y="0" width="${stripeWidth}" height="200" fill="${stripe.color}"/>`;
      }).join("");
    }
    
    return "";
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

  // Render horizontal sleeve bands - wrapping around sleeve edge
  const renderSleeveBands = (): string => {
    const bands = getSleeveBands();
    if (bands.length === 0) return "";

    const bandHeight = 8;
    const bandGap = 2;
    // Start from bottom of sleeve and work up
    const sleeveBottomY = 108;

    return bands.map((band, index) => {
      const offset = index * (bandHeight + bandGap);
      const bottomY = sleeveBottomY - offset;
      const topY = bottomY - bandHeight;
      
      // Left sleeve band - horizontal across the sleeve
      // Follows the sleeve angle
      const leftBand = `
        M 20 ${94 - offset - bandHeight * 0.3} 
        L 50 ${topY - 6} 
        L 50 ${bottomY - 6}
        L 20 ${94 - offset + bandHeight * 0.7}
        Z
      `;
      
      // Right sleeve band - mirror
      const rightBand = `
        M 180 ${94 - offset - bandHeight * 0.3}
        L 150 ${topY - 6}
        L 150 ${bottomY - 6}
        L 180 ${94 - offset + bandHeight * 0.7}
        Z
      `;
      
      return `<path d="${leftBand}" fill="${band.color}"/><path d="${rightBand}" fill="${band.color}"/>`;
    }).join("");
  };

  // Polo collar - raised with clear placket, matching reference exactly
  const renderPoloCollar = (): string => `
    <!-- Collar back (inner neck) -->
    <path d="M 80 52 L 100 46 L 120 52 L 118 56 L 100 51 L 82 56 Z" fill="rgba(0,0,0,0.12)"/>
    
    <!-- Left collar wing - raised, angled outward -->
    <path d="M 72 55 L 95 52 L 95 60 L 84 70 L 72 62 Z" fill="${config.collarColor}"/>
    <!-- Left collar shadow -->
    <path d="M 84 70 L 95 60 L 95 62 L 86 71 Z" fill="rgba(0,0,0,0.08)"/>
    
    <!-- Right collar wing - raised, angled outward -->
    <path d="M 128 55 L 105 52 L 105 60 L 116 70 L 128 62 Z" fill="${config.collarColor}"/>
    <!-- Right collar shadow -->
    <path d="M 116 70 L 105 60 L 105 62 L 114 71 Z" fill="rgba(0,0,0,0.08)"/>
    
    <!-- Placket - vertical strip down center -->
    <path d="M 95 60 L 100 56 L 105 60 L 105 82 L 100 86 L 95 82 Z" fill="${config.collarColor}"/>
    <!-- Placket right shadow -->
    <path d="M 100 56 L 105 60 L 105 82 L 100 86 Z" fill="rgba(0,0,0,0.06)"/>
    <!-- Placket inner (neck opening) -->
    <path d="M 97 62 L 100 59 L 103 62 L 103 78 L 100 82 L 97 78 Z" fill="rgba(0,0,0,0.15)"/>
  `;

  // V-neck collar - soft wrap, thicker, matching MHS reference
  const renderVNeckCollar = (): string => `
    <!-- Collar rim across shoulders -->
    <path d="M 68 56 L 100 48 L 132 56 L 128 62 L 100 55 L 72 62 Z" fill="${config.collarColor}"/>
    <!-- Collar rim shadow -->
    <path d="M 100 48 L 132 56 L 128 62 L 100 55 Z" fill="rgba(0,0,0,0.05)"/>
    
    <!-- V-neck opening - soft V shape -->
    <path d="M 82 62 L 100 56 L 118 62 L 100 92 Z" fill="${config.collarColor}"/>
    <!-- V-neck inner shadow -->
    <path d="M 100 56 L 118 62 L 100 92 Z" fill="rgba(0,0,0,0.08)"/>
    
    <!-- Inner neck darkness -->
    <path d="M 88 66 L 100 61 L 112 66 L 100 85 Z" fill="rgba(0,0,0,0.18)"/>
    <!-- Deeper inner shadow -->
    <path d="M 93 70 L 100 66 L 107 70 L 100 80 Z" fill="rgba(0,0,0,0.12)"/>
  `;

  const collarSvg = config.collarStyle === "polo" ? renderPoloCollar() : renderVNeckCollar();

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <!-- Jersey clip path including body and sleeves -->
    <clipPath id="jersey-clip">
      <path d="${jerseyBodyPath}"/>
      <path d="${leftSleevePath}"/>
      <path d="${rightSleevePath}"/>
    </clipPath>
    
    <!-- Subtle top-left to bottom-right gradient for depth -->
    <linearGradient id="body-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.1)"/>
      <stop offset="40%" stop-color="rgba(255,255,255,0.02)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.06)"/>
    </linearGradient>
    
    <!-- Vertical shading for hem depth -->
    <linearGradient id="hem-shadow" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="85%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.08)"/>
    </linearGradient>
  </defs>
  
  <!-- Jersey body base -->
  <path d="${jerseyBodyPath}" fill="${config.baseColor}"/>
  
  <!-- Left sleeve base -->
  <path d="${leftSleevePath}" fill="${config.baseColor}"/>
  
  <!-- Right sleeve base -->
  <path d="${rightSleevePath}" fill="${config.baseColor}"/>
  
  <!-- Stripes clipped to jersey shape -->
  <g clip-path="url(#jersey-clip)">
    ${renderStripes()}
  </g>
  
  <!-- Sleeve bands -->
  ${renderSleeveBands()}
  
  <!-- Gradient overlay for subtle depth -->
  <path d="${jerseyBodyPath}" fill="url(#body-gradient)"/>
  <path d="${leftSleevePath}" fill="url(#body-gradient)"/>
  <path d="${rightSleevePath}" fill="url(#body-gradient)"/>
  
  <!-- Hem shadow -->
  <path d="${jerseyBodyPath}" fill="url(#hem-shadow)"/>
  
  <!-- Collar -->
  ${collarSvg}
  
  <!-- Subtle sleeve edge shadows -->
  <path d="M 20 80 L 22 81 L 22 108 L 20 110 Z" fill="rgba(0,0,0,0.04)"/>
  <path d="M 180 80 L 178 81 L 178 108 L 180 110 Z" fill="rgba(0,0,0,0.04)"/>
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
