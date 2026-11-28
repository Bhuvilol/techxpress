import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPanelHistory, panelFromHash } from '../lib/hashRoute.js';
import { ledStatusKey } from '../lib/countdown.js';
import { fetchRegistrationOpen } from '../lib/station.js';
import { EVENT } from '../content/station.js';

// Live matchMedia value.
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

// The open panel (from the URL hash) and open/close functions that follow
// the rules in lib/hashRoute.js, through react-router so its location stays
// in sync (legacy redirects like /register -> /#book land here too).
export function usePanelRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const panel = panelFromHash(location.hash);
  const history = useMemo(
    () =>
      createPanelHistory({
        getHash: () => window.location.hash,
        getState: () => window.history.state?.usr ?? null,
        push: (hash, state) => navigate({ pathname: '/', hash }, { state }),
        replace: (hash, state) => navigate({ pathname: '/', hash }, { replace: true, state }),
        back: () => navigate(-1),
      }),
    [navigate],
  );
  return { panel, open: history.open, close: history.close };
}

// Keeps the last non-null value rendered for `ms` after it goes null, so the
// panel can play its exit animation. Returns [value, leaving].
export function usePresence(value, ms) {
  const [shown, setShown] = useState(value);
  const [leaving, setLeaving] = useState(false);
  if (value && value !== shown) {
    setShown(value);
    setLeaving(false);
  } else if (value && leaving) {
    setLeaving(false);
  } else if (!value && shown && !leaving) {
    setLeaving(true);
  }
  useEffect(() => {
    if (!leaving) return undefined;
    const t = setTimeout(() => {
      setShown(null);
      setLeaving(false);
    }, ms);
    return () => clearTimeout(t);
  }, [leaving, ms]);
  return [shown, leaving];
}

// Date.now(), refreshed every `ms` (aligned to the minute by default).
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

// Registration open? true / false / null (unknown, still loading or offline).
export function useRegistrationOpen() {
  const [open, setOpen] = useState(null);
  useEffect(() => {
    let alive = true;
    fetchRegistrationOpen().then((v) => {
      if (alive) setOpen(v);
    });
    return () => {
      alive = false;
    };
  }, []);
  return open;
}

// Which LED.status line to show right now.
export function useLedStatus() {
  const open = useRegistrationOpen();
  const now = useNow();
  return ledStatusKey({
    now,
    open,
    opensOn: EVENT.registrationOpensOn,
    closesOn: EVENT.registrationClosesOn,
    closesAt: EVENT.registrationClosesAt,
    startsAt: EVENT.startsAt,
  });
}
