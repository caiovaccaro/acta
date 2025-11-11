import { getAndClearPendingArticles } from './storage.js';

/**
 * Enqueues pending article links for full content extraction
 * This function is called after RSS feed processing is complete
 * @returns {Promise<Array>} Array of request objects ready to be processed
 */
export async function enqueuePendingArticles() {
    const pendingArticles = await getAndClearPendingArticles();
    
    if (pendingArticles.length === 0) {
        console.log('ℹ️  No pending articles to enqueue');
        return [];
    }
    
    const requests = pendingArticles.map(article => ({
        url: article.url,
        label: 'article',
        userData: {
            source: article.source,
            rssTitle: article.rssTitle,
            rssDescription: article.rssDescription,
            rssPubDate: article.rssPubDate,
        }
    }));
    
    console.log(`✅ Prepared ${requests.length} article URLs for content extraction`);
    
    return requests;
}

