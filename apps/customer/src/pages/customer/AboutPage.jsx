import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './AboutPage.module.css';
import { useTenant } from '../../context/TenantContext';
import usePageMeta from '../../hooks/usePageMeta';

const CONFIG = {
  frameCount: 240,
  tiers: {
    portrait: { path: '/frames/portrait/', crop: { x: 0.1698, w: 0.65 }, fullWidth: 1920 },
    hd:       { path: '/frames/hd/',       crop: { x: 0, w: 1 },         fullWidth: 1920 },
    qhd:      { path: '/frames/qhd/',      crop: { x: 0, w: 1 },         fullWidth: 2560 },
  },
  qhdAbove: 2000,
  holdAt: 0.92,
  focalX: 0.54,
  focalXPortrait: 0.495,
  smoothing: 0.14,
  fade: 0.045,
  warmWindow: 6,
};

export default function AboutPage() {
  const tenant = useTenant();
  usePageMeta(
    `About ${tenant.name || 'Our Café'} – Scroll to Pour`,
    'Scan the code on your table, choose your drink, and watch the cup fill.'
  );

  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const gaugeRef = useRef(null);
  const loaderRef = useRef(null);
  const loaderBarRef = useRef(null);
  const pctTextRef = useRef(null);
  const loadNoteRef = useRef(null);
  const ctaRef = useRef(null);

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    const section = sectionRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!section || !stage || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const caps = [...section.querySelectorAll(`.${styles.cap}`)];
    const gaugeFill = gaugeRef.current;
    const loader = loaderRef.current;
    const loaderBar = loaderBarRef.current;
    const pctText = pctTextRef.current;
    const loadNote = loadNoteRef.current;
    const cta = ctaRef.current;

    const N = CONFIG.frameCount;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

    let tier = null;
    let generation = 0;
    let frames = [];
    let loaded = 0;
    let failed = 0;
    let ready = false;
    const bitmaps = new Map();
    const pending = new Set();
    let lastWarm = -1;
    let target = 0;
    let current = 0;
    let raf = 0;
    let isDisposed = false;
    let box = { dx: 0, dy: 0, dw: 0, dh: 0, w: 0, h: 0, dpr: 1 };

    const frameSrc = (name, i) => `${CONFIG.tiers[name].path}f${String(i + 1).padStart(3, '0')}.webp`;

    function chooseTier() {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      let want;
      if (w / h < 1.1) {
        want = 'portrait';
      } else {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        want = Math.max(w, h * 16 / 9) * dpr > CONFIG.qhdAbove ? 'qhd' : 'hd';
      }
      return CONFIG.tiers[want] ? want : (CONFIG.tiers.qhd ? 'qhd' : Object.keys(CONFIG.tiers)[0]);
    }

    function loadOrder() {
      const seen = new Set();
      const order = [];
      const add = (i) => {
        if (i >= 0 && i < N && !seen.has(i)) {
          seen.add(i);
          order.push(i);
        }
      };
      add(0);
      add(N - 1);
      [32, 16, 8, 4, 2, 1].forEach((step) => {
        for (let i = 0; i < N; i += step) add(i);
      });
      return order;
    }

    function showLoadError() {
      generation++;
      if (loader && loader.querySelector('p')) {
        loader.querySelector('p').textContent = 'The video frames didn’t load';
      }
      if (loaderBar && loaderBar.parentElement) {
        loaderBar.parentElement.hidden = true;
      }
      if (loadNote) {
        loadNote.hidden = false;
        loadNote.textContent = 'Please check your connection and refresh.';
      }
    }

    function loadFrame(name, i, gen) {
      return new Promise((resolve) => {
        if (isDisposed) return resolve();
        const img = new Image();
        img.onload = img.onerror = () => {
          if (gen !== generation || isDisposed) return resolve();
          if (img.naturalWidth) {
            frames[i] = img;
          } else {
            failed++;
          }
          loaded++;
          if (failed >= 4 && failed === loaded) {
            showLoadError();
            return resolve();
          }
          const share = loaded / N;
          if (loaderBar) loaderBar.style.transform = `scaleX(${share})`;
          if (pctText) pctText.textContent = `${Math.round(share * 100)}%`;

          if (!ready && ((frames[0] && share >= 0.35) || loaded === N)) {
            ready = true;
            setIsReady(true);
            layout();
          }
          resolve();
        };
        img.src = frameSrc(name, i);
      });
    }

    function startLoad() {
      const gen = ++generation;
      tier = chooseTier();
      bitmaps.forEach((b) => b.close && b.close());
      bitmaps.clear();
      pending.clear();
      frames = new Array(N).fill(null);
      loaded = 0;
      failed = 0;
      ready = false;
      lastWarm = -1;

      if (loader) loader.classList.remove(styles.loaderDone);
      if (loaderBar && loaderBar.parentElement) loaderBar.parentElement.hidden = false;
      if (loadNote) loadNote.hidden = true;
      if (loader && loader.querySelector('p')) loader.querySelector('p').textContent = 'Loading the pour';
      if (loaderBar) loaderBar.style.transform = 'scaleX(0)';

      const queue = loadOrder();
      const name = tier;
      const worker = async () => {
        while (queue.length && gen === generation && !isDisposed) {
          await loadFrame(name, queue.shift(), gen);
        }
      };
      for (let k = 0; k < 6; k++) worker();
    }

    function layout() {
      if (isDisposed || !stage) return;
      const w = stage.clientWidth;
      const h = stage.clientHeight;

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

      const dpr = clamp(Math.min(window.devicePixelRatio || 1, 2, (CONFIG.tiers[tier]?.fullWidth || 1920) / dw), 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
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
            pending.delete(i);
            if (gen !== generation || Math.abs(i - lastWarm) > W * 2 || isDisposed) {
              if (bm.close) bm.close();
            } else {
              bitmaps.set(i, bm);
            }
          })
          .catch(() => pending.delete(i));
      }
      bitmaps.forEach((bm, i) => {
        if (Math.abs(i - center) > W * 2) {
          if (bm.close) bm.close();
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
      if (!box.dw || !tier || isDisposed) return;
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
      ctx.imageSmoothingQuality = 'high';
      ctx.globalAlpha = 1;

      const srcA = source(ia);
      if (srcA) ctx.drawImage(srcA, x, box.dy, w, box.dh);

      const ib = nearestIndex(b);
      if (ib >= 0 && ib !== ia && t > 0.01) {
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
      if (gaugeFill) gaugeFill.style.transform = `scaleY(${fill})`;

      caps.forEach((cap) => {
        const a = parseFloat(cap.dataset.in);
        const b = parseFloat(cap.dataset.out);
        const o = clamp((p - a) / CONFIG.fade, 0, 1) * clamp((b - p) / CONFIG.fade, 0, 1);
        cap.style.opacity = o;
        cap.style.transform = reduceMotion ? 'none' : `translateY(${(1 - o) * 14}px)`;
        cap.style.pointerEvents = o > 0.6 ? 'auto' : 'none';
      });

      if (cta && caps.length) {
        const last = caps[caps.length - 1];
        cta.tabIndex = parseFloat(last.style.opacity) > 0.6 ? 0 : -1;
      }
    }

    function tick() {
      if (isDisposed) return;
      const diff = target - current;
      current = reduceMotion || Math.abs(diff) < 0.0004 ? target : current + diff * CONFIG.smoothing;
      draw(current);
      updateUI(current);
      raf = current === target ? 0 : requestAnimationFrame(tick);
    }

    function readScroll() {
      if (isDisposed || !section || !stage) return;
      const r = section.getBoundingClientRect();
      const travel = r.height - stage.clientHeight;
      target = travel > 0 ? clamp(-r.top / travel, 0, 1) : 0;
      if (!raf) raf = requestAnimationFrame(tick);
    }

    window.addEventListener('scroll', readScroll, { passive: true });

    let resizeObserver = null;
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        if (isDisposed) return;
        if (tier && chooseTier() !== tier) {
          startLoad();
        } else {
          layout();
        }
        readScroll();
      });
      resizeObserver.observe(stage);
    }

    updateUI(0);
    startLoad();
    readScroll();

    return () => {
      isDisposed = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', readScroll);
      if (resizeObserver) resizeObserver.disconnect();
      bitmaps.forEach((bm) => bm.close && bm.close());
      bitmaps.clear();
      pending.clear();
      frames = [];
    };
  }, []);

  const cafeName = tenant.name || 'Brewhaus Café';

  return (
    <div className={styles.aboutContainer}>
      <header className={styles.bar}>
        <Link className={styles.mark} to="/menu">
          {cafeName}
        </Link>
        <Link className={styles.menuLink} to="/menu">
          Menu
        </Link>
      </header>

      <main>
        <section ref={sectionRef} className={styles.pour} id="pour" aria-label="A cup filling with coffee as you scroll">
          <div ref={stageRef} className={styles.stage}>
            <canvas
              ref={canvasRef}
              className={styles.canvasFrame}
              role="img"
              aria-label="A white cup on a saucer slowly filling with coffee, with steam rising"
            />
            <div className={styles.shade} />

            <div className={styles.caps}>
              <article className={styles.cap} data-in="-1" data-out="0.22">
                <h1>Pour yourself a slow morning.</h1>
                <p>Scroll down and watch the cup fill.</p>
                <div className={styles.cue} aria-hidden="true">
                  <span className={styles.cueLine} />
                  Scroll to pour
                </div>
              </article>

              <article className={styles.cap} data-in="0.27" data-out="0.5">
                <h2>Scan the code on your table.</h2>
                <p>No queue and no waving for the menu. The QR code opens our full menu on your phone.</p>
              </article>

              <article className={styles.cap} data-in="0.55" data-out="0.79">
                <h2>Choose what you like.</h2>
                <p>Pick your drinks, add anything from the counter and send the order straight to the kitchen.</p>
              </article>

              <article className={styles.cap} data-in="0.85" data-out="2">
                <h2>Your cup is ready.</h2>
                <p>Come hungry. The menu is one tap away.</p>
                <Link ref={ctaRef} className={styles.cta} to="/menu" id="cta">
                  Open the menu
                </Link>
              </article>
            </div>

            <div className={styles.gauge} aria-hidden="true">
              <i ref={gaugeRef} />
            </div>

            <div
              ref={loaderRef}
              className={`${styles.loader} ${isReady ? styles.loaderDone : ''}`}
              role="status"
              aria-live="polite"
            >
              <p>Loading the pour</p>
              <div className={styles.track}>
                <i ref={loaderBarRef} />
              </div>
              <span ref={pctTextRef} className={styles.srOnly} id="pct">
                0%
              </span>
              <p ref={loadNoteRef} className={styles.loaderNote} id="loadnote" hidden />
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.foot}>
        <Link className={styles.mark} to="/menu">
          {cafeName}
        </Link>
        <Link to="/menu">Open the menu</Link>
      </footer>
    </div>
  );
}
