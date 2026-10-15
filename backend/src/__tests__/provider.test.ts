import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TripoProvider, TripoApiError } from '../providers/tripo.provider.js';

describe('TripoProvider Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw API_KEY_MISSING if no API key is provided', async () => {
    const unconfigured = new TripoProvider('');
    expect(unconfigured.isConfigured).toBe(false);

    await expect(
      unconfigured.createImageTo3DTask('token-123')
    ).rejects.toThrow('Tripo API key is not configured');
  });

  it('should handle 401 Invalid Credentials error', async () => {
    const provider = new TripoProvider('invalid-key');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      status: 401,
      ok: false,
      json: async () => ({ message: 'Unauthorized' }),
    } as any);

    await expect(provider.createImageTo3DTask('token-123')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      statusCode: 401,
    });
  });

  it('should handle 429 Rate Limit error', async () => {
    const provider = new TripoProvider('valid-key');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      status: 429,
      ok: false,
      json: async () => ({ message: 'Rate limited' }),
    } as any);

    await expect(provider.createImageTo3DTask('token-123')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      statusCode: 429,
    });
  });

  it('should handle 402 Insufficient Credits error', async () => {
    const provider = new TripoProvider('valid-key');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      status: 402,
      ok: false,
      json: async () => ({ message: 'Payment required' }),
    } as any);

    await expect(provider.createImageTo3DTask('token-123')).rejects.toMatchObject({
      code: 'INSUFFICIENT_CREDITS',
      statusCode: 402,
    });
  });

  it('should handle network timeout', async () => {
    const provider = new TripoProvider('valid-key');

    const abortError = new DOMException('Request aborted', 'AbortError');
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError);

    await expect(provider.createImageTo3DTask('token-123')).rejects.toMatchObject({
      code: 'TIMEOUT',
    });
  });

  it('should upload image and return file_token', async () => {
    const provider = new TripoProvider('valid-key');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({
        code: 0,
        data: { file_token: 'file_token_xyz789' },
      }),
    } as any);

    const token = await provider.uploadImage(Buffer.from('test-image'), 'test.jpg');
    expect(token).toBe('file_token_xyz789');
  });

  it('should retrieve task status with progress and output url', async () => {
    const provider = new TripoProvider('valid-key');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({
        code: 0,
        data: {
          task_id: 'task-123',
          type: 'image_to_model',
          status: 'success',
          progress: 100,
          output: {
            model_url: 'https://cdn.tripo3d.ai/models/result.glb',
            rendered_image_url: 'https://cdn.tripo3d.ai/renders/preview.png',
          },
        },
      }),
    } as any);

    const res = await provider.getTaskStatus('task-123');
    expect(res.status).toBe('success');
    expect(res.progress).toBe(100);
    expect(res.modelUrl).toBe('https://cdn.tripo3d.ai/models/result.glb');
  });

  it('should download model binary buffer', async () => {
    const provider = new TripoProvider('valid-key');
    const encoder = new TextEncoder();
    const uint8 = encoder.encode('mock-glb-binary-content');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      status: 200,
      ok: true,
      arrayBuffer: async () => uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength),
    } as any);

    const buffer = await provider.downloadModel('https://cdn.tripo3d.ai/models/result.glb');
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.toString()).toBe('mock-glb-binary-content');
  });
});
