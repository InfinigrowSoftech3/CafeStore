import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowDown,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Coffee,
  Compass,
} from 'lucide-react';
import api from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import usePageMeta from '../../hooks/usePageMeta';

function formatInternationalTel(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.length === 10) return `+91${digits}`;
  return digits.startsWith('91') && digits.length === 12 ? `+${digits}` : `+${digits}`;
}

const contactDetails = (tenant) => {
  const hours = Object.entries(tenant.openingHours || {}).map(([day, value]) => `${day}: ${value}`).join(' · ');
  return [
  {
    id: 'address',
    label: 'Visit Us',
    value: tenant.address || 'Address not provided',
    subvalue: tenant.address ? 'Get directions to this address' : 'Add your address in café settings',
    icon: MapPin,
    action: {
      type: 'link',
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenant.address || 'Cafe')}`,
      text: 'Get Directions',
      external: true,
    },
  },
  {
    id: 'phone',
    label: 'Call Us',
    value: tenant.contactPhone || 'Phone not provided',
    subvalue: 'Available during café hours',
    icon: Phone,
    action: {
      type: 'tel',
      href: tenant.contactPhone ? `tel:${formatInternationalTel(tenant.contactPhone)}` : '',
      text: 'Call Now',
    },
  },
  {
    id: 'email',
    label: 'Email Us',
    value: tenant.contactEmail || 'Email not provided',
    subvalue: 'For catering, events & inquiries',
    icon: Mail,
    action: {
      type: 'mailto',
      href: tenant.contactEmail ? `mailto:${tenant.contactEmail}` : '',
      text: 'Send Email',
    },
  },
  {
    id: 'hours',
    label: 'Opening Hours',
    value: hours || 'Opening hours not provided',
    subvalue: '',
    icon: Clock,
    action: {
      type: 'copy',
      copyText: hours,
      text: 'Copy Hours',
    },
  },
  ];
};

const reveal = {
  initial: { opacity: 0, y: 24, filter: 'blur(8px)' },
  whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
};

function SectionEyebrow({ children, light = false }) {
  return (
    <p
      className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${
        light ? 'text-[#F3E9DC]' : 'text-[#7A3316]'
      }`}
    >
      {children}
    </p>
  );
}

export default function ContactPage() {
  const tenant = useTenant();
  usePageMeta(
    'Contact Us & Café Location Directions',
    'Reach out to our team for reservations, event catering, menu inquiries, or find easy map directions to our artisanal café.'
  );
  const contactSectionRef = useRef(null);
  const [copiedId, setCopiedId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    subject: '',
    message: '',
    honeypot: '', // anti-spam bot trap
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const scrollToContact = () => {
    contactSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCopy = (text, id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const setHeroDepth = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5).toFixed(2);
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5).toFixed(2);
    event.currentTarget.style.setProperty('--contact-x', x);
    event.currentTarget.style.setProperty('--contact-y', y);
  };

  const validateField = (name, value) => {
    let error = '';
    const trimmed = String(value || '').trim();

    if (name === 'name') {
      if (!trimmed) {
        error = 'Please enter your name.';
      } else if (trimmed.length < 2) {
        error = 'Name must be at least 2 characters.';
      } else if (trimmed.length > 80) {
        error = 'Name must be 80 characters or less.';
      }
    }

    if (name === 'contact') {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phonePattern = /^[0-9+()\-\s]{7,20}$/;
      if (!trimmed) {
        error = 'Please enter your email or phone number.';
      } else if (!emailPattern.test(trimmed) && !phonePattern.test(trimmed)) {
        error = 'Please enter a valid email address or phone number.';
      }
    }

    if (name === 'subject') {
      if (trimmed.length > 140) {
        error = 'Subject must be 140 characters or less.';
      }
    }

    if (name === 'message') {
      if (!trimmed) {
        error = 'Please enter your message.';
      } else if (trimmed.length < 8) {
        error = 'Message must be at least 8 characters.';
      } else if (trimmed.length > 2000) {
        error = 'Message must be 2,000 characters or less.';
      }
    }

    return error;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setServerError('');

    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name !== 'honeypot') {
      const error = validateField(name, value);
      if (error) {
        setFormErrors((prev) => ({ ...prev, [name]: error }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    // Spam honeypot test
    if (formData.honeypot) {
      setIsSuccess(true);
      return;
    }

    // Validate all fields
    const errors = {};
    const nameErr = validateField('name', formData.name);
    const contactErr = validateField('contact', formData.contact);
    const subjectErr = validateField('subject', formData.subject);
    const messageErr = validateField('message', formData.message);

    if (nameErr) errors.name = nameErr;
    if (contactErr) errors.contact = contactErr;
    if (subjectErr) errors.subject = subjectErr;
    if (messageErr) errors.message = messageErr;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstKey = Object.keys(errors)[0];
      const element = document.getElementById(`field-${firstKey}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('/contact', {
        name: formData.name.trim(),
        contact: formData.contact.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      });

      setIsSuccess(true);
      toast.success(`Your message has been sent to ${tenant.name}.`);
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.message ||
        'Unable to send your message right now. Please try again shortly.';
      setServerError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setFormData({
      name: '',
      contact: '',
      subject: '',
      message: '',
      honeypot: '',
    });
    setFormErrors({});
    setServerError('');
    setIsSuccess(false);
  };

  return (
    <main className="contact-page min-h-[100dvh] bg-[#FBF6EF] text-[#2B1810]">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION WITH CINEMATIC VIDEO & 3D FLOATING CUP */}
      {/* ========================================================================= */}
      <section
        onMouseMove={setHeroDepth}
        onMouseLeave={(event) => {
          event.currentTarget.style.setProperty('--contact-x', 0);
          event.currentTarget.style.setProperty('--contact-y', 0);
        }}
        className="contact-hero relative isolate min-h-[720px] overflow-hidden bg-[#7A3316] text-white"
      >
        {/* Background Backdrop */}
        {tenant.slug === 'brewhaus' ? (
          <>
            <img
              src="/images/about/brewhaus-cinematic-hero.webp"
              alt={`Barista preparing handcrafted coffee at ${tenant.name}`}
              className="absolute inset-0 z-0 h-full w-full object-cover"
            />
            <video
              className="absolute inset-0 z-0 h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/images/about/brewhaus-cinematic-hero.webp"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
              aria-hidden="true"
            >
              <source src="/BrewHaus.mp4" type="video/mp4" />
            </video>
          </>
        ) : tenant.heroImageUrl ? (
          <img
            src={tenant.heroImageUrl}
            alt={`Atmosphere at ${tenant.name}`}
            className="absolute inset-0 z-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#7A3316] via-[#5E2610] to-[#0A261D]" />
        )}

        {/* Ambient Gradient Overlays for Luxury Contrast */}
        <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(15,61,46,0.96)_0%,rgba(15,61,46,0.80)_48%,rgba(15,61,46,0.40)_100%)]" />
        <div className="absolute inset-0 z-10 bg-[linear-gradient(0deg,rgba(15,61,46,0.88)_0%,transparent_50%)]" />

        {/* Hero Content */}
        <div className="relative z-20 mx-auto flex min-h-[720px] max-w-7xl items-center px-4 pb-20 pt-28">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            className="w-full min-w-0 max-w-2xl"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#F3E9DC]">
              Get in touch
            </p>
            <p className="mt-4 font-display text-3xl font-bold tracking-[0.16em] text-white">
              {tenant.name.toUpperCase()}
            </p>
            <h1 className="mt-4 max-w-xl font-display text-5xl font-semibold leading-[0.94] text-white">
              We’d love to hear from you.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/80">
              Whether you’re planning a casual meetup, asking about catering, or just want to say
              hello, our team is ready to welcome and assist you.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={scrollToContact}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#FFFDF9] px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#2B1810] shadow-sm transition-all duration-300 hover:bg-[#F3E9DC] active:scale-95 focus:outline-none focus:ring-1 focus:ring-white"
              >
                Reach out to us <ArrowDown size={15} />
              </button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenant.address || 'Cafe')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md transition-all hover:bg-white/20 focus:outline-none focus:ring-1 focus:ring-white"
              >
                <MapPin size={14} className="text-[#F3E9DC]" />
                <span>{tenant.address ? 'Visit Our Café' : 'View Location'}</span>
              </a>
            </div>
          </motion.div>
        </div>

        {/* 3D Floating Ceramic Cup with Steam Effect */}
        <div
          className="contact-hero-cup pointer-events-none absolute bottom-6 right-6 z-20 hidden w-64"
          aria-hidden="true"
        >
          {/* Subtle Ambient Steam Particles */}
          <div className="relative mb-[-12px] flex justify-center gap-3">
            <span className="steam-particle-1 inline-block h-6 w-2 rounded-full bg-cream/35 blur-[2px]" />
            <span className="steam-particle-2 inline-block h-8 w-2.5 rounded-full bg-cream/45 blur-[2.5px]" />
            <span className="steam-particle-3 inline-block h-5 w-2 rounded-full bg-cream/30 blur-[2px]" />
          </div>

          <div className="rounded-t-[9rem] border border-white/25 bg-cream/10 p-2.5 shadow-[0_30px_60px_rgba(0,0,0,0.35)] backdrop-blur-md">
            <img
              src={tenant.heroImageUrl || (tenant.slug === 'brewhaus' ? '/images/about/brewhaus-story-cup.webp' : '/images/coffee-placeholder.svg')}
              alt={`Handcrafted coffee at ${tenant.name}`}
              className="h-[22rem] w-full rounded-t-[8.3rem] object-cover object-bottom"
            />
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-cream/70">
            <Sparkles size={12} className="text-brew-300" />
            <span>Crafted with precision</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. CONTACT INFORMATION EDITORIAL CARDS */}
      {/* ========================================================================= */}
      <section ref={contactSectionRef} className="scroll-mt-8 px-4 py-20 bg-[#FBF6EF]">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <SectionEyebrow>Direct channels</SectionEyebrow>
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1] text-[#2B1810]">
              Every way to connect.
            </h2>
            <p className="mt-5 text-base leading-7 text-stone-600">
              Have a question about our specialty brews, dietary options, or private table
              reservations? Reach out directly through any of our channels.
            </p>
          </div>

          {/* 3D Depth Elevation Cards */}
          <div className="mt-14 grid gap-6">
            {contactDetails(tenant).map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.id}
                  {...reveal}
                  transition={{ ...reveal.transition, delay: index * 0.08 }}
                  className="group relative flex flex-col justify-between rounded-2xl border border-[#EFE4D6] bg-[#FFFDF9] p-7 shadow-2xs transition-all duration-300 hover:border-stone-400"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3E9DC] text-[#2B1810] border border-[#EFE4D6] transition-colors duration-300 group-hover:bg-[#7A3316] group-hover:text-white">
                        <Icon size={20} />
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
                        0{index + 1}
                      </span>
                    </div>

                    <h3 className="mt-6 font-display text-2xl font-bold text-[#2B1810]">
                      {item.label}
                    </h3>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-[#2B1810]">
                      {item.value}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">{item.subvalue}</p>
                  </div>

                  <div className="mt-8 border-t border-[#EFE4D6] pt-5">
                    {item.action.type === 'copy' ? (
                      <button
                        type="button"
                        onClick={() => handleCopy(item.action.copyText, item.id)}
                        className="inline-flex min-h-[44px] items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#7A3316] transition hover:text-[#5E2610] focus:outline-none focus:ring-2 focus:ring-[#7A3316]/20 rounded-lg"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check size={14} className="text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>{item.action.text}</span>
                          </>
                        )}
                      </button>
                    ) : item.action.external ? (
                      <a
                        href={item.action.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-[44px] items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#7A3316] transition hover:text-[#5E2610] focus:outline-none focus:ring-2 focus:ring-[#7A3316]/20 rounded-lg"
                      >
                        <span>{item.action.text}</span>
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <a
                        href={item.action.href}
                        className="inline-flex min-h-[44px] items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#7A3316] transition hover:text-[#5E2610] focus:outline-none focus:ring-2 focus:ring-[#7A3316]/20 rounded-lg"
                      >
                        <span>{item.action.text}</span>
                        <ArrowRight size={14} />
                      </a>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CONTACT FORM & EDITORIAL DETAILS */}
      {/* ========================================================================= */}
      <section className="border-t border-[#EFE4D6] bg-[#FBF6EF] px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12">
            {/* Left Context Column */}
            <motion.div {...reveal} className="flex flex-col justify-between">
              <div>
                <SectionEyebrow>Write to {tenant.name}</SectionEyebrow>
                <h2 className="mt-4 font-display text-4xl font-semibold leading-[1] text-[#2B1810]">
                  Send us a direct message.
                </h2>
                <p className="mt-6 text-base leading-8 text-stone-600">
                  Whether you have feedback about your visit, want to partner with us, or are
                  inquiring about catering for special events, we will respond promptly.
                </p>

                <div className="mt-10 space-y-5">
                  <div className="rounded-2xl border border-[#EFE4D6] bg-[#FBF6EF] p-5 shadow-2xs">
                    <div className="flex items-center gap-3 text-[#2B1810]">
                      <Clock size={18} className="text-[#7A3316]" />
                      <span className="text-xs font-bold uppercase tracking-[0.16em]">
                        Response Time
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-stone-600">
                      We usually respond within 24 hours during standard café operating days.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#EFE4D6] bg-[#FBF6EF] p-5 shadow-2xs">
                    <div className="flex items-center gap-3 text-[#2B1810]">
                      <Coffee size={18} className="text-[#7A3316]" />
                      <span className="text-xs font-bold uppercase tracking-[0.16em]">
                        Large Gatherings & Events
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-stone-600">
                      Looking to book tables for groups or private celebrations? Mention the date and
                      estimated party size in the subject or message.
                    </p>
                  </div>
                </div>
              </div>

              {/* Direct Quote */}
              <div className="mt-10 border-l-2 border-[#7A3316] pl-5">
                <p className="font-display text-2xl font-medium italic text-[#2B1810]">
                  “A thoughtful cup, an easy meal, and conversations that need a little more room.”
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7A3316]">
                  {tenant.name} Hospitality
                </p>
              </div>
            </motion.div>

            {/* Right Contact Form / Success Container */}
            <motion.div
              {...reveal}
              className="relative overflow-hidden rounded-3xl border border-[#EFE4D6] bg-[#FFFDF9] p-7 shadow-2xs"
            >
              <AnimatePresence mode="wait">
                {!isSuccess ? (
                  <motion.form
                    key="contact-form"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4 }}
                    onSubmit={handleSubmit}
                    noValidate
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="font-display text-3xl font-semibold text-[#2B1810]">
                        Leave a message
                      </h3>
                      <p className="mt-1 text-xs text-stone-500">
                        Fields marked with <span className="text-red-500">*</span> are required.
                      </p>
                    </div>

                    {serverError && (
                      <div
                        role="alert"
                        aria-live="assertive"
                        className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800"
                      >
                        {serverError}
                      </div>
                    )}

                    {/* Anti-spam honeypot (hidden from real users) */}
                    <div className="hidden" aria-hidden="true">
                      <label htmlFor="field-honeypot">Leave blank</label>
                      <input
                        id="field-honeypot"
                        type="text"
                        name="honeypot"
                        tabIndex={-1}
                        autoComplete="off"
                        value={formData.honeypot}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Full Name */}
                    <div>
                      <label
                        htmlFor="field-name"
                        className="block text-xs font-bold uppercase tracking-[0.16em] text-stone-700"
                      >
                        Your Name <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-2">
                        <input
                          id="field-name"
                          name="name"
                          type="text"
                          required
                          maxLength={80}
                          placeholder="e.g. Dhruvil Sharma"
                          value={formData.name}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          className={`w-full rounded-full border bg-[#FFFDF9] px-5 py-3 text-sm font-medium text-[#2B1810] placeholder:text-stone-400 focus:outline-none focus:ring-1 transition-all duration-200 ${
                            formErrors.name
                              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                              : 'border-[#EFE4D6] focus:border-stone-900 focus:ring-[#7A3316]'
                          }`}
                        />
                      </div>
                      {formErrors.name && (
                        <p className="mt-1.5 text-xs font-medium text-red-600" role="alert" aria-live="polite">
                          {formErrors.name}
                        </p>
                      )}
                    </div>

                    {/* Email or Phone */}
                    <div>
                      <label
                        htmlFor="field-contact"
                        className="block text-xs font-bold uppercase tracking-[0.16em] text-stone-700"
                      >
                        Email or Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-2">
                        <input
                          id="field-contact"
                          name="contact"
                          type="text"
                          required
                          maxLength={160}
                          placeholder="you@domain.com or +91 98765 43210"
                          value={formData.contact}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          className={`w-full rounded-full border bg-[#FFFDF9] px-5 py-3 text-sm font-medium text-[#2B1810] placeholder:text-stone-400 focus:outline-none focus:ring-1 transition-all duration-200 ${
                            formErrors.contact
                              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                              : 'border-[#EFE4D6] focus:border-stone-900 focus:ring-[#7A3316]'
                          }`}
                        />
                      </div>
                      {formErrors.contact && (
                        <p className="mt-1.5 text-xs font-medium text-red-600" role="alert" aria-live="polite">
                          {formErrors.contact}
                        </p>
                      )}
                    </div>

                    {/* Subject */}
                    <div>
                      <label
                        htmlFor="field-subject"
                        className="block text-xs font-bold uppercase tracking-[0.16em] text-stone-700"
                      >
                        Subject <span className="text-xs font-normal text-stone-400">(Optional)</span>
                      </label>
                      <div className="mt-2">
                        <input
                          id="field-subject"
                          name="subject"
                          type="text"
                          maxLength={140}
                          placeholder="e.g. Table reservation / Coffee inquiry"
                          value={formData.subject}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          className={`w-full rounded-full border bg-[#FFFDF9] px-5 py-3 text-sm font-medium text-[#2B1810] placeholder:text-stone-400 focus:outline-none focus:ring-1 transition-all duration-200 ${
                            formErrors.subject
                              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                              : 'border-[#EFE4D6] focus:border-stone-900 focus:ring-[#7A3316]'
                          }`}
                        />
                      </div>
                      {formErrors.subject && (
                        <p className="mt-1.5 text-xs font-medium text-red-600" role="alert" aria-live="polite">
                          {formErrors.subject}
                        </p>
                      )}
                    </div>

                    {/* Message */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="field-message"
                          className="block text-xs font-bold uppercase tracking-[0.16em] text-stone-700"
                        >
                          Message <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[11px] text-stone-400">
                          {formData.message.length} / 2000
                        </span>
                      </div>
                      <div className="mt-2">
                        <textarea
                          id="field-message"
                          name="message"
                          required
                          rows={4}
                          maxLength={2000}
                          placeholder="Tell us what's on your mind..."
                          value={formData.message}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          className={`w-full resize-y rounded-2xl border bg-[#FFFDF9] px-5 py-3.5 text-sm font-medium text-[#2B1810] placeholder:text-stone-400 focus:outline-none focus:ring-1 transition-all duration-200 ${
                            formErrors.message
                              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                              : 'border-[#EFE4D6] focus:border-stone-900 focus:ring-[#7A3316]'
                          }`}
                        />
                      </div>
                      {formErrors.message && (
                        <p className="mt-1.5 text-xs font-medium text-red-600" role="alert" aria-live="polite">
                          {formErrors.message}
                        </p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex min-h-[46px] w-full items-center justify-center gap-3 rounded-full bg-[#7A3316] py-3 px-6 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-2xs transition-all duration-300 hover:bg-[#5E2610] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#7A3316]"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Sending message...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Message</span>
                          <Send size={15} />
                        </>
                      )}
                    </button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success-confirmation"
                    role="status"
                    aria-live="polite"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col items-center py-8 text-center"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F3E9DC] text-[#2B1810] border border-[#EFE4D6] shadow-2xs">
                      <CheckCircle2 size={36} className="stroke-[1.6]" />
                    </div>

                    <p className="mt-6 text-xs font-bold uppercase tracking-[0.24em] text-[#2B1810]">
                      Message Sent
                    </p>
                    <h3 className="mt-2 font-display text-4xl font-semibold text-[#2B1810]">
                      Thank you for contacting {tenant.name}.
                    </h3>
                    <p className="mt-4 max-w-md text-sm leading-relaxed text-stone-600">
                      We have received your note and will get back to you shortly. Feel free to stop
                      by anytime for your favorite brew!
                    </p>

                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleResetForm}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#EFE4D6] bg-[#FFFDF9] px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-stone-700 transition hover:bg-[#FBF6EF] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#7A3316]/20"
                      >
                        Send another message
                      </button>
                      <Link
                        to="/menu"
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#7A3316] px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#5E2610] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#7A3316]/20"
                      >
                        Explore Menu <ArrowRight size={14} />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. CINEMATIC CAFÉ ATMOSPHERE SECTION */}
      {/* ========================================================================= */}
      <section className="relative isolate overflow-hidden bg-[#7A3316] px-4 py-24 text-white">
        {tenant.slug === 'brewhaus' ? (
          <>
            <img
              src="/images/about/brewhaus-cinematic-hero.webp"
              alt={`Atmosphere at ${tenant.name}`}
              className="absolute inset-0 -z-20 h-full w-full object-cover opacity-35"
              loading="lazy"
            />
            <video
              className="absolute inset-0 -z-10 h-full w-full object-cover opacity-55 mix-blend-luminosity"
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              poster="/images/about/brewhaus-cinematic-hero.webp"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
              aria-hidden="true"
            >
              <source src="/BrewHaus.mp4" type="video/mp4" />
            </video>
          </>
        ) : tenant.heroImageUrl ? (
          <img
            src={tenant.heroImageUrl}
            alt={`Atmosphere at ${tenant.name}`}
            className="absolute inset-0 -z-20 h-full w-full object-cover opacity-35"
            loading="lazy"
          />
        ) : null}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#7A3316] via-[#7A3316]/70 to-[#7A3316]/85" />

        <motion.div {...reveal} className="mx-auto max-w-3xl text-center">
          <SectionEyebrow light>Come Say Hello</SectionEyebrow>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-[0.98] text-white">
            The ritual, from the first pour.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-white/80">
            A calm, warm sanctuary designed for slow mornings, afternoon reading, and evening
            conversations over freshly prepared artisanal food and specialty drinks.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-xs uppercase tracking-[0.2em] text-white/70">
            <span>Fresh Kitchen</span>
            <span aria-hidden="true">•</span>
            <span>Warm Comfort Food</span>
            <span aria-hidden="true">•</span>
            <span>{tenant.address || 'Visit us at the café'}</span>
          </div>
        </motion.div>
      </section>

      {/* ========================================================================= */}
      {/* 5. LOCATION & MAP SECTION */}
      {/* ========================================================================= */}
      <section className="bg-[#FAFAF8] px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <SectionEyebrow>Our Location</SectionEyebrow>
            <h2 className="mt-4 font-display text-4xl font-semibold text-[#2B1810]">
              Finding {tenant.name}.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-stone-600">
              {tenant.address || 'Find our café at the address shown below.'}
            </p>
          </div>

          <motion.div
            {...reveal}
            className="relative mt-12 overflow-hidden rounded-[2.5rem] border border-[#EFE4D6] bg-[#F3E9DC] shadow-xs"
          >
            {/* Map Frame */}
            <div className="relative h-[380px] w-full">
              <iframe
                title={`${tenant.name} location map`}
                src={tenant.address ? `https://www.google.com/maps?q=${encodeURIComponent(tenant.address)}&output=embed` : 'about:blank'}
                className="h-full w-full border-0 grayscale-[20%] contrast-105"
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* Floating Location Overlay Card */}
            <div className="pointer-events-auto absolute bottom-6 left-6 right-6">
              <div className="rounded-3xl border border-[#EFE4D6] bg-[#FFFDF9]/95 p-6 text-[#2B1810] shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-2 text-[#7A3316]">
                  <Compass size={16} />
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em]">
                    {tenant.name} Landmark
                  </span>
                </div>
                <h3 className="mt-2 font-display text-2xl font-bold text-[#2B1810]">
                  {tenant.address || 'Address not provided'}
                </h3>
                {tenant.contactPhone && (
                  <a
                    href={`tel:${formatInternationalTel(tenant.contactPhone)}`}
                    className="mt-1 inline-flex min-h-[44px] items-center text-xs text-stone-600 hover:text-[#7A3316] underline focus:outline-none focus:ring-2 focus:ring-[#7A3316]/20"
                  >
                    {tenant.contactPhone}
                  </a>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenant.address || 'Cafe')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#7A3316] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#5E2610] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#7A3316]/20"
                  >
                    <span>Get Directions</span>
                    <ExternalLink size={14} />
                  </a>
                  <span className="text-xs text-stone-500">Open today until 11:00 PM</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. CALL TO ACTION SECTION */}
      {/* ========================================================================= */}
      <section className="relative isolate overflow-hidden bg-[#7A3316] px-4 py-24 text-center text-white">
        {tenant.slug === 'brewhaus' ? (
          <img
            src="/images/about/brewhaus-story-cup.webp"
            alt={`${tenant.name} dining experience`}
            className="absolute inset-0 -z-20 h-full w-full object-cover opacity-25"
            loading="lazy"
          />
        ) : tenant.heroImageUrl ? (
          <img
            src={tenant.heroImageUrl}
            alt={`${tenant.name} dining experience`}
            className="absolute inset-0 -z-20 h-full w-full object-cover opacity-25"
            loading="lazy"
          />
        ) : null}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(22,80,61,0.5),rgba(15,61,46,0.96)_75%)]" />

        <motion.div {...reveal} className="mx-auto max-w-3xl">
          <SectionEyebrow light>Artisanal Food & Dining</SectionEyebrow>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-[0.96] text-white">
            Visit {tenant.name}.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-white/80">
            Enjoy handcrafted coffee, comforting food, and good moments made to last.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/menu"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#F3E9DC] px-7 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#7A3316] transition hover:bg-[#FEE6A3] active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              View Menu <ArrowRight size={15} />
            </Link>
            <Link
              to="/about"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white backdrop-blur-sm transition hover:bg-white/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              Explore Our Story <ArrowRight size={15} />
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
