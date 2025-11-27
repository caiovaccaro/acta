/**
 * Script to check crawl request status in database
 */

import { connectDatabase, disconnectDatabase, prisma, CrawlStatus } from '@acta/db';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../../../.env') });

async function checkCrawlRequests() {
    await connectDatabase();
    
    try {
        const counts = await prisma.crawlRequest.groupBy({
            by: ['status'],
            _count: {
                id: true,
            },
        });
        
        console.log('\n📊 Crawl Request Status:');
        counts.forEach(({ status, _count }) => {
            console.log(`  ${status}: ${_count.id}`);
        });
        
        // Get in_progress requests
        const inProgress = await prisma.crawlRequest.findMany({
            where: { status: CrawlStatus.in_progress },
            take: 10,
            include: { outlet: true },
            orderBy: { updatedAt: 'desc' },
        });
        
        if (inProgress.length > 0) {
            console.log(`\n⚠️  Found ${inProgress.length} in_progress requests (showing first 10):`);
            inProgress.forEach(req => {
                const age = Math.round((Date.now() - req.updatedAt.getTime()) / 1000 / 60);
                console.log(`  - ${req.outlet.name}: ${req.url.substring(0, 60)}... (${age} minutes old)`);
            });
        }
        
        // Get pending requests
        const pending = await prisma.crawlRequest.findMany({
            where: { status: CrawlStatus.pending },
            take: 10,
            include: { outlet: true },
            orderBy: { createdAt: 'desc' },
        });
        
        if (pending.length > 0) {
            console.log(`\n✅ Found ${pending.length} pending requests (showing first 10):`);
            pending.forEach(req => {
                const age = Math.round((Date.now() - req.createdAt.getTime()) / 1000 / 60);
                console.log(`  - ${req.outlet.name}: ${req.url.substring(0, 60)}... (${age} minutes old)`);
            });
        } else {
            console.log('\nℹ️  No pending requests found');
        }
        
    } catch (error) {
        console.error('Error checking crawl requests:', error);
    } finally {
        await disconnectDatabase();
    }
}

checkCrawlRequests();



