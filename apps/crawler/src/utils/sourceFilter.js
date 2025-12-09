/**
 * Source Filter
 * 
 * Handles whitelist/denylist filtering of articles by source domain.
 */

/**
 * @typedef {Object} ArticleCandidate
 * @property {string} url - Article URL
 * @property {string} sourceDomain - Source domain
 */

export class SourceFilter {
  /**
   * Creates a new source filter
   * @param {string[]} whitelist - Array of whitelisted domains
   * @param {string[]} [denylist] - Array of denylisted domains (optional)
   */
  constructor(whitelist, denylist = []) {
    if (!Array.isArray(whitelist)) {
      throw new Error('Whitelist must be an array');
    }
    if (!Array.isArray(denylist)) {
      throw new Error('Denylist must be an array');
    }
    
    // Normalize domains (lowercase, remove www)
    this.whitelist = whitelist.map(d => this._normalizeDomain(d));
    this.denylist = denylist.map(d => this._normalizeDomain(d));
  }

  /**
   * Filters articles by whitelisted sources
   * @param {ArticleCandidate[]} articles - Articles to filter
   * @param {Object} [logger] - Optional logger for detailed logging
   * @returns {ArticleCandidate[]} Filtered articles
   */
  filterArticlesByWhitelistedSources(articles, logger = null) {
    if (!Array.isArray(articles)) {
      return [];
    }

    const filtered = [];
    const rejected = [];

    for (const article of articles) {
      if (!article || !article.url) {
        rejected.push({ article, reason: 'missing_url' });
        continue;
      }

      const domain = this.extractDomain(article.url);
      if (!domain) {
        rejected.push({ article, reason: 'invalid_url', url: article.url });
        continue;
      }

      // Check denylist first
      if (this.isDenylisted(domain)) {
        rejected.push({ article, reason: 'denylisted', domain });
        continue;
      }

      // Check whitelist
      if (!this.isWhitelisted(domain)) {
        rejected.push({ article, reason: 'not_whitelisted', domain, url: article.url });
        continue;
      }

      filtered.push(article);
    }

    // Log rejected articles
    if (logger && rejected.length > 0) {
      const byReason = {};
      rejected.forEach(({ reason, domain, url, article }) => {
        if (!byReason[reason]) {
          byReason[reason] = [];
        }
        byReason[reason].push({
          domain,
          url: url || article?.url,
          title: article?.title?.substring(0, 100),
        });
      });

      logger.warn(`Filtered out ${rejected.length} articles`, {
        total: articles.length,
        filtered: filtered.length,
        rejected: rejected.length,
        byReason,
      });
    }

    return filtered;
  }

  /**
   * Checks if a domain is whitelisted
   * @param {string} domain - Domain to check
   * @returns {boolean} True if whitelisted
   */
  isWhitelisted(domain) {
    const normalized = this._normalizeDomain(domain);
    return this.whitelist.includes(normalized);
  }

  /**
   * Checks if a domain is denylisted
   * @param {string} domain - Domain to check
   * @returns {boolean} True if denylisted
   */
  isDenylisted(domain) {
    const normalized = this._normalizeDomain(domain);
    return this.denylist.includes(normalized);
  }

  /**
   * Extracts domain from URL
   * @param {string} url - URL string
   * @returns {string|null} Domain or null if invalid
   */
  extractDomain(url) {
    if (!url || typeof url !== 'string') {
      return null;
    }

    try {
      const urlObj = new URL(url);
      let hostname = urlObj.hostname;
      
      // Remove www. prefix
      if (hostname.startsWith('www.')) {
        hostname = hostname.substring(4);
      }
      
      return hostname.toLowerCase();
    } catch (error) {
      // Invalid URL
      return null;
    }
  }

  /**
   * Normalizes a domain string
   * @private
   * @param {string} domain - Domain string
   * @returns {string} Normalized domain
   */
  _normalizeDomain(domain) {
    if (!domain || typeof domain !== 'string') {
      return '';
    }
    
    let normalized = domain.toLowerCase().trim();
    
    // Remove protocol if present
    normalized = normalized.replace(/^https?:\/\//, '');
    
    // Remove www. prefix
    if (normalized.startsWith('www.')) {
      normalized = normalized.substring(4);
    }
    
    // Remove trailing slash
    normalized = normalized.replace(/\/$/, '');
    
    // Remove path
    const parts = normalized.split('/');
    normalized = parts[0];
    
    return normalized;
  }

  /**
   * Loads source filter from configuration files
   * @param {string} whitelistPath - Path to whitelist JSON file
   * @param {string} denylistPath - Path to denylist JSON file
   * @returns {Promise<SourceFilter>} Configured source filter
   */
  static async loadFromConfig(whitelistPath, denylistPath) {
    const { readFileSync } = await import('fs');
    const { resolve, dirname } = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Load whitelist
    let whitelist = [];
    try {
      const whitelistData = JSON.parse(
        readFileSync(resolve(__dirname, whitelistPath), 'utf-8')
      );
      whitelist = whitelistData.domains || [];
    } catch (error) {
      console.warn(`Failed to load whitelist from ${whitelistPath}:`, error.message);
    }

    // Load denylist
    let denylist = [];
    try {
      const denylistData = JSON.parse(
        readFileSync(resolve(__dirname, denylistPath), 'utf-8')
      );
      denylist = denylistData.domains || [];
    } catch (error) {
      // Denylist is optional, so we just log a warning
      console.warn(`Failed to load denylist from ${denylistPath}:`, error.message);
    }

    return new SourceFilter(whitelist, denylist);
  }
}

