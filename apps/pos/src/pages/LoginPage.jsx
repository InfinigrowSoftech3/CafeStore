import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle, Eye, EyeOff, Loader2, Sparkles, ExternalLink,
  Monitor, Clock, ShieldCheck, Coffee, Check, RotateCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { env } from '../config/env';
import { Button, Input } from '../components/ui';
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
      setError('Please enter your staff email and password.');
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
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-pos-bg text-pos-text font-sans select-none overflow-hidden">
      {/* Warm parchment textured subtle background */}
      <div className="absolute inset-0 bg-[radial-gradient(#E5DED5_1.5px,transparent_1.5px)] [background-size:28px_28px] opacity-70 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-pos-border bg-pos-surface p-6 sm:p-8 shadow-elevation2 text-pos-text"
      >
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-pos-raised border border-pos-accent/30 px-3.5 py-1 text-xs font-bold text-pos-accent">
            <span className="h-2 w-2 rounded-full bg-pos-accent animate-pulse" />
            <span>Counter POS Workstation</span>
          </div>

          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-pos-border bg-pos-accent text-white font-display text-2xl font-black shadow-elevation1 overflow-hidden">
            {tenant?.logoUrl ? (
              <img src={tenant.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              (tenant?.name || 'C').charAt(0).toUpperCase()
            )}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-pos-text">
            {tenant?.name || 'Café'} POS
          </h1>
          <p className="mt-1 text-xs text-pos-muted font-normal">
            Touch Register, Table Orders & Cashier Station
          </p>
        </div>

        {/* ── 1-Click Instant Demo / Preview Buttons ─────────── */}
        <div className="mb-6 p-4 rounded-2xl bg-pos-raised border border-pos-border">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-pos-accent uppercase tracking-wider">
            <Sparkles size={14} />
            <span>Quick Terminal Login (1-Click)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => demoLogin('cashier')}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-pos-surface border border-pos-border hover:border-pos-accent text-xs font-bold text-pos-text hover:text-pos-accent shadow-xs touch-press transition cursor-pointer disabled:opacity-50"
            >
              <Coffee size={16} />
              <span>Cashier</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => demoLogin('manager')}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-pos-surface border border-pos-border hover:border-pos-accent text-xs font-bold text-pos-text hover:text-pos-accent shadow-xs touch-press transition cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck size={16} />
              <span>Manager</span>
            </button>
          </div>
          <div className="mt-2 text-[11px] text-pos-muted text-center">
            Instantly enters terminal with live demo staff privileges
          </div>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-pos-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wider font-bold">
            <span className="bg-pos-surface px-3 text-pos-muted">Or sign in with email</span>
          </div>
        </div>

        {/* Slow connection / cold start waking notice */}
        {isWaking && loading && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-pos-accent/40 bg-pos-raised p-3.5 text-xs text-pos-text">
            <Loader2 size={18} className="animate-spin shrink-0 text-pos-accent" />
            <span className="font-medium leading-relaxed">
              Waking up the server, this can take up to a minute on first load…
            </span>
          </div>
        )}

        {/* ── Error Notification ────────────────────────────── */}
        {error && (
          <div className={`mb-5 flex flex-col gap-2 rounded-2xl border p-4 text-xs font-medium ${
            rateLimitCountdown > 0
              ? 'border-amber-400/50 bg-amber-500/10 text-amber-900'
              : 'border-rose-400/50 bg-rose-500/10 text-rose-900'
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
                    Terminal will re-enable in <strong className="font-mono">{rateLimitCountdown}s</strong>.
                  </div>
                )}
              </div>
            </div>
            {isTimeoutError && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e)}
                className="mt-1 inline-flex items-center justify-center gap-1.5 self-start rounded-xl bg-pos-accent hover:opacity-90 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
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
              <label className="block text-xs font-bold uppercase tracking-wider text-pos-muted">
                Staff Email
              </label>
              <button
                type="button"
                onClick={() => handleFillCredentials('manager@sipstack-demo.com', 'Manager@123')}
                className="text-xs text-pos-accent hover:underline font-semibold touch-press"
              >
                Auto-fill demo
              </button>
            </div>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cashier@yourcafe.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-pos-muted">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-pos-border bg-pos-surface px-4 py-3 pr-12 text-base text-pos-text placeholder:text-pos-muted/60 outline-none transition focus:border-pos-accent focus:ring-2 focus:ring-pos-accent/20 min-h-[48px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-pos-muted hover:text-pos-text p-2 touch-press"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {requiresTwoFactor && (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-pos-accent">
                2FA Verification Code
              </label>
              <input
                type="text"
                required
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
                className="w-full rounded-xl border border-pos-accent/50 bg-pos-surface px-4 py-3 text-base text-pos-text placeholder:text-pos-muted/60 text-center tracking-widest font-mono outline-none min-h-[48px]"
              />
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isButtonDisabled}
            isLoading={loading}
            className="w-full font-bold shadow-elevation1"
          >
            {loading ? (
              <span className="text-xs">
                {isWaking ? 'Waking up the server, this can take up to a minute on first load…' : 'Verifying Station...'}
              </span>
            ) : (
              'Sign in to Terminal'
            )}
          </Button>
        </form>

        {/* ── Cross-App Navigation Footer ───────────────────── */}
        <div className="mt-6 pt-5 border-t border-pos-border flex items-center justify-between text-xs text-pos-muted">
          <a
            href={env.adminUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-pos-accent transition font-medium"
          >
            <ShieldCheck size={14} />
            <span>Admin Back-Office</span>
            <ExternalLink size={11} className="opacity-70" />
          </a>
          <a
            href={env.kdsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-pos-accent transition font-medium"
          >
            <Monitor size={14} />
            <span>Kitchen Display</span>
            <ExternalLink size={11} className="opacity-70" />
          </a>
        </div>
      </motion.div>
    </div>
  );
}
