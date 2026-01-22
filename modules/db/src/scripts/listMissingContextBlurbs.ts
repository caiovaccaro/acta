/**
 * List Questions Missing Context Blurbs
 *
 * Usage:
 *   npm run db:list:missing-context-blurbs
 *   npm run db:list:missing-context-blurbs -- --question-id=<question-id>
 *   npm run db:list:missing-context-blurbs -- --topic-id=<topic-id>
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { parseArgs } from 'util';
import {
  connectDatabase,
  disconnectDatabase,
  findActiveQuestions,
  findQuestionById,
  findQuestionsByTopicId,
  findTopicById,
} from '@acta/db';

// Load environment variables
const projectRoot = resolve(process.cwd(), '../..');
const envPath = resolve(projectRoot, '.env');
config({ path: envPath });

interface ScriptArgs {
  questionId?: string;
  topicId?: string;
}

function parseScriptArgs(): ScriptArgs {
  const { values } = parseArgs({
    options: {
      'question-id': { type: 'string' },
      'topic-id': { type: 'string' },
    },
  });

  return {
    questionId: values['question-id'],
    topicId: values['topic-id'],
  };
}

function isMissingBlurb(blurb: unknown): boolean {
  return !blurb || (typeof blurb === 'string' && blurb.trim().length === 0);
}

async function main() {
  const args = parseScriptArgs();

  console.log('🔎 Scanning for questions missing context blurbs...\n');

  try {
    await connectDatabase();
    console.log('✅ Database connected\n');

    let questions;
    if (args.questionId) {
      const question = await findQuestionById(args.questionId);
      questions = question ? [question] : [];
    } else if (args.topicId) {
      const topic = await findTopicById(args.topicId);
      if (!topic) {
        console.error(`❌ Topic not found: "${args.topicId}"`);
        return;
      }
      questions = await findQuestionsByTopicId(topic.id, false);
    } else {
      questions = await findActiveQuestions();
    }

    const missing = questions.filter((q) => isMissingBlurb((q as any).contextBlurb));

    console.log(`📋 Missing context blurbs: ${missing.length} of ${questions.length}\n`);
    if (missing.length === 0) {
      console.log('✅ All questions have context blurbs.');
      return;
    }

    for (const q of missing) {
      const topicName = (q as any).topic?.name || 'Unknown';
      console.log(`- ${q.id} | ${topicName} | ${q.questionText}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

main();

