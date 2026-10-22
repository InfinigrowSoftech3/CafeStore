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
    <div className="relative w-full overflow-hidden rounded-[28px] border border-[#EFE4D6] bg-gradient-to-br from-[#F6E9D6] via-[#F1E0C7] to-[#E9D3B4] p-[clamp(20px,3vw,40px)] shadow-[0_8px_24px_rgba(90,50,20,0.08)]">
      {/* Decorative Warm Blur Accents */}
      <div
        className="absolute top-0 right-1/4 h-48 w-48 rounded-full bg-[#B5702F]/15 blur-2xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[#7A3316]/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 grid grid-cols-[minmax(0,1.4fr)_minmax(128px,1fr)] items-center gap-[clamp(12px,2vw,32px)]">
        {/* Left Column: 4-Line Serif Headline, Tagline, Order Button */}
        <div className="min-w-0 max-w-[34rem]">
          <h1 className="font-display font-extrabold text-[clamp(2rem,5vw,4rem)] leading-[1.04] tracking-tight text-[#2B1810]">
            Good
            <br />
            Food
            <br />
            <span className="italic font-normal text-[#B5702F]">Brighter</span>
            <br />
            Moments
          </h1>

          <p className="mt-2.5 max-w-[26rem] text-[clamp(0.75rem,1vw,0.95rem)] leading-relaxed font-medium text-[#7B6B5F]">
            Fresh ingredients. Great taste. Always a good time!
          </p>

          <button
            type="button"
            onClick={onOrderNow}
            aria-label="Order Now and browse menu"
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#7A3316] px-5 py-2.5 text-xs font-bold text-[#FFFDF9] shadow-[0_6px_20px_rgba(122,51,22,0.32)] transition-all hover:bg-[#5E2610] active:scale-95"
          >
            <span>Order Now</span>
            <ArrowRight size={16} strokeWidth={2.4} />
          </button>
        </div>

        {/* Right Column: cup stays fully inside the card */}
        <div className="flex min-w-0 items-center justify-center">
          <img
            src={heroImage}
            alt={`${tenant.name || 'Café'} Gourmet Coffee`}
            fetchpriority="high"
            className="h-[clamp(180px,25vw,420px)] w-full max-w-[420px] object-contain drop-shadow-[0_14px_22px_rgba(90,50,20,0.2)]"
          />
        </div>
      </div>
    </div>
  );
}
