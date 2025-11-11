import { readdir, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { writeFileSync } from 'fs';

/**
 * Exports full article data to CSV and JSON
 * This includes articles with extracted content (after full article processing)
 */
async function exportArticles() {
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
        console.log('Reading articles...');
        
        const articles = [];
        for (const file of jsonFiles) {
            try {
                const content = await readFile(join(datasetDir, file), 'utf-8');
                const item = JSON.parse(content);
                
                // Only include items that have full article content
                // Full articles have: textContent and articleUrl
                if (item.articleUrl && item.textContent) {
                    articles.push(item);
                }
            } catch (err) {
                console.warn(`⚠️  Error reading ${file}:`, err.message);
            }
        }
        
        console.log(`✅ Loaded ${articles.length} articles\n`);
        
        if (articles.length === 0) {
            console.log('ℹ️  No full articles found. Articles may not have been processed yet.');
            return;
        }
        
        // Get all unique keys from articles for CSV headers
        const allKeys = new Set();
        articles.forEach(article => {
            Object.keys(article).forEach(key => allKeys.add(key));
        });
        const headers = Array.from(allKeys).sort();
        
        // Create CSV content
        const csvRows = [];
        csvRows.push(headers.join(','));
        
        for (const article of articles) {
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
        const csvPath = resolve('articles-export.csv');
        writeFileSync(csvPath, csvContent, 'utf-8');
        console.log(`✅ Exported to CSV: ${csvPath}`);
        
        // Export to JSON
        const jsonPath = resolve('articles-export.json');
        writeFileSync(jsonPath, JSON.stringify(articles, null, 2), 'utf-8');
        console.log(`✅ Exported to JSON: ${jsonPath}`);
        
        console.log(`\n✨ Articles export complete! Open articles-export.csv in Excel.`);
    } catch (err) {
        console.error('❌ Error exporting articles:', err.message);
        console.error('Make sure the crawler has run and created articles in storage/datasets/default/');
    }
}

exportArticles();

