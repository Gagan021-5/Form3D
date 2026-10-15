/**
 * Forma3D Centralized API Configuration & Endpoints Registry
 *
 * FOR RENDER / PRODUCTION DEPLOYMENT:
 * Set a single environment variable in Render Static Site dashboard:
 *   VITE_API_URL=https://your-backend-service.onrender.com
 *
 * In local development, if VITE_API_URL is unset, it automatically defaults to '/api/v1'
 * which is routed through Vite's local dev server proxy to http://localhost:4000.
 */

const rawApiUrl = import.meta.env?.VITE_API_URL || '';

// Base origin (e.g. "https://your-backend.onrender.com" or empty string for local proxy)
export const API_ORIGIN = rawApiUrl ? rawApiUrl.replace(/\/+$/, '') : '';

// Base API v1 URL
export const API_BASE_URL = API_ORIGIN ? `${API_ORIGIN}/api/v1` : '/api/v1';

// Centralized REST API Endpoints Registry
export const ENDPOINTS = {
  // Products
  products: (query = '') => `${API_BASE_URL}/products${query ? `?${query}` : ''}`,
  product: (id) => `${API_BASE_URL}/products/${id}`,
  productImage: (id) => `${API_BASE_URL}/products/${id}/image`,
  uploadProductImage: (id) => `${API_BASE_URL}/products/${id}/upload`,
  productAssets: (id) => `${API_BASE_URL}/products/${id}/assets`,

  // 3D Generation Tasks
  createGeneration: (productId) => `${API_BASE_URL}/products/${productId}/generations`,
  generation: (id) => `${API_BASE_URL}/generations/${id}`,
  retryGeneration: (id) => `${API_BASE_URL}/generations/${id}/retry`,

  // Model Assets
  assetDownload: (id) => `${API_BASE_URL}/assets/${id}/download`,
  assetServe: (id) => `${API_BASE_URL}/assets/${id}/serve`,

  // Shopify Integration
  shopifyResolve: () => `${API_BASE_URL}/shopify/resolve`,
  shopifyGenerate: () => `${API_BASE_URL}/shopify/generate`,

  // System
  health: API_ORIGIN ? `${API_ORIGIN}/health` : '/health',
};

export default {
  API_ORIGIN,
  API_BASE_URL,
  ENDPOINTS,
};
