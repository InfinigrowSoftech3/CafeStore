import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle, Eye, EyeOff, Loader2, Sparkles, ExternalLink,
  Monitor, ChefHat, ShieldCheck, Clock, RotateCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { env } from '../config/env';
import { wakeServer } from '../services/api';

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
  const [isWaking, setIsWaking] = useState(false);
  const [isTimeoutError, setIsTimeoutError] = useState(false);

  useEffect(() => {
    wakeServer();
  }, []);

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
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (loading || rateLimitCountdown > 0) return;

    if (!email || !password) {
      setError('Please enter your kitchen staff email and password.');
      return;
    }

    setLoading(true);
    setIsWaking(false);
    setIsTimeoutError(false);
    setError('');

    const wakeTimer = setTimeout(() => {
      setIsWaking(true);
    }, 4000);

    try {
      await login(email, password, twoFactorCode);
      clearTimeout(wakeTimer);
      setIsWaking(false);
    } catch (err) {
      clearTimeout(wakeTimer);
      setIsWaking(false);

      if (err.code === 'TWO_FACTOR_REQUIRED') {
        setRequiresTwoFactor(true);
      }

      const isTimeout =
        err.isTimeout ||
        err.code === 'ECONNABORTED' ||
        Boolean(err.message && /timeout|taking too long|network\s*error/i.test(err.message)) ||
        !err.response;

      if (err.status === 429 || err.code === 'RATE_LIMITED') {
        setIsTimeoutError(false);
        const retrySec = Number(err.retryAfter) || 30;
        setRateLimitCountdown(retrySec);
        setError(`Too many login attempts. Please wait ${retrySec} seconds before trying again.`);
      } else if (isTimeout) {
        setIsTimeoutError(true);
        setError('Server is taking too long. Please try again');
      } else {
        setIsTimeoutError(false);
        setError(err.message || 'Unable to sign in. Please verify your credentials.');
      }
    } finally {
      clearTimeout(wakeTimer);
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
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#F8F6F2] text-[#1C1815] font-sans select-none overflow-hidden">
      {/* Warm parchment dot texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#E5DED5_1.5px,transparent_1.5px)] [background-size:28px_28px] opacity-70 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-[#E5DED5] bg-white p-6 sm:p-8 shadow-xl text-[#1C1815]"
      >
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#F2EDE4] border border-amber-600/30 px-3.5 py-1 text-xs font-bold text-amber-700">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Kitchen & Bar Display Station</span>
          </div>

          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#E5DED5] bg-white text-3xl font-black text-stone-950 shadow-sm overflow-hidden">
            <img src={tenant?.logoUrl || '/logo.png'} alt="Logo" className="h-full w-full object-cover" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1815]">
            {tenant?.name || 'Café'} KDS
          </h1>
          <p className="mt-1.5 text-xs text-[#6E645B] font-normal">
            Cook, Barista & Kitchen Staff Live Ticket Board
          </p>
        </div>

        {/* ── 1-Click Instant Demo / Preview Buttons ─────────── */}
        <div className="mb-6 p-4 rounded-2xl bg-[#FAF8F5] border border-[#E5DED5]">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
            <Sparkles size={14} />
            <span>Quick Display Login (1-Click)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => demoLogin('kitchen')}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white border border-[#E5DED5] hover:border-amber-500 text-xs font-bold text-[#1C1815] hover:text-amber-700 shadow-xs active:scale-98 transition cursor-pointer disabled:opacity-50"
            >
              <ChefHat size={16} />
              <span>Kitchen Staff</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => demoLogin('manager')}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white border border-[#E5DED5] hover:border-amber-500 text-xs font-bold text-[#1C1815] hover:text-amber-700 shadow-xs active:scale-98 transition cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck size={16} />
              <span>Manager</span>
            </button>
          </div>
          <div className="mt-2 text-[11px] text-[#6E645B] text-center">
            Instantly enters board with live kitchen staff privileges
          </div>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E5DED5]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wider font-bold">
            <span className="bg-white px-3 text-[#6E645B]">Or sign in with email</span>
          </div>
        </div>

        {/* Slow connection / cold start waking notice */}
        {isWaking && loading && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950">
            <Loader2 size={18} className="animate-spin shrink-0 text-amber-600" />
            <span className="font-medium leading-relaxed">
              Waking up the server, this can take up to a minute on first load…
            </span>
          </div>
        )}

        {/* ── Error Notification ────────────────────────────── */}
        {error && (
          <div className={`mb-5 flex flex-col gap-2 rounded-2xl border p-4 text-xs font-medium ${
            rateLimitCountdown > 0
              ? 'border-amber-400 bg-amber-50 text-amber-900'
              : 'border-rose-300 bg-rose-50 text-rose-900'
          }`}>
            <div className="flex items-start gap-3">
              {rateLimitCountdown > 0 ? (
                <Clock size={18} className="shrink-0 mt-0.5 text-amber-700 animate-spin" />
              ) : (
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600" />
              )}
              <div className="flex-1">
                <span>{error}</span>
                {rateLimitCountdown > 0 && (
                  <div className="mt-1 text-[11px] opacity-80">
                    Board will re-enable in <strong className="font-mono">{rateLimitCountdown}s</strong>.
                  </div>
                )}
              </div>
            </div>
            {isTimeoutError && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e)}
                className="mt-1 inline-flex items-center justify-center gap-1.5 self-start rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-stone-950 shadow-xs transition cursor-pointer"
              >
                <RotateCw size={13} />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        {/* ── Email / Password Form ─────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6E645B]">
                Staff Email
              </label>
              <button
                type="button"
                onClick={() => handleFillCredentials('manager@sipstack-demo.com', 'Manager@123')}
                className="text-xs text-amber-700 hover:underline font-semibold"
              >
                Auto-fill demo
              </button>
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="chef@yourcafe.com"
              className="w-full rounded-xl border border-[#E5DED5] bg-[#FAF8F5] px-4 py-3 text-base text-[#1C1815] placeholder-[#6E645B]/60 outline-none transition focus:border-amber-600 focus:bg-white min-h-[48px]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6E645B]">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#E5DED5] bg-[#FAF8F5] px-4 py-3 pr-12 text-base text-[#1C1815] placeholder-[#6E645B]/60 outline-none transition focus:border-amber-600 focus:bg-white min-h-[48px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E645B] hover:text-[#1C1815] p-2"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {requiresTwoFactor && (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-amber-700">
                2FA Verification Code
              </label>
              <input
                type="text"
                required
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
                className="w-full rounded-xl border border-amber-500 bg-[#FAF8F5] px-4 py-3 text-base text-[#1C1815] text-center tracking-widest font-mono outline-none min-h-[48px]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isButtonDisabled}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 px-5 py-3.5 text-base font-bold text-stone-950 shadow-md transition disabled:opacity-50 min-h-[48px] cursor-pointer"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            <span className="text-sm">
              {loading
                ? (isWaking ? 'Waking up the server, this can take up to a minute on first load…' : 'Connecting Board...')
                : 'Sign in to Kitchen Board'}
            </span>
          </button>
        </form>

        {/* ── Cross-App Navigation Footer ───────────────────── */}
        <div className="mt-6 pt-5 border-t border-[#E5DED5] flex items-center justify-between text-xs text-[#6E645B]">
          <a
            href={env.posUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-700 flex items-center gap-1 transition font-medium min-h-[32px] px-1"
          >
            <Monitor size={12} />
            <span>POS Register</span>
          </a>
          <span className="text-[#E5DED5]">·</span>
          <a
            href={env.adminUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-700 flex items-center gap-1 transition font-medium min-h-[32px] px-1"
          >
            <span>Back Office</span>
            <ExternalLink size={12} />
          </a>
          <span className="text-[#E5DED5]">·</span>
          <a
            href={env.customerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-700 flex items-center gap-1 transition font-medium min-h-[32px] px-1"
          >
            <span>Storefront</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </motion.div>
    </div>
  );
}
