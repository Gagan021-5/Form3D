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
}) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadError, setLoadError] = useState(null);

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
            maxPolarAngle={Math.PI / 2 + 0.15} // don't flip upside down
          />
        </Canvas>
      </ThreeErrorBoundary>

      {/* Unified Floating Toolbar Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center pointer-events-none max-w-[calc(100%-1.5rem)]">
        <div className="flex items-center gap-1 sm:gap-1.5 p-1.5 bg-white/95 backdrop-blur-md rounded-2xl border border-forma-border shadow-forma-md pointer-events-auto">
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
            title="Toggle Wireframe Mode"
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
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-forma-accent hover:bg-forma-accent-hover active:scale-95 rounded-xl shadow-forma flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
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
    </div>
  );
}
