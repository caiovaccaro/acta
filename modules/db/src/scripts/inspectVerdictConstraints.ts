/**
 * Inspect Verdict Constraints Script
 * Checks what constraints exist on the verdicts table
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../../../../.env') });

import { connectDatabase, disconnectDatabase, prisma } from '@acta/db';

async function main() {
  await connectDatabase();
  
  console.log('🔍 Inspecting verdicts table constraints...\n');
  
  // Get all unique constraints
  const constraints = await prisma.$queryRaw<Array<{
    conname: string;
    contype: string;
    definition: string;
    columns: string[];
  }>>`
    SELECT 
      conname,
      contype,
      pg_get_constraintdef(oid) as definition,
      array_agg(a.attname ORDER BY array_position(c.conkey, a.attnum)) as columns
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.conrelid = 'verdicts'::regclass
    AND c.contype = 'u'
    GROUP BY conname, contype, oid
    ORDER BY conname;
  `;
  
  console.log(`Found ${constraints.length} unique constraint(s):\n`);
  
  for (const constraint of constraints) {
    console.log(`Constraint: ${constraint.conname}`);
    console.log(`  Type: ${constraint.contype}`);
    console.log(`  Definition: ${constraint.definition}`);
    console.log(`  Columns: ${constraint.columns.join(', ')}`);
    console.log('');
  }
  
  // Also check unique indexes (which can act like constraints)
  const indexes = await prisma.$queryRaw<Array<{
    indexname: string;
    indexdef: string;
    isunique: boolean;
  }>>`
    SELECT 
      indexname,
      indexdef,
      indisunique as isunique
    FROM pg_indexes i
    JOIN pg_index idx ON idx.indexrelid = (SELECT oid FROM pg_class WHERE relname = i.indexname)
    WHERE i.tablename = 'verdicts'
    AND idx.indisunique = true
    ORDER BY indexname;
  `;
  
  console.log(`\nFound ${indexes.length} unique index(es):\n`);
  
  for (const idx of indexes) {
    console.log(`Index: ${idx.indexname}`);
    console.log(`  Definition: ${idx.indexdef}`);
    console.log(`  Is Unique: ${idx.isunique}`);
    console.log('');
  }
  
  // Check existing verdicts
  const verdicts = await prisma.$queryRaw<Array<{
    id: string;
    questionId: string;
    month: Date;
    calculatedAt: Date;
  }>>`
    SELECT id, "questionId", month, "calculatedAt"
    FROM verdicts
    ORDER BY "questionId", month;
  `;
  
  console.log(`\nExisting verdicts: ${verdicts.length}\n`);
  
  // Group by questionId to find duplicates
  const byQuestion = new Map<string, typeof verdicts>();
  for (const v of verdicts) {
    const existing = byQuestion.get(v.questionId) || [];
    existing.push(v);
    byQuestion.set(v.questionId, existing);
  }
  
  for (const [questionId, vs] of byQuestion.entries()) {
    if (vs.length > 1) {
      console.log(`⚠️  Question ${questionId} has ${vs.length} verdicts:`);
      for (const v of vs) {
        console.log(`   - ${v.id}: month=${v.month.toISOString().slice(0, 7)}, calculated=${v.calculatedAt.toISOString()}`);
      }
    }
  }
  
  await disconnectDatabase();
}

main().catch(console.error);

