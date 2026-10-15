import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar.jsx';
import { Footer } from './components/Footer.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { UploadPage } from './pages/UploadPage.jsx';
import { GenerationPage } from './pages/GenerationPage.jsx';
import { ViewerPage } from './pages/ViewerPage.jsx';
import { LibraryPage } from './pages/LibraryPage.jsx';
import { ShopifyPreviewPage } from './pages/ShopifyPreviewPage.jsx';

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-forma-bg text-forma-text">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/shopify/preview" element={<ShopifyPreviewPage />} />
            <Route path="/generations/:id" element={<GenerationPage />} />
            <Route path="/viewer/:id" element={<ViewerPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
