import { Suspense, useRef, useState, useMemo, Component } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  RotateCcw,
  Play,
  Pause,
  Grid,
  Maximize2,
  Minimize2,
  AlertCircle,
  Download,
  Loader2,
} from 'lucide-react';

// ─── Inner Model Component with Auto-centering and Normalization ──────
function ModelMesh({ url, wireframe }) {
  const gltf = useGLTF(url);

  // Clone scene so we don't mutate original cached object
  const sceneClone = useMemo(() => {
    const clone = gltf.scene.clone(true);

    // Compute bounding box to center and scale uniformly
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Normalize scale to fit in a ~2 unit box
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 1.8 / maxDim : 1;

    clone.scale.setScalar(scale);
    clone.position.set(
      -center.x * scale,
      -center.y * scale + (size.y * scale) / 2 - 0.5,
      -center.z * scale
    );

    // Apply materials / wireframe if selected
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            mat.wireframe = wireframe;
          });
        } else if (child.material) {
          child.material.wireframe = wireframe;
        }
      }
    });

    return clone;
  }, [gltf, wireframe]);

  return <primitive object={sceneClone} />;
}

// ─── Loading Spinner ────────────────────────────────────────────────
function Loader() {
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center p-6 bg-white/90 backdrop-blur-sm rounded-xl border border-forma-border shadow-forma-md">
        <Loader2 className="w-8 h-8 text-forma-accent animate-spin mb-3" />
        <p className="text-sm font-medium text-forma-text">Loading 3D asset...</p>
        <p className="text-xs text-forma-text-secondary mt-1">Parsing mesh geometry and PBR materials</p>
      </div>
    </Html>
  );
}

// ─── Error Boundary for 3D Canvas ───────────────────────────────────
class ThreeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    console.error('[ModelViewer Error]', error);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

// ─── Main ModelViewer Component ─────────────────────────────────────
export function ModelViewer({
  modelUrl,
  productName = 'Product Model',
  onDownload,
  className = '',
  enableAR = true,
}) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [showARModal, setShowARModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const containerRef = useRef(null);
  const controlsRef = useRef(null);

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // ─── Real AR Room Placement Handoff ──────────────────────────────
  const handleViewInRoom = () => {
    const userAgent = (navigator.userAgent || '').toLowerCase();
    const isAndroid = userAgent.includes('android');
    const isIOS = /iphone|ipad|ipod/.test(userAgent);

    const absoluteGlbUrl = modelUrl.startsWith('http')
      ? modelUrl
      : new URL(modelUrl, window.location.origin).href;

    if (isAndroid) {
      // Launch Google Scene Viewer via Android Intent for genuine AR floor placement
      const sceneViewerUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(
        absoluteGlbUrl
      )}&mode=ar_only&resizable=true&title=${encodeURIComponent(
        productName
      )}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(
        window.location.href
      )};end;`;

      window.location.href = sceneViewerUrl;
    } else if (isIOS) {
      // iOS Safari requires USDZ for native Quick Look AR. Show clear guidance modal.
      setShowARModal(true);
    } else {
      // Desktop: Show QR Code & mobile handoff modal
      setShowARModal(true);
    }
  };

  const copyPageLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loadError) {
    return (
      <div className={`relative flex flex-col items-center justify-center p-8 bg-forma-muted rounded-xl border border-forma-border min-h-[420px] ${className}`}>
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-forma-error mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-forma-text mb-1">Failed to Render 3D Model</h3>
        <p className="text-xs text-forma-text-secondary text-center max-w-md mb-5">
          {loadError}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLoadError(null)}
            className="px-4 py-2 text-xs font-medium text-forma-accent bg-forma-accent/10 hover:bg-forma-accent/20 rounded-lg transition-colors"
          >
            Try Again
          </button>
          {onDownload && (
            <button
              onClick={onDownload}
              className="px-4 py-2 text-xs font-medium text-white bg-forma-accent hover:bg-forma-accent-hover rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download GLB File
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      aria-label={`3D viewer for ${productName}`}
      className={`relative w-full min-h-[350px] sm:min-h-[440px] rounded-2xl overflow-hidden bg-gradient-to-b from-[#F7F9FC] to-[#EEF2F7] border border-forma-border card-shadow select-none ${className}`}
    >
      {/* Studio 3D Canvas */}
      <ThreeErrorBoundary
        fallback={(err) => (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-forma-muted text-center">
            <AlertCircle className="w-8 h-8 text-forma-error mb-2" />
            <p className="text-sm font-semibold text-forma-text">3D Rendering Error</p>
            <p className="text-xs text-forma-text-secondary max-w-sm mt-1">{err.message}</p>
            {onDownload && (
              <button
                onClick={onDownload}
                className="mt-4 px-3.5 py-1.5 text-xs font-medium bg-forma-accent text-white rounded-lg flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download Raw GLB
              </button>
            )}
          </div>
        )}
      >
        <Canvas
          shadows
          camera={{ position: [0, 1.2, 2.8], fov: 45 }}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
        >
          {/* Neutral studio lighting */}
          <ambientLight intensity={0.9} />
          <directionalLight
            position={[5, 8, 6]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-bias={-0.0001}
          />
          <directionalLight position={[-6, 4, -4]} intensity={0.6} />
          <directionalLight position={[0, -4, 2]} intensity={0.25} />

          <Suspense fallback={<Loader />}>
            <ModelMesh url={modelUrl} wireframe={wireframe} />
            <ContactShadows
              position={[0, -0.5, 0]}
              opacity={0.35}
              scale={4.5}
              blur={2.4}
              far={2}
            />
          </Suspense>

          <OrbitControls
            ref={controlsRef}
            makeDefault
            autoRotate={autoRotate}
            autoRotateSpeed={1.8}
            enableDamping
            dampingFactor={0.05}
            minDistance={1.0}
            maxDistance={8.0}
            maxPolarAngle={Math.PI / 2 + 0.15}
          />
        </Canvas>
      </ThreeErrorBoundary>

      {/* Unified Floating Toolbar Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center pointer-events-none max-w-[calc(100%-1.5rem)]">
        <div className="flex items-center gap-1 sm:gap-1.5 p-1.5 bg-white/95 backdrop-blur-md rounded-2xl border border-forma-border shadow-forma-md pointer-events-auto">
          {enableAR && (
            <>
              <button
                onClick={handleViewInRoom}
                title="View in Your Room (Augmented Reality)"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-forma-navy text-white hover:bg-forma-navy/90 active:scale-95 transition-all flex items-center gap-1.5 shadow-forma"
              >
                <Maximize2 className="w-3.5 h-3.5 text-forma-accent" />
                <span>View in Room</span>
              </button>
              <div className="w-[1px] h-5 bg-forma-border mx-1" />
            </>
          )}

          <button
            onClick={resetCamera}
            title="Reset Camera Position"
            className="p-2 sm:p-1.5 text-forma-text hover:text-forma-accent hover:bg-forma-muted rounded-xl transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            title={autoRotate ? 'Pause Rotation' : 'Auto Rotate'}
            className={`p-2 sm:p-1.5 rounded-xl transition-colors ${
              autoRotate ? 'text-forma-accent bg-forma-accent/10' : 'text-forma-text hover:text-forma-accent hover:bg-forma-muted'
            }`}
          >
            {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setWireframe(!wireframe)}
            title="Toggle Wireframe Inspection"
            className={`p-2 sm:p-1.5 rounded-xl transition-colors ${
              wireframe ? 'text-forma-accent bg-forma-accent/10' : 'text-forma-text hover:text-forma-accent hover:bg-forma-muted'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="p-2 sm:p-1.5 text-forma-text hover:text-forma-accent hover:bg-forma-muted rounded-xl transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onDownload && (
            <>
              <div className="w-[1px] h-5 bg-forma-border mx-1" />
              <button
                onClick={onDownload}
                title="Download 3D Model"
                className="px-3 py-1.5 text-xs font-semibold text-forma-text hover:text-forma-accent hover:bg-forma-muted rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Download</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Subtle Interaction Hint */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <span className="text-[10px] sm:text-[11px] font-medium tracking-wide uppercase px-2.5 py-1 rounded-lg bg-white/85 backdrop-blur-sm border border-forma-border text-forma-text-secondary truncate max-w-[85%]">
          3D Studio &bull; Drag to rotate &bull; Scroll to zoom
        </span>
      </div>

      {/* AR Placement Handoff Modal (for Desktop or iOS guidance) */}
      {showARModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forma-navy/50 backdrop-blur-sm select-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-forma-lg border border-forma-border space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-forma-accent/10 text-forma-accent mx-auto flex items-center justify-center">
              <Maximize2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-forma-text">
                View in Your Room (AR)
              </h3>
              <p className="text-xs text-forma-text-secondary leading-relaxed">
                Scan this QR code with your phone camera to place{' '}
                <span className="font-semibold text-forma-text">{productName}</span> in your actual room using browser-based AR.
              </p>
            </div>

            {/* QR Code Container */}
            <div className="p-3 bg-forma-muted rounded-xl border border-forma-border inline-block mx-auto">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  window.location.href
                )}`}
                alt="Scan QR code for mobile AR"
                className="w-40 h-40 rounded-lg mx-auto"
                loading="lazy"
              />
            </div>

            <div className="text-[11px] text-forma-text-secondary bg-blue-50 border border-blue-100 p-2.5 rounded-lg text-left space-y-1">
              <p className="font-semibold text-forma-navy">Device Compatibility:</p>
              <p>&bull; <strong>Android:</strong> Launches Google Scene Viewer (ARCore) for native floor placement.</p>
              <p>&bull; <strong>iOS:</strong> Full 3D inspection on mobile; native Quick Look requires USDZ export.</p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={copyPageLink}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold border border-forma-border hover:bg-forma-muted text-forma-text transition-colors"
              >
                {copiedLink ? 'Copied Link!' : 'Copy Mobile Link'}
              </button>
              <button
                onClick={() => setShowARModal(false)}
                className="py-2 px-4 rounded-xl text-xs font-semibold bg-forma-accent text-white hover:bg-forma-accent-hover transition-colors shadow-forma"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
