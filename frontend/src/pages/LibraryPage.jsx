import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import {
  Layers,
  Search,
  Plus,
  Box,
  Download,
  Trash2,
  Calendar,
  AlertCircle,
  Loader2,
  Filter,
  CheckCircle2,
  Clock,
  Maximize2,
  Eye,
} from 'lucide-react';

export function LibraryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getProducts({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        pageSize: 50,
      });
      setProducts(res.data || []);
    } catch (err) {
      console.error('Failed to load library:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load models. Make sure the backend server is running.');
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await api.deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      await fetchProducts();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete product. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const downloadAsset = (product) => {
    const asset = product.assets?.[0];
    if (!asset) return;
    const downloadUrl = api.getAssetDownloadUrl(asset.id);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${product.name.replace(/[^a-zA-Z0-9-_ ]/g, '')}.glb`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLaunchAR = (product) => {
    const asset = product.assets?.[0];
    if (!asset) return;

    const serveUrl = api.getAssetServeUrl(asset.id);
    const absoluteGlbUrl = serveUrl.startsWith('http')
      ? serveUrl
      : new URL(serveUrl, window.location.origin).href;

    const userAgent = (navigator.userAgent || '').toLowerCase();
    const isAndroid = userAgent.includes('android');

    if (isAndroid && absoluteGlbUrl.startsWith('https://')) {
      const fallbackUrl = window.location.origin + `/viewer/${product.id}`;
      const sceneViewerUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(
        absoluteGlbUrl
      )}&mode=ar_only&resizable=true&title=${encodeURIComponent(
        product.name
      )}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(
        fallbackUrl
      )};end;`;
      window.location.href = sceneViewerUrl;
    } else {
      window.location.href = `/viewer/${product.id}`;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-forma-border">
        <div>
          <h1 className="text-2xl font-bold text-forma-text tracking-tight">
            Product 3D Library
          </h1>
          <p className="text-xs text-forma-text-secondary mt-0.5">
            Manage persistent 3D models and test interactive orbit controls or real room AR placement.
          </p>
        </div>

        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-forma-accent hover:bg-forma-accent-hover shadow-forma transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Upload 3D Model</span>
        </Link>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-forma-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by title..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-forma-border bg-forma-surface focus:outline-none focus:ring-2 focus:ring-forma-accent/20 focus:border-forma-accent text-forma-text"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-forma-text-secondary" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-forma-border bg-forma-surface focus:outline-none focus:ring-2 focus:ring-forma-accent/20 focus:border-forma-accent text-forma-text"
          >
            <option value="">All Statuses</option>
            <option value="SUCCEEDED">Ready</option>
            <option value="PROCESSING">Processing</option>
            <option value="QUEUED">Queued</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-forma-error shrink-0 mt-0.5" />
          <div className="text-xs text-forma-error">
            <p className="font-semibold">Library Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-forma-accent animate-spin mx-auto" />
          <p className="text-xs font-medium text-forma-text-secondary">Loading products from database...</p>
        </div>
      ) : products.length === 0 ? (
        /* Empty State */
        <div className="bg-forma-surface rounded-2xl border border-forma-border p-12 text-center max-w-lg mx-auto space-y-4 card-shadow my-8">
          <div className="w-12 h-12 rounded-xl bg-forma-accent/10 flex items-center justify-center text-forma-accent mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-forma-text">No Models Found</h3>
            <p className="text-xs text-forma-text-secondary">
              {search || statusFilter
                ? 'No models match your search or filter criteria.'
                : 'Your library is empty. Upload a .GLB 3D model to inspect in WebGL and view in AR.'}
            </p>
          </div>
          <Link
            to="/upload"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-forma-accent hover:bg-forma-accent-hover shadow-forma transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Upload 3D Model</span>
          </Link>
        </div>
      ) : (
        /* Product Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((product) => {
            const latestJob = product.latestJob;
            const asset = product.assets?.[0];
            const isCompleted = !!asset || latestJob?.status === 'SUCCEEDED';
            const isRunning =
              !asset && ['QUEUED', 'PROCESSING', 'DOWNLOADING'].includes(latestJob?.status || '');
            const isFailed = !asset && latestJob?.status === 'FAILED';

            return (
              <div
                key={product.id}
                className="bg-forma-surface rounded-xl border border-forma-border overflow-hidden card-shadow card-hover flex flex-col"
              >
                {/* Thumbnail / 3D Preview Area */}
                <div className="relative h-48 bg-gradient-to-b from-[#F7F9FC] to-[#EEF2F7] border-b border-forma-border p-3 flex items-center justify-center group overflow-hidden">
                  {product.sourceImagePath ? (
                    <img
                      src={api.getProductImageUrl(product.id)}
                      alt={product.name}
                      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 text-forma-text-secondary group-hover:scale-105 transition-transform duration-300">
                      <div className="w-16 h-16 rounded-2xl bg-forma-accent/10 flex items-center justify-center text-forma-accent shadow-forma-sm">
                        <Box className="w-8 h-8" />
                      </div>
                      <span className="text-[11px] font-medium text-forma-text-secondary">
                        3D Asset File
                      </span>
                    </div>
                  )}

                  {/* Status Badge Overlay */}
                  <div className="absolute top-2.5 left-2.5">
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-forma-success backdrop-blur-sm">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ready</span>
                      </span>
                    )}
                    {isRunning && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[10px] font-semibold text-forma-accent animate-pulse-subtle backdrop-blur-sm">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Generating</span>
                      </span>
                    )}
                    {isFailed && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-[10px] font-semibold text-forma-error backdrop-blur-sm">
                        <AlertCircle className="w-3 h-3" />
                        <span>Failed</span>
                      </span>
                    )}
                  </div>

                  {/* Format tag */}
                  {asset && (
                    <span className="absolute bottom-2.5 right-2.5 px-1.5 py-0.5 rounded bg-white/90 border border-forma-border text-[10px] font-mono text-forma-text-secondary uppercase">
                      {asset.format}
                    </span>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-forma-text truncate" title={product.name}>
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] text-forma-text-secondary mt-1">
                      <span className="capitalize">{product.category || 'General'}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(product.createdAt).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-forma-border flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isCompleted ? (
                        <>
                          <Link
                            to={`/viewer/${product.id}`}
                            className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-forma-accent text-white hover:bg-forma-accent-hover transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </Link>
                          <button
                            onClick={() => handleLaunchAR(product)}
                            title="View in Your Room (AR)"
                            className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-forma-navy text-white hover:bg-forma-navy/90 transition-colors flex items-center gap-1"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-forma-accent" />
                            <span>AR</span>
                          </button>
                          <button
                            onClick={() => downloadAsset(product)}
                            title="Download GLB File"
                            className="p-1.5 rounded-md border border-forma-border text-forma-text hover:bg-forma-muted transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : latestJob ? (
                        <Link
                          to={`/generations/${latestJob.id}`}
                          className="px-3 py-1.5 rounded-md text-xs font-medium border border-forma-border text-forma-text hover:bg-forma-muted transition-colors flex items-center gap-1"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Status</span>
                        </Link>
                      ) : (
                        <Link
                          to={`/upload`}
                          className="px-3 py-1.5 rounded-md text-xs font-medium border border-forma-border text-forma-text hover:bg-forma-muted transition-colors"
                        >
                          Upload
                        </Link>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => setDeleteTarget(product)}
                      title="Delete Product"
                      className="p-1.5 text-forma-text-secondary hover:text-forma-error hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forma-text/30 backdrop-blur-sm animate-fade-in">
          <div className="bg-forma-surface rounded-xl border border-forma-border p-6 max-w-md w-full card-shadow space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-forma-error flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-forma-text">Delete Product?</h3>
                <p className="text-xs text-forma-text-secondary leading-relaxed">
                  Are you sure you want to delete <strong className="text-forma-text">"{deleteTarget.name}"</strong>? This will permanently remove the record and all associated image and GLB model files from persistent storage.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-xs font-medium border border-forma-border text-forma-text hover:bg-forma-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-forma-error text-white hover:bg-forma-error/90 transition-colors flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Product</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
