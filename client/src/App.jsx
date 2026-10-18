import { Component, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';

import QuickCartPopup from './components/ui/QuickCartPopup';
import WebPushPrompt from './components/ui/WebPushPrompt';
import Navbar from './components/ui/Navbar';

// Primary customer entry page loaded eagerly
import MenuPage from './pages/customer/MenuPage';

// Lazy-loaded customer pages
const CartPage = lazy(() => import('./pages/customer/CartPage'));
const CheckoutPage = lazy(() => import('./pages/customer/CheckoutPage'));
const OrderConfirmPage = lazy(() => import('./pages/customer/OrderConfirmPage'));
const TrackOrderPage = lazy(() => import('./pages/customer/TrackOrderPage'));
const AboutPage = lazy(() => import('./pages/customer/AboutPage'));
const OffersPage = lazy(() => import('./pages/customer/OffersPage'));
const ContactPage = lazy(() => import('./pages/customer/ContactPage'));
const GalleryPage = lazy(() => import('./pages/customer/GalleryPage'));
const ReceiptPage = lazy(() => import('./pages/customer/ReceiptPage'));
const OrdersPage = lazy(() => import('./pages/customer/OrdersPage'));
const BillPage = lazy(() => import('./pages/customer/BillPage'));
const UnsubscribePage = lazy(() => import('./pages/customer/UnsubscribePage'));
const LegalPage = lazy(() => import('./pages/customer/LegalPage'));
const NotFoundPage = lazy(() => import('./pages/customer/NotFoundPage'));

class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes?.('Failed to fetch dynamically imported module') ||
      error?.message?.includes?.('dynamically imported module') ||
      error?.message?.includes?.('Expected a JavaScript-or-Wasm module script');
    return { hasError: true, isChunkError };
  }

  componentDidCatch(error) {
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes?.('Failed to fetch dynamically imported module') ||
      error?.message?.includes?.('dynamically imported module') ||
      error?.message?.includes?.('Expected a JavaScript-or-Wasm module script');

    if (isChunkError) {
      const reloadKey = 'chunk_boundary_reload';
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem(reloadKey, now.toString());
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#17110C] text-[#FAF6EF] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full border border-[#C8963E]/40 bg-[#C8963E]/10 flex items-center justify-center mb-4 text-2xl">
            ☕
          </div>
          <h2 className="text-xl font-bold font-display mb-2 tracking-wide">Updated Version Available</h2>
          <p className="text-sm text-[#E9E0D2] max-w-sm mb-6 leading-relaxed">
            A new version of the café site was just deployed. Please refresh to load the updated page.
          </p>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('chunk_boundary_reload');
              window.location.reload();
            }}
            className="btn-primary min-h-[44px]"
          >
            Refresh Now
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function PageFallback() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-brew-500 border-t-transparent animate-spin" />
    </div>
  );
}

function MenuRouteWrapper() {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get('cafeSlug') || searchParams.get('cafe') || searchParams.get('cafeId') || searchParams.get('slug') || searchParams.get('token') || searchParams.get('tableToken') || '';
  return <MenuPage key={slug} />;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Navbar />
      <QuickCartPopup />
      <WebPushPrompt />
      <Analytics />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#17110C',
            color: '#FAF6EF',
            border: '1px solid #E9E0D2',
            borderRadius: '12px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#C8963E', secondary: '#17110C' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
        }}
      />

      <ChunkErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/menu" replace />} />
            <Route path="/menu" element={<MenuRouteWrapper />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/offers" element={<OffersPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/bill" element={<BillPage />} />
            <Route path="/unsubscribe" element={<UnsubscribePage />} />
            <Route path="/privacy" element={<LegalPage />} />
            <Route path="/terms" element={<LegalPage />} />
            <Route path="/refund-policy" element={<LegalPage />} />

            <Route path="/receipt" element={<ReceiptPage />} />
            <Route path="/receipt/:orderId" element={<ReceiptPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/order-confirm/:orderId" element={<OrderConfirmPage />} />
            <Route path="/track/:orderId" element={<TrackOrderPage />} />

            <Route path="/admin" element={<Navigate to="/menu" replace />} />
            <Route path="/admin/*" element={<Navigate to="/menu" replace />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ChunkErrorBoundary>
    </BrowserRouter>
  );
}
