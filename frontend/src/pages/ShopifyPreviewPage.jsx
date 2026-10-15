import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import { ModelViewer } from '../components/ModelViewer.jsx';
import {
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  RotateCcw,
  ShoppingBag,
  ExternalLink,
  Layers,
  Maximize2,
} from 'lucide-react';

export function ShopifyPreviewPage() {
  const [searchParams] = useSearchParams();

  // Extract untrusted query parameters
  const rawImage = searchParams.get('image') || '';
  const rawTitle = searchParams.get('title') || '';
  const rawProductId = searchParams.get('productId') || '';
  const rawReturnUrl = searchParams.get('returnUrl') || '';

  // Sanitized state
  const [sanitizedTitle, setSanitizedTitle] = useState('');
  const [validatedImageUrl, setValidatedImageUrl] = useState('');
  const [shopifyProductId, setShopifyProductId] = useState('');
  const [safeReturnUrl, setSafeReturnUrl] = useState(null);

  // Resolution & Generation states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [productData, setProductData] = useState(null);
  const [jobData, setJobData] = useState(null);
  const [assetData, setAssetData] = useState(null);

  const pollIntervalRef = useRef(null);

  // ─── Step 1: Input Validation ────────────────────────────────────
  useEffect(() => {
    // Validate productId
    const trimmedId = rawProductId.trim();
    if (!trimmedId) {
      setError('Missing Shopify Product ID. Please ensure your Shopify theme passes productId.');
      setLoading(false);
      return;
    }
    setShopifyProductId(trimmedId);

    // Sanitize title
    const cleanTitle = rawTitle.trim() || 'Shopify Product';
    setSanitizedTitle(cleanTitle);

    // Validate image URL (must be valid HTTP/HTTPS)
    if (!rawImage) {
      setError('No product image was provided from Shopify.');
      setLoading(false);
      return;
    }

    try {
      const parsed = new URL(rawImage);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setError('Unsupported image protocol. Only HTTP and HTTPS images can be converted to 3D.');
        setLoading(false);
        return;
      }
      setValidatedImageUrl(parsed.toString());
    } catch {
      setError('Invalid product image URL supplied by Shopify.');
      setLoading(false);
      return;
    }
  }, [rawImage, rawTitle, rawProductId]);

  // ─── Step 2: Resolve Product Mapping (Prevents Duplicates) ─────────
  const resolveMapping = useCallback(async () => {
    if (!shopifyProductId || !validatedImageUrl) return;

    try {
      setLoading(true);
      setError(null);

      const res = await api.resolveShopifyProduct({
        shopifyProductId,
        title: sanitizedTitle,
        imageUrl: validatedImageUrl,
        returnUrl: rawReturnUrl || undefined,
      });

      if (res.safeReturnUrl) {
        setSafeReturnUrl(res.safeReturnUrl);
      }

      if (res.status === 'existing' && res.data) {
        setProductData(res.data);
        if (res.data.latestJob) {
          setJobData(res.data.latestJob);
        }
        if (res.data.assets && res.data.assets.length > 0) {
          setAssetData(res.data.assets[0]);
        }
      }
    } catch (err) {
      console.error('Failed to resolve Shopify product:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to connect to Forma3D server. Please verify your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, [shopifyProductId, validatedImageUrl, sanitizedTitle, rawReturnUrl]);

  useEffect(() => {
    if (shopifyProductId && validatedImageUrl) {
      resolveMapping();
    }
  }, [shopifyProductId, validatedImageUrl, resolveMapping]);

  // ─── Step 3: Poll In-Progress Generation ───────────────────────────
  useEffect(() => {
    if (jobData && ['QUEUED', 'PROCESSING', 'DOWNLOADING'].includes(jobData.status)) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const updatedJob = await api.getGeneration(jobData.id);
          setJobData(updatedJob);

          if (updatedJob.status === 'SUCCEEDED') {
            clearInterval(pollIntervalRef.current);
            // Refresh product to load new 3D model asset
            if (productData?.productId) {
              const fullProduct = await api.getProduct(productData.productId);
              if (fullProduct.assets && fullProduct.assets.length > 0) {
                setAssetData(fullProduct.assets[0]);
              }
            }
          } else if (updatedJob.status === 'FAILED') {
            clearInterval(pollIntervalRef.current);
          }
        } catch (err) {
          console.error('Failed to poll generation status:', err);
        }
      }, 3500);

      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    }
  }, [jobData, productData]);

  // ─── Step 4: Initiate 3D Model Generation ─────────────────────────
  const handleStartGeneration = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const res = await api.generateShopifyProduct({
        shopifyProductId,
        title: sanitizedTitle,
        imageUrl: validatedImageUrl,
      });

      if (res.data?.job) {
        setJobData(res.data.job);
        setProductData((prev) => ({
          ...(prev || {}),
          productId: res.data.productId,
        }));
      }
    } catch (err) {
      console.error('Failed to generate 3D model:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to initiate 3D generation. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetry = async () => {
    if (!jobData?.id) return;
    try {
      setIsGenerating(true);
      setError(null);
      const newJob = await api.retryGeneration(jobData.id);
      setJobData(newJob);
    } catch (err) {
      console.error('Failed to retry generation:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to retry generation.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Render States ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-forma-accent animate-spin mx-auto" />
        <h2 className="text-base font-semibold text-forma-text">Connecting to Shopify Store...</h2>
        <p className="text-xs text-forma-text-secondary">
          Checking existing 3D models and validating product parameters.
        </p>
      </div>
    );
  }

  const isModelReady = assetData && jobData?.status === 'SUCCEEDED';
  const isProcessing = jobData && ['QUEUED', 'PROCESSING', 'DOWNLOADING'].includes(jobData.status);
  const isFailed = jobData?.status === 'FAILED';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
      {/* Header & Return Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-forma-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-forma-navy text-white">
              Shopify Store Integration
            </span>
            {isModelReady && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-forma-success border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                3D Model Available
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-forma-text tracking-tight">
            {sanitizedTitle}
          </h1>
          <p className="text-xs text-forma-text-secondary">
            Product ID: <span className="font-mono text-forma-text">{shopifyProductId}</span>
          </p>
        </div>

        {/* Validated Return to Store Action */}
        {safeReturnUrl ? (
          <a
            href={safeReturnUrl}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-forma-surface border border-forma-border hover:bg-forma-muted text-forma-text transition-colors shadow-forma"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-forma-accent" />
            <span>Return to Store</span>
          </a>
        ) : (
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-forma-surface border border-forma-border hover:bg-forma-muted text-forma-text transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Forma3D</span>
          </Link>
        )}
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-xs text-forma-error">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">Preview Error</p>
            <p className="leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* ─── State 1: 3D Model is Succeeded & Interactive ───────────── */}
      {isModelReady && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-[460px] sm:h-[540px] w-full">
              <ModelViewer
                modelUrl={api.getAssetServeUrl(assetData.id)}
                productName={sanitizedTitle}
                onDownload={() => {
                  const link = document.createElement('a');
                  link.href = api.getAssetDownloadUrl(assetData.id);
                  link.download = `${sanitizedTitle}.glb`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="h-full"
                enableAR={true}
              />
            </div>
          </div>

          {/* Right Product Details & Room Placement Bar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-forma-border p-5 space-y-4 shadow-forma">
              <div className="flex items-center gap-3">
                <img
                  src={validatedImageUrl}
                  alt={sanitizedTitle}
                  className="w-16 h-16 rounded-xl object-cover border border-forma-border shrink-0 bg-forma-muted"
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-forma-text-secondary uppercase tracking-wider">
                    Source Photo
                  </p>
                  <p className="text-xs font-bold text-forma-text truncate">{sanitizedTitle}</p>
                  <p className="text-[11px] text-forma-success flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    Mesh Reconstructed
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-forma-border text-xs">
                <div className="flex justify-between text-forma-text-secondary">
                  <span>Format</span>
                  <span className="font-mono font-medium text-forma-text">Binary glTF (.GLB)</span>
                </div>
                <div className="flex justify-between text-forma-text-secondary">
                  <span>Mesh Geometry</span>
                  <span className="font-medium text-forma-text">UV-unwrapped PBR</span>
                </div>
                <div className="flex justify-between text-forma-text-secondary">
                  <span>Room Placement</span>
                  <span className="font-medium text-forma-accent">AR Enabled</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => {
                    const userAgent = (navigator.userAgent || '').toLowerCase();
                    const isAndroid = userAgent.includes('android');
                    const absoluteGlbUrl = new URL(
                      api.getAssetServeUrl(assetData.id),
                      window.location.origin
                    ).href;

                    if (isAndroid) {
                      const sceneViewerUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(
                        absoluteGlbUrl
                      )}&mode=ar_only&resizable=true&title=${encodeURIComponent(
                        sanitizedTitle
                      )}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(
                        window.location.href
                      )};end;`;
                      window.location.href = sceneViewerUrl;
                    } else {
                      // Trigger modal in viewer or alert
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="w-full py-3 rounded-xl font-bold text-xs bg-forma-navy hover:bg-forma-navy/90 text-white transition-all shadow-forma flex items-center justify-center gap-2"
                >
                  <Maximize2 className="w-4 h-4 text-forma-accent" />
                  <span>Place in Your Room</span>
                </button>

                {safeReturnUrl && (
                  <a
                    href={safeReturnUrl}
                    className="w-full py-2.5 rounded-xl font-semibold text-xs border border-forma-border bg-forma-surface hover:bg-forma-muted text-forma-text transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Back to Shopify Store</span>
                  </a>
                )}
              </div>
            </div>

            <div className="bg-forma-muted rounded-2xl border border-forma-border p-4 text-[11px] text-forma-text-secondary leading-relaxed space-y-1">
              <p className="font-semibold text-forma-text">About Room Placement (AR):</p>
              <p>
                Mobile devices using Google Chrome on Android or WebXR can instantly project this model onto your floor or table to verify dimensions and fit.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── State 2: Generation In Progress ────────────────────────── */}
      {isProcessing && (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-forma-border p-6 sm:p-8 space-y-6 shadow-forma text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 text-forma-accent flex items-center justify-center mx-auto animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-forma-text">
              Generating 3D Model from Shopify Photo
            </h2>
            <p className="text-xs text-forma-text-secondary max-w-md mx-auto leading-relaxed">
              Neural geometry synthesis and texture projection in progress. This step takes approximately 45–90 seconds. You may keep this window open or return to your store.
            </p>
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-forma-text">
                {jobData?.providerStatus ? `Provider: ${jobData.providerStatus}` : 'Computing...'}
              </span>
              <span className="text-forma-accent">
                {typeof jobData?.progress === 'number' && jobData.progress > 0
                  ? `${jobData.progress}%`
                  : 'Processing'}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-forma-border overflow-hidden">
              <div
                className="h-full bg-forma-accent transition-all duration-500 rounded-full"
                style={{
                  width: `${
                    typeof jobData?.progress === 'number' && jobData.progress > 0
                      ? Math.min(100, Math.max(10, jobData.progress))
                      : 40
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="pt-2">
            <img
              src={validatedImageUrl}
              alt={sanitizedTitle}
              className="w-24 h-24 rounded-xl object-cover border border-forma-border mx-auto shadow-sm"
            />
            <p className="text-[11px] text-forma-text-secondary mt-2">Source Product Image</p>
          </div>
        </div>
      )}

      {/* ─── State 3: Generation Failed ─────────────────────────────── */}
      {isFailed && (
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-forma-border p-6 sm:p-8 space-y-5 shadow-forma text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 text-forma-error flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-forma-text">3D Generation Failed</h2>
            <p className="text-xs text-forma-text-secondary max-w-sm mx-auto leading-relaxed">
              {jobData?.errorMessage || 'The AI 3D engine encountered an error while processing this product image.'}
            </p>
            {jobData?.errorCode && (
              <p className="font-mono text-[11px] text-forma-text-secondary">
                Error Code: {jobData.errorCode}
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleRetry}
              disabled={isGenerating}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-forma-accent text-white hover:bg-forma-accent-hover transition-colors flex items-center gap-2 shadow-forma disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              <span>Retry Generation</span>
            </button>
            {safeReturnUrl && (
              <a
                href={safeReturnUrl}
                className="px-4 py-2.5 rounded-xl text-xs font-medium border border-forma-border hover:bg-forma-muted text-forma-text transition-colors"
              >
                Return to Store
              </a>
            )}
          </div>
        </div>
      )}

      {/* ─── State 4: Not Yet Generated (Ready to Create 3D Model) ────── */}
      {!isModelReady && !isProcessing && !isFailed && (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-forma-border p-6 sm:p-8 space-y-6 shadow-forma">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group shrink-0">
              <img
                src={validatedImageUrl}
                alt={sanitizedTitle}
                className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl object-cover border border-forma-border shadow-sm bg-forma-muted"
              />
              <span className="absolute bottom-2 left-2 right-2 text-center text-[10px] font-semibold bg-white/90 backdrop-blur-sm border border-forma-border rounded-lg py-1 text-forma-text">
                Shopify Photo
              </span>
            </div>

            <div className="space-y-3 text-center sm:text-left">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-forma-accent">
                  AI 3D Reconstruction
                </span>
                <h2 className="text-xl font-extrabold text-forma-text">
                  Transform Into an Interactive 3D Model
                </h2>
                <p className="text-xs text-forma-text-secondary leading-relaxed">
                  A high-fidelity 3D mesh has not yet been computed for this Shopify product. Click below to initiate AI geometric synthesis and prepare room placement.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={handleStartGeneration}
                  disabled={isGenerating}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold text-white bg-forma-accent hover:bg-forma-accent-hover active:scale-95 transition-all shadow-forma-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate 3D Model</span>
                    </>
                  )}
                </button>

                {safeReturnUrl && (
                  <a
                    href={safeReturnUrl}
                    className="w-full sm:w-auto px-4 py-3 rounded-xl text-xs font-medium border border-forma-border hover:bg-forma-muted text-forma-text transition-colors text-center"
                  >
                    Back to Store
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
