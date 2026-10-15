import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import { ModelViewer } from '../components/ModelViewer.jsx';
import { PRODUCT_CATEGORIES } from '@forma3d/shared';
import {
  ArrowLeft,
  Download,
  Layers,
  Calendar,
  HardDrive,
  AlertCircle,
  Loader2,
  FileBox,
  Tag,
  Camera,
} from 'lucide-react';

export function ViewerPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [asset, setAsset] = useState(null);
  const [category, setCategory] = useState('');
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    if (id === 'demo') {
      setProduct({
        id: 'demo',
        name: 'Contemporary Armchair',
        category: 'furniture',
        createdAt: new Date().toISOString(),
        isDemo: true,
      });
      setAsset({
        id: 'demo-asset',
        format: 'glb',
        fileSize: 6256,
      });
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await api.getProduct(id);
        setProduct(data);
        setCategory(data.category || '');

        // Find completed asset
        if (data.assets && data.assets.length > 0) {
          setAsset(data.assets[0]);
        } else if (data.latestJob && ['QUEUED', 'PROCESSING', 'DOWNLOADING'].includes(data.latestJob.status)) {
          // If job is still running, redirect to generation status page
          navigate(`/generations/${data.latestJob.id}`, { replace: true });
          return;
        } else {
          setError('No generated 3D model found for this product.');
        }
      } catch (err) {
        console.error('Failed to load product for viewer:', err);
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load 3D model. Please verify product ID.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, navigate]);

  const handleCategoryChange = async (newCategory) => {
    if (product?.isDemo) {
      setCategory(newCategory || '');
      return;
    }
    try {
      setIsUpdatingCategory(true);
      const updated = await api.updateProduct(product.id, {
        category: newCategory || null,
      });
      setProduct((prev) => ({ ...prev, category: updated.category }));
      setCategory(updated.category || '');
    } catch (err) {
      console.error('Failed to update category:', err);
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const handleDownload = () => {
    if (!asset) return;
    const downloadUrl =
      asset.id === 'demo-asset'
        ? '/models/sample-product.glb'
        : api.getAssetDownloadUrl(asset.id);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${product?.name || 'model'}.glb`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-forma-accent animate-spin mx-auto" />
        <p className="text-sm font-medium text-forma-text">Loading 3D asset and metadata...</p>
      </div>
    );
  }

  if (error || !product || !asset) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-forma-error mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-forma-text">Model Not Available</h2>
        <p className="text-xs text-forma-text-secondary max-w-sm mx-auto">
          {error || 'The requested 3D model could not be located on disk.'}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            to="/library"
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-forma-accent text-white hover:bg-forma-accent-hover transition-colors flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Back to Library</span>
          </Link>
          <Link
            to="/upload"
            className="px-4 py-2 rounded-lg text-xs font-medium border border-forma-border bg-white text-forma-text hover:bg-forma-muted transition-colors"
          >
            Create New Model
          </Link>
        </div>
      </div>
    );
  }

  const modelServeUrl =
    asset?.id === 'demo-asset' ? '/models/sample-product.glb' : api.getAssetServeUrl(asset.id);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Top Bar Navigation & Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-forma-border">
        <div className="flex items-center gap-3">
          <Link
            to="/library"
            className="p-2 rounded-lg border border-forma-border text-forma-text hover:bg-forma-muted transition-colors"
            title="Back to Model Library"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-forma-text tracking-tight">
                {product.name}
              </h1>
              {product.isDemo ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-forma-accent uppercase tracking-wider">
                  Demo Showcase &bull; Pre-Rendered
                </span>
              ) : (
                product.category && (
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-forma-muted border border-forma-border text-forma-text-secondary capitalize">
                    {product.category}
                  </span>
                )
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-forma-text-secondary mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(product.createdAt).toLocaleDateString()}</span>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5" />
                <span>{(asset.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <FileBox className="w-3.5 h-3.5" />
                <span>Standard 3D Asset (.GLB)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Actions: AR Camera & Download */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              const arBtn = document.querySelector('button[title*="View in Your Room"]');
              if (arBtn) {
                arBtn.click();
              }
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-lg shadow-md flex items-center gap-2 transition-all"
            title="Place in your room using phone camera"
          >
            <Camera className="w-4 h-4" />
            <span>View in Room (AR)</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-3.5 py-2 text-xs font-medium border border-forma-border text-forma-text hover:bg-forma-muted active:bg-forma-muted/80 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download GLB</span>
          </button>
        </div>
      </div>

      {/* Main 3D Studio & Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Interactive 3D Viewer */}
        <div className="lg:col-span-3 bg-forma-surface rounded-2xl border border-forma-border p-4 card-shadow">
          <div className="h-[400px] sm:h-[520px] w-full">
            <ModelViewer
              modelUrl={modelServeUrl}
              productName={product.name}
              onDownload={handleDownload}
              className="h-full"
            />
          </div>
        </div>

        {/* Right: Asset & Source Image Details */}
        <div className="space-y-6">
          {/* Card: Mobile AR Placement QR Code */}
          <div className="bg-forma-surface rounded-xl border border-forma-border p-5 card-shadow space-y-3 text-center">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-forma-text flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                <span>Place in Your Room</span>
              </h3>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                AR Camera
              </span>
            </div>

            <p className="text-xs text-forma-text-secondary leading-snug">
              Point your phone's camera at this QR code to render <span className="font-semibold text-forma-text">{product.name}</span> in your room at 1:1 physical scale.
            </p>

            <div className="p-2.5 bg-forma-bg rounded-xl border border-forma-border inline-block mx-auto shadow-sm">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  `${window.location.origin}/viewer/${product.id}?ar=true`
                )}`}
                alt="Scan to View in Room"
                className="w-36 h-36 rounded-lg mx-auto"
                loading="lazy"
              />
            </div>

            <p className="text-[11px] text-forma-text-secondary">
              Direct AR camera handoff with automatic floor detection.
            </p>
          </div>

          {/* Card: Source Photo or Direct Upload Badge */}
          <div className="bg-forma-surface rounded-xl border border-forma-border p-5 card-shadow space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-forma-text-secondary">
              {product.sourceImagePath ? 'Input Photograph' : 'Source Asset'}
            </h3>
            {product.isDemo ? (
              <div className="rounded-lg border border-forma-border bg-forma-bg overflow-hidden p-4 flex flex-col items-center justify-center h-48 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-forma-accent flex items-center justify-center mx-auto">
                  <FileBox className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-forma-text">Pre-Rendered Showcase</p>
                <p className="text-[11px] text-forma-text-secondary leading-tight">
                  Pre-rendered sample armchair model served from local assets. Demonstrates full Three.js controls and AR room placement with 0 API credits.
                </p>
              </div>
            ) : product.sourceImagePath ? (
              <div className="rounded-lg border border-forma-border bg-forma-bg overflow-hidden p-2 flex items-center justify-center h-48 shadow-forma-sm">
                <img
                  src={api.getProductImageUrl(product.id)}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="rounded-lg border border-forma-border bg-forma-bg overflow-hidden p-4 flex flex-col items-center justify-center h-48 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-forma-accent/10 flex items-center justify-center text-forma-accent mx-auto shadow-forma-sm">
                  <FileBox className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-forma-text">Direct 3D Model Upload</p>
                <p className="text-[11px] text-forma-text-secondary leading-tight">
                  This 3D asset was uploaded directly to your library without AI generation or reference photo requirement.
                </p>
              </div>
            )}
            <p className="text-[11px] text-forma-text-secondary">
              {product.isDemo
                ? 'Standard GLB binary mesh with PBR metallic-roughness materials.'
                : product.sourceImagePath
                ? 'Generated from this 2D reference photo.'
                : 'Imported directly as a binary glTF (.glb) model.'}
            </p>
          </div>

          {/* Card: Model Specs */}
          <div className="bg-forma-surface rounded-xl border border-forma-border p-5 card-shadow space-y-3 text-xs">
            <h3 className="font-bold uppercase tracking-wider text-forma-text-secondary">
              Geometry Specs
            </h3>
            <div className="space-y-2 text-forma-text">
              <div className="flex justify-between py-1 border-b border-forma-border">
                <span className="text-forma-text-secondary">Asset Format</span>
                <span className="font-mono font-medium uppercase">{asset.format}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-forma-border">
                <span className="text-forma-text-secondary">File Size</span>
                <span className="font-mono font-medium">{(asset.fileSize / 1024).toFixed(0)} KB</span>
              </div>
              <div className="flex justify-between py-1 border-b border-forma-border">
                <span className="text-forma-text-secondary">Shading</span>
                <span className="font-medium">Metallic-Roughness PBR</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-forma-text-secondary">Storage</span>
                <span className="font-medium">Local Disk</span>
              </div>
            </div>
          </div>

          {/* Card: Model Details & Category */}
          <div className="bg-forma-surface rounded-xl border border-forma-border p-5 card-shadow space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold uppercase tracking-wider text-forma-text-secondary flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-forma-accent" />
                <span>Model Category</span>
              </h3>
              {isUpdatingCategory && (
                <span className="text-[11px] text-forma-accent font-medium animate-pulse">Saving...</span>
              )}
            </div>

            <div>
              <select
                id="modelCategorySelect"
                value={category || ''}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-forma-border bg-forma-surface text-forma-text focus:outline-none focus:ring-1 focus:ring-forma-accent text-xs transition-colors capitalize"
              >
                <option value="">Uncategorized</option>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-forma-text-secondary mt-1.5">
                Organize your 3D assets in the product library by category.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
