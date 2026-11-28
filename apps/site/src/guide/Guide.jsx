import { Component, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { TALL_QUERY } from '../scene/layout.js';
import { useMediaQuery, useRegistrationOpen } from '../ui/hooks.js';
import { GUIDE } from '../content/guide.js';
import { findJourney, journeysFor } from './journeys.js';
import { useTarget } from './useTarget.js';
import Spotlight from './Spotlight.jsx';
import Bubble from './Bubble.jsx';
import Launcher from './Launcher.jsx';
import '../styles/guide.css';

const KEY = 'txp.guide';
const CONTROL = 'input, select, textarea';

const loadRun = () => {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const run = raw ? JSON.parse(raw) : null;
    return run && typeof run.id === 'string' && Number.isInteger(run.step) ? run : { id: null, step: 0 };
  } catch {
    return { id: null, step: 0 };
  }
};
const saveRun = (run) => {
  try {
    if (run.id) window.sessionStorage.setItem(KEY, JSON.stringify(run));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* storage blocked: a reload simply ends the walkthrough */
  }
};

// Optional steps (Branch) are skipped when their field is not on the page.
const stepPresent = (st) => !st.optional || !st.target || Boolean(document.querySelector(st.target));

const controlOf = (el) => (!el ? null : el.matches?.(CONTROL) ? el : el.querySelector(CONTROL));

// A bug in the guide must never take the station down with it.
class Boundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error('[guide] crashed and was switched off:', error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function GuideInner({ panel, onOpen, onClose, ready }) {
  const registrationOpen = useRegistrationOpen();
  const tall = useMediaQuery(TALL_QUERY);
  const [run, setRun] = useState(loadRun);
  const [menuOpen, setMenuOpen] = useState(false);
  const [, bump] = useReducer((n) => n + 1, 0);
  const driving = useRef(false);
  const latest = useRef({ panel, onOpen, onClose });
  useEffect(() => {
    latest.current = { panel, onOpen, onClose };
  });

  const journey = run.id ? findJourney(run.id, registrationOpen) : null;
  const step = journey?.steps[run.step] ?? null;
  const nextStep = journey?.steps[run.step + 1] ?? null;

  const update = useCallback((next) => {
    saveRun(next);
    setRun(next);
  }, []);
  const stop = useCallback(() => update({ id: null, step: 0 }), [update]);

  const start = (id) => {
    const j = findJourney(id, registrationOpen);
    if (!j) return;
    setMenuOpen(false);
    // Begin at the first step that fits whatever is open right now.
    const at = j.steps.findIndex((s) => s.panel === '*' || s.panel === panel);
    update({ id, step: Math.max(0, at) });
  };
  const goNext = useCallback(() => {
    if (!journey) return;
    let i = run.step + 1;
    while (i < journey.steps.length && !stepPresent(journey.steps[i])) i += 1;
    if (i >= journey.steps.length) stop();
    else update({ id: run.id, step: i });
  }, [journey, run, stop, update]);
  const goBack = () => {
    let i = run.step - 1;
    while (i > 0 && !stepPresent(journey.steps[i])) i -= 1;
    update({ id: run.id, step: Math.max(0, i) });
  };

  // When the step changes, take the person to the panel it lives in.
  const stepKey = step ? `${run.id}:${run.step}` : null;
  useEffect(() => {
    if (!stepKey) return;
    const want = journeysFor(registrationOpen).find((j) => j.id === run.id)?.steps[run.step]?.panel;
    const { panel: cur, onOpen: open, onClose: close } = latest.current;
    if (want === '*' || want === cur) return;
    driving.current = true;
    if (want) open(want);
    else close();
    // Only when the step itself changes: not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey]);

  // The person closed or left the panel on their own: end the guide.
  useEffect(() => {
    if (!step || step.panel === '*') return;
    if (panel === step.panel) driving.current = false;
    else if (!driving.current && panel !== nextStep?.panel) stop();
  }, [panel, step, nextStep, stop]);

  const onRoute = Boolean(step) && (step.panel === '*' || step.panel === panel);
  const { rect, el, missing } = useTarget(step?.target, ready && onRoute);

  // How this step advances.
  useEffect(() => {
    if (!step || !el) return undefined;
    if (step.advance === 'input') {
      const control = controlOf(el);
      if (!control) return undefined;
      control.addEventListener('input', bump);
      control.addEventListener('change', bump);
      return () => {
        control.removeEventListener('input', bump);
        control.removeEventListener('change', bump);
      };
    }
    if (step.advance === 'pills') {
      // Re-check the count once React has painted the click.
      const onClick = () => setTimeout(bump, 0);
      el.addEventListener('click', onClick);
      return () => el.removeEventListener('click', onClick);
    }
    if (step.advance === 'click') {
      const onClick = () => setTimeout(goNext, 0);
      el.addEventListener('click', onClick);
      return () => el.removeEventListener('click', onClick);
    }
    return undefined;
  }, [step, el, goNext]);

  // A saved run whose journey or step no longer exists counts as no run.
  const showLauncher = ready && !step;
  const options = journeysFor(registrationOpen);

  let overlay = null;
  if (ready && step && onRoute) {
    const control = step.advance === 'input' ? controlOf(el) : null;
    const waitInput = step.advance === 'input' && !missing && (!control || control.value.trim() === '');
    const waitClick = step.advance === 'click' && !missing;
    const need = step.min ?? 1;
    const picked = step.advance === 'pills' && el ? el.querySelectorAll('.reg-pill.active').length : 0;
    const waitPills = step.advance === 'pills' && !missing && picked < need;
    const hint = missing ? GUIDE.missing
      : waitInput ? GUIDE.waitInput
      : waitClick ? GUIDE.waitClick
      : waitPills ? GUIDE.waitPills(need)
      : null;
    // Count only the steps that apply to this person (Branch may be skipped).
    const visible = journey.steps.filter(stepPresent);
    const shownIndex = Math.max(0, visible.indexOf(step));
    const isLast = journey.steps.slice(run.step + 1).every((st) => !stepPresent(st));
    overlay = (
      <>
        {step.target && rect && <Spotlight rect={rect} />}
        <Bubble
          rect={rect}
          step={step}
          index={shownIndex}
          total={visible.length}
          canBack={run.step > 0}
          canNext={!waitInput && !waitClick && !waitPills}
          isLast={isLast}
          hint={hint}
          onBack={goBack}
          onNext={goNext}
          onStop={stop}
          onAction={(name) => {
            stop();
            onOpen(name);
          }}
        />
      </>
    );
  }

  return (
    <>
      {showLauncher && (
        <Launcher
          journeys={options}
          open={menuOpen}
          onToggle={() => setMenuOpen((v) => !v)}
          onPick={start}
          compact={tall && Boolean(panel)}
        />
      )}
      {overlay}
    </>
  );
}

export default function Guide(props) {
  return (
    <Boundary>
      <GuideInner {...props} />
    </Boundary>
  );
}
