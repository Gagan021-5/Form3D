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

  // Robust multipart/form-data upload helper
  async uploadFormData(url, formData, defaultErrorMsg) {
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: formData,
      });
    } catch (err) {
      throw new ApiError(
        'Unable to connect to backend server. If using Render free tier, the backend may be waking up from sleep (takes ~30-50s). Also verify VITE_API_URL in your Render Static Site environment settings.',
        'NETWORK_ERROR'
      );
    }

    let json;
    try {
      json = await response.json();
    } catch (err) {
      if (response.status === 413) {
        throw new ApiError('File is too large for the server upload limit (HTTP 413).', 'FILE_TOO_LARGE');
      }
      if (response.status === 404) {
        throw new ApiError(
          'API endpoint not found (HTTP 404). In your Render Static Site settings, ensure VITE_API_URL is set to your backend URL (e.g. https://your-backend.onrender.com).',
          'NOT_FOUND'
        );
      }
      throw new ApiError(
        `Server returned non-JSON response (HTTP ${response.status}). The backend service may still be starting up.`,
        'SERVER_ERROR'
      );
    }

    if (!response.ok || !json.success) {
      throw new ApiError(
        json.error?.message || defaultErrorMsg,
        json.error?.code || 'UPLOAD_FAILED',
        json.error?.details
      );
    }

    return json.data;
  },

  async uploadProductImage(productId, file) {
    const formData = new FormData();
    formData.append('image', file);
    return this.uploadFormData(ENDPOINTS.uploadProductImage(productId), formData, 'Failed to upload image');
  },

  // Direct 3D Model Upload (GLB)
  async uploadModel(file, { name, category } = {}) {
    const formData = new FormData();
    formData.append('model', file);
    if (name) formData.append('name', name);
    if (category) formData.append('category', category);

    return this.uploadFormData(ENDPOINTS.uploadModel(), formData, 'Failed to upload 3D model');
  },

  async uploadProductModel(productId, file) {
    const formData = new FormData();
    formData.append('model', file);
    return this.uploadFormData(ENDPOINTS.uploadProductModel(productId), formData, 'Failed to upload 3D model to product');
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

  async deleteAsset(assetId) {
    return request(ENDPOINTS.deleteAsset(assetId), {
      method: 'DELETE',
    });
  },

  // Shopify Integration
  async resolveShopifyProduct(payload) {
    return request(ENDPOINTS.shopifyResolve(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async generateShopifyProduct(payload) {
    return request(ENDPOINTS.shopifyGenerate(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
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
