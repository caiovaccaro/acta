/**
 * Remove Incomplete Quotes
 * 
 * This script removes evidence bullets (quotes and points for debate) that are incomplete
 * or too short to be meaningful.
 * 
 * Usage:
 *   npm run db:remove:incomplete-quotes
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { prisma, connectDatabase, disconnectDatabase } from '../index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
const projectRoot = resolve(__dirname, '../../../../');
config({ path: resolve(projectRoot, '.env') });

/**
 * Checks if a quote is incomplete or invalid
 */
function isIncompleteQuote(text: string): boolean {
  const trimmed = text.trim();
  
  // Must be at least 20 characters
  if (trimmed.length < 20) return true;
  
  // Must not end with incomplete escape sequence
  if (trimmed.endsWith('\\"')) return true;
  
  // Must not end with just a quote mark if very short (unless it has sentence-ending punctuation)
  if (trimmed.endsWith('"') && trimmed.length < 50) {
    // Check if it has sentence-ending punctuation before the quote
    const beforeQuote = trimmed.slice(0, -1);
    if (!beforeQuote.match(/[.!?]$/)) {
      return true; // Ends with quote but no sentence-ending punctuation
    }
  }
  
  // Must have at least 3 words
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 3) return true;
  
  return false;
}

async function main() {
  console.log('🔍 Finding Incomplete Quotes\n');
  
  try {
    await connectDatabase();
    
    // Get all evidence bullets
    const allBullets = await prisma.evidenceBullet.findMany({
      orderBy: [
        { verdictId: 'asc' },
        { type: 'asc' },
        { order: 'asc' },
      ],
    });
    
    console.log(`📊 Found ${allBullets.length} total evidence bullets\n`);
    
    // Find incomplete quotes
    const incompleteBullets = allBullets.filter(bullet => isIncompleteQuote(bullet.text));
    
    if (incompleteBullets.length === 0) {
      console.log('✅ No incomplete quotes found. All quotes are valid.\n');
      return;
    }
    
    console.log(`🔍 Found ${incompleteBullets.length} incomplete quote(s) to remove:\n`);
    
    // Show some examples
    for (let i = 0; i < Math.min(10, incompleteBullets.length); i++) {
      const bullet = incompleteBullets[i];
      const textPreview = bullet.text.length > 60 
        ? bullet.text.substring(0, 60) + '...' 
        : bullet.text;
      console.log(`   - ${bullet.id}: "${textPreview}" (${bullet.type}, length: ${bullet.text.length})`);
    }
    if (incompleteBullets.length > 10) {
      console.log(`   ... and ${incompleteBullets.length - 10} more\n`);
    } else {
      console.log('');
    }
    
    // Delete incomplete quotes
    console.log('🗑️  Deleting incomplete quotes...\n');
    const result = await prisma.evidenceBullet.deleteMany({
      where: {
        id: {
          in: incompleteBullets.map(b => b.id),
        },
      },
    });
    
    console.log(`✅ Successfully deleted ${result.count} incomplete quote(s)\n`);
    
    // Verify
    const remaining = await prisma.evidenceBullet.count();
    console.log(`📊 Remaining evidence bullets: ${remaining}`);
    console.log(`✨ Cleanup complete!`);
    
  } catch (error) {
    console.error('❌ Error removing incomplete quotes:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

main();

