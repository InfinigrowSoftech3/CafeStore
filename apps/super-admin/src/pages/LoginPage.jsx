import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Lock, Mail, Eye, EyeOff, Loader2, AlertCircle,
  CheckCircle2, ArrowRight, Sparkles, Smartphone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide administrative email and password.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/platform/admin/login', {
        email,
        password,
        twoFactorCode: require2fa ? twoFactorCode : undefined,
      });

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
      const msg = (typeof err.response?.data?.error === 'string' ? err.response.data.error : err.response?.data?.error?.message) || err.message || 'Invalid platform admin credentials.';
      setError(msg);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="super-admin-theme flex min-h-screen bg-[var(--sa-bg-page,#F5F7FC)] text-[var(--sa-text-body,#1B2559)] font-body">
      {/* ── Left Side: Brand Visual & SaaS Platform Overview ── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 border-r border-[#1E3FAE]/20 bg-gradient-to-br from-[#07123A] via-[#0B1B4D] to-[#1E3FAE] text-white overflow-hidden">
        {/* Glow ambient effects */}
        <div className="absolute -left-20 top-20 h-96 w-96 rounded-full bg-[#D4AF37]/15 blur-[130px] pointer-events-none" />
        <div className="absolute right-10 bottom-20 h-96 w-96 rounded-full bg-[#1E3FAE]/30 blur-[130px] pointer-events-none" />

        {/* Top brand header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-none bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] font-bold shadow-sm">
            <ShieldCheck size={24} />
          </div>
          <div>
            <span className="font-display text-xl font-bold tracking-tight text-white block">
              Brewhaus
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] block">
              Platform Administration
            </span>
          </div>
        </div>

        {/* Center narrative & value props */}
        <div className="relative z-10 my-auto py-12 space-y-8 max-w-lg">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-3 py-1 text-xs font-semibold text-[#D4AF37] mb-4">
              <Sparkles size={13} /> Multi-Tenant Dining Infrastructure
            </span>
            <h1 className="font-display text-4xl xl:text-5xl font-bold tracking-tight text-white leading-tight">
              Centralized Command for <span className="text-[#D4AF37]">18+ Live Cafés</span>.
            </h1>
            <p className="mt-4 text-sm text-white/80 leading-relaxed">
              Real-time platform metrics, tenant isolation oversight, automated QR table-ordering provision, and bank-grade audit trail compliance.
            </p>
          </div>

          {/* Highlights Cards */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 rounded-none border border-white/10 bg-white/[0.07] backdrop-blur-md p-4 shadow-xs">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#D4AF37]">
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#D4AF37]">
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#D4AF37]">
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
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            99.99% Systems Nominal
          </span>
        </div>
      </div>

      {/* ── Right Side: Admin Authentication Card ── */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12 bg-slate-50">
        <motion.div
          animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-6 bg-white p-8 sm:p-10 rounded-none border border-slate-200 shadow-xl"
        >
          {/* Header */}
          <div>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-none bg-[#0B1B4D] border border-slate-800 text-[#D4AF37] shadow-sm">
              <ShieldCheck size={26} />
            </div>
            <div className="inline-block px-2.5 py-0.5 ml-3 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200">
              Elevated Access
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 mt-2">
              Super Admin Sign In
            </h2>
            <p className="mt-1.5 text-xs text-slate-500">
              Enter your elevated administrative credentials to access platform controls.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-none border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Super Admin Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@brewhaus.com"
                  className="w-full rounded-none border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1E3FAE] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E3FAE] shadow-none transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Password
                </label>
                <span className="text-[11px] text-[#1E3FAE] hover:underline font-semibold cursor-pointer" title="Contact systems security administrator">
                  Forgot credentials?
                </span>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-none border border-slate-200 bg-white pl-11 pr-11 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1E3FAE] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E3FAE] shadow-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-700 transition"
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Two-Factor Authentication Code (TOTP)
                </label>
                <input
                  type="text"
                  required
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="6-digit code or backup code"
                  className="w-full rounded-none border border-amber-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1E3FAE] focus:outline-none focus:ring-1 focus:ring-[#1E3FAE]"
                />
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#0B1B4D] hover:bg-[#152a70] active:bg-[#07123A] py-3.5 font-bold text-white shadow-md transition disabled:opacity-60 mt-6 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Authenticating Core Session...
                </>
              ) : (
                <>
                  Sign in to Platform <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="rounded-none border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-900">Security Notice:</span> Access to this platform is strictly monitored and rate-limited. Unauthorized access attempts are flagged, IP-logged, and automatically blocked.
          </div>
        </motion.div>
      </div>
    </div>
  );
}
