import { useEffect, useState } from 'react';
import { ArrowLeft, Camera, ImagePlus, Loader2, Send, Star, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useTenant } from '../../context/TenantContext';
import usePageMeta from '../../hooks/usePageMeta';

const emptyForm = { customerName: '', review: '', rating: 5 };

function Stars({ rating, interactive = false, onChange }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        interactive ? (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md p-1 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F3D2E]"
            aria-label={`${value} star${value === 1 ? '' : 's'}`}
          >
            <Star size={22} fill={value <= rating ? 'currentColor' : 'none'} className={value <= rating ? 'text-amber-500' : 'text-stone-200'} />
          </button>
        ) : (
          <span key={value} className="p-0.5" aria-hidden="true">
            <Star size={15} fill={value <= rating ? 'currentColor' : 'none'} className={value <= rating ? 'text-amber-500' : 'text-stone-200'} />
          </span>
        )
      ))}
    </div>
  );
}

export default function GalleryPage() {
  const tenant = useTenant();

  usePageMeta({
    title: 'Community Moments & Guest Photo Wall',
    description: 'Explore photos, reviews, and warm moments shared by our café guests. Capture your experience and share your favorite coffee moments on our wall.',
  });

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadGallery = async () => {
    try {
      const { data } = await api.get('/gallery');
      setItems(data.items || []);
    } catch (error) {
      toast.error(error.message || 'Unable to load gallery');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGallery();
  }, []);

  const choosePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please choose a JPG, PNG, or WEBP photo.');
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be 5MB or smaller.');
      return;
    }
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!form.customerName.trim() || !form.review.trim()) {
      toast.error('Please enter your name and a short review.');
      return;
    }
    setSubmitting(true);
    try {
      const body = new FormData();
      body.append('customerName', form.customerName.trim());
      body.append('review', form.review.trim());
      body.append('rating', String(form.rating));
      if (photo) body.append('photo', photo);

      const { data } = await api.post('/gallery', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      setItems((current) => [data.item, ...current]);
      setForm(emptyForm);
      setPhoto(null);
      setPreview('');
      toast.success(`Your ${tenant.name} moment is now in the gallery.`);
    } catch (error) {
      toast.error(error.message || 'Unable to publish your review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-stone-900">
      <div className="border-b border-stone-200 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            to="/menu"
            className="inline-flex min-h-[38px] items-center gap-2 text-sm font-semibold text-stone-700 transition hover:text-stone-900"
          >
            <ArrowLeft size={16} />
            <span>Back to menu</span>
          </Link>
          <span className="text-xs uppercase tracking-widest text-stone-900 font-bold">
            Guest Wall
          </span>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <section className="grid items-end gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#0F3D2E]">{tenant.name} community</p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold leading-[1.05] text-stone-900 sm:text-5xl lg:text-6xl">
              Good food looks better together.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-stone-600">
              See the dishes, beverages, and warm moments our guests have shared. Add yours to the wall.
            </p>
          </div>
          <div className="rounded-3xl bg-[#0F3D2E] p-6 text-white shadow-2xs sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-[#0F3D2E]">
                <Camera size={21} />
              </div>
              <div>
                <div className="font-display text-xl font-bold">Your table, your story</div>
                <div className="mt-1 text-sm text-stone-200">Share a photo and tell us how it felt.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full flex min-h-56 items-center justify-center text-stone-400">
              <Loader2 size={28} className="animate-spin text-stone-900" />
            </div>
          ) : items.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center shadow-2xs">
              <ImagePlus className="mx-auto text-stone-900" size={32} />
              <h2 className="mt-4 font-display text-2xl font-bold text-stone-900">Be the first on the wall</h2>
              <p className="mt-2 text-sm text-stone-500">Share your {tenant.name} moment below.</p>
            </div>
          ) : (
            items.map((item) => (
              <article key={item._id} className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs transition hover:border-stone-400">
                <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                  <img
                    src={item.imageUrl}
                    alt={`${tenant.name} moment shared by ${item.customerName}`}
                    width={400}
                    height={300}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <Stars rating={item.rating} />
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">
                      {item.customerName}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-stone-700">“{item.review}”</p>
                </div>
              </article>
            ))
          )}
        </section>

        <section className="mt-14 grid gap-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-2xs sm:p-8 lg:grid-cols-[0.85fr_1.15fr] lg:p-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0F3D2E]">Leave a little love</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-stone-900">Add your moment</h2>
            <p className="mt-4 text-sm leading-7 text-stone-600">
              Tell the next guest what you ordered, who you came with, or what made you stay a little longer.
            </p>
          </div>

          <form onSubmit={submitReview} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold text-stone-800">
                Your name *
                <input
                  required
                  minLength={2}
                  maxLength={60}
                  value={form.customerName}
                  onChange={(event) => setForm({ ...form, customerName: event.target.value })}
                  className="input-field mt-2 text-base rounded-full"
                  placeholder="Aarav"
                />
              </label>
              <div>
                <div className="text-sm font-semibold text-stone-800">Your rating</div>
                <div className="mt-2">
                  <Stars rating={form.rating} interactive onChange={(rating) => setForm({ ...form, rating })} />
                </div>
              </div>
            </div>

            <label className="block text-sm font-semibold text-stone-800">
              Your review *
              <textarea
                required
                minLength={8}
                maxLength={500}
                value={form.review}
                onChange={(event) => setForm({ ...form, review: event.target.value })}
                className="input-field mt-2 min-h-28 resize-y text-base rounded-2xl"
                placeholder="The pour-over and artisanal sandwich were wonderful..."
              />
            </label>

            <div>
              <div className="text-sm font-semibold text-stone-800">Your photo (optional)</div>
              {preview ? (
                <div className="relative mt-2 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
                  <img src={preview} alt="Selected preview" width={400} height={200} className="h-48 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setPhoto(null); setPreview(''); }}
                    className="absolute right-3 top-3 inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full bg-stone-900/90 text-white hover:bg-stone-900 transition"
                    aria-label="Remove selected photo"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center transition hover:border-stone-900 hover:bg-stone-100">
                  <ImagePlus className="text-stone-900" size={26} />
                  <span className="mt-2 text-sm font-semibold text-stone-800">Choose a photo</span>
                  <span className="mt-1 text-xs text-stone-400">JPG, PNG, or WEBP up to 5MB</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} className="sr-only" />
                </label>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary inline-flex min-h-[44px] w-full items-center justify-center gap-2 sm:w-auto px-7 rounded-full shadow-2xs"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              <span>{submitting ? 'Publishing...' : 'Publish review'}</span>
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
