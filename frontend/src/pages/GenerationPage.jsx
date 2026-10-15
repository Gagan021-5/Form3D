import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import {
  Clock,
  Cpu,
  Download,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ArrowRight,
  Layers,
  ArrowLeft,
  Loader2,
  Box,
} from 'lucide-react';

export function GenerationPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);

  const pollTimerRef = useRef(null);

  const fetchStatus = async () => {
    if (!id) return;
    try {
      const jobData = await api.getGeneration(id);
      setJob(jobData);

      // Also fetch product details if not already loaded
      if (!product || product.id !== jobData.productId) {
        const prodData = await api.getProduct(jobData.productId);
        setProduct(prodData);
      }

      setError(null);

      // If job is still in progress, continue polling
      if (['QUEUED', 'PROCESSING', 'DOWNLOADING'].includes(jobData.status)) {
        pollTimerRef.current = setTimeout(fetchStatus, 3500);
      }
    } catch (err) {
      console.error('Failed to poll generation status:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to fetch generation status. Will retry automatically.');
      }
      // Retry polling even on network hiccups
      pollTimerRef.current = setTimeout(fetchStatus, 5000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [id]);

  const handleRetry = async () => {
    if (!job) return;
    try {
      setRetrying(true);
      const newJob = await api.retryGeneration(job.id);
      navigate(`/generations/${newJob.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to initiate retry. Please try again.');
      }
      setRetrying(false);
    }
  };

  if (loading && !job) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-forma-accent animate-spin mx-auto" />
        <p className="text-sm font-medium text-forma-text">Loading generation job...</p>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-forma-error mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-forma-text">Job Not Found</h2>
        <p className="text-xs text-forma-text-secondary max-w-sm mx-auto">{error}</p>
        <Link
          to="/library"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-forma-accent text-white hover:bg-forma-accent-hover transition-colors"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Go to Model Library</span>
        </Link>
      </div>
    );
  }

  const isSuccess = job?.status === 'SUCCEEDED';
  const isFailed = job?.status === 'FAILED';
  const isProcessing = ['QUEUED', 'PROCESSING', 'DOWNLOADING'].includes(job?.status || '');

  // Determine active step index
  let stepIndex = 0;
  if (job?.status === 'QUEUED') stepIndex = 1;
  else if (job?.status === 'PROCESSING') stepIndex = 2;
  else if (job?.status === 'DOWNLOADING') stepIndex = 3;
  else if (job?.status === 'SUCCEEDED') stepIndex = 4;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between pb-2 border-b border-forma-border">
        <Link
          to="/library"
          className="inline-flex items-center gap-1.5 text-xs text-forma-text-secondary hover:text-forma-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Library</span>
        </Link>
        <span className="text-xs text-forma-text-secondary">
          Job ID: <code className="font-mono">{job?.id.slice(0, 8)}...</code>
        </span>
      </div>

      {/* Main Status Card */}
      <div className="bg-forma-surface rounded-2xl border border-forma-border p-6 sm:p-8 card-shadow space-y-8">
        {/* Product & Header info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {product?.sourceImagePath && (
              <div className="w-16 h-16 rounded-xl border border-forma-border bg-forma-bg overflow-hidden shrink-0 shadow-forma-sm">
                <img
                  src={api.getProductImageUrl(product.id)}
                  alt={product.name}
                  className="w-full h-full object-contain p-1"
                />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-forma-text tracking-tight">
                {product?.name || 'Generating 3D Asset'}
              </h1>
              <p className="text-xs text-forma-text-secondary mt-0.5">
                Provider: <span className="font-medium capitalize">{job?.providerName} Engine</span>
                {job?.providerTaskId && (
                  <> &bull; Task ID: <span className="font-mono">{job.providerTaskId.slice(0, 12)}...</span></>
                )}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div>
            {isProcessing && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-forma-accent animate-pulse-subtle">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{job?.status === 'DOWNLOADING' ? 'Downloading GLB' : 'Generating 3D Mesh'}</span>
              </span>
            )}
            {isSuccess && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-forma-success">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Generation Complete</span>
              </span>
            )}
            {isFailed && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-xs font-semibold text-forma-error">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Generation Failed</span>
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar (Actual provider progress or indeterminate) */}
        {isProcessing && (
          <div className="space-y-2 bg-forma-muted p-4 rounded-xl border border-forma-border">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-forma-text">
                {job?.providerStatus
                  ? `Provider Status: ${job.providerStatus}`
                  : 'AI Engine Computing...'}
              </span>
              <span className="font-semibold text-forma-accent">
                {typeof job?.progress === 'number' && job.progress > 0
                  ? `${job.progress}%`
                  : 'Synthesizing'}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-forma-border overflow-hidden">
              {typeof job?.progress === 'number' && job.progress > 0 ? (
                <div
                  className="h-full bg-forma-accent transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(5, job.progress))}%` }}
                />
              ) : (
                <div className="h-full bg-forma-accent/70 rounded-full animate-pulse w-2/3" />
              )}
            </div>
            <p className="text-[11px] text-forma-text-secondary">
              AI neural 3D reconstruction usually takes 45–90 seconds. You may safely refresh this page; your progress is tracked on the server.
            </p>
          </div>
        )}

        {/* Failure Box */}
        {isFailed && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-forma-error shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-forma-error">
                <p className="font-semibold text-sm">Generation Error</p>
                <p className="leading-relaxed">
                  {job?.errorMessage || 'The provider encountered an error processing this image. Please retry or upload a cleaner photo.'}
                </p>
                {job?.errorCode && (
                  <p className="font-mono text-[11px] opacity-80 pt-1">
                    Error Code: {job.errorCode}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-forma-error text-white hover:bg-forma-error/90 transition-colors flex items-center gap-1.5 shadow-forma disabled:opacity-50"
              >
                {retrying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Retrying...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Generation</span>
                  </>
                )}
              </button>
              <Link
                to="/upload"
                className="px-4 py-2 rounded-lg text-xs font-medium border border-forma-border bg-white text-forma-text hover:bg-forma-muted transition-colors"
              >
                Upload Different Image
              </Link>
            </div>
          </div>
        )}

        {/* Timeline of Processing Steps */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-forma-text-secondary">
            Pipeline Steps
          </h3>
          <div className="space-y-3">
            {/* Step 1 */}
            <div className="flex items-center gap-3 text-xs">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-forma-success flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="font-medium text-forma-text">Source image uploaded & verified</span>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-3 text-xs">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                  stepIndex > 1
                    ? 'bg-emerald-100 text-forma-success'
                    : stepIndex === 1
                    ? 'bg-forma-accent/10 text-forma-accent animate-pulse'
                    : 'bg-forma-muted text-forma-text-secondary'
                }`}
              >
                {stepIndex > 1 ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-3.5 h-3.5" />}
              </div>
              <span className={stepIndex >= 1 ? 'font-medium text-forma-text' : 'text-forma-text-secondary'}>
                Synthesizing geometric point cloud and textures
              </span>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-3 text-xs">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                  stepIndex > 2
                    ? 'bg-emerald-100 text-forma-success'
                    : stepIndex === 2
                    ? 'bg-forma-accent/10 text-forma-accent animate-pulse'
                    : 'bg-forma-muted text-forma-text-secondary'
                }`}
              >
                {stepIndex > 2 ? <CheckCircle2 className="w-4 h-4" /> : <Cpu className="w-3.5 h-3.5" />}
              </div>
              <span className={stepIndex >= 2 ? 'font-medium text-forma-text' : 'text-forma-text-secondary'}>
                Neural multi-view mesh synthesis & PBR texture baking
              </span>
            </div>

            {/* Step 4 */}
            <div className="flex items-center gap-3 text-xs">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                  stepIndex >= 4
                    ? 'bg-emerald-100 text-forma-success'
                    : stepIndex === 3
                    ? 'bg-forma-accent/10 text-forma-accent animate-pulse'
                    : 'bg-forma-muted text-forma-text-secondary'
                }`}
              >
                {stepIndex >= 4 ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-3.5 h-3.5" />}
              </div>
              <span className={stepIndex >= 3 ? 'font-medium text-forma-text' : 'text-forma-text-secondary'}>
                GLB model downloaded & saved to local storage
              </span>
            </div>
          </div>
        </div>

        {/* Success Action Box */}
        {isSuccess && product && (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
            <div className="space-y-0.5 text-center sm:text-left">
              <h4 className="text-sm font-bold text-forma-text">3D Asset Ready for Inspection</h4>
              <p className="text-xs text-forma-text-secondary">
                Your GLB model has been downloaded and verified on disk.
              </p>
            </div>
            <Link
              to={`/viewer/${product.id}`}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-forma-accent hover:bg-forma-accent-hover shadow-forma transition-all flex items-center gap-2"
            >
              <Box className="w-4 h-4" />
              <span>Open in 3D Viewer</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
