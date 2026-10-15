// ─── Generation Job Status ───────────────────────────────────────────
export type JobStatus = 'QUEUED' | 'PROCESSING' | 'DOWNLOADING' | 'SUCCEEDED' | 'FAILED';

// ─── Provider Statuses (Tripo) ──────────────────────────────────────
export type ProviderStatus = 'queued' | 'running' | 'success' | 'failed' | 'banned' | 'expired' | 'unknown';

// ─── Product Category ───────────────────────────────────────────────
export type ProductCategory =
  | 'furniture'
  | 'electronics'
  | 'apparel'
  | 'jewelry'
  | 'footwear'
  | 'packaging'
  | 'toys'
  | 'automotive'
  | 'food'
  | 'other';

// ─── API Response Types ─────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ─── Product ────────────────────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  category: ProductCategory | null;
  sourceImagePath: string | null;
  sourceImageMimeType: string | null;
  sourceImageSize: number | null;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  latestJob?: GenerationJob | null;
  assets?: ModelAsset[];
}

// ─── Generation Job ─────────────────────────────────────────────────
export interface GenerationJob {
  id: string;
  productId: string;
  providerName: string;
  providerTaskId: string | null;
  status: JobStatus;
  providerStatus: ProviderStatus | null;
  progress: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

// ─── Model Asset ────────────────────────────────────────────────────
export interface ModelAsset {
  id: string;
  productId: string;
  generationJobId: string | null;
  sourceType?: 'GENERATION' | 'UPLOAD';
  localFilePath: string;
  format: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

// ─── Product with Details ───────────────────────────────────────────
export interface ProductDetail extends Product {
  latestJob: GenerationJob | null;
  assets: ModelAsset[];
}
