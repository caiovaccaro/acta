/**
 * ScraperAPI AI Parser Client
 * Documentation: https://scraperapi.gitbook.io/ai-parser-closed-beta/
 */

export class ScraperAPIParserClient {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('ScraperAPI API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = 'https://aiparser.scraperapi.com';
  }

  /**
   * Creates a new parser based on example URLs
   * @param {string} name - Parser name
   * @param {string[]} urls - Array of example URLs (max 3)
   * @param {Object} options - Optional fields and scraper params
   * @returns {Promise<Object>} Parser ID and version
   */
  async createParser(name, urls, options = {}) {
    if (!name || typeof name !== 'string') {
      throw new Error('Parser name is required');
    }
    if (!Array.isArray(urls) || urls.length === 0 || urls.length > 3) {
      throw new Error('URLs must be an array with 1-3 URLs');
    }

    const body = {
      name,
      api_key: this.apiKey,
      urls,
      ...(options.fields && { fields: options.fields }),
      ...(options.scraper_params && { scraper_params: options.scraper_params }),
    };

    const response = await fetch(`${this.baseUrl}/parsers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create parser: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    return await response.json();
  }

  /**
   * Parses a URL using an existing parser
   * @param {string} parserId - Parser ID
   * @param {string} url - URL to parse
   * @param {Object} options - Optional version and scraper params
   * @returns {Promise<Object>} Parsed data
   */
  async parseUrl(parserId, url, options = {}) {
    if (!parserId || !url) {
      throw new Error('Parser ID and URL are required');
    }

    const params = new URLSearchParams({
      api_key: this.apiKey,
      url: url,
      ...(options.scraper_params || {}),
    });

    const version = options.version !== undefined ? `/${options.version}` : '';
    const response = await fetch(
      `${this.baseUrl}/parse/${parserId}${version}?${params.toString()}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to parse URL: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    return await response.json();
  }

  /**
   * Lists all parsers for the account
   * @returns {Promise<Array>} List of parsers
   */
  async listParsers() {
    const response = await fetch(
      `${this.baseUrl}/parsers?api_key=${this.apiKey}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to list parsers: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    return await response.json();
  }

  /**
   * Gets parser details
   * @param {string} parserId - Parser ID
   * @param {number} version - Optional version number
   * @returns {Promise<Object>} Parser details
   */
  async getParserDetails(parserId, version = null) {
    if (!parserId) {
      throw new Error('Parser ID is required');
    }

    const versionPath = version !== null ? `/${version}` : '';
    const response = await fetch(
      `${this.baseUrl}/parsers/${parserId}${versionPath}?api_key=${this.apiKey}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to get parser details: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    return await response.json();
  }

  /**
   * Deletes a parser
   * @param {string} parserId - Parser ID
   * @returns {Promise<boolean>} True if successful
   */
  async deleteParser(parserId) {
    if (!parserId) {
      throw new Error('Parser ID is required');
    }

    const response = await fetch(
      `${this.baseUrl}/parsers/${parserId}?api_key=${this.apiKey}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to delete parser: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    return response.status === 204;
  }

  /**
   * Updates parser fields (creates new version)
   * @param {string} parserId - Parser ID
   * @param {Object} updates - Field updates
   * @param {number} version - Base version to update
   * @returns {Promise<Object>} New version info
   */
  async updateParserFields(parserId, updates, version = null) {
    if (!parserId) {
      throw new Error('Parser ID is required');
    }

    const versionPath = version !== null ? `/${version}` : '';
    const body = {
      api_key: this.apiKey,
      ...updates,
    };

    const response = await fetch(
      `${this.baseUrl}/parsers/${parserId}${versionPath}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to update parser: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    return await response.json();
  }
}

