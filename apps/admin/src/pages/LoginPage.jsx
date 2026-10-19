import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Eye, EyeOff, Loader2, Clock, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { env } from '../config/env';

export default function LoginPage() {
  const tenant = useTenant();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

  // Active countdown timer when rate limited (429)
  useEffect(() => {
    if (rateLimitCountdown <= 0) return;
    const interval = setInterval(() => {
      setRateLimitCountdown((prev) => {
        if (prev <= 1) {
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitCountdown]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || rateLimitCountdown > 0) return; // Prevent double-submit or submission while in cooldown

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password, twoFactorCode);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.code === 'TWO_FACTOR_REQUIRED') {
        setRequiresTwoFactor(true);
      }

      if (err.status === 429 || err.code === 'RATE_LIMITED') {
        const retrySec = Number(err.retryAfter) || 30;
        setRateLimitCountdown(retrySec);
        setError(`Too many login attempts. Please wait ${retrySec} seconds before trying again.`);
      } else {
        setError(err.message || 'Unable to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isButtonDisabled = loading || rateLimitCountdown > 0;

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50 font-body select-none overflow-hidden">
      {/* Subtle modern geometric background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-70 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative z-10 w-full max-w-md rounded-none border border-slate-200 bg-white p-7 sm:p-9 shadow-xl"
      >
        <div className="mb-7 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Café Operations Console</span>
          </div>

          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-none border border-slate-200 bg-[#0F3D2E] text-2xl font-extrabold text-white shadow-2xs overflow-hidden">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              tenant.name?.charAt(0)?.toUpperCase() || 'C'
            )}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {tenant.name || 'Café'} Admin
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-normal">
            Sign in to manage orders, kitchen flow, and live sales
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading || rateLimitCountdown > 0}
              className="w-full rounded-none border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F3D2E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F3D2E] disabled:opacity-75 transition"
              placeholder="owner@cafe.com"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Password
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading || rateLimitCountdown > 0}
                className="w-full rounded-none border border-slate-200 bg-slate-50/70 px-3.5 py-3 pr-10 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F3D2E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F3D2E] disabled:opacity-75 transition"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {requiresTwoFactor && (
            <div>
              <label htmlFor="two-factor-code" className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Two-Factor Code
              </label>
              <input
                id="two-factor-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={twoFactorCode}
                onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading || rateLimitCountdown > 0}
                className="w-full rounded-none border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-xs sm:text-sm text-center font-mono tracking-widest text-slate-900 focus:border-[#0F3D2E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F3D2E] disabled:opacity-75 transition"
                placeholder="000000"
              />
            </div>
          )}

          {error && (
            <div className={`flex items-start gap-2.5 rounded-none border p-3 text-xs font-semibold ${
              rateLimitCountdown > 0
                ? 'border-amber-300 bg-amber-50 text-amber-900'
                : 'border-rose-200 bg-rose-50 text-rose-900'
            }`}>
              {rateLimitCountdown > 0 ? (
                <Clock size={16} className="mt-0.5 shrink-0 text-amber-700 animate-spin" />
              ) : (
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
              )}
              <div className="flex-1">
                <span>{error}</span>
                {rateLimitCountdown > 0 && (
                  <div className="mt-1 text-[11px] text-amber-800 font-normal">
                    Button re-enables automatically in <strong className="font-mono">{rateLimitCountdown}s</strong>.
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isButtonDisabled}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#0F3D2E] hover:bg-[#165a44] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-2xs hover:shadow-xs active:scale-98 transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Signing in...</span>
              </>
            ) : rateLimitCountdown > 0 ? (
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                <span>Try again in {rateLimitCountdown}s</span>
              </span>
            ) : (
              'Sign in to Dashboard'
            )}
          </button>

          <div className="pt-2 text-center space-y-3">
            <div className="text-xs text-slate-500 font-medium">
              Opening a new café?{' '}
              <Link to="/signup" className="font-bold text-[#0F3D2E] hover:underline">
                Start 14-day free trial
              </Link>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
              <span>Looking for customer ordering?</span>
              <a
                href={env.customerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1 hover:underline"
              >
                <span>Live Menu</span>
                <ArrowRight size={12} />
              </a>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
