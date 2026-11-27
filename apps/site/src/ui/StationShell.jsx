import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Station from '../scene/Station.jsx';
import { BOOT_MIN_MS, INTRO_TOTAL_MS } from '../scene/stage.js';
import { LED, UI } from '../content/station.js';
import { applyMotionPref, readMotionOff } from '../lib/station.js';
import { useLedStatus, usePanelRoute, usePresence } from './hooks.js';
import Panel from './Panel.jsx';
import Menu from './Menu.jsx';
import BookButton from './BookButton.jsx';
import Hints from './Hints.jsx';
import DoorTransition from './DoorTransition.jsx';
import About from './panels/About.jsx';
import Timetable from './panels/Timetable.jsx';
import Prizes from './panels/Prizes.jsx';
import Faq from './panels/Faq.jsx';
import Countdown from './panels/Countdown.jsx';
import PnrStatus from './panels/PnrStatus.jsx';
import '../styles/ui.css';
import logoUrl from '../assets/stage/logo.webp';

const loadCounter = () => import('./panels/ReservationCounter.jsx');
const ReservationCounter = lazy(loadCounter);

// Apply the saved motion preference before the stage first renders.
applyMotionPref(readMotionOff());

const EXIT_MS = 240;
// If the stage never reports the end of its opening, show the UI anyway.
// Boarding + art loading (preload gives up after 4 s) + the opening + slack.
const INTRO_FALLBACK_MS = BOOT_MIN_MS + 4000 + INTRO_TOTAL_MS + 1500;

const PANEL_VIEWS = {
  about: About,
  timetable: Timetable,
  prizes: Prizes,
  faq: Faq,
  countdown: Countdown,
  pnr: PnrStatus,
};

// Announces the departure board's status line to screen readers.
function LiveStatus({ ready }) {
  const key = useLedStatus();
  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {ready ? `${UI.liveStatusPrefix} ${LED.status[key]}` : ''}
    </p>
  );
}

// The landing page: the station stage plus everything on top of it.
export default function StationShell() {
  const { panel, open, close } = usePanelRoute();
  const [shown, leaving] = usePresence(panel, EXIT_MS);
  const [introDone, setIntroDone] = useState(() => Boolean(panel));
  const [pnrPrefill, setPnrPrefill] = useState(null);
  const [opener, setOpener] = useState(null);
  const dirtyRef = useRef(false);

  // Fallback in case the stage never calls onIntroDone.
  useEffect(() => {
    if (introDone) return undefined;
    const t = setTimeout(() => setIntroDone(true), INTRO_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [introDone]);

  const onIntroDone = useCallback(() => setIntroDone(true), []);

  // Fetch the booking counter's chunk once the browser is idle.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb) => setTimeout(cb, 2000));
    const cancel = window.cancelIdleCallback ?? clearTimeout;
    const id = idle(() => loadCounter().catch(() => {}), { timeout: 6000 });
    return () => cancel(id);
  }, []);

  // open(name, pnrPrefill?, opener?)
  const openPanel = useCallback(
    (name, prefill = null, openerEl = null) => {
      if (!panel) setOpener(openerEl ?? document.activeElement);
      if (name === 'pnr') setPnrPrefill(prefill);
      setIntroDone(true);
      open(name);
    },
    [open, panel],
  );

  const onDirtyChange = useCallback((dirty) => {
    dirtyRef.current = dirty;
  }, []);
  const shouldConfirm = useCallback(() => shown === 'book' && dirtyRef.current, [shown]);

  const panelOpen = Boolean(panel);
  const titleId = shown ? `panel-title-${shown}` : undefined;
  const View = shown ? PANEL_VIEWS[shown] : null;

  return (
    <div className={`txp-shell${introDone ? ' is-ready' : ''}${panelOpen ? ' has-panel' : ''}`}>
      <div className="txp-stage" inert={panelOpen ? '' : undefined}>
        <Station onHotspot={(name) => openPanel(name)} dimmed={panelOpen} onIntroDone={onIntroDone} />
      </div>

      {introDone && (
        <div className="txp-chrome" inert={panelOpen ? '' : undefined}>
          <img className="txp-logo" src={logoUrl} alt="TechXpress Hackathon" />
          <div className="station-top-nav">
            <Link
              to="/vortex"
              className="vortex-station-btn"
              aria-label="Enter VORTEX Passenger Terminal"
            >
              <span className="vortex-rivet rivet-tl" />
              <span className="vortex-rivet rivet-tr" />
              <span className="vortex-rivet rivet-bl" />
              <span className="vortex-rivet rivet-br" />
              <span className="vortex-btn-icon">
                <img src={logoUrl} alt="" className="vortex-btn-engine" />
              </span>
              <span className="vortex-btn-body">
                <span className="vortex-btn-en">VORTEX TERMINAL</span>
                <span className="vortex-btn-hi" lang="hi">प्रवेश द्वार · मंच 1</span>
              </span>
              <span className="vortex-btn-arrow" aria-hidden="true">→</span>
            </Link>
            <Menu onOpen={openPanel} />
          </div>
          <BookButton onOpen={openPanel} />
          <Hints />
        </div>
      )}

      {shown && (
        <Panel
          key={shown}
          name={shown}
          titleId={titleId}
          leaving={leaving}
          onClose={close}
          shouldConfirm={shouldConfirm}
          returnFocus={opener}
        >
          {shown === 'book' ? (
            <Suspense fallback={<p className="panel-loading" id={titleId} tabIndex={-1}>{UI.loadingCounter}</p>}>
              <ReservationCounter titleId={titleId} onOpen={openPanel} onDirtyChange={onDirtyChange} />
            </Suspense>
          ) : shown === 'pnr' ? (
            <PnrStatus titleId={titleId} prefill={pnrPrefill} onOpen={openPanel} />
          ) : (
            <View titleId={titleId} onOpen={openPanel} />
          )}
        </Panel>
      )}

      <LiveStatus ready={introDone} />
      <DoorTransition />
    </div>
  );
}
