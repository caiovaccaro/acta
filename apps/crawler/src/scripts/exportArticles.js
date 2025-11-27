/**
 * Exports full article data from PostgreSQL to CSV and JSON
 * This includes articles with extracted content
 */

import { connectDatabase, disconnectDatabase, prisma } from '@acta/db';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Exports articles from PostgreSQL to CSV and JSON
 */
async function exportArticles() {
    const projectRoot = resolve(__dirname, '../../..');
    
    try {
        await connectDatabase();
        
        console.log('📊 Fetching articles from PostgreSQL...\n');
        
        // Fetch all articles from database
        const articles = await prisma.article.findMany({
            include: {
                outlet: {
                    select: {
                        name: true,
                        ideology: true,
                    },
                },
                crawlRequest: {
                    select: {
                        status: true,
                        attempts: true,
                    },
                },
            },
            orderBy: {
                extractedAt: 'desc',
            },
        });
        
        console.log(`✅ Loaded ${articles.length} articles from database\n`);
        
        if (articles.length === 0) {
            console.log('ℹ️  No articles found in database.');
            await disconnectDatabase();
            return;
        }
        
        // Transform articles to export format
        const exportData = articles.map(article => ({
            id: article.id,
            url: article.url,
            outlet: article.outlet.name,
            outletId: article.outletId,
            ideology: article.outlet.ideology,
            title: article.title,
            textContent: article.textContent,
            excerpt: article.excerpt,
            publishedDate: article.publishedDate?.toISOString() || '',
            extractedAt: article.extractedAt.toISOString(),
            createdAt: article.createdAt.toISOString(),
            crawlRequestStatus: article.crawlRequest?.status || '',
            crawlRequestAttempts: article.crawlRequest?.attempts || 0,
        }));
        
        // Get all unique keys for CSV headers
        const allKeys = new Set();
        exportData.forEach(article => {
            Object.keys(article).forEach(key => allKeys.add(key));
        });
        const headers = Array.from(allKeys).sort();
        
        // Create CSV content
        const csvRows = [];
        csvRows.push(headers.join(','));
        
        for (const article of exportData) {
            const row = headers.map(header => {
                const value = article[header];
                
                // Handle different value types
                if (value === null || value === undefined) {
                    return '';
                }
                
                if (Array.isArray(value)) {
                    return `"${value.join('; ')}"`;
                }
                
                if (typeof value === 'object') {
                    return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                }
                
                // Escape quotes and wrap in quotes if contains comma, quote, or newline
                const stringValue = String(value);
                const escaped = stringValue.replace(/"/g, '""');
                if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') || escaped.includes('\r')) {
                    return `"${escaped}"`;
                }
                return escaped;
            });
            csvRows.push(row.join(','));
        }
        
        const csvContent = csvRows.join('\n');
        const csvPath = resolve(projectRoot, 'articles-export.csv');
        writeFileSync(csvPath, csvContent, 'utf-8');
        console.log(`✅ Exported to CSV: ${csvPath}`);
        
        // Export to JSON
        const jsonPath = resolve(projectRoot, 'articles-export.json');
        writeFileSync(jsonPath, JSON.stringify(exportData, null, 2), 'utf-8');
        console.log(`✅ Exported to JSON: ${jsonPath}`);
        
        console.log(`\n✨ Articles export complete! Open articles-export.csv in Excel.`);
        
        await disconnectDatabase();
    } catch (err) {
        console.error('❌ Error exporting articles:', err.message);
        await disconnectDatabase();
        process.exit(1);
    }
}

exportArticles();
