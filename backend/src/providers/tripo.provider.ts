import { config } from '../config/env.js';
import type { ProviderStatus } from '@forma3d/shared';

// ─── Tripo API Types ────────────────────────────────────────────────

interface TripoApiResponse<T = unknown> {
  code: number;
  data: T;
  message?: string;
}

interface TripoUploadResult {
  file_token: string;
}

interface TripoTaskCreationResult {
  task_id: string;
}

interface TripoTaskResult {
  task_id: string;
  type: string;
  status: string;
  progress: number;
  output?: {
    model_url?: string;
    rendered_image_url?: string;
  };
}

// ─── Error Types ────────────────────────────────────────────────────

export class TripoApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'TripoApiError';
  }
}

// ─── Provider Module ────────────────────────────────────────────────

export class TripoProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey !== undefined ? apiKey : config.tripo.apiKey;
    this.baseUrl = baseUrl || config.tripo.baseUrl;
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<TripoApiResponse<T>> {
    if (!this.isConfigured) {
      throw new TripoApiError(
        'Tripo API key is not configured. Set TRIPO_API_KEY in your .env file.',
        'API_KEY_MISSING'
      );
    }

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
        signal: AbortSignal.timeout(30000), // 30s timeout for individual requests
      });

      if (response.status === 401) {
        throw new TripoApiError(
          'Invalid Tripo API key. Please check your TRIPO_API_KEY.',
          'INVALID_CREDENTIALS',
          401
        );
      }

      if (response.status === 429) {
        throw new TripoApiError(
          'Tripo API rate limit exceeded. Please try again later.',
          'RATE_LIMITED',
          429
        );
      }

      if (response.status === 402) {
        throw new TripoApiError(
          'Insufficient Tripo API credits. Please add credits to your account.',
          'INSUFFICIENT_CREDITS',
          402
        );
      }

      const data = (await response.json()) as TripoApiResponse<T>;

      if (data.code !== 0) {
        throw new TripoApiError(
          data.message || `Tripo API error (code: ${data.code})`,
          'PROVIDER_ERROR',
          response.status
        );
      }

      return data;
    } catch (err) {
      console.error('[TripoProvider fetch error]:', err);
      if (err instanceof TripoApiError) throw err;

      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw new TripoApiError(
          `Unable to connect to Tripo API: ${err.message}`,
          'NETWORK_ERROR'
        );
      }

      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new TripoApiError(
          'Tripo API request timed out.',
          'TIMEOUT'
        );
      }

      throw new TripoApiError(
        `Unexpected error communicating with Tripo API: ${err instanceof Error ? err.message : 'Unknown error'}`,
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Upload an image to Tripo and get a file_token.
   */
  async uploadImage(imageBuffer: Buffer, filename: string): Promise<string> {
    const formData = new FormData();
    const blob = new Blob([imageBuffer as unknown as BlobPart], { type: 'application/octet-stream' });
    formData.append('file', blob, filename);

    const result = await this.request<TripoUploadResult>('/files', {
      method: 'POST',
      body: formData,
    });

    return result.data.file_token;
  }

  /**
   * Create an image-to-3D generation task.
   */
  async createImageTo3DTask(fileToken: string): Promise<string> {
    const result = await this.request<TripoTaskCreationResult>('/task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'image_to_model',
        file: {
          type: 'jpg',
          file_token: fileToken,
        },
      }),
    });

    return result.data.task_id;
  }

  /**
   * Get the status of a generation task.
   */
  async getTaskStatus(taskId: string): Promise<{
    status: ProviderStatus;
    progress: number;
    modelUrl: string | null;
    renderedImageUrl: string | null;
  }> {
    const result = await this.request<TripoTaskResult>(`/task/${taskId}`);
    const task = result.data;

    return {
      status: this.normalizeStatus(task.status),
      progress: task.progress || 0,
      modelUrl: task.output?.model_url || null,
      renderedImageUrl: task.output?.rendered_image_url || null,
    };
  }

  /**
   * Download a model file from a URL.
   */
  async downloadModel(modelUrl: string): Promise<Buffer> {
    try {
      const response = await fetch(modelUrl, {
        signal: AbortSignal.timeout(120000), // 2 min timeout for download
      });

      if (!response.ok) {
        throw new TripoApiError(
          `Failed to download model: HTTP ${response.status}`,
          'DOWNLOAD_FAILED',
          response.status
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      if (err instanceof TripoApiError) throw err;
      throw new TripoApiError(
        `Failed to download model file: ${err instanceof Error ? err.message : 'Unknown error'}`,
        'DOWNLOAD_FAILED'
      );
    }
  }

  /**
   * Normalize Tripo task statuses to our internal ProviderStatus type.
   */
  private normalizeStatus(tripoStatus: string): ProviderStatus {
    switch (tripoStatus) {
      case 'queued':
        return 'queued';
      case 'running':
        return 'running';
      case 'success':
        return 'success';
      case 'failed':
        return 'failed';
      case 'banned':
        return 'banned';
      case 'expired':
        return 'expired';
      default:
        return 'unknown';
    }
  }
}

// Singleton instance
export const tripoProvider = new TripoProvider();
