import { Link } from 'react-router-dom';
import { Coffee, MapPin, Phone, Mail, Clock, ArrowRight } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

function formatInternationalTel(phone) {
  if (!phone) return 'tel:+919876543210';
  const clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('+')) return `tel:${clean}`;
  if (clean.length === 10) return `tel:+91${clean}`;
  return `tel:+${clean}`;
}

export default function Footer() {
  const tenant = useTenant();
  const currentYear = new Date().getFullYear();

  const phone = tenant.contactPhone || '+91 98765 43210';
  const email = tenant.contactEmail || 'contact@artisanroast.com';
  const address = tenant.address || '12 Connaught Circle, Heritage Block, New Delhi';

  return (
    <footer className="border-t border-[#EFE4D6] bg-white text-stone-600" aria-label="Site Footer">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand Info */}
          <div className="space-y-4">
            <Link
              to="/"
              aria-label={`${tenant.name} - Home`}
              className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A3316]"
            >
              {tenant.logoUrl ? (
                <img
                  src={tenant.logoUrl}
                  alt={`${tenant.name} Logo`}
                  className="h-10 w-auto max-w-[150px] object-contain"
                  width={150}
                  height={40}
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A3316] text-white shadow-xs">
                  <Coffee size={22} className="stroke-[2.2]" />
                </div>
              )}
              <span className="font-display text-2xl font-bold tracking-[0.04em] text-[#7A3316]">
                {tenant.name}
              </span>
            </Link>
            <p className="text-xs uppercase tracking-[0.2em] text-[#7A3316]/80 font-bold">
              Fine Coffee &amp; Artisanal Dining
            </p>
            <p className="text-sm leading-relaxed text-stone-500">
              Crafted with ethically sourced ingredients, precision culinary standards, and warm hospitality for your dining enjoyment.
            </p>
          </div>

          {/* Explore Links */}
          <div>
            <h2 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-[#7A3316]">
              Explore
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link to="/menu" className="hover:text-[#7A3316] transition-colors">
                  Menu
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#7A3316] transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/offers" className="hover:text-[#7A3316] transition-colors">
                  Offers
                </Link>
              </li>
              <li>
                <Link to="/gallery" className="hover:text-[#7A3316] transition-colors">
                  Gallery
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#7A3316] transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-[#7A3316] transition-colors">
                  Orders
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details with Clickable Links */}
          <div>
            <h2 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-[#7A3316]">
              Contact &amp; Hours
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin size={17} className="mt-0.5 shrink-0 text-[#7A3316]" />
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#7A3316] transition-colors text-xs leading-relaxed text-stone-600"
                >
                  {address}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={17} className="shrink-0 text-[#7A3316]" />
                <a
                  href={formatInternationalTel(phone)}
                  className="hover:text-[#7A3316] transition-colors font-medium text-xs tracking-wider text-stone-600"
                >
                  {phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={17} className="shrink-0 text-[#7A3316]" />
                <a
                  href={`mailto:${email}`}
                  className="hover:text-[#7A3316] transition-colors font-medium text-xs break-all text-stone-600"
                >
                  {email}
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-stone-400 pt-1">
                <Clock size={16} className="mt-0.5 shrink-0 text-[#7A3316]" />
                <span>Open daily from 8:00 AM to 11:00 PM</span>
              </li>
            </ul>
          </div>

          {/* Table Ordering Access */}
          <div>
            <h2 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-[#7A3316]">
              Visit The Café
            </h2>
            <p className="mt-4 text-xs leading-relaxed text-stone-500">
              Order seamlessly from your table using our high-speed QR ordering system.
            </p>
            <div className="mt-4">
              <Link
                to="/menu"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#7A3316] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#5E2610] active:scale-95 shadow-2xs"
              >
                <span>Browse Menu</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Legal & Copyright */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#EFE4D6] pt-8 sm:flex-row text-xs text-stone-400">
          <p>© {currentYear} {tenant.name}. All rights reserved.</p>
          <nav aria-label="Legal documents" className="flex flex-wrap gap-5">
            <Link to="/privacy" className="hover:text-[#7A3316] transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-[#7A3316] transition-colors">
              Terms of Service
            </Link>
            <Link to="/refund-policy" className="hover:text-[#7A3316] transition-colors">
              Refund Policy
            </Link>
            <Link to="/unsubscribe" className="hover:text-[#7A3316] transition-colors">
              Preferences
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
