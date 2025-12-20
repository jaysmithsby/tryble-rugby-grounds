import { JerseyConfig, DEFAULT_JERSEY_CONFIG, StripeConfig, SleeveBandConfig } from "./types";

/**
 * Generates a standalone SVG string from a JerseyConfig
 * This SVG can be stored and used across the app (school profiles, fixture cards, leaderboards)
 * Design: Clean, flat vector with polo collar, angled sleeves, subtle gradients, transparent background
 */
export function generateJerseySvg(config: JerseyConfig = DEFAULT_JERSEY_CONFIG): string {
  const sortedStripes = [...(config.stripes || [])].sort((a, b) => a.order - b.order);
  
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

  // Generate stripes
  const renderStripes = (): string => {
    if (!config.stripes || config.stripes.length === 0) return "";
    
    if (config.layout === "horizontal_stripes") {
      const bodyHeight = 120;
      const stripeHeight = bodyHeight / (sortedStripes.length * 2 + 1);
      
      return sortedStripes.map((stripe, index) => {
        const y = 55 + stripeHeight + (index * stripeHeight * 2);
        return `<rect x="0" y="${y}" width="200" height="${stripeHeight}" fill="${stripe.color}"/>`;
      }).join("");
    }
    
    if (config.layout === "vertical_stripes") {
      const bodyWidth = 110;
      const stripeWidth = bodyWidth / (sortedStripes.length * 2 + 1);
      
      return sortedStripes.map((stripe, index) => {
        const x = 45 + stripeWidth + (index * stripeWidth * 2);
        return `<rect x="${x}" y="0" width="${stripeWidth}" height="200" fill="${stripe.color}"/>`;
      }).join("");
    }
    
    return "";
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
  const renderSleeveBands = (): string => {
    const bands = getSleeveBands();
    if (bands.length === 0) return "";

    const bandHeight = 6;
    const bandGap = 3;
    const startY = 72;

    return bands.map((band, index) => {
      const yOffset = index * (bandHeight + bandGap);
      const y = startY + yOffset;
      // Left sleeve - horizontal band following sleeve angle
      // Right sleeve - horizontal band following sleeve angle
      return `
        <path d="M 20 ${y + 15 + yOffset * 0.3} L 58 ${y} L 58 ${y + bandHeight} L 20 ${y + 15 + bandHeight + yOffset * 0.3} Z" fill="${band.color}"/>
        <path d="M 180 ${y + 15 + yOffset * 0.3} L 142 ${y} L 142 ${y + bandHeight} L 180 ${y + 15 + bandHeight + yOffset * 0.3} Z" fill="${band.color}"/>
      `;
    }).join("");
  };

  // Polo collar with placket
  const renderPoloCollar = (): string => `
    <!-- Collar back shadow -->
    <path d="M 78 48 L 100 42 L 122 48 L 122 52 L 100 46 L 78 52 Z" fill="rgba(0,0,0,0.15)"/>
    
    <!-- Left collar wing -->
    <path d="M 78 45 L 96 48 L 96 58 L 87 66 L 78 54 Z" fill="${config.collarColor}"/>
    
    <!-- Right collar wing -->
    <path d="M 122 45 L 104 48 L 104 58 L 113 66 L 122 54 Z" fill="${config.collarColor}"/>
    
    <!-- Collar inner shadows -->
    <path d="M 87 66 L 96 58 L 96 68 L 91 73 Z" fill="rgba(0,0,0,0.1)"/>
    <path d="M 113 66 L 104 58 L 104 68 L 109 73 Z" fill="rgba(0,0,0,0.1)"/>
    
    <!-- Placket -->
    <path d="M 96 58 L 100 55 L 104 58 L 104 78 L 100 83 L 96 78 Z" fill="${config.collarColor}"/>
    <path d="M 100 55 L 104 58 L 104 78 L 100 83 Z" fill="rgba(0,0,0,0.08)"/>
    <path d="M 97.5 61 L 100 59 L 102.5 61 L 102.5 75 L 100 78 L 97.5 75 Z" fill="${config.baseColor}" opacity="0.4"/>
  `;

  // V-neck collar
  const renderVNeckCollar = (): string => `
    <!-- Collar rim -->
    <path d="M 73 50 L 100 44 L 127 50 L 123 55 L 100 50 L 77 55 Z" fill="${config.collarColor}"/>
    
    <!-- V-neck opening -->
    <path d="M 86 55 L 100 52 L 114 55 L 100 82 Z" fill="${config.collarColor}"/>
    <path d="M 100 52 L 114 55 L 100 82 Z" fill="rgba(0,0,0,0.1)"/>
    <path d="M 91 59 L 100 56 L 109 59 L 100 76 Z" fill="rgba(0,0,0,0.2)"/>
  `;

  const collarSvg = config.collarStyle === "polo" ? renderPoloCollar() : renderVNeckCollar();

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <!-- Jersey body clip path -->
    <clipPath id="jersey-clip">
      <path d="${jerseyBodyPath}"/>
      <path d="${leftSleevePath}"/>
      <path d="${rightSleevePath}"/>
    </clipPath>
    
    <!-- Top-left lighting gradient -->
    <linearGradient id="body-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.12)"/>
      <stop offset="50%" stop-color="rgba(255,255,255,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.08)"/>
    </linearGradient>
    
    <!-- Inner shadow for depth -->
    <linearGradient id="inner-shadow" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="rgba(0,0,0,0.05)"/>
      <stop offset="10%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="90%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.1)"/>
    </linearGradient>
  </defs>
  
  <!-- Base jersey body -->
  <path d="${jerseyBodyPath}" fill="${config.baseColor}"/>
  
  <!-- Sleeves -->
  <path d="${leftSleevePath}" fill="${config.baseColor}"/>
  <path d="${rightSleevePath}" fill="${config.baseColor}"/>
  
  <!-- Stripes clipped to jersey -->
  <g clip-path="url(#jersey-clip)">
    ${renderStripes()}
  </g>
  
  <!-- Sleeve bands -->
  ${renderSleeveBands()}
  
  <!-- Top-left lighting gradient overlay -->
  <path d="${jerseyBodyPath}" fill="url(#body-gradient)"/>
  <path d="${leftSleevePath}" fill="url(#body-gradient)"/>
  <path d="${rightSleevePath}" fill="url(#body-gradient)"/>
  
  <!-- Inner shadow for depth -->
  <path d="${jerseyBodyPath}" fill="url(#inner-shadow)"/>
  
  <!-- Collar -->
  ${collarSvg}
  
  <!-- Hem shadow -->
  <path d="M 55 170 Q 100 175 145 170 L 145 175 Q 100 180 55 175 Z" fill="rgba(0,0,0,0.08)"/>
  
  <!-- Sleeve edge shadows for depth -->
  <path d="M 20 70 L 20 100 L 22 99 L 22 71 Z" fill="rgba(0,0,0,0.06)"/>
  <path d="M 180 70 L 180 100 L 178 99 L 178 71 Z" fill="rgba(0,0,0,0.06)"/>
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
