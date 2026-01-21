/**
 * Outlet Logo Utilities
 * Maps outlet names to their parent publication domains for consistent logo URLs
 */

/**
 * Maps outlet names to their parent publication domains
 * This ensures logos always use the topmost parent publication domain
 */
const OUTLET_DOMAIN_MAP: Record<string, string> = {
  // The Guardian
  'The Guardian': 'theguardian.com',
  'Guardian': 'theguardian.com',
  
  // Al Jazeera
  'Al Jazeera English': 'aljazeera.com',
  'Al Jazeera': 'aljazeera.com',
  'AlJazeera': 'aljazeera.com',
  
  // BBC
  'BBC': 'bbc.com',
  'BBC News': 'bbc.com',
  
  // Politico
  'Politico': 'politico.com',
  
  // Fox News
  'Fox News': 'foxnews.com',
  'FoxNews': 'foxnews.com',
  
  // National Review
  'National Review': 'nationalreview.com',
  'NationalReview': 'nationalreview.com',
  
  // Deutsche Welle
  'Deutsche Welle': 'dw.com',
  'DeutscheWelle': 'dw.com',
  'DW': 'dw.com',
  
  // The Dispatch
  'The Dispatch': 'thedispatch.com',
  'TheDispatch': 'thedispatch.com',
  'Dispatch': 'thedispatch.com',
};

/**
 * Gets the parent publication domain for an outlet name
 * @param outletName - The outlet name from the database
 * @returns The parent publication domain
 */
export function getOutletDomain(outletName: string): string {
  // First check exact match
  if (OUTLET_DOMAIN_MAP[outletName]) {
    return OUTLET_DOMAIN_MAP[outletName];
  }
  
  // Try case-insensitive match
  const normalizedName = outletName.trim();
  const lowerName = normalizedName.toLowerCase();
  
  for (const [key, domain] of Object.entries(OUTLET_DOMAIN_MAP)) {
    if (key.toLowerCase() === lowerName) {
      return domain;
    }
  }
  
  // Fallback: try to extract domain from outlet name
  // Remove common suffixes and normalize
  const cleaned = normalizedName
    .replace(/\s+(English|News|Media|Network)$/i, '')
    .replace(/\s+/g, '')
    .toLowerCase();
  
  // If we can't find a match, return a sanitized version
  return `${cleaned}.com`;
}

/**
 * Gets the Google favicon URL for an outlet
 * @param outletName - The outlet name from the database
 * @returns The Google favicon URL
 */
export function getOutletLogoUrl(outletName: string): string {
  const domain = getOutletDomain(outletName);
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

/**
 * Predefined logo URLs for known outlets (matching hero section)
 */
export const HERO_LOGO_URLS = {
  Guardian: getOutletLogoUrl('The Guardian'),
  AlJazeera: getOutletLogoUrl('Al Jazeera English'),
  BBC: getOutletLogoUrl('BBC'),
  Politico: getOutletLogoUrl('Politico'),
  FoxNews: getOutletLogoUrl('Fox News'),
  NationalReview: getOutletLogoUrl('National Review'),
  DeutscheWelle: getOutletLogoUrl('Deutsche Welle'),
  TheDispatch: getOutletLogoUrl('The Dispatch'),
};






