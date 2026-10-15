import { describe, it, expect } from 'vitest';
import { TripoProvider } from '../providers/tripo.provider.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const isLiveTest = process.env.LIVE_TEST === 'true';
const liveApiKey = process.env.TRIPO_API_KEY;

/**
 * OPTIONAL LIVE INTEGRATION TEST
 *
 * This test communicates with the real Tripo API (https://openapi.tripo3d.ai/v3).
 * It is skipped by default to prevent unexpected consumption of billable API credits.
 *
 * To run this live integration test:
 *   1. Ensure a valid TRIPO_API_KEY is configured in your .env file
 *   2. Run: npm run test:live --workspace=apps/api
 */
describe.skipIf(!isLiveTest || !liveApiKey)('Tripo API Live Integration Test', () => {
  it('should authenticate with Tripo API and verify valid credentials', async () => {
    console.log('Running live Tripo integration test with real API key...');
    const provider = new TripoProvider(liveApiKey);

    expect(provider.isConfigured).toBe(true);

    // Create a 1x1 minimal valid PNG buffer to test the upload endpoint
    const minimalPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    // 1. Test live file upload
    const fileToken = await provider.uploadImage(minimalPng, 'live-test.png');
    console.log('✓ Live upload succeeded. Received file_token:', fileToken);
    expect(fileToken).toBeDefined();
    expect(typeof fileToken).toBe('string');
    expect(fileToken.length).toBeGreaterThan(0);

    // Note: To avoid consuming AI credits on automated test runs,
    // we stop after validating API key authentication and the file upload endpoint.
  }, 30000);
});
