/**
 * Error Handler for Paywall Authentication
 * Implements error tagging, monitoring, and retry logic
 */

/**
 * Error types for paywall-related failures
 */
export const ERROR_TYPES = {
    AUTH_FAILED: 'auth_failed',
    PAYWALL_BLOCK: 'paywall_block',
    PARSE_ERROR: 'parse_error',
    RATE_LIMITED: 'rate_limited',
    SESSION_EXPIRED: 'session_expired',
    NETWORK_ERROR: 'network_error',
    TIMEOUT: 'timeout',
    UNKNOWN: 'unknown',
};

/**
 * Error statistics per outlet
 */
const errorStats = new Map();

/**
 * Get error statistics for an outlet
 * @param {string} outletName - Outlet name
 * @returns {Object} Error statistics
 */
export function getErrorStats(outletName) {
    if (!errorStats.has(outletName)) {
        errorStats.set(outletName, {
            totalErrors: 0,
            errorsByType: {},
            lastError: null,
            lastErrorTime: null,
            consecutiveFailures: 0,
            loginSuccessCount: 0,
            loginFailureCount: 0,
            articleSuccessCount: 0,
            articleFailureCount: 0,
            latency: [],
        });
    }
    return errorStats.get(outletName);
}

/**
 * Record an error for an outlet
 * @param {string} outletName - Outlet name
 * @param {string} errorType - Error type (from ERROR_TYPES)
 * @param {Error|string} error - Error object or message
 * @param {Object} context - Additional context (optional)
 */
export function recordError(outletName, errorType, error, context = {}) {
    const stats = getErrorStats(outletName);
    
    stats.totalErrors++;
    stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + 1;
    stats.lastError = error instanceof Error ? error.message : error;
    stats.lastErrorTime = new Date().toISOString();
    
    if (errorType === ERROR_TYPES.AUTH_FAILED || errorType === ERROR_TYPES.SESSION_EXPIRED) {
        stats.consecutiveFailures++;
        stats.loginFailureCount++;
    } else {
        // Reset consecutive failures on non-auth errors
        stats.consecutiveFailures = 0;
    }
    
    // Log error with context (never log credentials)
    const logContext = { ...context };
    delete logContext.password;
    delete logContext.credentials;
    delete logContext.cookies;
    
    console.error(`[${outletName}] Error (${errorType}):`, error instanceof Error ? error.message : error, logContext);
}

/**
 * Record successful operation
 * @param {string} outletName - Outlet name
 * @param {string} operationType - 'login' or 'article'
 * @param {number} latency - Operation latency in ms (optional)
 */
export function recordSuccess(outletName, operationType, latency = null) {
    const stats = getErrorStats(outletName);
    
    if (operationType === 'login') {
        stats.loginSuccessCount++;
        stats.consecutiveFailures = 0; // Reset on successful login
    } else if (operationType === 'article') {
        stats.articleSuccessCount++;
    }
    
    if (latency !== null) {
        stats.latency.push(latency);
        // Keep only last 100 latency measurements
        if (stats.latency.length > 100) {
            stats.latency.shift();
        }
    }
}

/**
 * Check if outlet has too many consecutive failures
 * @param {string} outletName - Outlet name
 * @param {number} threshold - Maximum consecutive failures (default: 3)
 * @returns {boolean} True if should stop retrying
 */
export function shouldStopRetrying(outletName, threshold = 3) {
    const stats = getErrorStats(outletName);
    return stats.consecutiveFailures >= threshold;
}

/**
 * Get error rate for an outlet
 * @param {string} outletName - Outlet name
 * @returns {Object} Error rates
 */
export function getErrorRates(outletName) {
    const stats = getErrorStats(outletName);
    
    const totalLoginAttempts = stats.loginSuccessCount + stats.loginFailureCount;
    const totalArticleAttempts = stats.articleSuccessCount + stats.articleFailureCount;
    
    return {
        loginSuccessRate: totalLoginAttempts > 0 
            ? (stats.loginSuccessCount / totalLoginAttempts) * 100 
            : 0,
        articleSuccessRate: totalArticleAttempts > 0
            ? (stats.articleSuccessCount / totalArticleAttempts) * 100
            : 0,
        averageLatency: stats.latency.length > 0
            ? stats.latency.reduce((a, b) => a + b, 0) / stats.latency.length
            : 0,
        errorRateByType: stats.errorsByType,
        consecutiveFailures: stats.consecutiveFailures,
    };
}

/**
 * Tag error by analyzing error message and HTTP status
 * @param {Error|Object} error - Error object or response
 * @param {number} statusCode - HTTP status code (optional)
 * @returns {string} Error type
 */
export function tagError(error, statusCode = null) {
    // Check HTTP status code first
    if (statusCode) {
        if (statusCode === 401 || statusCode === 403) {
            return ERROR_TYPES.AUTH_FAILED;
        }
        if (statusCode === 429) {
            return ERROR_TYPES.RATE_LIMITED;
        }
        if (statusCode >= 500) {
            return ERROR_TYPES.NETWORK_ERROR;
        }
    }
    
    // Check error message
    const errorMessage = error?.message || error?.toString() || '';
    const lowerMessage = errorMessage.toLowerCase();
    
    if (lowerMessage.includes('auth') || lowerMessage.includes('login') || lowerMessage.includes('unauthorized')) {
        return ERROR_TYPES.AUTH_FAILED;
    }
    if (lowerMessage.includes('paywall') || lowerMessage.includes('subscription') || lowerMessage.includes('locked')) {
        return ERROR_TYPES.PAYWALL_BLOCK;
    }
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
        return ERROR_TYPES.RATE_LIMITED;
    }
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
        return ERROR_TYPES.TIMEOUT;
    }
    if (lowerMessage.includes('parse') || lowerMessage.includes('invalid')) {
        return ERROR_TYPES.PARSE_ERROR;
    }
    if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
        return ERROR_TYPES.NETWORK_ERROR;
    }
    
    return ERROR_TYPES.UNKNOWN;
}

/**
 * Calculate exponential backoff delay
 * @param {number} attemptNumber - Current attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in ms (default: 1000)
 * @param {number} maxDelay - Maximum delay in ms (default: 30000)
 * @returns {number} Delay in milliseconds
 */
export function calculateBackoff(attemptNumber, baseDelay = 1000, maxDelay = 30000) {
    const delay = Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);
    // Add jitter (random 0-20% of delay)
    const jitter = delay * 0.2 * Math.random();
    return Math.floor(delay + jitter);
}

/**
 * Log error statistics summary
 * @param {string} outletName - Outlet name (optional, logs all if not provided)
 */
export function logErrorSummary(outletName = null) {
    if (outletName) {
        const rates = getErrorRates(outletName);
        const stats = getErrorStats(outletName);
        
        console.log(`\n📊 Error Summary for ${outletName}:`);
        console.log(`  Login Success Rate: ${rates.loginSuccessRate.toFixed(1)}%`);
        console.log(`  Article Success Rate: ${rates.articleSuccessRate.toFixed(1)}%`);
        console.log(`  Average Latency: ${rates.averageLatency.toFixed(0)}ms`);
        console.log(`  Consecutive Failures: ${stats.consecutiveFailures}`);
        console.log(`  Total Errors: ${stats.totalErrors}`);
        console.log(`  Errors by Type:`, rates.errorRateByType);
    } else {
        // Log summary for all outlets
        for (const [name, stats] of errorStats.entries()) {
            if (stats.totalErrors > 0 || stats.loginSuccessCount > 0 || stats.articleSuccessCount > 0) {
                logErrorSummary(name);
            }
        }
    }
}

/**
 * Reset error statistics for an outlet
 * @param {string} outletName - Outlet name
 */
export function resetErrorStats(outletName) {
    errorStats.delete(outletName);
}

