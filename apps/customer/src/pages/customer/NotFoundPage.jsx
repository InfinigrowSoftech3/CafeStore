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
    <main className="flex min-h-[75vh] flex-col items-center justify-center bg-white px-5 py-16 text-center text-[#2B1810]">
      <div className="mx-auto max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300 bg-[#F3E9DC] text-[#7A3316] shadow-xs">
          <Coffee size={32} />
        </div>

        <p className="font-mono text-xs font-bold tracking-[0.24em] uppercase text-[#7A3316]">
          404 · Page Not Found
        </p>

        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-[#7A3316]">
          We couldn’t find that page.
        </h1>

        <p className="mt-4 text-base leading-relaxed text-stone-600">
          The link you followed may be broken or the page may have been moved. Let’s get you back to our delicious dining menu.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3">
          <Link
            to="/menu"
            className="w-full btn-primary inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full px-7 py-3 font-bold text-xs uppercase tracking-wider shadow-sm"
          >
            <UtensilsCrossed size={16} />
            <span>Explore Menu</span>
          </Link>
          <Link
            to="/"
            className="w-full btn-secondary inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full px-7 py-3 font-bold text-xs uppercase tracking-wider shadow-2xs"
          >
            <ArrowLeft size={16} />
            <span>Return Home</span>
          </Link>
        </div>

        {/* Helpful quick links */}
        <div className="mt-12 rounded-2xl border border-[#EFE4D6] bg-[#FFFDF9] p-5 shadow-2xs text-left">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
            Popular destinations
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Link to="/about" className="flex items-center gap-2 text-stone-700 hover:text-[#7A3316] p-2 rounded-xl hover:bg-[#FBF6EF] transition border border-transparent hover:border-[#EFE4D6]">
              <Coffee size={14} className="text-[#7A3316]" /> Our Story
            </Link>
            <Link to="/offers" className="flex items-center gap-2 text-stone-700 hover:text-[#7A3316] p-2 rounded-xl hover:bg-[#FBF6EF] transition border border-transparent hover:border-[#EFE4D6]">
              <Sparkles size={14} className="text-[#7A3316]" /> Daily Deals
            </Link>
            <Link to="/contact" className="flex items-center gap-2 text-stone-700 hover:text-[#7A3316] p-2 rounded-xl hover:bg-[#FBF6EF] transition border border-transparent hover:border-[#EFE4D6]">
              <Phone size={14} className="text-[#7A3316]" /> Contact &amp; Hours
            </Link>
            <Link to="/orders" className="flex items-center gap-2 text-stone-700 hover:text-[#7A3316] p-2 rounded-xl hover:bg-[#FBF6EF] transition border border-transparent hover:border-[#EFE4D6]">
              <ArrowLeft size={14} className="text-[#7A3316]" /> Active Orders
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
