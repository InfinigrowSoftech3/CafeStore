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
    <div className="relative w-full overflow-hidden rounded-[28px] sm:rounded-[32px] bg-gradient-to-br from-[#F6E9D6] via-[#F1E0C7] to-[#E9D3B4] p-5 sm:p-7 lg:p-10 shadow-[0_8px_24px_rgba(90,50,20,0.08)] border border-[#EFE4D6]">
      {/* Decorative Warm Blur Accents */}
      <div
        className="absolute top-0 right-1/4 w-48 h-48 bg-[#B5702F]/15 rounded-full blur-2xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-0 w-64 h-64 bg-[#7A3316]/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 items-center gap-4">
        {/* Left Column: 4-Line Serif Headline, Tagline, Order Button */}
        <div className="md:col-span-7 max-w-sm sm:max-w-md">
          <h1 className="font-display font-extrabold text-[32px] sm:text-4xl lg:text-[46px] text-[#2B1810] leading-[1.08] tracking-tight">
            Good
            <br />
            Food
            <br />
            <span className="italic font-normal text-[#B5702F]">Brighter</span>
            <br />
            Moments
          </h1>

          <p className="text-xs sm:text-sm text-[#7B6B5F] mt-2.5 max-w-[210px] sm:max-w-xs leading-relaxed font-medium">
            Fresh ingredients. Great taste. Always a good time!
          </p>

          <button
            type="button"
            onClick={onOrderNow}
            aria-label="Order Now and browse menu"
            className="mt-4 sm:mt-5 inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-[#7A3316] text-[#FFFDF9] font-bold text-xs sm:text-sm shadow-[0_6px_20px_rgba(122,51,22,0.32)] hover:bg-[#5E2610] active:scale-95 transition-all"
          >
            <span>Order Now</span>
            <ArrowRight size={16} strokeWidth={2.4} />
          </button>
        </div>

        {/* Right Column: Hero coffee cup bleeding off the edge */}
        <div className="hidden md:flex md:col-span-5 justify-end relative">
          <img
            src={heroImage}
            alt={`${tenant.name || 'Café'} Gourmet Coffee`}
            fetchpriority="high"
            className="w-full max-w-[340px] lg:max-w-[380px] object-contain drop-shadow-[0_20px_28px_rgba(90,50,20,0.22)] -mr-6 -my-4 transition-transform duration-300 hover:scale-105"
          />
        </div>
      </div>

      {/* Mobile Bleed-off-edge Image positioned absolutely on small screens */}
      <div className="md:hidden absolute -right-6 sm:-right-4 -bottom-4 sm:-bottom-2 w-[185px] sm:w-[230px] pointer-events-none select-none">
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
