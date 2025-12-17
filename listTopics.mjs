import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });
import { prisma } from '@acta/db';
async function main() {
  const topics = await prisma.topic.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, source: true, moderationStatus: true, discoveredAt: true },
  });
  console.log(JSON.stringify(topics, null, 2));
  await prisma.$disconnect();
}
main();
