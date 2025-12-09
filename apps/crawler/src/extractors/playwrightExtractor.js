/**
 * Playwright Content Extractor
 * Extracts article content using Playwright with a real (non-headless) browser
 * Supports login flows for subscription-based sites
 */

import { chromium } from 'playwright';

export class PlaywrightExtractor {
  constructor(options = {}) {
    this.logger = options.logger || null;
    this.headless = false; // Always use non-headless for visibility
    this.slowMo = options.slowMo || 100; // Slow down operations to appear more human
    this.timeout = options.timeout || 60000; // Increased to 60 seconds for slow-loading pages
    this.userDataDir = options.userDataDir || null; // For persistent sessions
    this.credentials = options.credentials || {}; // { outlet: { email, password } }
  }

  /**
   * Extracts article content from a URL
   * @param {string} url - Article URL
   * @param {Object} options - Extraction options
   * @param {string} options.outlet - Outlet name (for login credentials)
   * @param {Object} options.selectors - Custom CSS selectors for content extraction
   * @returns {Promise<Object>} Extracted article data
   */
  async extractArticle(url, options = {}) {
    const browser = await this._launchBrowser();
    const context = await this._createContext(browser, options.outlet);
    const page = await context.newPage();

    try {
      if (this.logger) {
        this.logger.info('Extracting article with Playwright', { url, outlet: options.outlet });
      }

      // Navigate to the article
      // Use 'domcontentloaded' instead of 'networkidle' for faster loading
      // Some sites have continuous network activity that prevents 'networkidle'
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.timeout });

      // Check for Cloudflare challenge and wait for it to complete
      await this._handleCloudflareChallenge(page);

      // Check for CAPTCHA and wait for manual solving
      await this._handleCaptcha(page);

      // Handle login if needed
      if (options.outlet && this.credentials[options.outlet]) {
        await this._handleLogin(page, options.outlet);
        // Navigate again after login
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.timeout });
        
        // Check for Cloudflare challenge again after login
        await this._handleCloudflareChallenge(page);
        
        // Check for CAPTCHA again after login
        await this._handleCaptcha(page);
      }

      // Wait for page to fully load after any challenges
      // Try to wait for article content to appear
      try {
        // Wait for common article indicators
        await Promise.race([
          page.waitForSelector('article, h1, [class*="article"]', { timeout: 10000 }).catch(() => null),
          page.waitForTimeout(5000), // Fallback: wait 5 seconds
        ]);
      } catch {
        // Continue anyway
      }
      
      // Additional wait to ensure content is rendered
      await page.waitForTimeout(2000);

      // Extract content
      const articleData = await this._extractContent(page, url, options);

      if (this.logger) {
        this.logger.info('Article extracted successfully', {
          url,
          titleLength: articleData.title?.length || 0,
          contentLength: articleData.textContent?.length || 0,
        });
      }

      return articleData;
    } catch (error) {
      if (this.logger) {
        this.logger.error('Playwright extraction error', { url, error: error.message });
      }
      throw error;
    } finally {
      await page.close();
      await context.close();
      await browser.close();
    }
  }

  /**
   * Launches a browser instance
   * @private
   */
  async _launchBrowser() {
    const launchOptions = {
      headless: this.headless,
      slowMo: this.slowMo,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
      ],
    };

    if (this.userDataDir) {
      launchOptions.userDataDir = this.userDataDir;
    }

    return await chromium.launch(launchOptions);
  }

  /**
   * Creates a browser context with realistic settings
   * @private
   */
  async _createContext(browser, outlet) {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York',
      // Add extra headers to appear more like a real browser
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
      },
    });

    // Add comprehensive stealth script to avoid detection
    await context.addInitScript(() => {
      // Hide webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      
      // Override plugins to appear more human
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Override chrome object
      window.chrome = {
        runtime: {},
      };

      // Override permissions API
      const originalQuery2 = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery2(parameters)
      );

      // Mock missing properties
      Object.defineProperty(navigator, 'platform', {
        get: () => 'MacIntel',
      });

      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8,
      });

      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
      });
    });

    return context;
  }

  /**
   * Handles login flow for subscription-based sites
   * Supports two-step login: email -> continue -> password -> submit
   * @private
   */
  async _handleLogin(page, outlet) {
    const creds = this.credentials[outlet];
    if (!creds || !creds.email || !creds.password) {
      if (this.logger) {
        this.logger.warn('No credentials provided for outlet', { outlet });
      }
      return;
    }

    try {
      // Check if already logged in
      const isLoggedIn = await this._checkLoggedIn(page, outlet);
      if (isLoggedIn) {
        if (this.logger) {
          this.logger.info('Already logged in', { outlet });
        }
        return;
      }

      // Navigate to login page (outlet-specific)
      const loginUrl = this._getLoginUrl(outlet);
      await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: this.timeout });

      // Wait for login form
      await page.waitForTimeout(2000);

      // Get outlet-specific selectors
      const selectors = this._getLoginSelectors(outlet);
      
      // Step 1: Enter email and click continue
      if (selectors.email) {
        await page.fill(selectors.email, creds.email);
        await this._humanDelay();
        
        // Click continue/submit button for email step
        if (selectors.continue) {
          await page.click(selectors.continue);
          await this._humanDelay();
          
          // Wait for password field to appear (two-step login)
          await page.waitForTimeout(2000);
          
          // Wait for password field to be visible
          if (selectors.password) {
            try {
              await page.waitForSelector(selectors.password, { state: 'visible', timeout: 5000 });
            } catch (error) {
              if (this.logger) {
                this.logger.warn('Password field not found after email step', { outlet });
              }
            }
          }
        }
      }

      // Step 2: Enter password and submit
      if (selectors.password) {
        await page.fill(selectors.password, creds.password);
        await this._humanDelay();
      }

      // Click final submit/login button
      if (selectors.submit) {
        await page.click(selectors.submit);
        await this._humanDelay();
      }

      // Wait for login to complete
      await page.waitForTimeout(3000);

      // Verify login was successful
      const loginSuccessful = await this._checkLoggedIn(page, outlet);
      if (loginSuccessful) {
        if (this.logger) {
          this.logger.info('Login successful', { outlet });
        }
      } else {
        if (this.logger) {
          this.logger.warn('Login may have failed - not logged in after attempt', { outlet });
        }
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error('Login error', { outlet, error: error.message });
      }
      // Don't throw - continue without login
    }
  }

  /**
   * Handles Cloudflare challenge detection and waits for it to complete
   * @private
   */
  async _handleCloudflareChallenge(page) {
    // Check for Cloudflare challenge indicators
    const cloudflareSelectors = [
      '#challenge-error-text',
      '#challenge-form',
      '.cf-browser-verification',
      '[data-ray]',
      'div:has-text("Verifying you are human")',
      'div:has-text("Checking your browser")',
      'div:has-text("Please wait")',
      'div:has-text("challenges.cloudflare.com")',
    ];

    let hasChallenge = false;
    for (const selector of cloudflareSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await element.isVisible().catch(() => false);
          if (isVisible) {
            hasChallenge = true;
            break;
          }
        }
      } catch {
        // Continue checking
      }
    }

    // Also check page text for Cloudflare messages
    if (!hasChallenge) {
      try {
        const pageText = await page.textContent('body').catch(() => '');
        const cloudflareKeywords = [
          'verifying you are human',
          'checking your browser',
          'challenges.cloudflare.com',
          'cloudflare',
          'enable javascript and cookies',
          'security of your connection',
        ];
        hasChallenge = cloudflareKeywords.some(keyword => 
          pageText.toLowerCase().includes(keyword.toLowerCase())
        );
      } catch {
        // Continue
      }
    }

    if (hasChallenge) {
      if (this.logger) {
        this.logger.warn('Cloudflare challenge detected - waiting for completion', { url: page.url() });
      }
      console.log('');
      console.log('🛡️  Cloudflare challenge detected!');
      
      // Check if there's a blocking message
      try {
        const pageText = await page.textContent('body').catch(() => '');
        if (pageText.toLowerCase().includes('unblock challenges.cloudflare.com')) {
          console.log('⚠️  WARNING: Cloudflare challenge domain is being blocked!');
          console.log('');
          console.log('   The message "Please unblock challenges.cloudflare.com" means:');
          console.log('   - A browser extension (ad blocker, privacy tool) is blocking it');
          console.log('   - Network/firewall is blocking challenges.cloudflare.com');
          console.log('   - Browser privacy settings are too strict');
          console.log('');
          console.log('   Solutions:');
          console.log('   1. Disable ad blockers/privacy extensions temporarily');
          console.log('   2. Allow challenges.cloudflare.com in your network/firewall');
          console.log('   3. Check browser privacy settings');
          console.log('   4. Try using a different network/VPN');
          console.log('');
          console.log('   Waiting 30 seconds for you to fix this...');
          console.log('   (You can manually interact with the browser if needed)');
          console.log('');
        } else {
          console.log('   Waiting for challenge to complete automatically...');
          console.log('   (This usually takes 5-10 seconds)');
          console.log('');
        }
      } catch {
        console.log('   Waiting for challenge to complete automatically...');
        console.log('   (This usually takes 5-10 seconds)');
        console.log('');
      }

      // Wait for Cloudflare challenge to complete
      // Cloudflare challenges typically complete automatically within 5-10 seconds
      // But if blocked, we'll wait longer and allow manual interaction
      const maxWait = 60000; // 60 seconds (increased for blocked challenges)
      const checkInterval = 2000; // 2 seconds
      let waited = 0;

      while (waited < maxWait) {
        await page.waitForTimeout(checkInterval);
        waited += checkInterval;

        // Check if challenge is still present
        let stillHasChallenge = false;
        for (const selector of cloudflareSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              const isVisible = await element.isVisible().catch(() => false);
              if (isVisible) {
                stillHasChallenge = true;
                break;
              }
            }
          } catch {
            // Continue
          }
        }

        if (!stillHasChallenge) {
          // Check page text again
          try {
            const pageText = await page.textContent('body').catch(() => '');
            const cloudflareKeywords = [
              'verifying you are human',
              'checking your browser',
              'challenges.cloudflare.com',
              'enable javascript and cookies',
              'unblock challenges.cloudflare.com',
            ];
            stillHasChallenge = cloudflareKeywords.some(keyword => 
              pageText.toLowerCase().includes(keyword.toLowerCase())
            );
          } catch {
            // Continue
          }
        }

        if (!stillHasChallenge) {
          // Additional check: see if we can find article content
          try {
            const hasArticleContent = await page.$('article, h1, [class*="article"]').catch(() => null);
            if (hasArticleContent) {
              console.log('✅ Cloudflare challenge completed. Page loaded successfully.');
              break;
            }
          } catch {
            // Continue
          }
        }

        // Show progress every 10 seconds
        if (waited % 10000 === 0) {
          console.log(`   Still waiting... (${waited / 1000}s elapsed)`);
          console.log('   You can manually interact with the browser if needed.');
        }
      }

      if (waited >= maxWait) {
        console.warn('⚠️  Cloudflare challenge timeout after 60 seconds.');
        console.warn('   The page may still be loading or the challenge may need manual interaction.');
        console.warn('   Check the browser window - you may need to:');
        console.warn('   1. Click "Verify" or similar button');
        console.warn('   2. Wait for automatic verification');
        console.warn('   3. The script will continue once the page loads');
      }
    }
  }

  /**
   * Handles CAPTCHA detection and waits for manual solving
   * @private
   */
  async _handleCaptcha(page) {
    // Common CAPTCHA selectors
    const captchaSelectors = [
      'iframe[src*="recaptcha"]',
      'iframe[src*="hcaptcha"]',
      'div[class*="captcha"]',
      'div[id*="captcha"]',
      '[data-callback*="captcha"]',
      '.g-recaptcha',
      '#captcha',
    ];

    let hasCaptcha = false;
    for (const selector of captchaSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await element.isVisible().catch(() => false);
          if (isVisible) {
            hasCaptcha = true;
            break;
          }
        }
      } catch {
        // Continue checking
      }
    }

    // Also check for CAPTCHA in page text
    if (!hasCaptcha) {
      try {
        const pageText = await page.textContent('body').catch(() => '');
        const captchaKeywords = ['captcha', 'verify you', 'i\'m not a robot', 'robot check'];
        hasCaptcha = captchaKeywords.some(keyword => 
          pageText.toLowerCase().includes(keyword.toLowerCase())
        );
      } catch {
        // Continue
      }
    }

    if (hasCaptcha) {
      if (this.logger) {
        this.logger.warn('CAPTCHA detected - waiting for manual solving', { url: page.url() });
      }
      console.log('');
      console.log('⚠️  CAPTCHA detected!');
      console.log('   Please solve the CAPTCHA in the browser window.');
      console.log('   Waiting for you to complete it...');
      console.log('   (The script will continue automatically after 60 seconds)');
      console.log('');

      // Wait up to 60 seconds for CAPTCHA to be solved
      // Check every 2 seconds if CAPTCHA is still present
      const maxWait = 60000; // 60 seconds
      const checkInterval = 2000; // 2 seconds
      let waited = 0;

      while (waited < maxWait) {
        await page.waitForTimeout(checkInterval);
        waited += checkInterval;

        // Check if CAPTCHA is still present
        let stillHasCaptcha = false;
        for (const selector of captchaSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              const isVisible = await element.isVisible().catch(() => false);
              if (isVisible) {
                stillHasCaptcha = true;
                break;
              }
            }
          } catch {
            // Continue
          }
        }

        if (!stillHasCaptcha) {
          // Check page text again
          try {
            const pageText = await page.textContent('body').catch(() => '');
            const captchaKeywords = ['captcha', 'verify you', 'i\'m not a robot'];
            stillHasCaptcha = captchaKeywords.some(keyword => 
              pageText.toLowerCase().includes(keyword.toLowerCase())
            );
          } catch {
            // Continue
          }
        }

        if (!stillHasCaptcha) {
          console.log('✅ CAPTCHA appears to be solved. Continuing...');
          break;
        }

        // Show progress every 10 seconds
        if (waited % 10000 === 0) {
          console.log(`   Still waiting... (${waited / 1000}s elapsed)`);
        }
      }

      if (waited >= maxWait) {
        console.warn('⚠️  Timeout waiting for CAPTCHA. Continuing anyway...');
      }
    }
  }

  /**
   * Checks if user is already logged in
   * @private
   */
  async _checkLoggedIn(page, outlet) {
    // Check for common logged-in indicators
    const indicators = [
      'a[href*="logout"]',
      'a[href*="sign-out"]',
      '.user-menu',
      '[data-testid*="user"]',
    ];

    for (const selector of indicators) {
      try {
        const element = await page.$(selector);
        if (element) return true;
      } catch {
        // Continue
      }
    }

    return false;
  }

  /**
   * Gets login URL for an outlet
   * @private
   */
  _getLoginUrl(outlet) {
    const urls = {
      'Wall Street Journal': 'https://www.wsj.com/login',
      'Financial Times': 'https://www.ft.com/login',
      'The Economist': 'https://www.economist.com/user/login',
    };

    return urls[outlet] || 'https://www.google.com';
  }

  /**
   * Gets login form selectors for an outlet
   * Supports two-step login: email -> continue -> password -> submit
   * @private
   */
  _getLoginSelectors(outlet) {
    const selectors = {
      'Wall Street Journal': {
        email: 'input[name="username"], input[type="email"], input[id*="email"], input[id*="username"]',
        continue: 'button:has-text("Continue"), button:has-text("Next"), button[type="submit"]:has-text("Continue"), button[type="submit"]:has-text("Next")',
        password: 'input[name="password"], input[type="password"], input[id*="password"]',
        submit: 'button[type="submit"]:has-text("Sign In"), button[type="submit"]:has-text("Log In"), button:has-text("Sign In"), button:has-text("Log In")',
      },
      'Financial Times': {
        email: 'input[name="email"], input[type="email"], input[id*="email"]',
        continue: 'button:has-text("Continue"), button:has-text("Next"), button[type="submit"]:has-text("Continue"), button[type="submit"]:has-text("Next")',
        password: 'input[name="password"], input[type="password"], input[id*="password"]',
        submit: 'button[type="submit"]:has-text("Sign In"), button:has-text("Sign In"), button:has-text("Log In")',
      },
      'The Economist': {
        email: 'input[name="email"], input[type="email"], input[id*="email"]',
        continue: 'button:has-text("Continue"), button:has-text("Next"), button[type="submit"]:has-text("Continue"), button[type="submit"]:has-text("Next")',
        password: 'input[name="password"], input[type="password"], input[id*="password"]',
        submit: 'button[type="submit"]:has-text("Sign In"), button:has-text("Sign In"), button:has-text("Log In")',
      },
    };

    return selectors[outlet] || {
      email: 'input[type="email"]',
      continue: 'button:has-text("Continue"), button[type="submit"]',
      password: 'input[type="password"]',
      submit: 'button[type="submit"]',
    };
  }

  /**
   * Extracts article content from the page
   * @private
   */
  async _extractContent(page, url, options) {
    // Try outlet-specific selectors first
    const outlet = options.outlet;
    const customSelectors = options.selectors || this._getContentSelectors(outlet);

    let title = '';
    let textContent = '';
    let author = '';
    let publishedDate = null;

    // Extract title
    if (customSelectors.title) {
      try {
        const titleElement = await page.$(customSelectors.title);
        if (titleElement) {
          title = await titleElement.textContent();
          title = title.trim();
        }
      } catch (error) {
        if (this.logger) {
          this.logger.warn('Failed to extract title with custom selector', { error: error.message });
        }
      }
    }

    // Fallback to common selectors
    if (!title) {
      const commonTitleSelectors = [
        'h1',
        'article h1',
        '[class*="headline"]',
        '[class*="title"]',
        'h1[class*="article"]',
      ];

      for (const selector of commonTitleSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            title = await element.textContent();
            title = title.trim();
            if (title) break;
          }
        } catch {
          // Continue
        }
      }
    }

    // Extract main content
    if (customSelectors.content) {
      try {
        const contentElement = await page.$(customSelectors.content);
        if (contentElement) {
          textContent = await contentElement.textContent();
          textContent = textContent.trim();
        }
      } catch (error) {
        if (this.logger) {
          this.logger.warn('Failed to extract content with custom selector', { error: error.message });
        }
      }
    }

    // Fallback to common content selectors
    if (!textContent) {
      const commonContentSelectors = [
        'article',
        '[class*="article-body"]',
        '[class*="content"]',
        '[class*="story-body"]',
        'main',
        '[role="article"]',
      ];

      for (const selector of commonContentSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            textContent = await element.textContent();
            textContent = textContent.trim();
            if (textContent && textContent.length > 500) break; // Ensure we got substantial content
          }
        } catch {
          // Continue
        }
      }
    }

    // Extract author
    if (customSelectors.author) {
      try {
        const authorElement = await page.$(customSelectors.author);
        if (authorElement) {
          author = await authorElement.textContent();
          author = author.trim();
        }
      } catch {
        // Continue
      }
    }

    // Extract published date
    if (customSelectors.publishedDate) {
      try {
        const dateElement = await page.$(customSelectors.publishedDate);
        if (dateElement) {
          const dateText = await dateElement.textContent();
          publishedDate = this._parseDate(dateText);
        }
      } catch {
        // Continue
      }
    }

    // Try to extract from meta tags
    if (!publishedDate) {
      try {
        const metaDate = await page.$eval('meta[property="article:published_time"], meta[name="publish-date"]', 
          el => el.getAttribute('content'));
        if (metaDate) {
          publishedDate = new Date(metaDate);
        }
      } catch {
        // Continue
      }
    }

    return {
      url,
      title: title || 'Untitled',
      textContent: textContent || '',
      author: author || '',
      publishedDate: publishedDate,
      sourceDomain: this._extractDomain(url),
    };
  }

  /**
   * Gets content selectors for an outlet
   * @private
   */
  _getContentSelectors(outlet) {
    const selectors = {
      'Wall Street Journal': {
        title: 'h1[class*="headline"]',
        content: 'div[class*="article-body"]',
        author: '[class*="byline"]',
        publishedDate: 'time, [class*="timestamp"]',
      },
      'Financial Times': {
        title: 'h1',
        content: 'div[class*="article-body"]',
        author: '[class*="byline"]',
        publishedDate: 'time',
      },
      'The Economist': {
        title: 'h1',
        content: 'article[class*="article-body"]',
        author: '[class*="byline"]',
        publishedDate: 'time',
      },
    };

    return selectors[outlet] || {};
  }

  /**
   * Parses date string to Date object
   * @private
   */
  _parseDate(dateString) {
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

  /**
   * Adds human-like delay
   * @private
   */
  async _humanDelay() {
    const delay = 500 + Math.random() * 1000; // 500-1500ms
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

