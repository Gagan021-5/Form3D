import prisma from '../config/database.js';
import { config } from '../config/env.js';
import { tripoProvider, TripoApiError } from '../providers/tripo.provider.js';
import { saveModelFile } from '../services/storage.service.js';
import fsp from 'fs/promises';

// Track active polling intervals
const activePollers = new Map<string, NodeJS.Timeout>();

/**
 * Start a generation job: upload image to Tripo, create task, begin polling.
 */
export async function startGenerationJob(jobId: string): Promise<void> {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    include: { product: true },
  });

  if (!job) {
    console.error(`[JobProcessor] Job ${jobId} not found`);
    return;
  }

  if (!job.product.sourceImagePath) {
    await failJob(jobId, 'NO_IMAGE', 'No source image found for this product.');
    return;
  }

  if (!tripoProvider.isConfigured) {
    await failJob(jobId, 'API_KEY_MISSING', 'Tripo API key is not configured. Set TRIPO_API_KEY in your .env file.');
    return;
  }

  try {
    // Read the source image
    const { getAbsolutePath } = await import('../services/storage.service.js');
    const imagePath = getAbsolutePath(job.product.sourceImagePath);
    const imageBuffer = await fsp.readFile(imagePath);

    // Update status to PROCESSING
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', providerStatus: 'uploading' },
    });

    // Upload image to Tripo
    const fileToken = await tripoProvider.uploadImage(
      imageBuffer,
      `product-${job.productId}.jpg`
    );

    // Create generation task
    const taskId = await tripoProvider.createImageTo3DTask(fileToken);

    // Save provider task ID
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        providerTaskId: taskId,
        providerStatus: 'queued',
      },
    });

    console.log(`[JobProcessor] Task created: ${taskId} for job ${jobId}`);

    // Start polling
    startPolling(jobId, taskId);
  } catch (err) {
    const errorCode =
      err instanceof TripoApiError ? err.code : 'SUBMISSION_ERROR';
    const errorMessage =
      err instanceof Error
        ? err.message
        : 'An unexpected error occurred while submitting the generation task.';

    await failJob(jobId, errorCode, errorMessage);
  }
}

/**
 * Start polling the provider for task status.
 */
function startPolling(jobId: string, taskId: string): void {
  // Don't double-poll
  if (activePollers.has(jobId)) {
    clearInterval(activePollers.get(jobId)!);
  }

  const startTime = Date.now();
  const interval = setInterval(async () => {
    try {
      // Check timeout
      if (Date.now() - startTime > config.generation.timeoutMs) {
        stopPolling(jobId);
        await failJob(
          jobId,
          'TIMEOUT',
          'Generation timed out. The model took too long to generate.'
        );
        return;
      }

      const status = await tripoProvider.getTaskStatus(taskId);

      // Update job with provider status
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          providerStatus: status.status,
          progress: status.progress,
        },
      });

      console.log(
        `[JobProcessor] Job ${jobId}: ${status.status} (${status.progress}%)`
      );

      if (status.status === 'success' && status.modelUrl) {
        stopPolling(jobId);
        await downloadAndStoreModel(jobId, status.modelUrl);
      } else if (
        status.status === 'failed' ||
        status.status === 'banned' ||
        status.status === 'expired'
      ) {
        stopPolling(jobId);
        const message =
          status.status === 'banned'
            ? 'The image was flagged by the provider content policy.'
            : status.status === 'expired'
            ? 'The generation task expired before completion.'
            : 'The 3D model generation failed. Please try again.';
        await failJob(jobId, `PROVIDER_${status.status.toUpperCase()}`, message);
      }
    } catch (err) {
      console.error(`[JobProcessor] Polling error for job ${jobId}:`, err);
      // Don't stop polling on transient errors - only stop on permanent ones
      if (err instanceof TripoApiError && err.code === 'INVALID_CREDENTIALS') {
        stopPolling(jobId);
        await failJob(jobId, err.code, err.message);
      }
    }
  }, config.generation.pollIntervalMs);

  activePollers.set(jobId, interval);
}

/**
 * Stop polling for a job.
 */
function stopPolling(jobId: string): void {
  const interval = activePollers.get(jobId);
  if (interval) {
    clearInterval(interval);
    activePollers.delete(jobId);
  }
}

/**
 * Download the generated model and store it locally.
 */
async function downloadAndStoreModel(
  jobId: string,
  modelUrl: string
): Promise<void> {
  try {
    // Update status to DOWNLOADING
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: 'DOWNLOADING' },
    });

    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) return;

    // Download the model
    const modelBuffer = await tripoProvider.downloadModel(modelUrl);

    // Save to local storage
    const { relativePath, fileSize } = await saveModelFile(modelBuffer, 'glb');

    // Create model asset record
    await prisma.modelAsset.create({
      data: {
        productId: job.productId,
        generationJobId: jobId,
        localFilePath: relativePath,
        format: 'glb',
        mimeType: 'model/gltf-binary',
        fileSize: fileSize,
      },
    });

    // Mark job as succeeded
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: 'SUCCEEDED',
        completedAt: new Date(),
        progress: 100,
      },
    });

    console.log(
      `[JobProcessor] Job ${jobId} completed successfully. Model saved to ${relativePath}`
    );
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : 'Failed to download and store the generated model.';
    await failJob(jobId, 'DOWNLOAD_ERROR', errorMessage);
  }
}

/**
 * Mark a job as failed.
 */
async function failJob(
  jobId: string,
  errorCode: string,
  errorMessage: string
): Promise<void> {
  console.error(`[JobProcessor] Job ${jobId} failed: ${errorCode} - ${errorMessage}`);
  try {
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorCode,
        errorMessage,
        completedAt: new Date(),
      },
    });
  } catch (err) {
    console.error(`[JobProcessor] Failed to update job ${jobId}:`, err);
  }
}

/**
 * Resume any in-progress jobs after a restart.
 */
export async function resumeIncompleteJobs(): Promise<void> {
  const incompleteJobs = await prisma.generationJob.findMany({
    where: {
      status: { in: ['QUEUED', 'PROCESSING', 'DOWNLOADING'] },
    },
    include: { product: true },
  });

  if (incompleteJobs.length === 0) {
    console.log('[JobProcessor] No incomplete jobs to resume.');
    return;
  }

  console.log(
    `[JobProcessor] Resuming ${incompleteJobs.length} incomplete job(s)...`
  );

  for (const job of incompleteJobs) {
    if (job.providerTaskId && job.status !== 'QUEUED') {
      // Resume polling for jobs that have a provider task ID
      console.log(
        `[JobProcessor] Resuming polling for job ${job.id} (task: ${job.providerTaskId})`
      );
      startPolling(job.id, job.providerTaskId);
    } else if (job.status === 'QUEUED') {
      // Re-start queued jobs
      console.log(`[JobProcessor] Re-starting queued job ${job.id}`);
      startGenerationJob(job.id);
    } else {
      // Jobs in PROCESSING without a task ID - mark as failed
      await failJob(
        job.id,
        'RESTART_RECOVERY',
        'This job was interrupted by a server restart and could not be recovered. Please try again.'
      );
    }
  }
}

/**
 * Clean up all active pollers (for graceful shutdown).
 */
export function shutdownJobProcessor(): void {
  console.log(`[JobProcessor] Shutting down. Active pollers: ${activePollers.size}`);
  for (const [jobId, interval] of activePollers) {
    clearInterval(interval);
    console.log(`[JobProcessor] Stopped polling for job ${jobId}`);
  }
  activePollers.clear();
}
