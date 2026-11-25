import { useEffect, useRef, useState } from 'react';
import { TALL_QUERY } from '../scene/layout.js';
import { UI } from '../content/station.js';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
const SWIPE_CLOSE_PX = 90;
const FLICK_PX_PER_MS = 0.6;

// A modal panel. Wide screens: a side panel from the right with the stage
// still visible. Tall (portrait) screens: a bottom sheet with a grab handle
// that can be swiped down. Elements marked [data-grab] (the material
// headers) also start the swipe.
//
//   name           panel id; also the material class txp-panel--<name>
//   titleId        id of the heading inside (aria-labelledby, gets focus)
//   leaving        true while the exit animation plays
//   onClose()      close it (the shell updates the URL)
//   shouldConfirm  () => bool: ask before closing (the booking form has data)
//   returnFocus    element to focus again after closing
export default function Panel({ name, titleId, leaving, onClose, shouldConfirm, returnFocus, children }) {
  const sheetRef = useRef(null);
  const scrollRef = useRef(null);
  const drag = useRef(null);
  const [confirming, setConfirming] = useState(false);

  const requestClose = () => {
    if (shouldConfirm?.()) {
      setConfirming(true);
      return false;
    }
    onClose();
    return true;
  };
  // Handlers attached in effects read the latest version through this ref.
  const requestCloseRef = useRef(requestClose);
  useEffect(() => {
    requestCloseRef.current = requestClose;
  });

  // Focus the heading on open; give focus back to the opener on close.
  useEffect(() => {
    const opener = returnFocus;
    const heading = titleId ? document.getElementById(titleId) : null;
    (heading ?? sheetRef.current)?.focus({ preventScroll: true });
    return () => {
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [titleId, returnFocus]);

  // Esc closes (or dismisses the confirmation); Tab stays inside.
  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (confirming) setConfirming(false);
      else requestClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...sheetRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (!items.length) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !sheetRef.current.contains(document.activeElement) || document.activeElement.id === titleId)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Swipe down to close (tall layout only).
  const onPointerDown = (e) => {
    if (!window.matchMedia(TALL_QUERY).matches) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const grab = e.target.closest('[data-grab]');
    if (!grab || e.target.closest('button, a, input, select, textarea, summary, label')) return;
    drag.current = { id: e.pointerId, y0: e.clientY, t0: performance.now(), dy: 0 };
    sheetRef.current.setPointerCapture?.(e.pointerId);
    sheetRef.current.classList.add('is-dragging');
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    d.dy = Math.max(0, e.clientY - d.y0);
    sheetRef.current.style.transform = `translateY(${d.dy}px)`;
  };
  const endDrag = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const el = sheetRef.current;
    el.classList.remove('is-dragging');
    const speed = d.dy / Math.max(1, performance.now() - d.t0);
    const closing = e.type === 'pointerup' && (d.dy > SWIPE_CLOSE_PX || (d.dy > 24 && speed > FLICK_PX_PER_MS));
    if (closing && requestCloseRef.current()) {
      el.style.transform = `translateY(${d.dy}px)`;
      el.classList.add('is-flung');
    } else {
      el.style.transform = '';
    }
  };

  return (
    <div className={`txp-panel-root txp-panel-root--${name}${leaving ? ' is-leaving' : ''}`}>
      <div className="txp-backdrop" onClick={() => requestClose()} aria-hidden="true" />
      <section
        ref={sheetRef}
        className={`txp-panel txp-panel--${name}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="txp-grab" data-grab aria-hidden="true">
          <span className="txp-grab-handle" />
        </div>
        <button type="button" className="txp-close" onClick={() => requestClose()} aria-label={UI.close}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </button>
        <div className="txp-panel-scroll" ref={scrollRef}>
          {children}
        </div>
        {confirming && (
          <div className="txp-confirm" role="alertdialog" aria-labelledby={`${name}-confirm-q`}>
            <p id={`${name}-confirm-q`}>{UI.discardQuestion}</p>
            <div className="txp-confirm-actions">
              <button type="button" className="txp-btn txp-btn--ghost" onClick={() => setConfirming(false)} autoFocus>
                {UI.keepEditing}
              </button>
              <button type="button" className="txp-btn txp-btn--ink" onClick={() => { setConfirming(false); onClose(); }}>
                {UI.closeAnyway}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
