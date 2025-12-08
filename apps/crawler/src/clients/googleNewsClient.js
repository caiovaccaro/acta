/**
 * Google News API Client
 * Uses Google News RSS feeds and search to discover articles
 * 
 * Note: Google doesn't have an official "News API" but we can use:
 * 1. Google News RSS feeds (https://news.google.com/rss)
 * 2. Google Custom Search API (requires API key)
 * 3. Direct RSS parsing from Google News search results
 */

export class GoogleNewsClient {
  constructor(options = {}) {
    this.logger = options.logger || null;
    this.useCustomSearch = options.useCustomSearch || false;
    this.customSearchApiKey = options.customSearchApiKey || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    this.customSearchEngineId = options.customSearchEngineId || process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
  }

  /**
   * Discovers articles from Google News using RSS feeds
   * @param {string} query - Search query (e.g., "gaza", "ai regulation")
   * @param {string[]} domains - Allowed domains (e.g., ["wsj.com", "ft.com"])
   * @param {Object} dateRange - Optional date range {from: Date, to: Date}
   * @returns {Promise<Array>} Array of article URLs and metadata
   */
  async discoverArticles(query, domains, dateRange = null) {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }
    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      throw new Error('Domains must be a non-empty array');
    }

    if (this.useCustomSearch && this.customSearchApiKey && this.customSearchEngineId) {
      return await this._discoverViaCustomSearch(query, domains, dateRange);
    } else {
      return await this._discoverViaRSS(query, domains, dateRange);
    }
  }

  /**
   * Discovers articles using Google Custom Search API
   * @private
   */
  async _discoverViaCustomSearch(query, domains, dateRange) {
    const articles = [];
    const domainQuery = domains.map(d => `site:${d}`).join(' OR ');
    const searchQuery = `${query} (${domainQuery})`;

    // Add date range if provided
    let dateRestrict = '';
    if (dateRange && dateRange.from) {
      const daysAgo = Math.floor((Date.now() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      dateRestrict = `d${Math.min(daysAgo, 365)}`; // Google allows up to 365 days
    }

    const params = new URLSearchParams({
      key: this.customSearchApiKey,
      cx: this.customSearchEngineId,
      q: searchQuery,
      num: 10, // Results per page (max 10 for free tier)
      ...(dateRestrict && { dateRestrict }),
    });

    try {
      const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Custom Search API error: ${response.status} ${response.statusText}. ${errorText}`);
      }

      const data = await response.json();

      if (data.items) {
        for (const item of data.items) {
          const domain = this._extractDomain(item.link);
          if (domains.includes(domain)) {
            articles.push({
              url: item.link,
              title: item.title,
              snippet: item.snippet,
              publishedDate: item.pagemap?.metatags?.[0]?.['article:published_time'] 
                ? new Date(item.pagemap.metatags[0]['article:published_time'])
                : null,
              sourceDomain: domain,
            });
          }
        }
      }

      if (this.logger) {
        this.logger.info('Google Custom Search results', {
          query: searchQuery,
          found: articles.length,
          totalResults: data.searchInformation?.totalResults || 0,
        });
      }

      return articles;
    } catch (error) {
      if (this.logger) {
        this.logger.error('Google Custom Search API error', { error: error.message });
      }
      throw error;
    }
  }

  /**
   * Discovers articles using Google News RSS feeds
   * @private
   */
  async _discoverViaRSS(query, domains, dateRange) {
    const articles = [];
    
    // Build Google News RSS URL
    // Format: https://news.google.com/rss/search?q=QUERY+site:DOMAIN&hl=en&gl=US&ceid=US:en
    const domainQueries = domains.map(d => `site:${d}`).join('+OR+');
    const searchQuery = encodeURIComponent(`${query} (${domainQueries})`);
    const rssUrl = `https://news.google.com/rss/search?q=${searchQuery}&hl=en&gl=US&ceid=US:en`;

    if (this.logger) {
      this.logger.debug('Fetching Google News RSS', { url: rssUrl });
    }

    try {
      const response = await fetch(rssUrl);
      
      if (!response.ok) {
        throw new Error(`Google News RSS error: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      const articlesFromRSS = this._parseRSSFeed(xmlText, domains);

      // Filter by date range if provided
      if (dateRange) {
        return articlesFromRSS.filter(article => {
          if (!article.publishedDate) return true; // Include if no date
          return article.publishedDate >= dateRange.from && article.publishedDate <= dateRange.to;
        });
      }

      if (this.logger) {
        this.logger.info('Google News RSS results', {
          query,
          domains: domains.length,
          found: articlesFromRSS.length,
        });
      }

      return articlesFromRSS;
    } catch (error) {
      if (this.logger) {
        this.logger.error('Google News RSS error', { error: error.message });
      }
      throw error;
    }
  }

  /**
   * Parses Google News RSS feed XML
   * @private
   */
  _parseRSSFeed(xmlText, allowedDomains) {
    const articles = [];
    
    // Simple XML parsing (could use a proper XML parser, but this works for RSS)
    const itemMatches = xmlText.matchAll(/<item>([\s\S]*?)<\/item>/gi);
    
    for (const match of itemMatches) {
      const itemXml = match[1];
      
      // Extract title
      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) || 
                        itemXml.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : '';

      // Extract link (Google News links are redirects, need to extract actual URL)
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/i);
      let link = linkMatch ? linkMatch[1].trim() : '';
      
      // Google News links are redirects like: https://news.google.com/rss/articles/...
      // We need to extract the actual article URL from the description or use the link as-is
      // For now, we'll use the link and let the extractor handle it
      
      // Extract description/snippet
      const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/i) ||
                        itemXml.match(/<description>(.*?)<\/description>/i);
      const snippet = descMatch ? descMatch[1].trim() : '';

      // Extract pubDate
      const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i);
      const publishedDate = pubDateMatch ? this._parseRSSDate(pubDateMatch[1]) : null;

      // Extract source URL from description (Google News includes it)
      // Format: <a href="ACTUAL_URL">Title</a>
      const urlMatch = snippet.match(/href="(https?:\/\/[^"]+)"/i) || 
                      link.match(/url=([^&]+)/i);
      const actualUrl = urlMatch ? decodeURIComponent(urlMatch[1]) : link;

      if (actualUrl) {
        const domain = this._extractDomain(actualUrl);
        if (allowedDomains.includes(domain)) {
          articles.push({
            url: actualUrl,
            title: title,
            snippet: snippet,
            publishedDate: publishedDate,
            sourceDomain: domain,
          });
        }
      }
    }

    return articles;
  }

  /**
   * Parses RSS date format
   * @private
   */
  _parseRSSDate(dateString) {
    try {
      return new Date(dateString);
    } catch {
      return null;
    }
  }

  /**
   * Extracts domain from URL
   * @private
   */
  _extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }
}

