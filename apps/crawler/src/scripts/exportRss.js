/**
 * Exports RSS feed metadata from PostgreSQL to CSV and JSON
 * This includes crawl requests that represent RSS feed items
 */

import { connectDatabase, disconnectDatabase, prisma, CrawlStatus } from '@acta/db';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Exports RSS metadata (crawl requests) from PostgreSQL to CSV and JSON
 */
async function exportRSS() {
    const projectRoot = resolve(__dirname, '../../..');
    
    try {
        await connectDatabase();
        
        console.log('📊 Fetching RSS metadata (crawl requests) from PostgreSQL...\n');
        
        // Fetch all crawl requests with outlet info
        // These represent RSS feed items
        const crawlRequests = await prisma.crawlRequest.findMany({
            include: {
                outlet: {
                    select: {
                        name: true,
                        ideology: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        
        console.log(`✅ Loaded ${crawlRequests.length} crawl requests from database\n`);
        
        if (crawlRequests.length === 0) {
            console.log('ℹ️  No crawl requests found in database.');
            await disconnectDatabase();
            return;
        }
        
        // Transform to export format
        const exportData = crawlRequests.map(request => ({
            id: request.id,
            url: request.url,
            outlet: request.outlet.name,
            outletId: request.outletId,
            ideology: request.outlet.ideology,
            status: request.status,
            attempts: request.attempts,
            errorMessage: request.errorMessage || '',
            createdAt: request.createdAt.toISOString(),
            updatedAt: request.updatedAt.toISOString(),
        }));
        
        // Export to CSV
        const headers = ['id', 'url', 'outlet', 'outletId', 'ideology', 'status', 'attempts', 'errorMessage', 'createdAt', 'updatedAt'];
        
        const csvRows = [];
        csvRows.push(headers.join(','));
        
        for (const item of exportData) {
            const row = headers.map(header => {
                const value = item[header] || '';
                // Escape quotes and wrap in quotes if contains comma, quote, or newline
                const escaped = String(value).replace(/"/g, '""');
                if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
                    return `"${escaped}"`;
                }
                return escaped;
            });
            csvRows.push(row.join(','));
        }
        
        const csvContent = csvRows.join('\n');
        const csvPath = resolve(projectRoot, 'rss-export.csv');
        writeFileSync(csvPath, csvContent, 'utf-8');
        console.log(`✅ Exported to CSV: ${csvPath}`);
        
        // Export to JSON
        const jsonPath = resolve(projectRoot, 'rss-export.json');
        writeFileSync(jsonPath, JSON.stringify(exportData, null, 2), 'utf-8');
        console.log(`✅ Exported to JSON: ${jsonPath}`);
        
        console.log(`\n✨ RSS export complete! Open rss-export.csv in Excel.`);
        
        await disconnectDatabase();
    } catch (err) {
        console.error('❌ Error exporting RSS data:', err.message);
        await disconnectDatabase();
        process.exit(1);
    }
}

exportRSS();
