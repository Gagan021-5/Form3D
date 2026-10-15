export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const JOB_STATUS_LABELS: Record<string, string> = {
  QUEUED: 'Queued',
  PROCESSING: 'Processing',
  DOWNLOADING: 'Downloading Model',
  SUCCEEDED: 'Completed',
  FAILED: 'Failed',
};

export const JOB_STATUS_ORDER = ['QUEUED', 'PROCESSING', 'DOWNLOADING', 'SUCCEEDED'] as const;

export const MODEL_FORMAT = {
  GLB: 'glb',
  GLTF: 'gltf',
} as const;

export const TRIPO_PROVIDER_NAME = 'tripo' as const;
