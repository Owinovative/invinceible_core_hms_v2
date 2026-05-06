import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JobQueueService } from './resilience/job-queue.service';
import { SafeLoggerService } from './resilience/safe-logger.service';

async function bootstrapWorker() {
  process.env.WORKER_MODE = 'true';
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });
  const logger = app.get(SafeLoggerService);
  const queue = app.get(JobQueueService);

  queue.startWorkerLoop();
  logger.info('HMS worker started');

  const shutdown = async (signal: string) => {
    logger.warn('HMS worker shutting down', { signal });
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrapWorker().catch((error) => {
  console.error('Worker failed to start', error);
  process.exit(1);
});
