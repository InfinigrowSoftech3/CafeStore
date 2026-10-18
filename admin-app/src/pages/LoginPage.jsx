import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Mail, Lock, Eye, EyeOff, Loader2, Clock, ArrowRight,
  UtensilsCrossed, BarChart3, FileText, Users, AlertCircle
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

/* Steaming Coffee Cup Icon matching mockup */
function CoffeeCupLogo({ className = "w-6 h-6 text-[#E2B774]" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
      <path d="M6 2v3" />
      <path d="M10 2v3" />
      <path d="M14 2v3" />
    </svg>
  );
}

/* Two roasted coffee beans graphic in bottom corner */
function CoffeeBeansGraphic({ className = "w-8 h-8 text-[#542B12]" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(-30 18 24)">
        <path d="M18 10 C26 10 28 17 28 24 C28 31 26 38 18 38 C10 38 8 31 8 24 C8 17 10 10 18 10 Z" />
        <path d="M18 12 Q22 24 18 36" stroke="#E2C9B6" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </g>
      <g transform="rotate(35 32 30)">
        <path d="M32 18 C38 18 40 23 40 28 C40 33 38 38 32 38 C26 38 24 33 24 28 C24 23 26 18 32 18 Z" />
        <path d="M32 20 Q35 28 32 36" stroke="#E2C9B6" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/* Botanical Monstera leaf line art watermark */
function BotanicalLeaves({ className = "text-[#CBB4A0]/20" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 240 240" stroke="currentColor">
      <path d="M220 20 C180 50 130 110 100 190" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M150 65 C175 55 205 60 215 75" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M125 100 C155 100 190 115 205 135" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M110 135 C135 145 165 170 180 195" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M240 70 C200 90 150 160 120 240" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M180 100 C205 105 225 125 230 145" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M150 135 C180 150 200 180 205 210" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export default function LoginPage() {
  const tenant = useTenant();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
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
    if (loading || rateLimitCountdown > 0) return;

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
    <div className="relative min-h-screen w-full flex bg-[#FDFBF7] font-body text-slate-800 select-none overflow-x-hidden">
      {/* ── Background Photography Layer ── */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/images/cafe-login-bg.jpg"
          alt=""
          className="h-full w-full object-cover object-left"
        />
        {/* Soft daylight ambient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-black/10" />
      </div>

      {/* ── Organic Ribbon Wave Curves (Right / Top-Right Backdrop) ── */}
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none z-0"
        preserveAspectRatio="none"
        viewBox="0 0 1440 900"
        fill="none"
      >
        {/* Tan / Cream Organic Wave */}
        <path
          d="M 640,900 C 720,720 800,640 960,580 C 1140,510 1280,480 1440,500 L 1440,900 Z"
          fill="#F5EFE6"
        />
        {/* Deep Forest Green Background Curve */}
        <path
          d="M 940,0 C 900,240 960,420 1120,510 C 1240,580 1340,590 1440,600 L 1440,0 Z"
          fill="#0F3D2E"
        />
      </svg>

      {/* Botanical Leaf Art Watermark in top-right */}
      <div className="absolute top-0 right-0 w-80 h-80 pointer-events-none z-0 hidden lg:block overflow-hidden">
        <BotanicalLeaves className="w-full h-full text-[#EADCCB]/25" />
      </div>

      {/* ── Main Layout Container ── */}
      <div className="relative z-10 flex min-h-screen w-full flex-col lg:flex-row items-center justify-between px-4 sm:px-8 lg:px-14 py-8 lg:py-12">
        {/* ── Left Side: Brand Narrative & Feature Highlights (Desktop) ── */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between self-stretch pr-8 xl:pr-12">
          {/* Top Brand Header */}
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F3D2E] text-amber-200 shadow-sm">
                <CoffeeCupLogo className="w-6 h-6 text-[#E2B774]" />
              </div>
              <div>
                <span className="font-display text-2xl font-bold tracking-tight text-slate-900 block leading-tight">
                  Café Admin
                </span>
                <span className="text-[9px] font-bold tracking-[0.25em] text-[#8C7A6B] block uppercase">
                  OPERATIONS CONSOLE
                </span>
              </div>
            </div>

            {/* Gold Accent Line */}
            <div className="w-11 h-[3px] bg-[#C59B27] mt-5 mb-7 rounded-full" />

            {/* Headline */}
            <h1 className="font-display text-4xl xl:text-5xl font-bold tracking-tight text-slate-900 leading-[1.15]">
              Manage Your <br />
              Café, <span className="italic font-normal text-[#C08237]">Smarter</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-4 text-sm text-slate-600 font-normal leading-relaxed max-w-md">
              Streamline orders, track inventory, manage menus, and grow your café with powerful tools — all in one place.
            </p>

            {/* 4 Feature Badges in a Horizontal Row */}
            <div className="grid grid-cols-4 gap-3 max-w-lg mt-8">
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#FAF5EF]/95 border border-[#EBDCCB]/90 text-center shadow-xs backdrop-blur-xs">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5ECE1] text-[#A66C3B] mb-1.5">
                  <UtensilsCrossed size={17} />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 leading-tight">
                  Manage<br />Orders
                </span>
              </div>

              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#FAF5EF]/95 border border-[#EBDCCB]/90 text-center shadow-xs backdrop-blur-xs">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5ECE1] text-[#A66C3B] mb-1.5">
                  <BarChart3 size={17} />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 leading-tight">
                  Track<br />Inventory
                </span>
              </div>

              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#FAF5EF]/95 border border-[#EBDCCB]/90 text-center shadow-xs backdrop-blur-xs">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5ECE1] text-[#A66C3B] mb-1.5">
                  <FileText size={17} />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 leading-tight">
                  Update<br />Menu
                </span>
              </div>

              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#FAF5EF]/95 border border-[#EBDCCB]/90 text-center shadow-xs backdrop-blur-xs">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F5ECE1] text-[#A66C3B] mb-1.5">
                  <Users size={17} />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 leading-tight">
                  Live<br />Sales
                </span>
              </div>
            </div>
          </div>

          {/* Bottom spacer so natural photo with latte & croissant stays visible */}
          <div className="h-44 xl:h-52 pointer-events-none" />
        </div>

        {/* ── Right Side: Floating Login Card ── */}
        <div className="flex w-full lg:w-1/2 items-center justify-center lg:justify-end my-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative w-full max-w-[440px] rounded-[32px] bg-white p-7 sm:p-9 shadow-2xl border border-slate-100/90"
          >
            {/* Coffee beans corner decoration */}
            <div className="absolute -bottom-3 -left-3 pointer-events-none z-20">
              <CoffeeBeansGraphic className="w-9 h-9 text-[#542B12]" />
            </div>

            {/* Top Operations Console Pill */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-3.5 py-1 text-xs font-semibold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Café Operations Console</span>
              </div>
            </div>

            {/* Center Coffee Cup Icon Badge */}
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F3D2E] text-amber-200 shadow-md">
              <CoffeeCupLogo className="w-7 h-7 text-[#E2B774]" />
            </div>

            {/* Title & Subtitle */}
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-center">
              Café Admin
            </h1>
            <p className="mt-1 text-center text-xs text-slate-500 font-normal">
              Sign in to manage orders, kitchen flow, and live sales
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Email Address */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  EMAIL ADDRESS
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={loading || rateLimitCountdown > 0}
                    placeholder="owner@cafe.com"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F3D2E] focus:outline-none focus:ring-1 focus:ring-[#0F3D2E] shadow-2xs transition disabled:opacity-75"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  PASSWORD
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={loading || rateLimitCountdown > 0}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F3D2E] focus:outline-none focus:ring-1 focus:ring-[#0F3D2E] shadow-2xs transition disabled:opacity-75"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Keep me signed in & Forgot password row */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#0F3D2E] focus:ring-[#0F3D2E] accent-[#0F3D2E]"
                  />
                  <span className="text-slate-700 font-medium text-xs">Keep me signed in</span>
                </label>
                <button
                  type="button"
                  onClick={() => setError('Password reset instructions have been forwarded to systems administration.')}
                  className="font-semibold text-[#0F3D2E] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* 2FA Code (if required) */}
              {requiresTwoFactor && (
                <div>
                  <label htmlFor="two-factor-code" className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Two-Factor Code
                  </label>
                  <input
                    id="two-factor-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={twoFactorCode}
                    onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={loading || rateLimitCountdown > 0}
                    className="w-full rounded-xl border border-amber-300 bg-amber-50/40 py-3 text-sm text-center font-mono tracking-widest text-slate-900 focus:border-[#0F3D2E] focus:outline-none focus:ring-1 focus:ring-[#0F3D2E]"
                    placeholder="000000"
                  />
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs font-semibold ${
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
                        Button re-enables in <strong className="font-mono">{rateLimitCountdown}s</strong>.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isButtonDisabled}
                className="w-full rounded-xl bg-[#0F3D2E] hover:bg-[#165a44] active:bg-[#0c2a20] text-white py-3.5 px-4 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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
                  <>
                    <span>SIGN IN TO DASHBOARD</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

              {/* OR Divider */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="absolute bg-white px-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  OR
                </span>
              </div>

              {/* Secondary Navigation Links */}
              <div className="space-y-2 text-center text-xs">
                <div className="text-slate-600">
                  Opening a new café?{' '}
                  <Link to="/signup" className="font-bold text-[#0F3D2E] hover:underline">
                    Start 14-day free trial →
                  </Link>
                </div>
                <div className="text-slate-600">
                  Looking for customer ordering?{' '}
                  <a
                    href="https://cafe-client-app.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#0F3D2E] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Live Menu →</span>
                  </a>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
