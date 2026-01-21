/**
 * Reject a discovered topic
 * Usage:
 *   npm run db:reject:topic -- --topicId=<id>
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../../../../.env') });

import { connectDatabase, disconnectDatabase, rejectTopic, findTopicById } from '../index';

async function main() {
  const topicId = process.argv.find((arg) => arg.startsWith('--topicId='))?.split('=')[1];

  if (!topicId) {
    console.error('❌ Missing --topicId argument');
    process.exit(1);
  }

  try {
    await connectDatabase();
    const topic = await findTopicById(topicId);
    if (!topic) {
      console.error(`❌ Topic not found: ${topicId}`);
      return;
    }

    await rejectTopic(topicId);
    console.log(`✅ Rejected topic: ${topic.name} (${topicId})`);
  } catch (error) {
    console.error('❌ Error rejecting topic:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

main();






