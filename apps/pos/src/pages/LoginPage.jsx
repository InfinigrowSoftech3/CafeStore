import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle, Eye, EyeOff, Loader2, Sparkles, ExternalLink,
  Monitor, Clock, ShieldCheck, Coffee, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { env } from '../config/env';
import { Button, Input } from '../components/ui';

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
      setError('Please enter your staff email and password.');
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
          <p className="mt-1.5 text-xs text-pos-muted font-normal">
            Cashier & Counter Touch Terminal Sign In
          </p>
        </div>

        {/* ── 1-Click Instant Demo / Preview Buttons ─────────── */}
        <div className="mb-6 rounded-2xl border border-pos-border bg-pos-raised/70 p-3.5 text-xs space-y-2.5">
          <div className="flex items-center gap-1.5 text-pos-accent font-bold text-[11px] uppercase tracking-wider">
            <Sparkles size={14} />
            <span>Quick Terminal Login (1-Click)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => demoLogin('cashier')}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-pos-accent text-white font-bold text-xs shadow-xs touch-press min-h-[48px] hover:bg-pos-accent-hover transition-colors"
            >
              <Monitor size={15} />
              <span>Cashier</span>
            </button>
            <button
              type="button"
              onClick={() => demoLogin('manager')}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-pos-surface hover:bg-pos-raised text-pos-text font-bold text-xs border border-pos-border hover:border-pos-accent shadow-xs touch-press min-h-[48px] transition-colors"
            >
              <ShieldCheck size={15} className="text-pos-accent" />
              <span>Manager</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-pos-danger/40 bg-pos-danger/10 p-3.5 text-xs text-pos-danger">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed font-semibold">{error}</span>
          </div>
        )}

        {/* ── Standard Staff Credentials Form ──────────────── */}
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
            {loading ? 'Verifying Station...' : 'Sign in to Terminal'}
          </Button>
        </form>

        {/* ── Cross-App Navigation Footer ───────────────────── */}
        <div className="mt-6 pt-5 border-t border-pos-border flex items-center justify-between text-xs text-pos-muted">
          <a
            href={env.adminUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-pos-accent flex items-center gap-1 transition font-medium min-h-[32px] px-1"
          >
            <span>Back Office</span>
            <ExternalLink size={12} />
          </a>
          <span className="text-pos-border">·</span>
          <a
            href={env.kdsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-pos-accent flex items-center gap-1 transition font-medium min-h-[32px] px-1"
          >
            <Clock size={12} />
            <span>Kitchen KDS</span>
          </a>
          <span className="text-pos-border">·</span>
          <a
            href={env.customerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-pos-accent flex items-center gap-1 transition font-medium min-h-[32px] px-1"
          >
            <span>Storefront</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </motion.div>
    </div>
  );
}
