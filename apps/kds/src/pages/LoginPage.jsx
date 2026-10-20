import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Eye, EyeOff, Loader2, Sparkles, Flame, Coffee, ExternalLink, Monitor } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { env } from '../config/env';

export default function LoginPage() {
  const tenant = useTenant();
  const { login, demoLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

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
    if (loading || rateLimitCountdown > 0) return;

    if (!email || !password) {
      setError('Please enter your kitchen staff email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password, twoFactorCode);
    } catch (err) {
      if (err.code === 'TWO_FACTOR_REQUIRED') {
        setRequiresTwoFactor(true);
      }
      if (err.status === 429 || err.code === 'RATE_LIMITED') {
        const retrySec = Number(err.retryAfter) || 30;
        setRateLimitCountdown(retrySec);
        setError(`Too many login attempts. Please wait ${retrySec} seconds before trying again.`);
      } else {
        setError(err.message || 'Unable to sign in. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFillCredentials = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  const isButtonDisabled = loading || rateLimitCountdown > 0;

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-stone-950 font-sans select-none overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#292524_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-stone-800 bg-stone-900/95 p-6 sm:p-8 shadow-2xl text-stone-100 backdrop-blur-md"
      >
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-[11px] font-bold text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Kitchen & Bar Display Station</span>
          </div>

          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-stone-800 bg-amber-500 text-2xl font-extrabold text-stone-950 shadow-md overflow-hidden">
            🍳
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            {tenant?.name || 'Café'} Kitchen Display
          </h1>
          <p className="mt-1 text-xs text-stone-400 font-normal">
            Cook, Barista & Kitchen Staff Live Ticket Board
          </p>
        </div>

        {/* ── 1-Click Instant Demo / Preview Buttons ─────────── */}
        <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] uppercase tracking-wider">
            <Sparkles size={13} />
            <span>Instant Kitchen Access (1-Click)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => demoLogin('kitchen')}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-xs transition active:scale-98"
            >
              <Flame size={13} />
              <span>Kitchen Lead / Chef</span>
            </button>
            <button
              type="button"
              onClick={() => demoLogin('manager')}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-xs border border-amber-800/60 shadow-xs transition active:scale-98"
            >
              <Coffee size={13} />
              <span>Barista / Manager</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-300">
                Kitchen Staff Email
              </label>
              <button
                type="button"
                onClick={() => handleFillCredentials('manager@sipstack-demo.com', 'Manager@123')}
                className="text-[10px] text-amber-400 hover:text-amber-300 underline font-medium"
              >
                Auto-fill demo
              </button>
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kitchen@yourcafe.com"
              className="w-full rounded-xl border border-stone-800 bg-stone-950 px-3.5 py-2.5 text-sm text-white placeholder-stone-600 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-300">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-stone-800 bg-stone-950 px-3.5 py-2.5 pr-10 text-sm text-white placeholder-stone-600 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 transition"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {requiresTwoFactor && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-amber-400">
                2FA Verification Code
              </label>
              <input
                type="text"
                required
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
                className="w-full rounded-xl border border-amber-500/50 bg-stone-950 px-3.5 py-2.5 text-sm text-white placeholder-stone-600 text-center tracking-widest font-mono outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isButtonDisabled}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-4 py-3 text-sm font-bold shadow-md transition disabled:opacity-50"
          >
            {loading && <Loader2 size={16} className="animate-spin text-stone-950" />}
            {loading ? 'Entering Station...' : 'Sign in to Kitchen Board'}
          </button>
        </form>

        {/* ── Cross-App Navigation Footer ───────────────────── */}
        <div className="mt-6 pt-5 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <a
            href={env.adminUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-400 flex items-center gap-1 transition font-medium"
          >
            <span>Back Office</span>
            <ExternalLink size={11} />
          </a>
          <span className="text-stone-700">·</span>
          <a
            href={env.posUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 flex items-center gap-1 transition font-medium"
          >
            <Monitor size={11} />
            <span>POS Terminal</span>
          </a>
          <span className="text-stone-700">·</span>
          <a
            href={env.customerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-400 flex items-center gap-1 transition font-medium"
          >
            <span>Storefront</span>
            <ExternalLink size={11} />
          </a>
        </div>
      </motion.div>
    </div>
  );
}
