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
    <svg className={className} fill="none" viewBox="0 0 280 280" stroke="currentColor">
      <path d="M260 20 C210 60 150 130 110 220" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M170 80 C200 70 240 75 255 95" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M140 120 C180 120 220 140 240 165" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M125 160 C155 175 190 205 210 235" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M280 80 C230 110 170 190 140 280" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M205 120 C235 125 260 150 265 170" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M170 160 C205 180 230 215 235 250" strokeWidth="1.4" strokeLinecap="round" />
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
    setError('Password reset instructions will be sent to your registered administrator email.');
  };

  const isButtonDisabled = loading || rateLimitCountdown > 0;

  return (
    <div className="relative min-h-screen w-full flex flex-col lg:flex-row bg-[#0D4032] font-body text-[#111827] select-none overflow-x-hidden">
      {/* ── Background Photography Layer (Left ~68%) ── */}
      <div className="absolute inset-0 lg:right-[32%] pointer-events-none z-0">
        <img
          src="/images/cafe-hero-clean.jpg"
          alt="Café Interior"
          className="h-full w-full object-cover object-left"
        />
      </div>

      {/* ── Right Section Background Fill (#0D4032) ── */}
      <div className="absolute inset-y-0 right-0 w-full lg:w-[32%] bg-[#0D4032] pointer-events-none z-0" />

      {/* ── Seamless Organic Curves (Exact 1650 x 927 viewport baseline) ── */}
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none z-0 hidden lg:block"
        preserveAspectRatio="none"
        viewBox="0 0 1650 927"
        fill="none"
      >
        {/* Deep Forest Green Upper-Right Boundary Curve */}
        <path
          d="M 1120,0 C 1070,260 1130,430 1270,510 C 1390,570 1520,590 1650,600 L 1650,0 Z"
          fill="#0D4032"
        />
        {/* Warm Cream Decorative Curve along the lower portion */}
        <path
          d="M 900,927 C 1000,790 1110,720 1260,650 C 1410,600 1540,580 1650,600 L 1650,927 Z"
          fill="#F6EFE4"
        />
      </svg>

      {/* Botanical Leaf Art Watermark in top-right corner */}
      <div className="absolute top-0 right-0 w-96 h-96 pointer-events-none z-0 hidden lg:block overflow-hidden">
        <BotanicalLeaves className="w-full h-full text-[#F6EFE4]/20" />
      </div>

      {/* ── Left Content Area (~68% width): Branding, Headline, Description, 4 Feature Groups ── */}
      <div className="relative z-10 w-full lg:w-[68%] min-h-[540px] lg:min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:pl-[7%] lg:pt-[8%] lg:pr-12">
        <div className="max-w-[580px]">
          {/* Top Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0D4032] text-amber-200 shadow-xs">
              <CoffeeCupLogo className="w-6 h-6 text-[#E5B574]" />
            </div>
            <div>
              <span className="font-display text-[28px] font-bold tracking-tight text-[#111827] block leading-none">
                Café Admin
              </span>
              <span className="text-[10px] font-bold tracking-[0.28em] text-[#8C7A6B] block uppercase mt-1">
                OPERATIONS CONSOLE
              </span>
            </div>
          </div>

          {/* Thin Gold Horizontal Accent Line */}
          <div className="w-12 h-[2.5px] bg-[#C58A43] mt-5 mb-7 rounded-full" />

          {/* Main Headline (Playfair Display, ~68px on desktop, leading-[1.02], #111827) */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-[68px] font-bold tracking-tight text-[#111827] leading-[1.02]">
            Manage Your <br />
            Café, <span className="italic font-normal text-[#C58A43]">Smarter</span>
          </h1>

          {/* Supporting Paragraph (~19px, comfortable line spacing, muted slate-gray #64748B, wraps ~3 lines) */}
          <p className="mt-4 text-[16px] sm:text-[18px] lg:text-[19px] text-[#64748B] font-normal leading-[1.4] max-w-[540px]">
            Streamline orders, track inventory, manage menus, and grow your café with powerful tools — all in one place.
          </p>

          {/* Four Compact Feature Groups in a Single Horizontal Row */}
          <div className="flex items-center gap-4 sm:gap-6 mt-8">
            {/* Feature 1: Manage Orders */}
            <div className="flex flex-col items-center">
              <div className="flex h-[54px] w-[54px] items-center justify-center rounded-xl bg-[#F9EBDD] text-[#B77932] shadow-xs">
                <UtensilsCrossed size={22} />
              </div>
              <span className="text-[13px] sm:text-[14px] font-semibold text-[#111827] text-center mt-2 leading-tight">
                Manage<br />Orders
              </span>
            </div>

            {/* Feature 2: Track Inventory */}
            <div className="flex flex-col items-center">
              <div className="flex h-[54px] w-[54px] items-center justify-center rounded-xl bg-[#F9EBDD] text-[#B77932] shadow-xs">
                <BarChart3 size={22} />
              </div>
              <span className="text-[13px] sm:text-[14px] font-semibold text-[#111827] text-center mt-2 leading-tight">
                Track<br />Inventory
              </span>
            </div>

            {/* Feature 3: Update Menu */}
            <div className="flex flex-col items-center">
              <div className="flex h-[54px] w-[54px] items-center justify-center rounded-xl bg-[#F9EBDD] text-[#B77932] shadow-xs">
                <FileText size={22} />
              </div>
              <span className="text-[13px] sm:text-[14px] font-semibold text-[#111827] text-center mt-2 leading-tight">
                Update<br />Menu
              </span>
            </div>

            {/* Feature 4: Live Sales */}
            <div className="flex flex-col items-center">
              <div className="flex h-[54px] w-[54px] items-center justify-center rounded-xl bg-[#F9EBDD] text-[#B77932] shadow-xs">
                <Users size={22} />
              </div>
              <span className="text-[13px] sm:text-[14px] font-semibold text-[#111827] text-center mt-2 leading-tight">
                Live<br />Sales
              </span>
            </div>
          </div>
        </div>

        {/* Bottom spacer so the emerald latte cup, saucer, beans, and croissant on board stay fully visible */}
        <div className="h-44 xl:h-56 pointer-events-none hidden lg:block" />
      </div>

      {/* ── Right Content Area: Centered Login Card ── */}
      <div className="relative z-10 w-full lg:w-[32%] flex items-center justify-center p-4 sm:p-6 lg:p-8 lg:pr-[5%] my-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative w-full max-w-[570px] min-h-[720px] rounded-[22px] bg-white px-6 sm:px-[52px] py-10 shadow-2xl shadow-black/20 border border-slate-100 flex flex-col justify-between"
        >
          {/* Coffee beans motif near bottom-left edge of the card */}
          <div className="absolute -bottom-3 -left-3 pointer-events-none z-20">
            <CoffeeBeansGraphic className="w-9 h-9 text-[#542B12]" />
          </div>

          <div>
            {/* 1. Green outlined pill badge */}
            <div className="text-center mb-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50/90 border border-emerald-300/80 px-4 py-1.5 text-xs font-semibold text-[#0D4032]">
                <span className="h-2 w-2 rounded-full bg-[#12A37A] animate-pulse" />
                <span>Café Operations Console</span>
              </div>
            </div>

            {/* 2. Dark green square containing coffee cup logo (~80 x 80px) */}
            <div className="mx-auto mb-3 flex h-[80px] w-[80px] items-center justify-center rounded-2xl bg-[#0D4032] text-amber-200 shadow-sm">
              <CoffeeCupLogo className="w-10 h-10 text-[#E5B574]" />
            </div>

            {/* 3. Heading (Playfair Display, ~44px, bold, dark navy-black #111827) */}
            <h2 className="font-display text-3xl sm:text-[44px] font-bold tracking-tight text-[#111827] text-center leading-tight">
              Café Admin
            </h2>

            {/* 4. Subtitle (~14-15px, muted blue-gray #64748B) */}
            <p className="mt-1 text-center text-[14px] sm:text-[15px] text-[#64748B]">
              Sign in to manage orders, kitchen flow, and live sales
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* 5. Email address field (52px height, rounded-lg, #DCE4EC border) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#111827] mb-1.5">
                  EMAIL ADDRESS
                </label>
                <div className="relative h-[52px]">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={loading || rateLimitCountdown > 0}
                    placeholder="owner@cafe.com"
                    className="w-full h-full rounded-[8px] border border-[#DCE4EC] bg-white pl-11 pr-4 text-sm text-[#111827] placeholder:text-[#94A3B8] focus:border-[#0D4032] focus:outline-none focus:ring-1 focus:ring-[#0D4032] shadow-2xs transition disabled:opacity-75"
                  />
                </div>
              </div>

              {/* 6. Password field (52px height, lock icon, visibility toggle) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#111827] mb-1.5">
                  PASSWORD
                </label>
                <div className="relative h-[52px]">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={loading || rateLimitCountdown > 0}
                    placeholder="••••••••"
                    className="w-full h-full rounded-[8px] border border-[#DCE4EC] bg-white pl-11 pr-11 text-sm text-[#111827] placeholder:text-[#94A3B8] focus:border-[#0D4032] focus:outline-none focus:ring-1 focus:ring-[#0D4032] shadow-2xs transition disabled:opacity-75"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#111827] transition cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* 7. Remember-me row immediately below password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                    className="h-4 w-4 rounded border-[#DCE4EC] text-[#0D4032] focus:ring-[#0D4032] accent-[#0D4032] cursor-pointer"
                  />
                  <span className="text-xs text-[#111827] font-medium">Keep me signed in</span>
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
                  <label htmlFor="two-factor-code" className="block text-[11px] font-bold uppercase tracking-wider text-[#111827] mb-1.5">
                    Two-Factor Code
                  </label>
                  <input
                    id="two-factor-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={twoFactorCode}
                    onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={loading || rateLimitCountdown > 0}
                    className="w-full h-[52px] rounded-[8px] border border-amber-300 bg-amber-50/40 text-sm text-center font-mono tracking-widest text-[#111827] focus:border-[#0D4032] focus:outline-none focus:ring-1 focus:ring-[#0D4032]"
                    placeholder="000000"
                  />
                </div>
              )}

              {/* Error Message Alert */}
              {error && (
                <div className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs font-semibold ${
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

              {/* 8. Full-width dark forest-green button (52px height, rounded-[8px], uppercase) */}
              <button
                type="submit"
                disabled={isButtonDisabled}
                className="w-full h-[52px] rounded-[8px] bg-[#0D4032] hover:bg-[#083D2E] active:bg-[#05291E] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-3"
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
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* 9. Subtle divider with OR */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="border-t border-[#E2E8F0] w-full" />
                <span className="absolute bg-white px-3 text-[11px] font-bold tracking-widest text-[#94A3B8] uppercase">
                  OR
                </span>
              </div>

              {/* 10. Footer links */}
              <div className="space-y-1.5 text-center text-[13px] pt-1">
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
          </div>
        </motion.div>
      </div>
    </div>
  );
}
