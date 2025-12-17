/**
 * Seed Topics Script
 * Creates initial topics from PRD: Gaza, Drug Policy, AI Regulation
 * 
 * Usage:
 *   tsx src/scripts/seedTopics.ts
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase, disconnectDatabase, prisma } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file at project root
config({ path: resolve(__dirname, '../../../../.env') });
import { findOrCreateTopic } from '../repositories/topicRepository.js';

const INITIAL_TOPICS = [
  {
    name: 'Gaza',
    description: 'The ongoing conflict and humanitarian situation in Gaza, including questions about genocide, war crimes, and international response.',
    safetyNoteRequired: true,
  },
  {
    name: 'Drug Policy',
    description: 'Drug policy and decriminalization, including questions about effectiveness of different approaches to drug regulation and harm reduction.',
    safetyNoteRequired: false,
  },
  {
    name: 'AI Regulation',
    description: 'Artificial intelligence regulation and governance, including questions about safety, oversight, and the balance between innovation and control.',
    safetyNoteRequired: false,
  },
];

async function seedTopics() {
  console.log('🌱 Seeding initial topics...\n');
  
  try {
    await connectDatabase();
    
    const results = [];
    
    for (const topicData of INITIAL_TOPICS) {
      const topic = await findOrCreateTopic({
        ...topicData,
        source: 'seeded',
        moderationStatus: 'pending',
        discoveredAt: new Date(),
        discoveredFromArticles: [],
      });

      // Ensure seeded topics go through moderation (pending)
      const updated = await prisma.topic.update({
        where: { id: topic.id },
        data: {
          source: 'seeded',
          moderationStatus: 'pending',
          discoveredAt: topic.discoveredAt ?? new Date(),
          discoveredFromArticles: topic.discoveredFromArticles ?? [],
        },
      });

      results.push(updated);
      console.log(`✅ Topic (pending moderation): ${updated.name} (${updated.id})`);
      if (topic.safetyNoteRequired) {
        console.log(`   ⚠️  Safety note required`);
      }
    }
    
    console.log(`\n✅ Successfully seeded ${results.length} topics`);
    
  } catch (error) {
    console.error('❌ Error seeding topics:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTopics().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { seedTopics };

