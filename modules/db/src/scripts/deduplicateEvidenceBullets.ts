/**
 * Deduplicate Evidence Bullets
 * 
 * This script removes duplicate evidence bullets from the database.
 * Duplicates are identified by: same verdictId, same text (normalized), same type, same articleId.
 * 
 * Usage:
 *   npm run db:dedupe:evidence-bullets
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
 * Normalize text for comparison (trim, lowercase, remove extra whitespace)
 */
function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Checks if two normalized texts are duplicates (exact match or one contains the other)
 * Returns: 0 = no match, 1 = exact match, 2 = text1 contains text2, 3 = text2 contains text1
 */
function isDuplicateText(text1: string, text2: string): number {
  const normalized1 = normalizeText(text1);
  const normalized2 = normalizeText(text2);
  
  if (normalized1 === normalized2) {
    return 1; // Exact match
  }
  
  // Check if one contains the other (substring match)
  // Only consider it a duplicate if the shorter text is substantial (>= 50 chars)
  // and one clearly contains the other
  const minLength = Math.min(normalized1.length, normalized2.length);
  
  if (minLength < 50) {
    // For very short texts, require exact match
    return 0;
  }
  
  // If one text contains the other, it's a duplicate (keep the longer one)
  if (normalized1.includes(normalized2)) {
    return 2; // text1 contains text2 (keep text1, remove text2)
  }
  
  if (normalized2.includes(normalized1)) {
    return 3; // text2 contains text1 (keep text2, remove text1)
  }
  
  return 0; // No match
}

async function main() {
  console.log('🔍 Finding Duplicate Evidence Bullets\n');
  
  try {
    await connectDatabase();
    
    // Get all evidence bullets grouped by verdict
    const allBullets = await prisma.evidenceBullet.findMany({
      orderBy: [
        { verdictId: 'asc' },
        { type: 'asc' },
        { order: 'asc' },
      ],
    });
    
    console.log(`📊 Found ${allBullets.length} total evidence bullets\n`);
    
    // Group by verdictId to find duplicates within each verdict
    const bulletsByVerdict = new Map<string, typeof allBullets>();
    for (const bullet of allBullets) {
      if (!bulletsByVerdict.has(bullet.verdictId)) {
        bulletsByVerdict.set(bullet.verdictId, []);
      }
      bulletsByVerdict.get(bullet.verdictId)!.push(bullet);
    }
    
    // Find duplicates: same verdictId, type, and text (exact or substring match)
    // Deduplicate by text regardless of articleId (same quote from different articles = duplicate)
    const duplicatesToDelete: string[] = [];
    const kept = new Map<string, typeof allBullets[0]>(); // verdictId|type|normalizedText -> kept bullet
    
    for (const [verdictId, bullets] of bulletsByVerdict.entries()) {
      for (const bullet of bullets) {
        const normalizedText = normalizeText(bullet.text);
        const groupKey = `${verdictId}|${bullet.type}|${normalizedText}`;
        const keptBullet = kept.get(groupKey);
        
        if (keptBullet) {
          // Check if this bullet is a duplicate of the kept one (should always match since we use normalized text)
          const matchType = isDuplicateText(keptBullet.text, bullet.text);
          
          if (matchType > 0) {
            // Found a duplicate - keep the longer one, or if same length, keep the one with articleId
            if (matchType === 3 || (matchType === 1 && bullet.text.length > keptBullet.text.length)) {
              // Current bullet is longer or contains kept bullet, replace kept with current
              duplicatesToDelete.push(keptBullet.id);
              kept.set(groupKey, bullet);
            } else {
              // Kept bullet is same or longer, delete current
              duplicatesToDelete.push(bullet.id);
            }
          } else {
            // Shouldn't happen since we're using normalized text as key, but handle it
            // Keep both if they're truly different
          }
        } else {
          // First bullet with this text in this verdict+type, keep it
          kept.set(groupKey, bullet);
        }
      }
    }
    
    if (duplicatesToDelete.length === 0) {
      console.log('✅ No duplicate evidence bullets found. All bullets are unique.\n');
      return;
    }
    
    console.log(`🔍 Found ${duplicatesToDelete.length} duplicate evidence bullet(s) to remove:\n`);
    
    // Show some examples
    const examples = duplicatesToDelete.slice(0, 5);
    for (const id of examples) {
      const bullet = allBullets.find(b => b.id === id);
      if (bullet) {
        const textPreview = bullet.text.length > 60 
          ? bullet.text.substring(0, 60) + '...' 
          : bullet.text;
        console.log(`   - ${id}: "${textPreview}" (${bullet.type}, verdict: ${bullet.verdictId})`);
      }
    }
    if (duplicatesToDelete.length > 5) {
      console.log(`   ... and ${duplicatesToDelete.length - 5} more\n`);
    } else {
      console.log('');
    }
    
    // Delete duplicates
    console.log('🗑️  Deleting duplicate evidence bullets...\n');
    const result = await prisma.evidenceBullet.deleteMany({
      where: {
        id: {
          in: duplicatesToDelete,
        },
      },
    });
    
    console.log(`✅ Successfully deleted ${result.count} duplicate evidence bullet(s)\n`);
    
    // Verify
    const remaining = await prisma.evidenceBullet.count();
    console.log(`📊 Remaining evidence bullets: ${remaining}`);
    console.log(`✨ Deduplication complete!`);
    
  } catch (error) {
    console.error('❌ Error deduplicating evidence bullets:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

main();

