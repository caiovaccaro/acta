/**
 * Logger utility for ingestion jobs
 * Logs to both console and file
 */

import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class IngestionLogger {
  constructor(logDir = '../../logs') {
    this.logDir = resolve(__dirname, logDir);
    
    // Create logs directory if it doesn't exist
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
    
    // Create log file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = resolve(this.logDir, `ingestion-${timestamp}.log`);
    this.logStream = createWriteStream(this.logFile, { flags: 'a' });
    
    console.log(`📝 Logging to: ${this.logFile}`);
  }

  /**
   * Logs a message to both console and file
   * @param {string} level - Log level (INFO, WARN, ERROR, DEBUG)
   * @param {string} message - Log message
   * @param {any} [data] - Optional data to log
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data }),
    };
    
    const logLine = JSON.stringify(logEntry) + '\n';
    
    // Write to file
    this.logStream.write(logLine);
    
    // Also log to console with appropriate formatting
    const consoleMessage = `[${timestamp}] [${level}] ${message}`;
    if (data) {
      console.log(consoleMessage, data);
    } else {
      console.log(consoleMessage);
    }
  }

  /**
   * Log API request
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} [body] - Request body
   * @param {Object} [headers] - Request headers (will mask API key)
   */
  logApiRequest(method, url, body = null, headers = null) {
    const safeHeaders = { ...headers };
    if (safeHeaders.Authorization) {
      safeHeaders.Authorization = 'Bearer ***REDACTED***';
    }
    
    this.log('DEBUG', 'API Request', {
      method,
      url,
      body: body ? JSON.stringify(body, null, 2) : null,
      headers: safeHeaders,
    });
  }

  /**
   * Log API response
   * @param {number} status - HTTP status code
   * @param {any} [response] - Response data
   * @param {number} [duration] - Request duration in ms
   */
  logApiResponse(status, response = null, duration = null) {
    this.log('DEBUG', 'API Response', {
      status,
      duration: duration ? `${duration}ms` : null,
      response: response ? (typeof response === 'string' ? response.substring(0, 1000) : JSON.stringify(response).substring(0, 1000)) : null,
    });
  }

  /**
   * Log API error
   * @param {Error} error - Error object
   * @param {Object} [context] - Additional context
   */
  logApiError(error, context = null) {
    this.log('ERROR', 'API Error', {
      message: error.message,
      code: error.code,
      status: error.status,
      stack: error.stack,
      ...(context && { context }),
    });
  }

  /**
   * Log article processing
   * @param {string} topic - Topic name
   * @param {number} count - Number of articles
   * @param {Array} [articles] - Article data
   */
  logArticles(topic, count, articles = null) {
    this.log('INFO', `Articles fetched for topic "${topic}"`, {
      topic,
      count,
      articles: articles ? articles.map(a => ({
        url: a.url,
        title: a.title?.substring(0, 100),
        sourceDomain: a.sourceDomain,
        publishedDate: a.publishedDate,
      })) : null,
    });
  }

  info(message, data = null) {
    this.log('INFO', message, data);
  }

  warn(message, data = null) {
    this.log('WARN', message, data);
  }

  error(message, data = null) {
    this.log('ERROR', message, data);
  }

  debug(message, data = null) {
    this.log('DEBUG', message, data);
  }

  /**
   * Closes the log stream
   */
  close() {
    if (this.logStream) {
      this.logStream.end();
    }
  }
}

export default IngestionLogger;

