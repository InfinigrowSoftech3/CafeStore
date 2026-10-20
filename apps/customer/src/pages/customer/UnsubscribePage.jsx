import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ShieldOff, Loader2, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import usePageMeta from '../../hooks/usePageMeta';

export default function UnsubscribePage() {
  const tenant = useTenant();

  usePageMeta({
    title: 'Marketing Email & SMS Preferences',
    description: 'Manage your notification preferences or opt out of promotional messages, discount alerts, and marketing communications from our café.',
  });

  const [searchParams] = useSearchParams();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const p = searchParams.get('phone');
    if (p) {
      setPhone(p.replace(/\D/g, '').slice(-10));
    }
  }, [searchParams]);

  const handleUnsubscribe = async (e) => {
    e.preventDefault();
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/customers/public-unsubscribe', { phone: phone.trim() });
      setUnsubscribed(true);
    } catch (err) {
      setError(err.message || 'Failed to process your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-stone-900">
      <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/menu"
            className="btn-secondary min-h-[44px] text-xs font-bold uppercase tracking-wider py-2 px-4 inline-flex items-center gap-1.5 rounded-full border border-stone-300 shadow-2xs"
          >
            <ArrowLeft size={16} />
            <span>Back to Menu</span>
          </Link>
          <Link
            to="/"
            aria-label={`${tenant.name} - Home`}
            className="font-display font-bold text-lg text-[#0F3D2E] hover:text-[#16503D] transition-colors"
          >
            {tenant.name}
          </Link>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs sm:p-8">
          {unsubscribed ? (
            <div role="status" aria-live="polite" className="text-center py-6 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={32} />
              </div>
              <h1 className="font-display text-2xl font-bold text-[#0F3D2E]">Unsubscribe Confirmed</h1>
              <p className="text-sm leading-relaxed text-stone-600 max-w-md mx-auto">
                You will no longer receive promotional offers, discounts, or marketing updates from {tenant.name}.
              </p>
              <div className="rounded-2xl bg-stone-50 border border-stone-200 p-3.5 text-xs text-stone-500">
                ℹ️ Note: If you place future orders at {tenant.name}, you will still receive transactional receipts and order status updates.
              </div>
              <div className="pt-4">
                <Link to="/menu" className="btn-primary min-h-[46px] inline-flex items-center justify-center text-xs font-bold uppercase tracking-wider py-2.5 px-7 rounded-full shadow-sm">
                  Return to Café Menu
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUnsubscribe} className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300 bg-[#FFF1C9] text-[#0F3D2E]">
                  <ShieldOff size={20} />
                </div>
                <div>
                  <h1 className="font-display text-xl font-bold text-[#0F3D2E]">Marketing Preferences</h1>
                  <p className="text-xs text-stone-500">Opt-out of promotional communications</p>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-stone-600">
                Enter your mobile number to opt out of promotional SMS, WhatsApp, and email marketing from {tenant.name}.
              </p>

              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700"
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="unsubscribe-phone" className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
                  10-Digit Mobile Number *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                    +91
                  </span>
                  <input
                    id="unsubscribe-phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                      setError('');
                    }}
                    placeholder="9876543210"
                    className="input-field pl-12 text-base rounded-full border-stone-300 focus:border-[#0F3D2E] focus:ring-[#0F3D2E]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || phone.length < 10}
                className="w-full btn-primary min-h-[46px] flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Unsubscribe From Marketing</span>
                )}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
