export type JobStatus = 'QUEUED' | 'PROCESSING' | 'DOWNLOADING' | 'SUCCEEDED' | 'FAILED';
export type ProviderStatus = 'queued' | 'running' | 'success' | 'failed' | 'banned' | 'expired' | 'unknown';
export type ProductCategory = 'furniture' | 'electronics' | 'apparel' | 'jewelry' | 'footwear' | 'packaging' | 'toys' | 'automotive' | 'food' | 'other';
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
export interface Product {
    id: string;
    name: string;
    category: ProductCategory | null;
    sourceImagePath: string | null;
    sourceImageMimeType: string | null;
    sourceImageSize: number | null;
    createdAt: string;
    updatedAt: string;
    latestJob?: GenerationJob | null;
    assets?: ModelAsset[];
}
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
export interface ModelAsset {
    id: string;
    productId: string;
    generationJobId: string;
    localFilePath: string;
    format: string;
    mimeType: string;
    fileSize: number;
    createdAt: string;
}
export interface ProductDetail extends Product {
    latestJob: GenerationJob | null;
    assets: ModelAsset[];
}
//# sourceMappingURL=types.d.ts.map