/**
 * App-wide constants and configuration values
 * 
 * Centralizes hardcoded values for easier maintenance and updates.
 */

/**
 * Contact information
 */
export const CONTACT = {
  /** WhatsApp number for scorekeeper applications and support (without + prefix) */
  WHATSAPP_NUMBER: "27836388389",
} as const;

/**
 * Build WhatsApp message URL
 */
export const buildWhatsAppUrl = (message: string): string => {
  return `https://wa.me/${CONTACT.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};
