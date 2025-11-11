import { KeyValueStore } from 'crawlee';

// Track processed articles to prevent duplicates
const processedArticlesKey = 'PROCESSED_ARTICLES';
const pendingArticlesKey = 'PENDING_ARTICLES';
let processedArticles = null;

export async function getProcessedArticles() {
    if (processedArticles === null) {
        const kvStore = await KeyValueStore.open();
        const stored = await kvStore.getValue(processedArticlesKey);
        processedArticles = stored ? new Set(stored) : new Set();
    }
    return processedArticles;
}

export async function markArticleAsProcessed(articleLink) {
    const articles = await getProcessedArticles();
    articles.add(articleLink);
    const kvStore = await KeyValueStore.open();
    await kvStore.setValue(processedArticlesKey, Array.from(articles));
}

export async function isArticleProcessed(articleLink) {
    const articles = await getProcessedArticles();
    return articles.has(articleLink);
}

/**
 * Adds an article to the pending queue for later processing
 * @param {Object} article - Article object with link, title, description, pubDate
 * @param {string} source - News source name
 */
export async function addPendingArticle(article, source) {
    const kvStore = await KeyValueStore.open();
    let stored;
    try {
        stored = await kvStore.getValue(pendingArticlesKey);
    } catch (error) {
        // Handle corrupted or empty storage
        stored = null;
    }
    const pendingArticles = Array.isArray(stored) ? stored : [];
    
    // Only add if not already processed
    if (article.link && !await isArticleProcessed(article.link)) {
        pendingArticles.push({
            url: article.link,
            source: source,
            rssTitle: article.title,
            rssDescription: article.description,
            rssPubDate: article.pubDate,
        });
    }
    
    await kvStore.setValue(pendingArticlesKey, pendingArticles);
}

/**
 * Gets all pending articles and clears the queue
 * @returns {Array} Array of pending article objects
 */
export async function getAndClearPendingArticles() {
    const kvStore = await KeyValueStore.open();
    let stored;
    try {
        stored = await kvStore.getValue(pendingArticlesKey);
    } catch (error) {
        // Handle corrupted or empty storage
        stored = null;
    }
    const pendingArticles = Array.isArray(stored) ? stored : [];
    
    // Clear the queue
    await kvStore.setValue(pendingArticlesKey, []);
    
    return pendingArticles;
}

