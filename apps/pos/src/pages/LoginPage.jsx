import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

export default function LoginPage() {
  const tenant = useTenant();
  const { login } = useAuth();
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

  const isButtonDisabled = loading || rateLimitCountdown > 0;

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-900 font-sans select-none overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-7 sm:p-9 shadow-2xl text-slate-100"
      >
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Counter POS Station</span>
          </div>

          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-[#0F3D2E] text-2xl font-extrabold text-white shadow-md overflow-hidden">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              (tenant.name || 'C').charAt(0).toUpperCase()
            )}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            {tenant.name || 'Café'} POS Terminal
          </h1>
          <p className="mt-1 text-xs text-slate-400 font-normal">
            Cashier & Staff Access · Authorized roles only
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Staff Email
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cashier@yourcafe.com"
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 pr-10 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {requiresTwoFactor && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-emerald-400">
                2FA Verification Code
              </label>
              <input
                type="text"
                required
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
                className="w-full rounded-xl border border-emerald-500/50 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 text-center tracking-widest font-mono outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isButtonDisabled}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0F3D2E] hover:bg-[#165a44] px-4 py-3 text-sm font-bold text-white shadow-md transition disabled:opacity-50"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Verifying Station...' : 'Sign in to Terminal'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
