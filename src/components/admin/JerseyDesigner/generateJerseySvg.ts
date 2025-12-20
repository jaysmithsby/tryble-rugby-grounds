import { JerseyConfig, DEFAULT_JERSEY_CONFIG, StripeConfig } from "./types";

/**
 * Generates a standalone SVG string from a JerseyConfig
 * This SVG can be stored and used across the app (school profiles, fixture cards, leaderboards)
 * Design: Clean, flat vector with polo collar, angled sleeves, subtle gradients, transparent background
 */
export function generateJerseySvg(config: JerseyConfig = DEFAULT_JERSEY_CONFIG): string {
  const sortedStripes = [...(config.stripes || [])].sort((a, b) => a.order - b.order);
  
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

  // Sleeve bands
  const renderSleeveBands = (): string => {
    if (config.sleeveTrimColor === config.baseColor) return "";
    
    return `
      <path d="M 25 85 L 45 80 L 45 88 L 25 92 Z" fill="${config.sleeveTrimColor}"/>
      <path d="M 175 85 L 155 80 L 155 88 L 175 92 Z" fill="${config.sleeveTrimColor}"/>
    `;
  };

  // Polo collar with placket
  const renderPoloCollar = (): string => `
    <!-- Collar back shadow -->
    <path d="M 75 48 L 100 42 L 125 48 L 125 52 L 100 46 L 75 52 Z" fill="rgba(0,0,0,0.15)"/>
    
    <!-- Left collar wing -->
    <path d="M 75 45 L 95 48 L 95 58 L 85 68 L 75 55 Z" fill="${config.collarColor}"/>
    
    <!-- Right collar wing -->
    <path d="M 125 45 L 105 48 L 105 58 L 115 68 L 125 55 Z" fill="${config.collarColor}"/>
    
    <!-- Collar inner shadows -->
    <path d="M 85 68 L 95 58 L 95 70 L 90 75 Z" fill="rgba(0,0,0,0.1)"/>
    <path d="M 115 68 L 105 58 L 105 70 L 110 75 Z" fill="rgba(0,0,0,0.1)"/>
    
    <!-- Placket -->
    <path d="M 95 58 L 100 55 L 105 58 L 105 80 L 100 85 L 95 80 Z" fill="${config.collarColor}"/>
    <path d="M 100 55 L 105 58 L 105 80 L 100 85 Z" fill="rgba(0,0,0,0.08)"/>
    <path d="M 97 62 L 100 60 L 103 62 L 103 78 L 100 80 L 97 78 Z" fill="${config.baseColor}" opacity="0.4"/>
  `;

  // V-neck collar
  const renderVNeckCollar = (): string => `
    <!-- Collar rim -->
    <path d="M 70 50 L 100 44 L 130 50 L 125 55 L 100 50 L 75 55 Z" fill="${config.collarColor}"/>
    
    <!-- V-neck opening -->
    <path d="M 85 55 L 100 52 L 115 55 L 100 85 Z" fill="${config.collarColor}"/>
    <path d="M 100 52 L 115 55 L 100 85 Z" fill="rgba(0,0,0,0.1)"/>
    <path d="M 90 60 L 100 57 L 110 60 L 100 78 Z" fill="rgba(0,0,0,0.2)"/>
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
