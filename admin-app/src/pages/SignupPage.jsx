import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ArrowRight, CheckCircle2, AlertCircle, Loader2,
  Store, Mail, Lock, Globe, Eye, EyeOff, QrCode, UtensilsCrossed, Package, BarChart3
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

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

const RESERVED_SLUGS = new Set([
  'admin', 'administrator', 'api', 'app', 'auth', 'billing', 'brewhaus', 'cdn',
  'dashboard', 'dev', 'developer', 'docs', 'help', 'login', 'mail', 'master',
  'metrics', 'oauth', 'platform', 'portal', 'root', 'saas', 'settings', 'signin',
  'signup', 'staging', 'status', 'superadmin', 'support', 'sysadmin', 'system',
  'test', 'webhook', 'webhooks', 'www',
]);

export default function SignupPage() {
  const navigate = useNavigate();
  const { setAuthSession } = useAuth();

  const [step, setStep] = useState('form'); // 'form' | 'verify'
  const [cafeName, setCafeName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [slug, setSlug] = useState('');
  const [slugAutoModified, setSlugAutoModified] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle café name change and auto-generate slug unless manually edited
  const handleNameChange = (e) => {
    const name = e.target.value;
    setCafeName(name);
    if (!slugAutoModified) {
      const generated = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 28);
      setSlug(generated);
    }
  };

  const handleSlugChange = (e) => {
    setSlugAutoModified(true);
    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30));
  };

  const slugIsReserved = RESERVED_SLUGS.has(slug);

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!cafeName || !email || !password || !slug) {
      setError('Please fill out all fields.');
      return;
    }

    if (slugIsReserved) {
      setError(`"${slug}" is a reserved system URL. Please pick another URL slug.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/platform/auth/signup', {
        cafeName,
        email,
        password,
        slug,
      });

      setVerificationCode('');
      setStep('verify');
    } catch (err) {
      setError(err.message || 'Unable to register café. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!verificationCode) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/platform/auth/verify-email', {
        email,
        code: verificationCode,
      });

      setAuthSession(data.token, data.user);
      navigate('/setup-wizard', { replace: true });
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) return;
    setResendLoading(true);
    setResendSuccess('');
    setError('');

    try {
      const { data } = await api.post('/platform/auth/resend-code', { email });
      setResendSuccess(data.message || 'Verification code resent successfully.');
      setVerificationCode('');
    } catch (err) {
      setError(err.message || 'Unable to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

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
            Launch Your <br />
            Café, <span className="italic font-normal text-[#C58A43]">Smarter</span>
          </h1>

          {/* Supporting Paragraph (~19px, comfortable line spacing, muted slate-gray #64748B, max-w-[500px]) */}
          <p className="mt-4 text-[16px] sm:text-[18px] lg:text-[19px] text-[#64748B] font-normal leading-[1.4] max-w-[500px]">
            Complete onboarding to generate table QR codes and activate your café POS. Start managing orders, menus, and inventory in minutes.
          </p>

          {/* Four Compact Feature Groups in a Single Horizontal Row */}
          <div className="flex items-center gap-4 sm:gap-6 mt-8">
            {/* Feature 1: Generate QR Codes */}
            <div className="flex flex-col items-center">
              <div className="flex h-[56px] w-[56px] items-center justify-center rounded-xl bg-[#F9EBDD] text-[#B77932] shadow-xs">
                <QrCode size={22} />
              </div>
              <span className="text-[13px] sm:text-[14px] font-semibold text-[#111827] text-center mt-2 leading-tight">
                Generate<br />QR Codes
              </span>
            </div>

            {/* Feature 2: Manage Menus */}
            <div className="flex flex-col items-center">
              <div className="flex h-[56px] w-[56px] items-center justify-center rounded-xl bg-[#F9EBDD] text-[#B77932] shadow-xs">
                <UtensilsCrossed size={22} />
              </div>
              <span className="text-[13px] sm:text-[14px] font-semibold text-[#111827] text-center mt-2 leading-tight">
                Manage<br />Menus
              </span>
            </div>

            {/* Feature 3: Track Inventory */}
            <div className="flex flex-col items-center">
              <div className="flex h-[56px] w-[56px] items-center justify-center rounded-xl bg-[#F9EBDD] text-[#B77932] shadow-xs">
                <Package size={22} />
              </div>
              <span className="text-[13px] sm:text-[14px] font-semibold text-[#111827] text-center mt-2 leading-tight">
                Track<br />Inventory
              </span>
            </div>

            {/* Feature 4: Grow Your Sales */}
            <div className="flex flex-col items-center">
              <div className="flex h-[56px] w-[56px] items-center justify-center rounded-xl bg-[#F9EBDD] text-[#B77932] shadow-xs">
                <BarChart3 size={22} />
              </div>
              <span className="text-[13px] sm:text-[14px] font-semibold text-[#111827] text-center mt-2 leading-tight">
                Grow<br />Your Sales
              </span>
            </div>
          </div>
        </div>

        {/* Bottom spacer to keep the latte cup, saucer, beans, and croissant on board fully visible */}
        <div className="h-44 xl:h-56 pointer-events-none hidden lg:block" />
      </div>

      {/* ── Right Content Area: White Onboarding Card (~584px wide, ~795px tall) ── */}
      <div className="relative z-10 w-full lg:w-[32%] flex items-center justify-center p-4 sm:p-6 lg:p-8 lg:pr-[5%] my-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative w-full max-w-[584px] min-h-[760px] rounded-[20px] bg-white px-6 sm:px-[53px] py-9 shadow-2xl shadow-black/20 border border-slate-100 flex flex-col justify-between"
        >
          <div>
            {/* Top 14-Day Free Trial badge */}
            <div className="text-center mb-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50/90 border border-emerald-300/80 px-4 py-1.5 text-xs font-semibold text-[#0D4032]">
                <span className="h-2 w-2 rounded-full bg-[#12A37A] animate-pulse" />
                <span>14-Day Free Trial</span>
              </div>
            </div>

            {/* Dark green square (~64 x 64px) with sparkle icon */}
            <div className="mx-auto mb-3 flex h-[64px] w-[64px] items-center justify-center rounded-2xl bg-[#0D4032] text-amber-200 shadow-sm">
              <Sparkles className="w-8 h-8 text-amber-200" />
            </div>

            {/* Heading (Playfair Display, ~34px, bold, dark navy-black #111827) */}
            <h2 className="font-display text-2xl sm:text-[34px] font-bold tracking-tight text-[#111827] text-center leading-tight">
              {step === 'form' ? 'Launch Your Café' : 'Verify Your Email'}
            </h2>

            {/* Subtitle (~15-16px, muted blue-gray #64748B) */}
            <p className="mt-1 text-center text-[15px] sm:text-[16px] text-[#64748B] max-w-md mx-auto">
              {step === 'form'
                ? 'Complete onboarding to generate table QR codes and activate POS.'
                : `We sent a 6-digit confirmation code to ${email}`}
            </p>

            {/* Error Alert */}
            {error && (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-900">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <AnimatePresence mode="wait">
              {step === 'form' ? (
                <motion.form
                  key="step-form"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onSubmit={handleSignupSubmit}
                  className="mt-5 space-y-3.5"
                >
                  {/* Field 1: Café Name (51px height, rounded-[7px], #DCE4EC border) */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#111827] mb-1">
                      CAFÉ NAME
                    </label>
                    <div className="relative h-[51px]">
                      <Store size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                      <input
                        type="text"
                        required
                        value={cafeName}
                        onChange={handleNameChange}
                        placeholder="e.g. Velvet Roast Artisan Coffee"
                        className="w-full h-full rounded-[7px] border border-[#DCE4EC] bg-white pl-11 pr-4 text-sm text-[#111827] placeholder:text-[#94A3B8] focus:border-[#0D4032] focus:outline-none focus:ring-1 focus:ring-[#0D4032] shadow-2xs transition"
                      />
                    </div>
                  </div>

                  {/* Field 2: Subdomain Slug (51px height, globe icon) */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#111827] mb-1">
                      SUBDOMAIN SLUG
                    </label>
                    <div className="relative h-[51px]">
                      <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                      <input
                        type="text"
                        required
                        value={slug}
                        onChange={handleSlugChange}
                        placeholder="velvet-roast"
                        className={`w-full h-full rounded-[7px] border ${
                          slugIsReserved ? 'border-rose-300 bg-rose-50/50' : 'border-[#DCE4EC] bg-white'
                        } pl-11 pr-4 text-sm text-[#111827] placeholder:text-[#94A3B8] focus:border-[#0D4032] focus:outline-none focus:ring-1 focus:ring-[#0D4032] shadow-2xs transition font-mono`}
                      />
                    </div>
                    {/* Live Storefront Preview */}
                    <div className="mt-1.5 flex items-center justify-between text-[12px] sm:text-[13px]">
                      <span className="text-[#64748B]">
                        Storefront: <span className="font-bold text-[#0D4032]">{slug ? `${slug}.cafe-client-app.vercel.app` : 'your-cafe.cafe-client-app.vercel.app'}</span>
                      </span>
                      {slugIsReserved && (
                        <span className="font-bold text-rose-600 text-xs">Reserved word</span>
                      )}
                    </div>
                  </div>

                  {/* Field 3: Owner Email (51px height, mail icon) */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#111827] mb-1">
                      OWNER EMAIL
                    </label>
                    <div className="relative h-[51px]">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="owner@yourcafe.com"
                        className="w-full h-full rounded-[7px] border border-[#DCE4EC] bg-white pl-11 pr-4 text-sm text-[#111827] placeholder:text-[#94A3B8] focus:border-[#0D4032] focus:outline-none focus:ring-1 focus:ring-[#0D4032] shadow-2xs transition"
                      />
                    </div>
                  </div>

                  {/* Field 4: Password (51px height, lock icon, visibility toggle) */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#111827] mb-1">
                      PASSWORD (MIN 8 CHARACTERS)
                    </label>
                    <div className="relative h-[51px]">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-full rounded-[7px] border border-[#DCE4EC] bg-white pl-11 pr-11 text-sm text-[#111827] placeholder:text-[#94A3B8] focus:border-[#0D4032] focus:outline-none focus:ring-1 focus:ring-[#0D4032] shadow-2xs transition"
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

                  {/* Continue Button (51px height, full-width, #0D4032, rounded-[7px]) */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading || slugIsReserved}
                      className="w-full h-[51px] rounded-[7px] bg-[#0D4032] hover:bg-[#083D2E] active:bg-[#05291E] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Creating your account...</span>
                        </>
                      ) : (
                        <>
                          <span>CONTINUE</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Divider line */}
                  <div className="pt-2">
                    <div className="border-t border-[#E2E8F0] w-full" />
                  </div>

                  {/* Footer link */}
                  <div className="text-center pt-2 text-[13px] text-[#64748B]">
                    Already have a café account?{' '}
                    <Link to="/login" className="font-bold text-[#0D4032] hover:underline">
                      Sign in here
                    </Link>
                  </div>
                </motion.form>
              ) : (
                /* ── Step 2: 6-Digit Email Verification Flow ── */
                <motion.form
                  key="step-verify"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onSubmit={handleVerifySubmit}
                  className="mt-6 space-y-5"
                >
                  <p className="text-center text-xs text-[#64748B] font-medium">
                    We sent a 6-digit confirmation code to <strong className="text-[#111827]">{email}</strong>. Check your inbox and spam folder.
                  </p>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#111827] text-center">
                      Enter 6-Digit Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full text-center tracking-[0.5em] font-mono text-2xl font-bold rounded-[8px] border border-[#DCE4EC] bg-white py-3.5 focus:border-[#0D4032] focus:outline-none focus:ring-1 focus:ring-[#0D4032] transition"
                      placeholder="000000"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[51px] rounded-[7px] bg-[#0D4032] hover:bg-[#083D2E] active:bg-[#05291E] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Provisioning your café...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Verify & Launch Café</span>
                      </>
                    )}
                  </button>

                  {resendSuccess && (
                    <div className="rounded-[7px] bg-emerald-50 border border-emerald-200 p-2.5 text-center text-xs font-bold text-emerald-800">
                      {resendSuccess}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setStep('form')}
                      className="text-[#64748B] hover:text-[#111827] font-semibold underline cursor-pointer"
                    >
                      ← Back to details
                    </button>
                    <button
                      type="button"
                      disabled={resendLoading}
                      onClick={handleResendCode}
                      className="font-bold text-[#0D4032] hover:underline disabled:opacity-50 cursor-pointer"
                    >
                      {resendLoading ? 'Sending new code...' : 'Resend code'}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
