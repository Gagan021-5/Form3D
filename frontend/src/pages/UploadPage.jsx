import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import {
  MAX_MODEL_UPLOAD_SIZE_BYTES,
  PRODUCT_CATEGORIES,
} from '@forma3d/shared';
import {
  X,
  AlertCircle,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Box,
  Layers,
  ArrowRight,
  Eye,
} from 'lucide-react';

export function UploadPage() {
  const navigate = useNavigate();

  // Direct Model Upload State
  const [selectedModelFile, setSelectedModelFile] = useState(null);
  const [modelName, setModelName] = useState('');
  const [modelCategory, setModelCategory] = useState('');
  const [uploadedProduct, setUploadedProduct] = useState(null);

  // Status & Validation
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  const modelInputRef = useRef(null);

  const cleanFilename = (filename) => {
    if (!filename) return '';
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
    if (!nameWithoutExt) return 'Untitled 3D Model';
    return nameWithoutExt.charAt(0).toUpperCase() + nameWithoutExt.slice(1);
  };

  const validateAndSetModelFile = (file) => {
    setErrorMessage(null);
    setUploadedProduct(null);

    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.glb') {
      setErrorMessage('Invalid file format. Please upload a standard binary glTF (.glb) 3D model.');
      return;
    }

    if (file.size > MAX_MODEL_UPLOAD_SIZE_BYTES) {
      setErrorMessage(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is ${Math.round(MAX_MODEL_UPLOAD_SIZE_BYTES / (1024 * 1024))} MB.`
      );
      return;
    }

    setSelectedModelFile(file);
    setModelName(cleanFilename(file.name));
  };

  const loadSampleGlb = async () => {
    try {
      setErrorMessage(null);
      const res = await fetch('/models/sample-product.glb');
      const blob = await res.blob();
      const file = new File([blob], 'contemporary-armchair.glb', { type: 'model/gltf-binary' });
      validateAndSetModelFile(file);
    } catch (err) {
      console.error('Failed to load sample GLB:', err);
      setErrorMessage('Could not load sample GLB file.');
    }
  };

  const handleModelSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedModelFile) {
      setErrorMessage('Please select or drop a .glb 3D model file to proceed.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitStep('Validating and uploading 3D model...');

      const finalName = modelName.trim() || cleanFilename(selectedModelFile.name) || 'Untitled 3D Model';

      const result = await api.uploadModel(selectedModelFile, {
        name: finalName,
        category: modelCategory || undefined,
      });

      setSubmitStep('');
      setIsSubmitting(false);
      setUploadedProduct(result);
    } catch (err) {
      console.error('Model upload failed:', err);
      setIsSubmitting(false);
      setSubmitStep('');
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to upload 3D model. Please verify your connection.');
      }
    }
  };

  // Drag & Drop
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
      validateAndSetModelFile(e.dataTransfer.files[0]);
    }
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <button
          onClick={() => navigate('/library')}
          className="inline-flex items-center gap-1.5 text-xs text-forma-text-secondary hover:text-forma-text mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Library</span>
        </button>
        <h1 className="text-2xl font-bold text-forma-text tracking-tight">
          Upload 3D Model (.GLB)
        </h1>
        <p className="text-xs text-forma-text-secondary">
          Directly import your binary glTF (.glb) 3D assets up to {Math.round(MAX_MODEL_UPLOAD_SIZE_BYTES / (1024 * 1024))} MB for interactive 3D inspection and instant mobile AR camera placement.
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

      {/* Main Content Area */}
      {uploadedProduct ? (
        /* Success State */
        <div className="bg-forma-surface rounded-2xl border border-forma-border p-8 card-shadow text-center space-y-5 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-forma-success flex items-center justify-center mx-auto shadow-forma-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-forma-text">3D Model Saved Successfully!</h2>
            <p className="text-xs text-forma-text-secondary max-w-md mx-auto">
              <span className="font-semibold text-forma-text">{uploadedProduct.name}</span> has been stored in your persistent library and is ready for 3D inspection and mobile AR.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => navigate(`/viewer/${uploadedProduct.id}`)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-forma-accent hover:bg-forma-accent-hover shadow-forma flex items-center justify-center gap-2 transition-all"
            >
              <Eye className="w-4 h-4" />
              <span>Open 3D Studio</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/library')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-medium border border-forma-border hover:bg-forma-muted text-forma-text transition-colors flex items-center justify-center gap-2"
            >
              <Layers className="w-4 h-4" />
              <span>View in Library</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedModelFile(null);
                setModelName('');
                setModelCategory('');
                setUploadedProduct(null);
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-medium text-forma-text-secondary hover:text-forma-text hover:bg-forma-muted transition-colors"
            >
              Upload Another
            </button>
          </div>
        </div>
      ) : (
        /* Upload Form */
        <form onSubmit={handleModelSubmit} className="space-y-6">
          <div className="bg-forma-surface rounded-2xl border border-forma-border p-6 card-shadow space-y-5">
            {!selectedModelFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => modelInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-forma-accent bg-forma-accent/5 scale-[0.99]'
                    : 'border-forma-border hover:border-forma-accent/60 bg-forma-bg/40 hover:bg-forma-muted/30'
                }`}
              >
                <input
                  ref={modelInputRef}
                  type="file"
                  accept=".glb"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      validateAndSetModelFile(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-14 h-14 rounded-2xl bg-forma-accent/10 flex items-center justify-center text-forma-accent mb-4 shadow-forma-sm">
                  <Box className="w-7 h-7" />
                </div>
                <p className="text-sm font-semibold text-forma-text">
                  Click to browse or drop your .GLB 3D model here
                </p>
                <p className="text-xs text-forma-text-secondary mt-1.5">
                  Standard Binary glTF (.glb) &bull; Up to {Math.round(MAX_MODEL_UPLOAD_SIZE_BYTES / (1024 * 1024))} MB &bull; Instant Import
                </p>
                <p className="text-[11px] text-forma-text-secondary/70 mt-3 max-w-sm">
                  Directly import 3D files to test interactive orbit controls, material rendering, and Android Google Scene Viewer AR.
                </p>

                <div className="mt-4 pt-3.5 border-t border-forma-border/70 w-full max-w-xs flex items-center justify-center gap-2">
                  <span className="text-xs text-forma-text-secondary">Have no file handy?</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadSampleGlb();
                    }}
                    className="text-xs font-semibold text-forma-accent hover:underline flex items-center gap-1 p-1 rounded hover:bg-forma-accent/10 transition-colors"
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>Try Sample Model</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Selected Model File Card */
              <div className="space-y-5 animate-fade-in">
                <div className="rounded-xl border border-forma-border bg-forma-bg p-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-16 h-16 shrink-0 rounded-xl bg-forma-accent/10 border border-forma-accent/20 flex items-center justify-center text-forma-accent shadow-forma-sm">
                    <Box className="w-8 h-8" />
                  </div>

                  <div className="flex-1 space-y-1 text-center sm:text-left min-w-0">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>GLB File Ready for Import</span>
                    </div>
                    <p className="text-sm font-bold text-forma-text truncate max-w-xs sm:max-w-md">
                      {selectedModelFile.name}
                    </p>
                    <p className="text-xs text-forma-text-secondary">
                      {(selectedModelFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Binary glTF (.glb)
                    </p>

                    <div className="flex items-center justify-center sm:justify-start gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => modelInputRef.current?.click()}
                        className="text-xs font-medium text-forma-accent hover:underline"
                      >
                        Change File
                      </button>
                      <span className="text-forma-border">&bull;</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedModelFile(null);
                          setModelName('');
                          setModelCategory('');
                        }}
                        className="text-xs font-medium text-forma-error hover:underline flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Metadata Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label htmlFor="modelNameInput" className="text-xs font-semibold text-forma-text block mb-1.5">
                      Model Title
                    </label>
                    <input
                      id="modelNameInput"
                      type="text"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="e.g. Ergonomic Office Chair"
                      maxLength={200}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-forma-border focus:outline-none focus:ring-2 focus:ring-forma-accent/20 focus:border-forma-accent text-sm text-forma-text bg-forma-surface"
                    />
                  </div>

                  <div>
                    <label htmlFor="modelCategorySelect" className="text-xs font-semibold text-forma-text block mb-1.5">
                      Category
                    </label>
                    <select
                      id="modelCategorySelect"
                      value={modelCategory}
                      onChange={(e) => setModelCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-forma-border focus:outline-none focus:ring-2 focus:ring-forma-accent/20 focus:border-forma-accent text-sm text-forma-text bg-forma-surface"
                    >
                      <option value="">Uncategorized</option>
                      {PRODUCT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
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
              disabled={!selectedModelFile || isSubmitting}
              className="px-7 py-3 rounded-xl text-sm font-semibold text-white bg-forma-accent hover:bg-forma-accent-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-forma transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{submitStep || 'Saving 3D Model...'}</span>
                </>
              ) : (
                <>
                  <Box className="w-4 h-4" />
                  <span>Save to Library &amp; Inspect</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
