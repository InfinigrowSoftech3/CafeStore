import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Mail, Lock, Eye, EyeOff, Loader2, Clock, ArrowRight,
  UtensilsCrossed, BarChart3, FileText, Users, AlertCircle
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

/* Coffee Cup Logo with saucer and steam lines */
function CoffeeCupLogo({ className = "w-6 h-6 text-[#E5B574]" }) {
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
      <line x1="6" y1="2" x2="6" y2="4" />
      <line x1="10" y1="2" x2="10" y2="4" />
      <line x1="14" y1="2" x2="14" y2="4" />
      <line x1="2" y1="21" x2="18" y2="21" />
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

/* Botanical Monstera leaf line art watermark in top-right */
function BotanicalLeaves({ className = "text-[#F6EFE4]/20" }) {
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

  const [email, setEmail] = useState(() => localStorage.getItem('brewhaus_remember_email') || '');
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
      if (keepSignedIn) {
        localStorage.setItem('brewhaus_remember_email', email);
      } else {
        localStorage.removeItem('brewhaus_remember_email');
      }

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

  const handleForgotPassword = () => {
    setError('Password reset instructions will be sent to your verified administrator email.');
  };

  const isButtonDisabled = loading || rateLimitCountdown > 0;

  return (
    <div className="relative min-h-screen w-full flex flex-col lg:flex-row bg-[#082F25] font-body text-[#17233A] select-none overflow-x-hidden">
      {/* ── Background Photography Layer (Left ~68%) ── */}
      <div className="absolute inset-0 lg:right-[32%] pointer-events-none z-0">
        <img
          src="/images/cafe-login-bg.jpg"
          alt="Café Interior"
          className="h-full w-full object-cover object-left"
        />
        {/* Soft daylight ambient vignette to guarantee text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-transparent lg:w-[65%]" />
      </div>

      {/* ── Right Section Background Fill (#0D4032) ── */}
      <div className="absolute inset-y-0 right-0 w-full lg:w-[32%] bg-[#0D4032] pointer-events-none z-0" />

      {/* ── Seamless Organic Ribbon Wave Curves (Desktop) ── */}
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none z-0 hidden lg:block"
        preserveAspectRatio="none"
        viewBox="0 0 1440 900"
        fill="none"
      >
        {/* Deep Forest Green Upper-Right Curve */}
        <path
          d="M 940,0 C 910,240 960,420 1100,500 C 1220,560 1340,580 1440,590 L 1440,0 Z"
          fill="#0D4032"
        />
        {/* Warm Cream Bottom Curve (starts at x=760 to leave the croissant & coffee cup unobstructed) */}
        <path
          d="M 760,900 C 840,760 920,680 1060,610 C 1200,550 1320,530 1440,550 L 1440,900 Z"
          fill="#F6EFE4"
        />
      </svg>

      {/* Botanical Leaf Art Watermark in top-right */}
      <div className="absolute top-0 right-0 w-80 h-80 pointer-events-none z-0 hidden lg:block overflow-hidden">
        <BotanicalLeaves className="w-full h-full text-[#F6EFE4]/20" />
      </div>

      {/* ── Left Section (~68% width): Branding, Narrative & 4 Feature Cards ── */}
      <div className="relative z-10 w-full lg:w-[68%] min-h-[500px] lg:min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16">
        <div className="max-w-lg">
          {/* Top Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0D4032] text-amber-200 shadow-sm">
              <CoffeeCupLogo className="w-6 h-6 text-[#E5B574]" />
            </div>
            <div>
              <span className="font-display text-2xl font-bold tracking-tight text-[#17233A] block leading-tight">
                Café Admin
              </span>
              <span className="text-[9px] font-bold tracking-[0.25em] text-[#8C7A6B] block uppercase">
                OPERATIONS CONSOLE
              </span>
            </div>
          </div>

          {/* Gold Accent Line */}
          <div className="w-12 h-[2.5px] bg-[#C58A43] mt-4 mb-6 rounded-full" />

          {/* Main Headline */}
          <h1 className="font-display text-4xl xl:text-5xl font-bold tracking-tight text-[#17233A] leading-[1.12]">
            Manage Your <br />
            Café, <span className="italic font-normal text-[#C58A43]">Smarter</span>
          </h1>

          {/* Supporting Text */}
          <p className="mt-3.5 text-sm text-[#64748B] font-normal leading-relaxed max-w-md">
            Streamline orders, track inventory, manage menus, and grow your café with powerful tools — all in one place.
          </p>

          {/* 4 Feature Cards in One Horizontal Row */}
          <div className="grid grid-cols-4 gap-2.5 max-w-md mt-6">
            <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#F6EFE4] border border-[#EADBCA]/80 text-center shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-[#C58A43] mb-1.5 shadow-2xs">
                <UtensilsCrossed size={16} />
              </div>
              <span className="text-[11px] font-bold text-[#17233A] leading-tight">
                Manage<br />Orders
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#F6EFE4] border border-[#EADBCA]/80 text-center shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-[#C58A43] mb-1.5 shadow-2xs">
                <BarChart3 size={16} />
              </div>
              <span className="text-[11px] font-bold text-[#17233A] leading-tight">
                Track<br />Inventory
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#F6EFE4] border border-[#EADBCA]/80 text-center shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-[#C58A43] mb-1.5 shadow-2xs">
                <FileText size={16} />
              </div>
              <span className="text-[11px] font-bold text-[#17233A] leading-tight">
                Update<br />Menu
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#F6EFE4] border border-[#EADBCA]/80 text-center shadow-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-[#C58A43] mb-1.5 shadow-2xs">
                <Users size={16} />
              </div>
              <span className="text-[11px] font-bold text-[#17233A] leading-tight">
                Live<br />Sales
              </span>
            </div>
          </div>
        </div>

        {/* Bottom space ensuring the latte cup & croissant photography is unobstructed */}
        <div className="h-40 xl:h-52 pointer-events-none hidden lg:block" />
      </div>

      {/* ── Right Section (~32% width): Centered Login Card ── */}
      <div className="relative z-10 w-full lg:w-[32%] flex items-center justify-center p-4 sm:p-6 lg:p-8 my-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative w-full max-w-[410px] rounded-[28px] bg-white p-7 sm:p-8 shadow-2xl border border-slate-100/90"
        >
          {/* Coffee beans corner decoration */}
          <div className="absolute -bottom-3 -left-3 pointer-events-none z-20">
            <CoffeeBeansGraphic className="w-8 h-8 text-[#542B12]" />
          </div>

          {/* 1. Green outlined badge */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50/90 border border-emerald-300/80 px-3.5 py-1 text-[11px] font-semibold text-[#0D4032]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#12A37A] animate-pulse" />
              <span>Café Operations Console</span>
            </div>
          </div>

          {/* 2. Dark green square containing the coffee cup logo */}
          <div className="mx-auto mb-2.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0D4032] text-amber-200 shadow-sm">
            <CoffeeCupLogo className="w-7 h-7 text-[#E5B574]" />
          </div>

          {/* 3. Heading & 4. Subtitle */}
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#17233A] text-center">
            Café Admin
          </h2>
          <p className="mt-1 text-center text-xs text-[#64748B]">
            Sign in to manage orders, kitchen flow, and live sales
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
            {/* 5. Email address input */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#17233A] mb-1">
                EMAIL ADDRESS
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={loading || rateLimitCountdown > 0}
                  placeholder="owner@cafe.com"
                  className="w-full rounded-xl border border-[#DCE4EC] bg-white py-2.5 pl-9 pr-4 text-sm text-[#17233A] placeholder:text-[#94A3B8] focus:border-[#0D4032] focus:outline-none focus:ring-1 focus:ring-[#0D4032] shadow-2xs transition disabled:opacity-75"
                />
              </div>
            </div>

            {/* 6. Password input with visibility toggle */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#17233A] mb-1">
                PASSWORD
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading || rateLimitCountdown > 0}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#DCE4EC] bg-white py-2.5 pl-9 pr-10 text-sm text-[#17233A] placeholder:text-[#94A3B8] focus:border-[#0D4032] focus:outline-none focus:ring-1 focus:ring-[#0D4032] shadow-2xs transition disabled:opacity-75"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#17233A] transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* 7. Keep me signed in & 8. Forgot password */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  className="h-4 w-4 rounded border-[#DCE4EC] text-[#0D4032] focus:ring-[#0D4032] accent-[#0D4032]"
                />
                <span className="text-xs text-[#17233A] font-medium">Keep me signed in</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs font-semibold text-[#0D4032] hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Two-Factor Authentication Code (if required) */}
            {requiresTwoFactor && (
              <div>
                <label htmlFor="two-factor-code" className="block text-[10px] font-bold uppercase tracking-wider text-[#17233A] mb-1">
                  Two-Factor Code
                </label>
                <input
                  id="two-factor-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={twoFactorCode}
                  onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={loading || rateLimitCountdown > 0}
                  className="w-full rounded-xl border border-amber-300 bg-amber-50/40 py-2.5 text-sm text-center font-mono tracking-widest text-[#17233A] focus:border-[#0D4032] focus:outline-none focus:ring-1 focus:ring-[#0D4032]"
                  placeholder="000000"
                />
              </div>
            )}

            {/* Error Message Alert */}
            {error && (
              <div className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-xs font-semibold ${
                rateLimitCountdown > 0
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}>
                {rateLimitCountdown > 0 ? (
                  <Clock size={15} className="mt-0.5 shrink-0 text-amber-700 animate-spin" />
                ) : (
                  <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-600" />
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

            {/* 9. Full-width dark green button */}
            <button
              type="submit"
              disabled={isButtonDisabled}
              className="w-full rounded-xl bg-[#0D4032] hover:bg-[#082F25] active:bg-[#051F19] text-white py-3 px-4 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
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
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            {/* 10. Subtle divider with OR */}
            <div className="relative my-3 flex items-center justify-center">
              <div className="border-t border-[#E2E8F0] w-full" />
              <span className="absolute bg-white px-3 text-[10px] font-bold tracking-widest text-[#94A3B8] uppercase">
                OR
              </span>
            </div>

            {/* 11. & 12. Footer Navigation Links */}
            <div className="space-y-1.5 text-center text-xs">
              <div className="text-[#64748B]">
                Opening a new café?{' '}
                <Link to="/signup" className="font-bold text-[#0D4032] hover:underline">
                  Start 14-day free trial →
                </Link>
              </div>
              <div className="text-[#64748B]">
                Looking for customer ordering?{' '}
                <a
                  href="https://cafe-client-app.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#0D4032] hover:underline inline-flex items-center gap-1"
                >
                  <span>Live Menu →</span>
                </a>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
