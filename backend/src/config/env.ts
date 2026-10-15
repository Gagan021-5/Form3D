import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Attempt to load .env from current directory, root directory, and parent workspaces
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function optionalInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) throw new Error(`Invalid integer for ${key}: ${value}`);
  return parsed;
}

export const config = {
  nodeEnv: optional('NODE_ENV', 'development'),
  isDev: optional('NODE_ENV', 'development') === 'development',
  port: parseInt(process.env.PORT || process.env.API_PORT || '4000', 10),
  webUrl: optional('WEB_URL', 'http://localhost:5173'),
  apiUrl: optional('API_URL', process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || process.env.API_PORT || '4000'}`),
  databaseUrl: optional('DATABASE_URL', ''),

  tripo: {
    apiKey: process.env.TRIPO_API_KEY || '',
    baseUrl: 'https://openapi.tripo3d.ai/v3',
    get isConfigured(): boolean {
      return !!config.tripo.apiKey;
    },
  },

  storage: {
    dataDir: path.resolve(
      path.join(__dirname, '..', '..'),
      optional('DATA_DIR', './data')
    ),
    get uploadsDir(): string {
      return path.join(config.storage.dataDir, 'uploads');
    },
    get modelsDir(): string {
      return path.join(config.storage.dataDir, 'models');
    },
  },

  upload: {
    maxSizeBytes: optionalInt('MAX_UPLOAD_SIZE_MB', 10) * 1024 * 1024,
    maxModelSizeBytes: optionalInt('MAX_MODEL_UPLOAD_SIZE_MB', 100) * 1024 * 1024,
  },

  generation: {
    pollIntervalMs: optionalInt('GENERATION_POLL_INTERVAL_MS', 5000),
    timeoutMs: optionalInt('GENERATION_TIMEOUT_MS', 600000),
  },

  logLevel: optional('LOG_LEVEL', 'info'),
} as const;

export function validateConfig(): void {
  if (!config.databaseUrl) {
    console.warn(
      '⚠️  DATABASE_URL is not set. Database persistence will be unavailable until a PostgreSQL URL is provided.'
    );
  }

  if (!config.tripo.isConfigured) {
    console.warn(
      '⚠️  TRIPO_API_KEY is not set. 3D generation will not work until an API key is configured.'
    );
    console.warn('   Get an API key from https://platform.tripo3d.ai/');
  }

  console.log(`✓ Config loaded (env: ${config.nodeEnv})`);
  console.log(`  API: ${config.apiUrl}`);
  console.log(`  Web: ${config.webUrl}`);
  console.log(`  Data: ${config.storage.dataDir}`);
  console.log(`  Tripo: ${config.tripo.isConfigured ? 'configured' : 'NOT configured'}`);
}
