import { readdir, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { writeFileSync } from 'fs';

/**
 * Exports RSS feed metadata to CSV and JSON
 * This includes only the metadata extracted from RSS feeds (before full article extraction)
 */
async function exportRSS() {
    const datasetDir = resolve('storage/datasets/default');
    
    try {
        // Read all JSON files from the dataset directory
        const files = await readdir(datasetDir);
        const jsonFiles = files.filter(f => f.endsWith('.json')).sort();
        
        if (jsonFiles.length === 0) {
            console.log('⚠️  No data found in dataset directory.');
            return;
        }
        
        console.log(`📊 Found ${jsonFiles.length} data files\n`);
        console.log('Reading RSS metadata...');
        
        const rssItems = [];
        for (const file of jsonFiles) {
            try {
                const content = await readFile(join(datasetDir, file), 'utf-8');
                const item = JSON.parse(content);
                
                // Only include items that have RSS metadata but not full article content
                // RSS-only items have: source, feedUrl, title, link, description, pubDate
                // Full articles have additional fields like: textContent, articleUrl, extractedAt
                if (item.source && item.link && !item.textContent && !item.articleUrl) {
                    rssItems.push(item);
                }
            } catch (err) {
                console.warn(`⚠️  Error reading ${file}:`, err.message);
            }
        }
        
        console.log(`✅ Loaded ${rssItems.length} RSS feed items\n`);
        
        if (rssItems.length === 0) {
            console.log('ℹ️  No RSS metadata found. All items may have been processed to full articles.');
            return;
        }
        
        // Export to CSV
        const headers = ['source', 'feedUrl', 'title', 'link', 'description', 'pubDate'];
        
        // Create CSV content
        const csvRows = [];
        csvRows.push(headers.join(','));
        
        for (const item of rssItems) {
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
        const csvPath = resolve('rss-export.csv');
        writeFileSync(csvPath, csvContent, 'utf-8');
        console.log(`✅ Exported to CSV: ${csvPath}`);
        
        // Export to JSON
        const jsonPath = resolve('rss-export.json');
        writeFileSync(jsonPath, JSON.stringify(rssItems, null, 2), 'utf-8');
        console.log(`✅ Exported to JSON: ${jsonPath}`);
        
        console.log(`\n✨ RSS export complete! Open rss-export.csv in Excel.`);
    } catch (err) {
        console.error('❌ Error exporting RSS data:', err.message);
        console.error('Make sure the crawler has run and created data in storage/datasets/default/');
    }
}

exportRSS();

