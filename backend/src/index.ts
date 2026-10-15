import { createApp } from './app.js';
import { config, validateConfig } from './config/env.js';
import { initStorage } from './services/storage.service.js';
import { resumeIncompleteJobs, shutdownJobProcessor } from './jobs/generation.processor.js';
import prisma from './config/database.js';

async function main() {
  try {
    // 1. Validate configuration
    validateConfig();

    // 2. Initialize storage directories
    await initStorage();

    // 3. Connect to database
    await prisma.$connect();
    console.log('✓ Database connected');

    // 4. Create and start server
    const app = createApp();
    const server = app.listen(config.port, () => {
      console.log(`\n🚀 Forma3D API running at ${config.apiUrl}`);
      console.log(`   Health: ${config.apiUrl}/health`);
      console.log(`   API:    ${config.apiUrl}/api/v1\n`);
    });

    // 5. Resume any incomplete jobs from previous run
    await resumeIncompleteJobs();

    // ─── Graceful Shutdown ──────────────────────────────────────
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      shutdownJobProcessor();
      server.close();
      await prisma.$disconnect();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('Failed to start server:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
