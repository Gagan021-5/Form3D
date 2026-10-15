import { Link } from 'react-router-dom';
import { ModelViewer } from '../components/ModelViewer.jsx';
import {
  Upload,
  Cpu,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';

export function LandingPage() {
  const sampleModelUrl = '/models/sample-product.glb';

  const downloadSample = () => {
    const link = document.createElement('a');
    link.href = sampleModelUrl;
    link.download = 'forma3d-sample-product.glb';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-12 sm:space-y-20 py-6 sm:py-12">
      {/* ─── Hero Section ────────────────────────────────────────────── */}
      <section className="text-center max-w-4xl mx-auto px-4 space-y-5">
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-forma-text tracking-tight leading-tight">
          Turn Product Photos Into{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-forma-accent to-forma-accent-hover">
            Interactive 3D
          </span>
        </h1>

        <p className="text-sm sm:text-base lg:text-lg text-forma-text-secondary max-w-2xl mx-auto leading-relaxed">
          Transform 2D product photos into production-ready 3D models in minutes. Inspect mesh topologies, interact in real-time, and export directly to your design stack.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/upload"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-white bg-forma-accent hover:bg-forma-accent-hover shadow-forma-md transition-all flex items-center justify-center gap-2 text-sm"
          >
            <span>Create a 3D Model</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/library"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-medium text-forma-text bg-forma-surface hover:bg-forma-muted border border-forma-border shadow-forma transition-colors text-sm"
          >
            Browse Library
          </Link>
        </div>
      </section>

      {/* ─── Live Demonstration Section ──────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="bg-forma-surface rounded-2xl border border-forma-border p-4 sm:p-6 card-shadow space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-forma-border">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h2 className="text-sm sm:text-base font-bold text-forma-text">
                  Interactive 3D Studio Showcase
                </h2>
              </div>
              <p className="text-xs text-forma-text-secondary mt-0.5">
                Contemporary Armchair — rotate, zoom, and inspect surface topology
              </p>
            </div>
          </div>

          {/* Interactive 3D Canvas */}
          <div className="h-[400px] sm:h-[480px] w-full">
            <ModelViewer
              modelUrl={sampleModelUrl}
              productName="Contemporary Armchair"
              onDownload={downloadSample}
              className="h-full"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-forma-text-secondary pt-1 gap-2">
            <span className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-forma-accent shrink-0" />
              <span>Use mouse or touch controls to rotate, zoom, and test camera angles</span>
            </span>
            <span className="text-forma-text font-medium hidden sm:inline">WebGL Studio</span>
          </div>
        </div>
      </section>

      {/* ─── 3-Step Workflow ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-forma-text tracking-tight">
            How It Works
          </h2>
          <p className="text-xs sm:text-sm text-forma-text-secondary">
            Three simple steps to transform product images into 3D files
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-forma-surface rounded-xl border border-forma-border p-6 card-shadow space-y-4 card-hover">
            <div className="w-10 h-10 rounded-lg bg-forma-accent/10 flex items-center justify-center text-forma-accent font-bold text-sm">
              01
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-forma-text flex items-center gap-2">
                <Upload className="w-4 h-4 text-forma-accent" />
                Upload Photo
              </h3>
              <p className="text-xs text-forma-text-secondary leading-relaxed">
                Provide a clean photograph or studio render of your product on a neutral or solid background.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-forma-surface rounded-xl border border-forma-border p-6 card-shadow space-y-4 card-hover">
            <div className="w-10 h-10 rounded-lg bg-forma-accent/10 flex items-center justify-center text-forma-accent font-bold text-sm">
              02
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-forma-text flex items-center gap-2">
                <Cpu className="w-4 h-4 text-forma-accent" />
                3D Reconstruction
              </h3>
              <p className="text-xs text-forma-text-secondary leading-relaxed">
                Deep neural reconstruction synthesizes multi-view geometry, bakes textures, and optimizes polygon flow.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-forma-surface rounded-xl border border-forma-border p-6 card-shadow space-y-4 card-hover">
            <div className="w-10 h-10 rounded-lg bg-forma-accent/10 flex items-center justify-center text-forma-accent font-bold text-sm">
              03
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-forma-text flex items-center gap-2">
                <Layers className="w-4 h-4 text-forma-accent" />
                Inspect & Export
              </h3>
              <p className="text-xs text-forma-text-secondary leading-relaxed">
                Interact with your 3D product directly in the studio, toggle wireframe topology, and download the standardized GLB.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Call to Action ─────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="rounded-2xl border border-forma-border bg-gradient-to-b from-forma-surface to-forma-muted p-8 sm:p-12 text-center space-y-5 card-shadow">
          <h2 className="text-2xl sm:text-3xl font-bold text-forma-text tracking-tight">
            Ready to bring your products into 3D?
          </h2>
          <p className="text-sm text-forma-text-secondary max-w-xl mx-auto leading-relaxed">
            Upload your first photo to generate an interactive 3D model with real-time materials and instant export.
          </p>
          <div className="pt-2 flex justify-center">
            <Link
              to="/upload"
              className="px-7 py-3.5 rounded-xl font-semibold text-white bg-forma-accent hover:bg-forma-accent-hover shadow-forma-md transition-all flex items-center gap-2 text-sm"
            >
              <span>Create a 3D Model</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
