import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Box, Layers, Plus, Menu, X, ArrowRight, Sparkles } from 'lucide-react';

export function Navbar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-forma-surface/90 backdrop-blur-md border-b border-forma-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-forma-border bg-white shadow-forma transition-transform group-hover:scale-105 flex items-center justify-center p-0.5">
                <img src="/logo.jpg" alt="Qibo3D Logo" className="w-full h-full object-contain rounded-lg" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-forma-text">
                  Qibo<span className="text-forma-accent">3D</span>
                </span>
                <span className="text-[10px] text-forma-text-secondary -mt-1 font-medium">
                  Studio
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 sm:gap-3">
              <Link
                to="/"
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/')
                    ? 'text-forma-accent bg-forma-accent/10 font-semibold'
                    : 'text-forma-text-secondary hover:text-forma-text hover:bg-forma-muted'
                }`}
              >
                Overview
              </Link>
              <Link
                to="/library"
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  isActive('/library')
                    ? 'text-forma-accent bg-forma-accent/10 font-semibold'
                    : 'text-forma-text-secondary hover:text-forma-text hover:bg-forma-muted'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Model Library</span>
              </Link>
              <div className="w-[1px] h-5 bg-forma-border mx-1" />
              <Link
                to="/upload"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-forma-accent hover:bg-forma-accent-hover shadow-forma transition-all ml-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create 3D Model</span>
              </Link>
            </nav>

            {/* Mobile Hamburger Button */}
            <div className="flex items-center md:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-forma-text hover:text-forma-accent hover:bg-forma-muted transition-colors focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Slide-out Drawer / Sidebar */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-forma-surface shadow-2xl border-l border-forma-border p-6 flex flex-col justify-between transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Mobile Navigation Drawer"
      >
        <div className="space-y-6">
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-4 border-b border-forma-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-forma-border bg-white shadow-forma flex items-center justify-center p-0.5">
                <img src="/logo.jpg" alt="Qibo3D Logo" className="w-full h-full object-contain rounded-lg" />
              </div>
              <span className="text-base font-bold text-forma-text">
                Qibo<span className="text-forma-accent">3D</span>
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg text-forma-text-secondary hover:text-forma-text hover:bg-forma-muted transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col space-y-1.5">
            <Link
              to="/"
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
                isActive('/')
                  ? 'bg-forma-accent/10 text-forma-accent font-semibold'
                  : 'text-forma-text hover:bg-forma-muted'
              }`}
            >
              <span>Overview</span>
              <ArrowRight className="w-4 h-4 opacity-50" />
            </Link>

            <Link
              to="/library"
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
                isActive('/library')
                  ? 'bg-forma-accent/10 text-forma-accent font-semibold'
                  : 'text-forma-text hover:bg-forma-muted'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>Model Library</span>
              </span>
              <ArrowRight className="w-4 h-4 opacity-50" />
            </Link>
          </nav>
        </div>

        {/* Drawer Footer CTA */}
        <div className="pt-6 border-t border-forma-border space-y-3">
          <Link
            to="/upload"
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-forma-accent hover:bg-forma-accent-hover shadow-forma transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create 3D Model</span>
          </Link>
          <p className="text-[11px] text-center text-forma-text-secondary">
            Qibo3D Studio &bull; Professional 3D Visualization
          </p>
        </div>
      </aside>
    </>
  );
}
