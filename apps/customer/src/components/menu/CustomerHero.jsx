import { ArrowRight } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

export default function CustomerHero({ onOrderNow }) {
  const tenant = useTenant();

  // Prefer café's custom cover/hero image if available, otherwise bundled default coffee logo
  const heroImage =
    tenant.heroImageUrl ||
    tenant.settings?.heroImageUrl ||
    '/logo.png';

  return (
    <div className="relative w-full overflow-hidden rounded-[28px] bg-gradient-to-br from-[#F6E9D6] via-[#F1E0C7] to-[#E9D3B4] p-5 shadow-[0_8px_24px_rgba(90,50,20,0.08)] border border-[#EFE4D6]">
      {/* Decorative Warm Blur Accents */}
      <div
        className="absolute top-0 right-1/4 w-48 h-48 bg-[#B5702F]/15 rounded-full blur-2xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-0 w-64 h-64 bg-[#7A3316]/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 grid grid-cols-1 items-center gap-4">
        {/* Left Column: 4-Line Serif Headline, Tagline, Order Button */}
        <div className="max-w-sm">
          <h1 className="font-display font-extrabold text-[32px] text-[#2B1810] leading-[1.08] tracking-tight">
            Good
            <br />
            Food
            <br />
            <span className="italic font-normal text-[#B5702F]">Brighter</span>
            <br />
            Moments
          </h1>

          <p className="text-xs text-[#7B6B5F] mt-2.5 max-w-[210px] leading-relaxed font-medium">
            Fresh ingredients. Great taste. Always a good time!
          </p>

          <button
            type="button"
            onClick={onOrderNow}
            aria-label="Order Now and browse menu"
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 rounded-full bg-[#7A3316] text-[#FFFDF9] font-bold text-xs shadow-[0_6px_20px_rgba(122,51,22,0.32)] hover:bg-[#5E2610] active:scale-95 transition-all"
          >
            <span>Order Now</span>
            <ArrowRight size={16} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* Coffee cup bleeding off the right edge (mobile layout) */}
      <div className="absolute -right-6 -bottom-4 w-[185px] pointer-events-none select-none">
        <img
          src={heroImage}
          alt={`${tenant.name || 'Café'} Gourmet Coffee`}
          fetchpriority="high"
          className="w-full h-auto object-contain drop-shadow-[0_14px_22px_rgba(90,50,20,0.2)]"
        />
      </div>
    </div>
  );
}
