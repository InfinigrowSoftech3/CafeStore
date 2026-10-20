import { Link } from 'react-router-dom';
import { ArrowLeft, Coffee, UtensilsCrossed, Phone, Sparkles } from 'lucide-react';
import usePageMeta from '../../hooks/usePageMeta';
import { useTenant } from '../../context/TenantContext';

export default function NotFoundPage() {
  const tenant = useTenant();

  usePageMeta({
    title: 'Page Not Found - 404 Error',
    description: 'The requested page could not be found. Return to our gourmet menu or explore artisanal coffee and food at our café.',
  });

  return (
    <main className="flex min-h-[75vh] flex-col items-center justify-center bg-white px-5 py-16 text-center text-stone-900">
      <div className="mx-auto max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300 bg-[#FFF1C9] text-[#0F3D2E] shadow-xs">
          <Coffee size={32} />
        </div>

        <p className="font-mono text-xs font-bold tracking-[0.24em] uppercase text-[#0F3D2E]">
          404 · Page Not Found
        </p>

        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-[#0F3D2E] sm:text-5xl">
          We couldn’t find that page.
        </h1>

        <p className="mt-4 text-base leading-relaxed text-stone-600">
          The link you followed may be broken or the page may have been moved. Let’s get you back to our delicious dining menu.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/menu"
            className="w-full sm:w-auto btn-primary inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full px-7 py-3 font-bold text-xs uppercase tracking-wider shadow-sm"
          >
            <UtensilsCrossed size={16} />
            <span>Explore Menu</span>
          </Link>
          <Link
            to="/"
            className="w-full sm:w-auto btn-secondary inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full px-7 py-3 font-bold text-xs uppercase tracking-wider shadow-2xs"
          >
            <ArrowLeft size={16} />
            <span>Return Home</span>
          </Link>
        </div>

        {/* Helpful quick links */}
        <div className="mt-12 rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs text-left">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
            Popular destinations
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Link to="/about" className="flex items-center gap-2 text-stone-700 hover:text-[#0F3D2E] p-2 rounded-xl hover:bg-stone-50 transition border border-transparent hover:border-stone-200">
              <Coffee size={14} className="text-[#0F3D2E]" /> Our Story
            </Link>
            <Link to="/offers" className="flex items-center gap-2 text-stone-700 hover:text-[#0F3D2E] p-2 rounded-xl hover:bg-stone-50 transition border border-transparent hover:border-stone-200">
              <Sparkles size={14} className="text-[#0F3D2E]" /> Daily Deals
            </Link>
            <Link to="/contact" className="flex items-center gap-2 text-stone-700 hover:text-[#0F3D2E] p-2 rounded-xl hover:bg-stone-50 transition border border-transparent hover:border-stone-200">
              <Phone size={14} className="text-[#0F3D2E]" /> Contact &amp; Hours
            </Link>
            <Link to="/orders" className="flex items-center gap-2 text-stone-700 hover:text-[#0F3D2E] p-2 rounded-xl hover:bg-stone-50 transition border border-transparent hover:border-stone-200">
              <ArrowLeft size={14} className="text-[#0F3D2E]" /> Active Orders
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
