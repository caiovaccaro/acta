/**
 * Migration Script: File Storage → PostgreSQL
 * Migrates existing articles from Crawlee file storage to PostgreSQL
 * 
 * Usage: node apps/crawler/src/scripts/migrateFromFileStorage.js
 */

import { connectDatabase, disconnectDatabase, prisma } from '@acta/db';
import { readdir, readFile } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Migrates articles from file storage to PostgreSQL
 */
async function migrateFromFileStorage() {
    const datasetDir = resolve(__dirname, '../../storage/datasets/default');
    
    try {
        await connectDatabase();
        console.log('✅ Connected to database\n');
        
        // Check if storage directory exists
        let files;
        try {
            files = await readdir(datasetDir);
        } catch (error) {
            console.log('ℹ️  No file storage directory found. Nothing to migrate.');
            await disconnectDatabase();
            return;
        }
        
        const jsonFiles = files.filter(f => f.endsWith('.json')).sort();
        
        if (jsonFiles.length === 0) {
            console.log('ℹ️  No JSON files found in storage directory. Nothing to migrate.');
            await disconnectDatabase();
            return;
        }
        
        console.log(`📊 Found ${jsonFiles.length} files to process\n`);
        
        let migrated = 0;
        let skipped = 0;
        let errors = 0;
        
        for (const file of jsonFiles) {
            try {
                const content = await readFile(join(datasetDir, file), 'utf-8');
                const item = JSON.parse(content);
                
                // Only migrate full articles (with textContent and articleUrl)
                if (!item.articleUrl || !item.textContent) {
                    skipped++;
                    continue;
                }
                
                // Find or create outlet
                const outlet = await prisma.outlet.upsert({
                    where: { name: item.source || 'Unknown' },
                    update: {},
                    create: {
                        name: item.source || 'Unknown',
                        ideology: 'Center', // Default
                        credibilityScore: 0.5,
                        rssFeeds: item.feedUrl ? [item.feedUrl] : [],
                    },
                });
                
                // Parse published date
                let publishedDate = null;
                if (item.rssPubDate || item.publishedTime) {
                    const dateStr = item.rssPubDate || item.publishedTime;
                    const parsedDate = new Date(dateStr);
                    if (!isNaN(parsedDate.getTime())) {
                        publishedDate = parsedDate;
                    }
                }
                
                // Create or update article
                await prisma.article.upsert({
                    where: { url: item.articleUrl },
                    update: {
                        title: item.title || item.rssTitle || '',
                        textContent: item.textContent,
                        excerpt: item.excerpt || item.rssDescription || null,
                        publishedDate: publishedDate,
                    },
                    create: {
                        url: item.articleUrl,
                        outletId: outlet.id,
                        title: item.title || item.rssTitle || '',
                        textContent: item.textContent,
                        excerpt: item.excerpt || item.rssDescription || null,
                        publishedDate: publishedDate,
                    },
                });
                
                migrated++;
                if (migrated % 10 === 0) {
                    console.log(`   Migrated ${migrated} articles...`);
                }
            } catch (error) {
                errors++;
                console.warn(`⚠️  Error processing ${file}:`, error.message);
            }
        }
        
        console.log(`\n✅ Migration complete!`);
        console.log(`   Migrated: ${migrated}`);
        console.log(`   Skipped: ${skipped}`);
        console.log(`   Errors: ${errors}`);
        
        await disconnectDatabase();
    } catch (error) {
        console.error('❌ Migration failed:', error);
        await disconnectDatabase();
        process.exit(1);
    }
}

migrateFromFileStorage();

