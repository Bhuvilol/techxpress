import { useEffect, useState } from 'react';

const PAD = 8;
const GIVE_UP_MS = 3000;

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const same = (a, b) => a && b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;

// Finds `selector`, scrolls it into view once, then tracks its box every frame
// (panels slide in and layouts shift, so one measurement is not enough). If it
// never appears within a few seconds `missing` turns true and the caller falls
// back to a plain message. Elements with no size count as not found yet.
export function useTarget(selector, enabled) {
  const [found, setFound] = useState({ selector: null, rect: null, el: null, missing: false });

  useEffect(() => {
    if (!enabled || !selector) return undefined;
    let raf = 0;
    let el = null;
    let scrolled = false;
    const started = performance.now();

    const tick = () => {
      if (!el || !el.isConnected) {
        el = document.querySelector(selector);
        scrolled = false;
      }
      const box = el ? el.getBoundingClientRect() : null;
      if (el && box && (box.width > 0 || box.height > 0)) {
        if (!scrolled) {
          el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
          scrolled = true;
        }
        const rect = { top: box.top - PAD, left: box.left - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 };
        setFound((p) => (p.selector === selector && p.el === el && same(p.rect, rect) ? p : { selector, rect, el, missing: false }));
      } else if (performance.now() - started > GIVE_UP_MS) {
        setFound((p) => (p.selector === selector && p.missing ? p : { selector, rect: null, el: null, missing: true }));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [selector, enabled]);

  if (!enabled || !selector || found.selector !== selector) return { rect: null, el: null, missing: false };
  return found;
}
