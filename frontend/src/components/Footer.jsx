import { Link } from 'react-router-dom';
import { Box, Layers } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-forma-border bg-forma-surface py-12 text-xs text-forma-text-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-forma-border bg-white shadow-forma flex items-center justify-center p-0.5">
                <img src="/logo.jpg" alt="Forma3D Logo" className="w-full h-full object-contain rounded-lg" />
              </div>
              <span className="font-bold text-sm text-forma-text">
                Forma<span className="text-forma-accent">3D</span> Studio
              </span>
            </div>
            <p className="text-forma-text-secondary max-w-sm leading-relaxed text-xs">
              AI-powered 3D product visualization platform. Transform photos into interactive 3D assets with real-time WebGL inspection and standard model export.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <p className="font-semibold text-xs text-forma-text uppercase tracking-wider">Product</p>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="hover:text-forma-accent transition-colors">
                  Overview
                </Link>
              </li>
              <li>
                <Link to="/upload" className="hover:text-forma-accent transition-colors">
                  Create 3D Model
                </Link>
              </li>
              <li>
                <Link to="/library" className="hover:text-forma-accent transition-colors">
                  Model Library
                </Link>
              </li>
            </ul>
          </div>

          {/* Capabilities */}
          <div className="space-y-3">
            <p className="font-semibold text-xs text-forma-text uppercase tracking-wider">Capabilities</p>
            <ul className="space-y-2 text-forma-text-secondary">
              <li>Interactive 3D Studio</li>
              <li>PBR Surface Shading</li>
              <li>Standard GLB Export</li>
              <li>Real-Time WebGL Engine</li>
            </ul>
          </div>
        </div>

        {/* Bottom row */}
        <div className="pt-6 border-t border-forma-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© {new Date().getFullYear()} Forma3D Studio. All rights reserved.</p>
          <p className="text-forma-text-secondary">Built for digital product presentation and 3D visualization</p>
        </div>
      </div>
    </footer>
  );
}
