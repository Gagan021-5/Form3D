export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;
export const JOB_STATUS_LABELS = {
    QUEUED: 'Queued',
    PROCESSING: 'Processing',
    DOWNLOADING: 'Downloading Model',
    SUCCEEDED: 'Completed',
    FAILED: 'Failed',
};
export const JOB_STATUS_ORDER = ['QUEUED', 'PROCESSING', 'DOWNLOADING', 'SUCCEEDED'];
export const MODEL_FORMAT = {
    GLB: 'glb',
    GLTF: 'gltf',
};
export const MODEL_SOURCE_TYPE = {
    GENERATION: 'GENERATION',
    UPLOAD: 'UPLOAD',
};
export const ALLOWED_MODEL_EXTENSIONS = ['.glb'];
export const ALLOWED_MODEL_MIMES = [
    'model/gltf-binary',
    'application/octet-stream',
];
export const MAX_MODEL_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
export const TRIPO_PROVIDER_NAME = 'tripo';
//# sourceMappingURL=constants.js.map