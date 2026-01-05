import { config } from 'dotenv';
import { resolve } from 'path';
import { buildServer } from './server';
import { connectDatabase, disconnectDatabase } from '@acta/db';

// Load environment variables from root .env file
// When running from apps/api, go up 2 levels to project root
const projectRoot = resolve(process.cwd(), '../..');
const envPath = resolve(projectRoot, '.env');
config({ path: envPath });

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    // Connect to database
    await connectDatabase();

    // Build and start server
    const server = await buildServer();

    await server.listen({ port: PORT, host: HOST });

    console.log(`🚀 API server listening on http://${HOST}:${PORT}`);
    console.log(`📚 Health check: http://${HOST}:${PORT}/api/health`);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await disconnectDatabase();
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

start();

