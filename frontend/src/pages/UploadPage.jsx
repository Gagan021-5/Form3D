import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import {
  MAX_UPLOAD_SIZE_BYTES,
  ALLOWED_IMAGE_MIMES,
} from '@forma3d/shared';
import {
  UploadCloud,
  X,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

export function UploadPage() {
  const navigate = useNavigate();

  // Form states
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [productName, setProductName] = useState('');

  // Status & Validation
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  const fileInputRef = useRef(null);

  const cleanFilename = (filename) => {
    if (!filename) return '';
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
    if (!nameWithoutExt) return 'Untitled 3D Model';
    return nameWithoutExt.charAt(0).toUpperCase() + nameWithoutExt.slice(1);
  };

  const validateAndSetFile = (file) => {
    setErrorMessage(null);

    // MIME type check
    if (!ALLOWED_IMAGE_MIMES.includes(file.type)) {
      setErrorMessage(
        'Invalid file type. Please upload a JPG, JPEG, PNG, or WebP image.'
      );
      return;
    }

    // Size check
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setErrorMessage(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 10 MB.`
      );
      return;
    }

    // Revoke old preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    const newPreview = URL.createObjectURL(file);
    setPreviewUrl(newPreview);

    // Auto-fill product name from filename if not manually customized
    setProductName(cleanFilename(file.name));
  };

  const loadSampleSneaker = async () => {
    try {
      setErrorMessage(null);
      const res = await fetch('/test-sneaker.jpg');
      const blob = await res.blob();
      const file = new File([blob], 'modern-luxury-sneaker.jpg', { type: 'image/jpeg' });
      validateAndSetFile(file);
    } catch (err) {
      console.error('Failed to load sample image:', err);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  }, [previewUrl]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setProductName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedFile) {
      setErrorMessage('Please select or drop a product image to proceed.');
      return;
    }

    try {
      setIsSubmitting(true);

      const finalName = productName.trim() || cleanFilename(selectedFile.name) || 'Untitled 3D Model';

      // Step 1: Create product record (application metadata only)
      setSubmitStep('Preparing model record...');
      const product = await api.createProduct({
        name: finalName,
      });

      // Step 2: Upload source image
      setSubmitStep('Uploading product photo...');
      await api.uploadProductImage(product.id, selectedFile);

      // Step 3: Trigger generation task (Tripo API receives only the image file token)
      setSubmitStep('Synthesizing 3D model...');
      const job = await api.startGeneration(product.id);

      // Step 4: Route immediately to generation tracking
      navigate(`/generations/${job.id}`);
    } catch (err) {
      console.error('Submission failed:', err);
      setIsSubmitting(false);
      setSubmitStep('');
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to start generation. Please check your connection and try again.');
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-forma-text-secondary hover:text-forma-text mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <h1 className="text-2xl font-bold text-forma-text tracking-tight">
          Create New 3D Model
        </h1>
        <p className="text-xs text-forma-text-secondary">
          Upload a clear photograph of your product to generate an interactive 3D model.
        </p>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-forma-error shrink-0 mt-0.5" />
          <div className="text-xs text-forma-error space-y-0.5">
            <p className="font-semibold">Upload Error</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card: Dropzone / Preview */}
        <div className="bg-forma-surface rounded-2xl border border-forma-border p-6 card-shadow space-y-5">
          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-forma-accent bg-forma-accent/5 scale-[0.99]'
                  : 'border-forma-border hover:border-forma-accent/60 bg-forma-bg/40 hover:bg-forma-muted/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-14 h-14 rounded-2xl bg-forma-accent/10 flex items-center justify-center text-forma-accent mb-4 shadow-forma-sm">
                <UploadCloud className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-forma-text">
                Click to browse or drop your product photo here
              </p>
              <p className="text-xs text-forma-text-secondary mt-1.5">
                Supports JPG, JPEG, PNG, or WebP &bull; Max 10 MB
              </p>
              <p className="text-[11px] text-forma-text-secondary/70 mt-3 max-w-sm">
                Tip: Clean, isolated product shots on neutral or solid backgrounds produce the best 3D geometry.
              </p>

              <div className="mt-4 pt-3.5 border-t border-forma-border/70 w-full max-w-xs flex items-center justify-center gap-2">
                <span className="text-xs text-forma-text-secondary">Want to test now?</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadSampleSneaker();
                  }}
                  className="text-xs font-semibold text-forma-accent hover:underline flex items-center gap-1 p-1 rounded hover:bg-forma-accent/10 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Try Sample Sneaker</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {/* Selected Image Card */}
              <div className="rounded-xl border border-forma-border bg-forma-bg p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-36 h-36 shrink-0 rounded-xl overflow-hidden border border-forma-border bg-white flex items-center justify-center shadow-forma-sm">
                  <img
                    src={previewUrl}
                    alt="Uploaded Product Preview"
                    className="w-full h-full object-contain p-2"
                  />
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Image Ready for 3D Synthesis</span>
                    </div>
                    <p className="text-sm font-bold text-forma-text truncate max-w-xs sm:max-w-md">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-forma-text-secondary">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; {selectedFile.type}
                    </p>
                  </div>

                  <div className="flex items-center justify-center sm:justify-start gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-medium text-forma-accent hover:underline"
                    >
                      Change Photo
                    </button>
                    <span className="text-forma-border">&bull;</span>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="text-xs font-medium text-forma-error hover:underline flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Optional Name (Auto-filled from filename) */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="productName"
                    className="text-xs font-semibold text-forma-text"
                  >
                    Model Name
                  </label>
                  <span className="text-[11px] text-forma-text-secondary">
                    Optional &bull; Auto-detected from file
                  </span>
                </div>
                <input
                  id="productName"
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Ergonomic Office Chair"
                  maxLength={200}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-forma-border focus:outline-none focus:ring-2 focus:ring-forma-accent/20 focus:border-forma-accent text-sm text-forma-text bg-forma-surface transition-all placeholder:text-forma-text-secondary/50"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => navigate('/library')}
            className="px-5 py-2.5 rounded-xl border border-forma-border text-sm font-medium text-forma-text hover:bg-forma-muted transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={!selectedFile || isSubmitting}
            className="px-7 py-3 rounded-xl text-sm font-semibold text-white bg-forma-accent hover:bg-forma-accent-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-forma transition-all flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{submitStep || 'Processing...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate 3D Model</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
