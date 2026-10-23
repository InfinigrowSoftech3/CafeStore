import React, { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styles from './AboutPage.module.css';
import { useTenant } from '../../context/TenantContext';
import usePageMeta from '../../hooks/usePageMeta';

const CONFIG = {
  // The source sequence has 240 frames. We use every other frame for a much
  // smaller download while keeping the pour smooth through cross-fading.
  frameCount: 120,
  totalFrames: 240,
  frameStep: 2,
  tiers: {
    portrait: { path: '/frames/portrait/', crop: { x: 0.1698, w: 0.65 }, fullWidth: 1920 },
    hd:       { path: '/frames/hd/',       crop: { x: 0, w: 1 },         fullWidth: 1920 },
    qhd:      { path: '/frames/qhd/',      crop: { x: 0, w: 1 },         fullWidth: 2560 },
  },
  qhdAbove: 2000,
  holdAt: 0.92,
  focalX: 0.54,
  focalXPortrait: 0.495,
  smoothingTau: 55,
  fade: 0.045,
  warmWindow: 6,
  initialAhead: 8,
  ahead: 18,
  behind: 6,
  maxConcurrent: 4,
  maxLoaded: 72,
  fallbackImage: '/images/about/brewhaus-story-cup.webp',
};

const frameNumber = (i) => {
  if (i >= CONFIG.frameCount - 1) return CONFIG.totalFrames;
  return 1 + i * CONFIG.frameStep;
};

const frameSrc = (name, i) => `${CONFIG.tiers[name].path}f${String(frameNumber(i)).padStart(3, '0')}.webp`;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export default function AboutPage() {
  const tenant = useTenant();
  const [searchParams] = useSearchParams();
  const currentSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const cafeName = tenant?.name || 'Brewhaus Café';

  usePageMeta(
    `${cafeName} · Scroll to Pour`,
    'Scan the code on your table, choose your drink and watch the cup fill in our slow-pour artisan journey.'
  );

  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const gaugeFillRef = useRef(null);
  const loaderRef = useRef(null);
  const loaderBarRef = useRef(null);
  const pctTextRef = useRef(null);
  const loadNoteRef = useRef(null);
  const ctaRef = useRef(null);
  const capsRef = useRef([]);

  useEffect(() => {
    // The site uses smooth scrolling globally. Force this route to start at
    // the top instantly instead of animating from the previous page position.
    const rootStyle = document.documentElement.style;
    const previousScrollBehavior = rootStyle.scrollBehavior;
    rootStyle.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    rootStyle.scrollBehavior = previousScrollBehavior;

    const section = sectionRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!section || !stage || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const caps = capsRef.current.filter(Boolean);
    const gaugeFill = gaugeFillRef.current;
    const loader = loaderRef.current;
    const loaderBar = loaderBarRef.current;
    const pctText = pctTextRef.current;
    const loadNote = loadNoteRef.current;
    const cta = ctaRef.current;

    const N = CONFIG.frameCount;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let tier = null;
    let generation = 0;
    let frames = [];
    let loadedIndices = new Set();
    let pending = new Set();
    let failedSet = new Set();
    let wanted = [];
    let active = 0;
    let loadedCount = 0;
    let failedCount = 0;
    let ready = false;
    let fallbackActive = false;
    const bitmaps = new Map();
    let lastWarm = -1;
    let lastWindowCenter = -1;
    let target = 0;
    let current = 0;
    let raf = 0;
    let lastTick = 0;
    let box = { dx: 0, dy: 0, dw: 0, dh: 0, w: 0, h: 0, dpr: 1 };
    let isDisposed = false;

    function chooseTier() {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      let want;
      if (w / h < 1.1) {
        want = 'portrait';
      } else {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        want = Math.max(w, (h * 16) / 9) * dpr > CONFIG.qhdAbove ? 'qhd' : 'hd';
      }
      return CONFIG.tiers[want] ? want : CONFIG.tiers.qhd ? 'qhd' : Object.keys(CONFIG.tiers)[0];
    }

    function updateLoader(share) {
      const value = clamp(share, 0, 1);
      if (loaderBar) loaderBar.style.transform = `scaleX(${value})`;
      if (pctText) pctText.textContent = `${Math.round(value * 100)}%`;
    }

    function markReady() {
      if (ready) return;
      ready = true;
      updateLoader(1);
      if (loader) loader.classList.add(styles.loaderDone);
      layout();
      draw(current);
    }

    function showFallback() {
      if (isDisposed) return;
      fallbackActive = true;
      generation++;
      ready = true;
      updateLoader(1);
      if (loader) loader.classList.add(styles.loaderDone);
      if (stage) {
        stage.style.backgroundImage = `url('${CONFIG.fallbackImage}')`;
        stage.style.backgroundSize = 'cover';
        stage.style.backgroundPosition = 'center';
      }
      if (canvas) canvas.style.opacity = '0';
    }

    function evictFar(center) {
      if (loadedIndices.size <= CONFIG.maxLoaded) return;
      for (const i of [...loadedIndices]) {
        if (Math.abs(i - center) <= 32) continue;
        frames[i] = null;
        loadedIndices.delete(i);
        const bm = bitmaps.get(i);
        if (bm) {
          try { bm.close(); } catch (_) { /* ignore */ }
          bitmaps.delete(i);
        }
        if (loadedIndices.size <= CONFIG.maxLoaded) break;
      }
    }

    function pump() {
      if (isDisposed || !tier) return;
      while (active < CONFIG.maxConcurrent && wanted.length) {
        const i = wanted.shift();
        if (frames[i] || pending.has(i) || failedSet.has(i)) continue;
        pending.add(i);
        active++;
        loadOne(i, generation);
      }
    }

    function loadOne(i, gen) {
      const img = new Image();
      img.decoding = 'async';
      let settled = false;

      const finish = (ok) => {
        if (settled) return;
        settled = true;
        // A newer generation owns the counters and pending set now. Do not
        // let an old request decrement the new generation's concurrency.
        if (gen !== generation || isDisposed) return;
        active = Math.max(0, active - 1);
        pending.delete(i);

        if (ok && img.naturalWidth) {
          frames[i] = img;
          loadedIndices.add(i);
          loadedCount++;
          if (!ready && (i === 0 || loadedCount >= 3)) {
            markReady();
          } else if (ready) {
            draw(current);
          }
        } else {
          failedSet.add(i);
          failedCount++;
          if (!ready && (i === 0 || (loadedCount === 0 && failedCount >= 4))) {
            showFallback();
            return;
          }
        }

        if (!ready) {
          const initialTarget = Math.min(N, CONFIG.initialAhead + 1);
          updateLoader(loadedCount / initialTarget);
        }

        evictFar(lastWindowCenter >= 0 ? lastWindowCenter : 0);
        pump();
      };

      img.onload = () => finish(true);
      img.onerror = () => finish(false);
      img.src = frameSrc(tier, i);
    }

    function ensureWindow(center, initial = false) {
      if (isDisposed || !tier) return;
      const c = clamp(Math.round(center), 0, N - 1);
      if (!initial && c === lastWindowCenter) return;

      const start = Math.max(0, c - CONFIG.behind);
      const end = Math.min(N - 1, c + (initial ? CONFIG.initialAhead : CONFIG.ahead));
      const order = [];
      const seen = new Set();
      const add = (i) => {
        if (i >= start && i <= end && !seen.has(i)) {
          seen.add(i);
          order.push(i);
        }
      };

      // Load the frame at the current position first, then expand outwards.
      add(c);
      const maxD = Math.max(c - start, end - c);
      for (let d = 1; d <= maxD; d++) {
        add(c + d);
        add(c - d);
      }

      wanted = order;
      lastWindowCenter = c;
      pump();
      evictFar(c);
    }

    function startLoad() {
      generation++;
      tier = chooseTier();
      bitmaps.forEach((b) => {
        try { b.close(); } catch (_) { /* ignore */ }
      });
      bitmaps.clear();
      pending.clear();
      failedSet.clear();
      loadedIndices.clear();
      wanted = [];
      frames = new Array(N).fill(null);
      loadedCount = 0;
      failedCount = 0;
      active = 0;
      ready = false;
      fallbackActive = false;
      lastWarm = -1;
      lastWindowCenter = -1;

      if (loader) loader.classList.remove(styles.loaderDone);
      if (canvas) canvas.style.opacity = '';
      if (stage) stage.style.backgroundImage = '';
      if (loaderBar && loaderBar.parentElement) loaderBar.parentElement.hidden = false;
      if (loadNote) loadNote.hidden = true;
      const p = loader?.querySelector('p');
      if (p) p.textContent = 'Loading the pour';
      updateLoader(0);

      if (reduceMotion) {
        showFallback();
        return;
      }

      const center = Math.round(clamp(target / CONFIG.holdAt, 0, 1) * (N - 1));
      ensureWindow(center, true);
    }

    function layout() {
      if (!stage || !canvas || isDisposed) return;
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (!w || !h) return;

      const portrait = w / h < 1.1;
      let dw, dh, dy;
      if (portrait) {
        dw = w * 1.62;
        dh = (dw * 9) / 16;
        dy = h * 0.66 - dh / 2;
      } else {
        const s = Math.max(w / 16, h / 9);
        dw = s * 16;
        dh = s * 9;
        dy = (h - dh) / 2;
      }
      const focal = portrait ? CONFIG.focalXPortrait : CONFIG.focalX;
      const dx = Math.min(0, Math.max(w - dw, w / 2 - focal * dw));

      // A 1.5x backing store is plenty for a soft photographic background and
      // cuts canvas fill-rate dramatically on high-DPI phones.
      const dpr = clamp(
        Math.min(window.devicePixelRatio || 1, 1.5, CONFIG.tiers[tier]?.fullWidth ? CONFIG.tiers[tier].fullWidth / dw : 1.5),
        1,
        1.5
      );
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      box = { dx, dy, dw, dh, w, h, dpr };

      const mask = portrait
        ? `linear-gradient(to bottom, transparent ${dy}px, #000 ${dy + dh * 0.16}px, #000 ${dy + dh * 0.84}px, transparent ${dy + dh}px)`
        : 'none';
      canvas.style.maskImage = canvas.style.webkitMaskImage = mask;
      draw(current);
    }

    function warm(center) {
      if (!window.createImageBitmap || center === lastWarm || isDisposed) return;
      lastWarm = center;
      const gen = generation;
      const W = CONFIG.warmWindow;

      for (let i = Math.max(0, center - W); i <= Math.min(N - 1, center + W + 1); i++) {
        if (!frames[i] || bitmaps.has(i) || pending.has(i)) continue;
        pending.add(i);
        createImageBitmap(frames[i])
          .then((bm) => {
            if (gen !== generation || isDisposed) {
              try { bm.close(); } catch (_) { /* ignore */ }
              return;
            }
            pending.delete(i);
            if (Math.abs(i - lastWarm) > W * 2) {
              try { bm.close(); } catch (_) { /* ignore */ }
            } else {
              bitmaps.set(i, bm);
            }
          })
          .catch(() => {
            if (gen === generation && !isDisposed) pending.delete(i);
          });
      }

      bitmaps.forEach((bm, i) => {
        if (Math.abs(i - center) > W * 2) {
          try { bm.close(); } catch (_) { /* ignore */ }
          bitmaps.delete(i);
        }
      });
    }

    function nearestIndex(i) {
      if (frames[i]) return i;
      for (let d = 1; d < N; d++) {
        if (frames[i - d]) return i - d;
        if (frames[i + d]) return i + d;
      }
      return -1;
    }

    const source = (i) => bitmaps.get(i) || frames[i];

    function draw(progress) {
      if (!box.dw || !tier || isDisposed || fallbackActive) return;
      const f = clamp(progress / CONFIG.holdAt, 0, 1) * (N - 1);
      const a = Math.floor(f);
      const b = Math.min(a + 1, N - 1);
      const t = f - a;
      const ia = nearestIndex(a);
      if (ia < 0) return;
      warm(a);

      const c = CONFIG.tiers[tier].crop;
      const x = box.dx + c.x * box.dw;
      const w = c.w * box.dw;

      ctx.setTransform(box.dpr, 0, 0, box.dpr, 0, 0);
      ctx.clearRect(0, 0, box.w, box.h);
      ctx.globalAlpha = 1;

      const srcA = source(ia);
      if (srcA) {
        ctx.drawImage(srcA, x, box.dy, w, box.dh);
      }

      const ib = nearestIndex(b);
      if (ib >= 0 && ib !== ia && t > 0.02) {
        const srcB = source(ib);
        if (srcB) {
          ctx.globalAlpha = t;
          ctx.drawImage(srcB, x, box.dy, w, box.dh);
          ctx.globalAlpha = 1;
        }
      }
    }

    function updateUI(p) {
      if (isDisposed) return;
      const fill = clamp(p / CONFIG.holdAt, 0, 1);
      if (gaugeFill) {
        gaugeFill.style.transform = `scaleY(${fill})`;
      }

      caps.forEach((cap) => {
        if (!cap) return;
        const a = parseFloat(cap.dataset.in);
        const b = parseFloat(cap.dataset.out);
        const o = clamp((p - a) / CONFIG.fade, 0, 1) * clamp((b - p) / CONFIG.fade, 0, 1);
        cap.style.opacity = o;
        cap.style.transform = reduceMotion ? 'none' : `translateY(${(1 - o) * 14}px)`;
        cap.style.pointerEvents = o > 0.6 ? 'auto' : 'none';
      });

      if (cta) {
        const last = caps[caps.length - 1];
        if (last) {
          cta.tabIndex = parseFloat(last.style.opacity || '0') > 0.6 ? 0 : -1;
        }
      }
    }

    function readScroll() {
      if (!section || !stage || isDisposed) return;
      const r = section.getBoundingClientRect();
      const travel = r.height - stage.clientHeight;
      target = clamp(-r.top / (travel || 1), 0, 1);

      // A large jump (Page Down, anchor, restored scroll) should not make the
      // viewer wait for a long catch-up animation.
      if (Math.abs(target - current) > 0.28) current = target;

      // Captions and the gauge follow the real scroll position immediately.
      updateUI(target);

      if (!fallbackActive) {
        const center = Math.round(clamp(target / CONFIG.holdAt, 0, 1) * (N - 1));
        ensureWindow(center);
      }

      if (!raf) raf = requestAnimationFrame(tick);
    }

    function tick(now = performance.now()) {
      if (isDisposed) return;
      if (!lastTick) lastTick = now;
      const dt = clamp(now - lastTick, 0, 64);
      lastTick = now;
      const diff = target - current;

      if (reduceMotion || Math.abs(diff) < 0.0004) {
        current = target;
      } else {
        const factor = 1 - Math.exp(-dt / CONFIG.smoothingTau);
        current += diff * factor;
      }

      draw(current);

      if (Math.abs(target - current) > 0.0004) {
        raf = requestAnimationFrame(tick);
      } else {
        current = target;
        raf = 0;
      }
    }

    function onVisibilityChange() {
      if (document.hidden || isDisposed) return;
      // Recompute from the real scroll position in case the browser restored
      // or changed the scroll offset while the tab was in the background.
      readScroll();
      current = target;
      lastTick = 0;
      updateUI(target);
      draw(current);
      if (!raf) raf = requestAnimationFrame(tick);
    }

    window.addEventListener('scroll', readScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    const resizeObserver = new ResizeObserver(() => {
      if (isDisposed) return;
      if (tier && chooseTier() !== tier) {
        startLoad();
      } else {
        layout();
      }
      readScroll();
    });

    resizeObserver.observe(stage);

    updateUI(0);
    startLoad();
    readScroll();

    return () => {
      isDisposed = true;
      generation++;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', readScroll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      resizeObserver.disconnect();
      bitmaps.forEach((b) => {
        try { b.close(); } catch (_) { /* ignore */ }
      });
      bitmaps.clear();
      pending.clear();
      wanted = [];
    };
  }, []);

  return (
    <div className={styles.pageWrapper}>
      {/* Top Fixed Floating Navigation Bar */}
      <header className={styles.bar}>
        <Link className={styles.mark} to={`/menu${currentSearch}`}>
          {cafeName}
        </Link>
        <Link className={styles.menuLink} to={`/menu${currentSearch}`}>
          Menu
        </Link>
      </header>

      {/* Main Interactive Pour Experience */}
      <main>
        <section
          ref={sectionRef}
          className={styles.pour}
          id="pour"
          aria-label="A cup filling with coffee as you scroll"
        >
          <div ref={stageRef} className={styles.stage}>
            <canvas
              ref={canvasRef}
              className={styles.frame}
              role="img"
              aria-label="A white cup on a saucer slowly filling with coffee, with steam rising"
            />
            <div className={styles.shade} aria-hidden="true" />

            <div className={styles.caps}>
              <article
                ref={(el) => (capsRef.current[0] = el)}
                className={styles.cap}
                data-in="-1"
                data-out="0.27"
              >
                <h1>Pour yourself a slow morning.</h1>
                <p>Scroll down and watch the cup fill.</p>
                <div className={styles.cue} aria-hidden="true">
                  <span className={styles.cueLine} />
                  Scroll to pour
                </div>
              </article>

              <article
                ref={(el) => (capsRef.current[1] = el)}
                className={styles.cap}
                data-in="0.22"
                data-out="0.55"
              >
                <h2>Scan the code on your table.</h2>
                <p>No queue and no waving for the menu. The QR code opens our full menu on your phone.</p>
              </article>

              <article
                ref={(el) => (capsRef.current[2] = el)}
                className={styles.cap}
                data-in="0.5"
                data-out="0.85"
              >
                <h2>Choose what you like.</h2>
                <p>Pick your drinks, add anything from the counter and send the order straight to the kitchen.</p>
              </article>

              <article
                ref={(el) => (capsRef.current[3] = el)}
                className={styles.cap}
                data-in="0.8"
                data-out="2"
              >
                <h2>Your cup is ready.</h2>
                <p>Come hungry. The menu is one tap away.</p>
                <Link ref={ctaRef} className={styles.cta} to={`/menu${currentSearch}`} id="cta">
                  Open the menu
                </Link>
              </article>
            </div>

            <div className={styles.gauge} aria-hidden="true">
              <i ref={gaugeFillRef} className={styles.gaugeFill} />
            </div>

            <div ref={loaderRef} className={styles.loader} role="status" aria-live="polite">
              <p className={styles.loaderTitle}>Loading the pour</p>
              <div className={styles.track}>
                <i ref={loaderBarRef} className={styles.trackFill} />
              </div>
              <span ref={pctTextRef} className={styles.srOnly} id="pct">
                0%
              </span>
              <p ref={loadNoteRef} className={styles.loaderNote} id="loadnote" hidden />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.foot}>
        <Link className={styles.mark} to={`/menu${currentSearch}`}>
          {cafeName}
        </Link>
        <Link className={styles.footLink} to={`/menu${currentSearch}`}>
          Open the menu
        </Link>
      </footer>
    </div>
  );
}
