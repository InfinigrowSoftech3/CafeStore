import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Lock, Mail, Eye, EyeOff, Loader2, AlertCircle,
  CheckCircle2, ArrowRight, Sparkles, Smartphone, RotateCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { wakeServer } from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [require2fa, setRequire2fa] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [isWaking, setIsWaking] = useState(false);
  const [isTimeoutError, setIsTimeoutError] = useState(false);

  useEffect(() => {
    wakeServer();
  }, []);

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!email || !password) {
      setError('Please provide administrative email and password.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
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
      const { data } = await api.post('/platform/admin/login', {
        email,
        password,
        twoFactorCode: require2fa ? twoFactorCode : undefined,
      });

      clearTimeout(wakeTimer);
      setIsWaking(false);

      if (data.require2fa) {
        setRequire2fa(true);
        setLoading(false);
        return;
      }

      // Save platform admin session token
      sessionStorage.setItem('brewhaus_superadmin_token', data.token);
      sessionStorage.setItem('brewhaus_superadmin_user', JSON.stringify(data.admin));

      navigate('/', { replace: true });
    } catch (err) {
      clearTimeout(wakeTimer);
      setIsWaking(false);

      const isTimeout =
        err.isTimeout ||
        err.code === 'ECONNABORTED' ||
        Boolean(err.message && /timeout|taking too long|network\s*error/i.test(err.message)) ||
        !err.response;

      if (isTimeout) {
        setIsTimeoutError(true);
        setError('Server is taking too long. Please try again');
      } else {
        setIsTimeoutError(false);
        const rawErr = err.response?.data?.error;
        const msg = (typeof rawErr === 'string' ? rawErr : rawErr?.message) || err.response?.data?.message || err.message || 'Invalid platform admin credentials.';
        setError(msg);
      }
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      clearTimeout(wakeTimer);
      setLoading(false);
    }
  };

  return (
    <div className="super-admin-theme flex min-h-screen bg-[var(--sa-bg-page)] text-[var(--sa-text-body)] font-body">
      {/* ── Left Side: Brand Visual & SaaS Platform Overview ── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 border-r border-white/15 bg-gradient-to-br from-[var(--sa-primary-pressed)] via-[var(--sa-primary)] to-[var(--sa-primary-light)] text-white overflow-hidden">
        {/* Glow ambient effects */}
        <div className="absolute -left-20 top-20 h-96 w-96 rounded-full bg-white/10 blur-[130px] pointer-events-none" />
        <div className="absolute right-10 bottom-20 h-96 w-96 rounded-full bg-white/10 blur-[130px] pointer-events-none" />

        {/* Top brand header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-none bg-white/15 border border-white/30 text-white font-bold shadow-sm">
            <ShieldCheck size={24} />
          </div>
          <div>
            <span className="font-display text-xl font-bold tracking-tight text-white block">
              Brewhaus
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/75 block">
              Platform Administration
            </span>
          </div>
        </div>

        {/* Center narrative & value props */}
        <div className="relative z-10 my-auto py-12 space-y-8 max-w-lg">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold text-white mb-4">
              <Sparkles size={13} /> Multi-Tenant Dining Infrastructure
            </span>
            <h1 className="font-display text-4xl xl:text-5xl font-bold tracking-tight text-white leading-tight">
              Centralized Command for <span className="text-white">18+ Live Cafés</span>.
            </h1>
            <p className="mt-4 text-sm text-white/80 leading-relaxed">
              Real-time platform metrics, tenant isolation oversight, automated QR table-ordering provision, and bank-grade audit trail compliance.
            </p>
          </div>

          {/* Highlights Cards */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 rounded-none border border-white/10 bg-white/[0.07] backdrop-blur-md p-4 shadow-xs">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 border border-white/30 text-white">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Full Tenant Lifecycle & Quotas</div>
                <div className="text-[11px] text-white/70 mt-0.5">
                  Automated table generation, menu catalog sync, and plan tier quota management.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-none border border-white/10 bg-white/[0.07] backdrop-blur-md p-4 shadow-xs">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 border border-white/30 text-white">
                <ShieldCheck size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Secure Impersonation & Audit Trail</div>
                <div className="text-[11px] text-white/70 mt-0.5">
                  Troubleshoot owner dashboards safely with mandatory reason capture and tamper-evident logs.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-none border border-white/10 bg-white/[0.07] backdrop-blur-md p-4 shadow-xs">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 border border-white/30 text-white">
                <Smartphone size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Storefront Live Diagnostics</div>
                <div className="text-[11px] text-white/70 mt-0.5">
                  Preview live dining ordering storefronts across mobile, tablet, and desktop views.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom security assurance */}
        <div className="relative z-10 flex items-center justify-between text-xs text-white/60 border-t border-white/10 pt-6">
          <span>Brewhaus Platform v2.4 (Enterprise Core)</span>
          <span className="flex items-center gap-1.5 text-[var(--sa-success)] font-semibold">
            <span className="h-2 w-2 rounded-full bg-[var(--sa-success)] animate-pulse" />
            99.99% Systems Nominal
          </span>
        </div>
      </div>

      {/* ── Right Side: Admin Authentication Card ── */}
      <div className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-12 bg-[var(--sa-bg-page)] min-h-screen">
        <motion.div
          animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-6 bg-white p-6 sm:p-10 rounded-2xl sm:rounded-none border border-[var(--border-primary)] shadow-xl"
        >
          {/* Header */}
          <div>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-none bg-[var(--sa-primary)] border border-[var(--sa-primary)] text-white shadow-sm">
              <ShieldCheck size={26} />
            </div>
            <div className="inline-block px-2.5 py-0.5 ml-3 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[var(--sa-accent-tint)] text-[var(--sa-accent)] border border-[var(--sa-accent-border)]">
              Elevated Access
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)] mt-2">
              Super Admin Sign In
            </h2>
            <p className="mt-1.5 text-xs text-[var(--text-muted)]">
              Enter your elevated administrative credentials to access platform controls.
            </p>
          </div>

          {/* Slow connection / cold start waking notice */}
          {isWaking && loading && (
            <div className="flex items-center gap-3 rounded-none border border-[var(--sa-primary-border)] bg-[var(--sa-primary-tint)] p-3.5 text-xs text-[var(--text-secondary)]">
              <Loader2 size={18} className="animate-spin shrink-0 text-[var(--sa-primary)]" />
              <span className="font-medium leading-relaxed">
                Waking up the server, this can take up to a minute on first load…
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex flex-col gap-2.5 rounded-none border border-[var(--sa-danger-border)] bg-[var(--sa-danger-bg)] p-3.5 text-xs text-[var(--sa-danger-text)]">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span className="flex-1 font-medium">{error}</span>
              </div>
              {isTimeoutError && (
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e)}
                  className="mt-1 inline-flex items-center justify-center gap-1.5 self-start rounded-md bg-[var(--sa-primary)] hover:bg-[var(--sa-primary-hover)] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                >
                  <RotateCw size={13} />
                  <span>Retry</span>
                </button>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Super Admin Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-3.5 text-[var(--text-muted)]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@brewhaus.com"
                  className="w-full rounded-none border border-[var(--border-primary)] bg-white pl-11 pr-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--input-placeholder)] focus:border-[var(--sa-primary)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--sa-primary)] shadow-none transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Password
                </label>
                <span className="text-[11px] text-[var(--sa-primary)] hover:underline font-semibold cursor-pointer" title="Contact systems security administrator">
                  Forgot credentials?
                </span>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-3.5 text-[var(--text-muted)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-none border border-[var(--border-primary)] bg-white pl-11 pr-11 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--input-placeholder)] focus:border-[var(--sa-primary)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--sa-primary)] shadow-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-[var(--text-muted)] hover:text-[var(--sa-primary)] transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* 2FA input if required */}
            {require2fa && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-1.5"
              >
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                  Two-Factor Authentication Code (TOTP)
                </label>
                <input
                  type="text"
                  required
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="6-digit code or backup code"
                  className="w-full rounded-none border border-[var(--sa-primary-border)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--input-placeholder)] focus:border-[var(--sa-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--sa-primary)]"
                />
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--sa-primary)] hover:bg-[var(--sa-primary-hover)] active:bg-[var(--sa-primary-pressed)] py-3.5 font-bold text-white shadow-md transition disabled:opacity-60 mt-6 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span className="text-xs">
                    {isWaking
                      ? 'Waking up the server, this can take up to a minute on first load…'
                      : 'Authenticating Core Session...'}
                  </span>
                </>
              ) : (
                <>
                  Sign in to Platform <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="rounded-none border border-[var(--border-primary)] bg-[var(--bg-elevated)] p-4 text-[11px] text-[var(--text-secondary)] leading-relaxed">
            <span className="font-semibold text-[var(--text-primary)]">Security Notice:</span> Access to this platform is strictly monitored and rate-limited. Unauthorized access attempts are flagged, IP-logged, and automatically blocked.
          </div>
        </motion.div>
      </div>
    </div>
  );
}
