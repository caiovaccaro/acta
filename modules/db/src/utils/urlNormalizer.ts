/**
 * URL normalization utilities
 * Ensures consistent URL format for deduplication
 */

/**
 * Normalizes a URL to a canonical form for comparison
 * - Removes trailing slashes
 * - Removes common tracking parameters
 * - Converts to lowercase
 * - Removes fragments
 * 
 * @param url - The URL to normalize
 * @returns Normalized URL string
 */
export function normalizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('URL must be a non-empty string');
  }

  try {
    const urlObj = new URL(url.trim());
    
    // Remove fragment
    urlObj.hash = '';
    
    // Remove trailing slash from pathname (except root)
    if (urlObj.pathname.length > 1 && urlObj.pathname.endsWith('/')) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }
    
    // Remove common tracking parameters
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
      'ref',
      'source',
      'campaign',
    ];
    
    trackingParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Convert to lowercase and return
    return urlObj.toString().toLowerCase();
  } catch (error) {
    // If URL parsing fails, return trimmed lowercase version
    console.warn(`Failed to normalize URL: ${url}`, error);
    return url.trim().toLowerCase();
  }
}

/**
 * Validates if a string is a valid URL
 * @param url - The string to validate
 * @returns True if valid URL, false otherwise
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

