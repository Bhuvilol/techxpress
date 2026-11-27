import { useEffect, useState } from 'react';
import { PORTAL_EVENT, PORTAL_URL, SLIDE_KEY, prefetchPortal } from './portal.js';
import { prefersLessMotion } from '../lib/station.js';
import logoUrl from '../assets/stage/logo.webp';

// The "safe slide" into VORTEX: the station pans left while the VORTEX
// terminal slides in from the right, then the real portal loads (it is a
// separate app at /vortex/). The portal's page starts on the same navy and
// finishes the slide, so the page load is hidden. Reset on pageshow so
// coming Back (bfcache) shows the station again.
const PAN_MS = 600;

export default function DoorTransition() {
  const [phase, setPhase] = useState(null); // null | 'pan' | 'fade'

  useEffect(() => {
    let timer;
    const onGo = (event) => {
      const target = event.detail?.url || PORTAL_URL;
      const less = prefersLessMotion();
      if (!less) {
        try { sessionStorage.setItem(SLIDE_KEY, 'in'); } catch { /* private mode */ }
      }
      setPhase(less ? 'fade' : 'pan');
      document.documentElement.classList.toggle('txp-panning', !less);
      timer = setTimeout(() => window.location.assign(target), less ? 150 : PAN_MS);
    };
    const onShow = () => {
      clearTimeout(timer);
      document.documentElement.classList.remove('txp-panning');
      setPhase(null);
    };
    window.addEventListener(PORTAL_EVENT, onGo);
    window.addEventListener('pageshow', onShow);
    // Warm the portal's files once the station is idle, so the load after
    // the slide is near-instant.
    const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 2500));
    const cancelIdle = window.cancelIdleCallback ?? clearTimeout;
    const idleId = idle(prefetchPortal);
    return () => {
      clearTimeout(timer);
      cancelIdle(idleId);
      window.removeEventListener(PORTAL_EVENT, onGo);
      window.removeEventListener('pageshow', onShow);
    };
  }, []);

  if (!phase) return null;
  return (
    <div className={`txp-pan txp-pan--${phase}`} aria-hidden="true">
      <div className="txp-pan-terminal">
        <img src={logoUrl} alt="" className="txp-pan-logo" />
        <span className="txp-pan-label">VORTEX TERMINAL</span>
        <span className="txp-pan-sub" lang="hi">वोर्टेक्स टर्मिनल</span>
      </div>
    </div>
  );
}
