import { useEffect, useState } from 'react';
import { HINTS } from '../content/station.js';
import { TALL_QUERY } from '../scene/layout.js';
import { requestTiltPermission } from '../motion/useTilt.js';
import { useMediaQuery } from './hooks.js';

const SEEN_KEY = 'txp.hints';
const SHOW_MS = 6000;

const firstVisitThisSession = () => {
  try {
    return !window.sessionStorage.getItem(SEEN_KEY);
  } catch {
    return true;
  }
};
const markSeen = () => {
  try {
    window.sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* storage blocked: hints may show again next load */
  }
};

const canTilt = () => typeof window !== 'undefined' && typeof window.DeviceOrientationEvent !== 'undefined';

// "Tap anything on the platform" (and on phones "Tilt your phone"), once per
// session, for ~6 s or until the first interaction.
export default function Hints() {
  const [show, setShow] = useState(firstVisitThisSession);
  const tall = useMediaQuery(TALL_QUERY);
  const coarse = useMediaQuery('(pointer: coarse)');

  useEffect(() => {
    if (!show) return undefined;
    markSeen();
    const hide = () => setShow(false);
    const t = setTimeout(hide, SHOW_MS);
    // Any interaction elsewhere dismisses the hints (the tilt chip handles its own tap).
    const onDown = (e) => {
      if (!e.target.closest?.('.hint-tilt')) hide();
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', hide);
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', hide);
    };
  }, [show]);

  if (!show) return null;
  return (
    <div className="hints" role="note">
      <p className="hint-chip">
        <span className="hint-dot" aria-hidden="true" />
        {HINTS.tap}
      </p>
      {tall && coarse && canTilt() && (
        <button
          type="button"
          className="hint-chip hint-tilt"
          onClick={async () => {
            await requestTiltPermission();
            setShow(false);
          }}
        >
          <span className="hint-phone" aria-hidden="true" />
          {HINTS.tilt}
        </button>
      )}
    </div>
  );
}
