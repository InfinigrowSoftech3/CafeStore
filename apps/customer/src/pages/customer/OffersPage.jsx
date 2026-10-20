import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, UtensilsCrossed } from 'lucide-react';
import usePageMeta from '../../hooks/usePageMeta';

const offers = [
  {
    title: 'Early Bird Coffee',
    detail: 'Get 15% off on all signature and pour-over coffees ordered before 10:30 AM.',
    badge: 'Morning Special',
    tag: 'Valid Mon - Fri',
  },
  {
    title: 'Gourmet Brunch Combo',
    detail: 'Enjoy any artisan sandwich, handcrafted beverage, and fresh pastry combo at a special rate.',
    badge: 'Popular Combo',
    tag: 'Available All Day',
  },
  {
    title: 'Student & Creative Perk',
    detail: 'Any signature roast beverage with a 10% discount when presenting valid campus or student ID.',
    badge: 'Community',
    tag: 'In-Café Only',
  },
];

export default function OffersPage() {
  usePageMeta({
    title: 'Daily Coffee Specials & Dining Offers',
    description: 'Discover today’s gourmet coffee discounts, early bird specials, and combo dining deals brewed fresh daily at our artisanal café.',
  });

  return (
    <div className="min-h-screen bg-white text-stone-900">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            to="/menu"
            className="btn-secondary inline-flex min-h-[40px] items-center gap-2 text-xs font-bold uppercase tracking-wider py-2 px-5 rounded-full border border-stone-300 shadow-2xs"
          >
            <ArrowLeft size={16} />
            <span>Back to Menu</span>
          </Link>
          <Link
            to="/about"
            className="inline-flex min-h-[40px] items-center text-xs font-bold uppercase tracking-wider text-stone-900 hover:underline px-2"
          >
            Our Story →
          </Link>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-2xs sm:p-10">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#0F3D2E]" />
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#0F3D2E]">
              Today’s Handcrafted Specials
            </p>
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            Good deals, brewed daily.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-600">
            Enjoy exclusive seasonal savings on single-origin roasts, signature beverages, and gourmet café fare crafted fresh in our kitchen.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {offers.map((offer) => (
              <div
                key={offer.title}
                className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs hover:border-stone-400 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-block rounded-full bg-stone-100 border border-stone-300 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-stone-900">
                      {offer.badge}
                    </span>
                    <span className="text-[11px] font-semibold text-stone-400">
                      {offer.tag}
                    </span>
                  </div>
                  <h2 className="mt-5 font-display text-2xl font-bold text-stone-900">
                    {offer.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-stone-600">
                    {offer.detail}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-stone-200">
                  <Link
                    to="/menu"
                    className="inline-flex min-h-[38px] items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-900 hover:underline transition"
                  >
                    <UtensilsCrossed size={14} />
                    <span>Order Now</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
