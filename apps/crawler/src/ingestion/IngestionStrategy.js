/**
 * Ingestion Strategy Interface
 * 
 * Abstract interface for different article ingestion methods.
 * This allows for easy extension to RSS, API, or other ingestion sources.
 */

/**
 * @typedef {Object} IngestionOptions
 * @property {string[]} allowedDomains - Array of allowed domain names
 * @property {number} [maxArticles] - Maximum number of articles to fetch (optional)
 * @property {Object} [dateRange] - Date range filter (optional)
 * @property {Date} [dateRange.from] - Start date
 * @property {Date} [dateRange.to] - End date
 * @property {string} [question] - Optional question for analysis (e.g., "is what is happening in gaza a genocide?")
 */

/**
 * @typedef {Object} ArticleCandidate
 * @property {string} url - Article URL
 * @property {string} title - Article title
 * @property {string} textContent - Full article text content
 * @property {string} [excerpt] - Article excerpt (optional)
 * @property {Date|null} publishedDate - Publication date (if available)
 * @property {string} outletId - Outlet ID from database
 * @property {string} source - Source identifier (e.g., 'googlenews', 'rss', 'api')
 */

/**
 * Abstract base class for ingestion strategies
 */
export class IngestionStrategy {
  /**
   * Fetches articles for a given topic
   * @param {string} topic - Topic name (e.g., "world", "politics")
   * @param {IngestionOptions} options - Ingestion options
   * @returns {Promise<ArticleCandidate[]>} Array of article candidates
   * @throws {Error} If fetching fails
   */
  async fetchArticles(topic, options) {
    throw new Error('fetchArticles() must be implemented by subclass');
  }

  /**
   * Validates the strategy configuration
   * @returns {Promise<boolean>} True if valid, false otherwise
   */
  async validate() {
    throw new Error('validate() must be implemented by subclass');
  }

  /**
   * Gets the strategy name
   * @returns {string} Strategy identifier
   */
  getName() {
    throw new Error('getName() must be implemented by subclass');
  }
}

