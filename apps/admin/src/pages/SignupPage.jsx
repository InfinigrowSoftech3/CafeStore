import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, CheckCircle2, AlertCircle, Loader2, Store, Mail, Lock, Globe } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

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

  // Client-side quick slug check
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
      const { data } = await api.post('/platform/auth/signup', {
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
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50 font-body select-none overflow-hidden">
      {/* Subtle modern geometric background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-70 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative z-10 w-full max-w-lg rounded-none border border-slate-200 bg-white p-7 sm:p-9 shadow-xl"
      >
        <div className="mb-7 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>14-Day Free Trial</span>
          </div>

          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-none border border-slate-200 bg-[#0F3D2E] text-white shadow-2xs">
            <Sparkles size={26} />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {step === 'form' ? 'Launch Your Café' : 'Verify Your Email'}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 font-normal">
            {step === 'form'
              ? 'Complete onboarding to generate table QR codes and activate POS.'
              : `We sent a 6-digit confirmation code to ${email}`}
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-none border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-900">
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
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                  Café Name
                </label>
                <div className="relative">
                  <Store size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={cafeName}
                    onChange={handleNameChange}
                    placeholder="e.g. Velvet Roast Artisan Coffee"
                    className="w-full rounded-none border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 py-3 text-xs sm:text-sm text-slate-900 focus:border-[#0F3D2E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F3D2E] transition"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                  Subdomain Slug
                </label>
                <div className="relative">
                  <Globe size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={handleSlugChange}
                    placeholder="velvet-roast"
                    className={`w-full rounded-none border ${
                      slugIsReserved ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-slate-50/70'
                    } pl-10 pr-3.5 py-3 text-xs sm:text-sm text-slate-900 focus:border-[#0F3D2E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F3D2E] transition font-mono`}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">
                    Storefront: <span className="font-bold text-[#0F3D2E]">{slug ? `${slug}.cafe-client-app.vercel.app` : 'your-cafe.cafe-client-app.vercel.app'}</span>
                  </span>
                  {slugIsReserved && (
                    <span className="font-bold text-rose-600">Reserved word</span>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                  Owner Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@yourcafe.com"
                    className="w-full rounded-none border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 py-3 text-xs sm:text-sm text-slate-900 focus:border-[#0F3D2E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F3D2E] transition"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                  Password (min 8 characters)
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-none border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 py-3 text-xs sm:text-sm text-slate-900 focus:border-[#0F3D2E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F3D2E] transition"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || slugIsReserved}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-[#0F3D2E] hover:bg-[#165a44] py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-2xs hover:shadow-xs active:scale-98 transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Creating your account...
                    </>
                  ) : (
                    <>
                      Continue <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-3 text-xs text-slate-500 font-medium">
                Already have a café account?{' '}
                <Link to="/login" className="font-bold text-[#0F3D2E] hover:underline">
                  Sign in here
                </Link>
              </div>
            </motion.form>
          ) : (
            <motion.form
              key="step-verify"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleVerifySubmit}
              className="space-y-5"
            >
              <p className="text-center text-xs text-slate-500 font-medium">
                We sent a 6-digit confirmation code to <strong className="text-slate-800">{email}</strong>. Check your inbox and spam folder.
              </p>

              <div>
                <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-slate-600 text-center">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full text-center tracking-[0.5em] font-mono text-2xl font-bold rounded-none border border-slate-200 bg-slate-50/70 py-3.5 focus:border-[#0F3D2E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F3D2E] transition"
                  placeholder="000000"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#0F3D2E] hover:bg-[#165a44] py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-2xs hover:shadow-xs active:scale-98 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Provisioning your café...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Verify & Launch Café
                  </>
                )}
              </button>

              {resendSuccess && (
                <div className="rounded-none bg-emerald-50 border border-emerald-200 p-2.5 text-center text-xs font-bold text-emerald-800">
                  {resendSuccess}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="text-slate-500 hover:text-slate-800 font-semibold underline"
                >
                  ← Back to details
                </button>
                <button
                  type="button"
                  disabled={resendLoading}
                  onClick={handleResendCode}
                  className="font-bold text-[#0F3D2E] hover:underline disabled:opacity-50"
                >
                  {resendLoading ? 'Sending new code...' : 'Resend code'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
