import express from 'express';
import { config } from 'dotenv';
import { resolve } from 'path';
import { connectDatabase } from '@acta/db';
import { healthRoute } from './routes/health';

// Load environment variables
const projectRoot = resolve(process.cwd(), '../..');
const envPath = resolve(projectRoot, '.env');
config({ path: envPath });

const app = express();
const PORT = process.env.ADMIN_PORT || 3002;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', healthRoute);

// Basic admin routes (to be expanded)
app.get('/', (req, res) => {
  res.json({ message: 'Acta Admin API', version: '0.0.1' });
});

// Start server
async function startServer() {
  try {
    await connectDatabase();
    console.log('✅ Database connected');

    app.listen(PORT, () => {
      console.log(`🚀 Admin server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
