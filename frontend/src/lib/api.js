import { API_BASE_URL, ENDPOINTS } from '../config/api.js';

export class ApiError extends Error {
  constructor(message, code = 'API_ERROR', details = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

async function request(url, options = {}) {
  const fullUrl = url.startsWith('http') || url.startsWith('/api') ? url : `${API_BASE_URL}${url}`;
  let response;

  try {
    response = await fetch(fullUrl, {
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (err) {
    throw new ApiError(
      'Unable to connect to server. Check your network or make sure the API is running.',
      'NETWORK_ERROR'
    );
  }

  let json;
  try {
    json = await response.json();
  } catch (err) {
    throw new ApiError(
      `Unexpected server response (HTTP ${response.status})`,
      'PARSE_ERROR'
    );
  }

  if (!response.ok || !json.success) {
    const error = json.error;
    throw new ApiError(
      error?.message || `Request failed with status ${response.status}`,
      error?.code || 'REQUEST_FAILED',
      error?.details
    );
  }

  return json.data;
}

export const api = {
  // Products
  async getProducts(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.pageSize) query.set('pageSize', params.pageSize.toString());
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);

    const url = ENDPOINTS.products(query.toString());
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new ApiError(json.error?.message || 'Failed to fetch products', json.error?.code);
    }
    return json;
  },

  async getProduct(id) {
    return request(ENDPOINTS.product(id));
  },

  async createProduct(data) {
    return request(ENDPOINTS.products(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateProduct(id, data) {
    return request(ENDPOINTS.product(id), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async deleteProduct(id) {
    return request(ENDPOINTS.product(id), {
      method: 'DELETE',
    });
  },

  async uploadProductImage(productId, file) {
    const formData = new FormData();
    formData.append('image', file);

    const url = ENDPOINTS.uploadProductImage(productId);
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new ApiError(
        json.error?.message || 'Failed to upload image',
        json.error?.code || 'UPLOAD_FAILED'
      );
    }

    return json.data;
  },

  // Generations
  async startGeneration(productId) {
    return request(ENDPOINTS.createGeneration(productId), {
      method: 'POST',
    });
  },

  async getGeneration(id) {
    return request(ENDPOINTS.generation(id));
  },

  async retryGeneration(jobId) {
    return request(ENDPOINTS.retryGeneration(jobId), {
      method: 'POST',
    });
  },

  // Assets
  async getProductAssets(productId) {
    return request(ENDPOINTS.productAssets(productId));
  },

  // Helper URL generators
  getProductImageUrl(productId) {
    return ENDPOINTS.productImage(productId);
  },

  getAssetDownloadUrl(assetId) {
    return ENDPOINTS.assetDownload(assetId);
  },

  getAssetServeUrl(assetId) {
    return ENDPOINTS.assetServe(assetId);
  },

  endpoints: ENDPOINTS,
};
