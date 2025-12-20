import { JerseyConfig, DEFAULT_JERSEY_CONFIG } from "./types";

/**
 * Generates a standalone SVG string from a JerseyConfig
 * This SVG can be stored and used across the app (school profiles, fixture cards, leaderboards)
 */
export function generateJerseySvg(config: JerseyConfig = DEFAULT_JERSEY_CONFIG): string {
  const sortedStripes = [...(config.stripes || [])].sort((a, b) => a.order - b.order);
  
  // Generate stripes pattern
  const renderStripes = (): string => {
    if (!config.stripes || config.stripes.length === 0) return "";
    
    if (config.layout === "horizontal_stripes") {
      const stripeHeight = 60 / (sortedStripes.length + 1);
      return sortedStripes.map((stripe, index) => 
        `<rect x="15" y="${25 + (index + 1) * stripeHeight - stripeHeight / 2}" width="70" height="${stripeHeight * 0.8}" fill="${stripe.color}" rx="1"/>`
      ).join("");
    }
    
    if (config.layout === "vertical_stripes") {
      const stripeWidth = 60 / (sortedStripes.length + 1);
      return sortedStripes.map((stripe, index) => 
        `<rect x="${20 + (index + 1) * stripeWidth - stripeWidth / 2}" y="20" width="${stripeWidth * 0.8}" height="60" fill="${stripe.color}" rx="1"/>`
      ).join("");
    }
    
    return "";
  };

  const jerseyPath = `
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
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">
  <!-- Background circle -->
  <circle cx="50" cy="50" r="48" fill="#f8f9fa" stroke="#e9ecef" stroke-width="1"/>
  
  <!-- Jersey body -->
  <path d="${jerseyPath}" fill="${config.baseColor}" stroke="rgba(0,0,0,0.1)" stroke-width="0.5"/>
  
  <!-- Stripes clipped to jersey shape -->
  <defs>
    <clipPath id="jersey-clip-svg">
      <path d="${jerseyPath}"/>
    </clipPath>
  </defs>
  
  <g clip-path="url(#jersey-clip-svg)">
    ${renderStripes()}
  </g>
  
  <!-- Collar -->
  <ellipse cx="50" cy="15" rx="8" ry="4" fill="${config.collarColor}" stroke="rgba(0,0,0,0.1)" stroke-width="0.5"/>
  
  <!-- Left sleeve trim -->
  <path d="M 15 30 L 30 20 L 30 24 L 17 33 Z" fill="${config.sleeveTrimColor}" opacity="0.9"/>
  
  <!-- Right sleeve trim -->
  <path d="M 85 30 L 70 20 L 70 24 L 83 33 Z" fill="${config.sleeveTrimColor}" opacity="0.9"/>
  
  <!-- Subtle 3D highlight -->
  <path d="M 30 20 Q 30 15 35 15 L 50 10 L 50 85 L 35 85 Q 30 85 30 80 Z" fill="rgba(255,255,255,0.08)"/>
  
  <!-- Subtle 3D shadow -->
  <path d="M 70 20 Q 70 15 65 15 L 50 10 L 50 85 L 65 85 Q 70 85 70 80 Z" fill="rgba(0,0,0,0.05)"/>
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
