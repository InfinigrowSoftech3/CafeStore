import { Component, lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { wakeServer } from './services/api';

import QuickCartPopup from './components/ui/QuickCartPopup';
import CustomerBottomNav from './components/ui/CustomerBottomNav';
import WebPushPrompt from './components/ui/WebPushPrompt';
import Navbar from './components/ui/Navbar';
import CustomerNavDrawer from './components/ui/CustomerNavDrawer';

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
        <div className="min-h-screen bg-[#FAFAF8] text-stone-900 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-full border border-amber-200 bg-[#FFF1C9] flex items-center justify-center mb-4 text-2xl shadow-xs">
            ☕
          </div>
          <h2 className="text-2xl font-bold font-display text-stone-900 mb-2 tracking-tight">Updated Version Available</h2>
          <p className="text-sm text-stone-600 max-w-sm mb-6 leading-relaxed">
            A new version of the café site was just deployed. Please refresh to load the updated page.
          </p>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('chunk_boundary_reload');
              window.location.reload();
            }}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#0F3D2E] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-[#16503D] active:scale-95"
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
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#0F3D2E] border-t-transparent animate-spin" />
    </div>
  );
}

function RootRedirect() {
  const [searchParams] = useSearchParams();
  const search = searchParams.toString();
  return <Navigate to={search ? `/menu?${search}` : '/menu'} replace />;
}

function MenuRouteWrapper() {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get('cafeSlug') || searchParams.get('cafe') || searchParams.get('cafeId') || searchParams.get('slug') || searchParams.get('token') || searchParams.get('tableToken') || '';
  return <MenuPage key={slug} />;
}

export default function App() {
  useEffect(() => {
    wakeServer();
  }, []);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Navbar />
      <CustomerNavDrawer />
      <CustomerBottomNav />
      <QuickCartPopup />
      <WebPushPrompt />
      <Analytics />
      <SpeedInsights dsn="CmYU8C4o7QrHziabP83DyQ2CEd" />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#2B1810',
            color: '#FFFDF9',
            border: '1px solid #3E2419',
            borderRadius: '16px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            boxShadow: '0 10px 25px -5px rgba(43, 24, 16, 0.25)',
          },
          success: { iconTheme: { primary: '#F3E9DC', secondary: '#7A3316' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
        }}
      />

      <ChunkErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
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

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ChunkErrorBoundary>
    </BrowserRouter>
  );
}
