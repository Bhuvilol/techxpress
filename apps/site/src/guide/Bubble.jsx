import RajeshAvatar from './RajeshAvatar.jsx';
import { GUIDE } from '../content/guide.js';

// Speech bubble for the current step. Docked to the top or bottom of the
// screen, whichever is away from the highlighted element, so it never covers
// what it points at and needs no measuring of its own height.
export default function Bubble({ rect, step, index, total, canBack, canNext, isLast, hint, onBack, onNext, onStop, onAction }) {
  const mid = rect ? rect.top + rect.height / 2 : null;
  const dockTop = mid !== null && mid > window.innerHeight / 2;
  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onStop();
    }
  };
  return (
    <div className={`gs-dock ${dockTop ? 'gs-dock--top' : 'gs-dock--bottom'}`}>
      <div className="gs-bubble" role="status" aria-live="polite" onKeyDown={onKeyDown}>
        <div className="gs-bubble-head">
          <span className="gs-who"><RajeshAvatar size={28} />{GUIDE.name}</span>
          <span className="gs-count">{GUIDE.stepOf(index + 1, total)}</span>
        </div>
        <p className="gs-say">{step.say}</p>
        {hint && <p className="gs-hint">{hint}</p>}
        {step.actions?.length > 0 && (
          <div className="gs-actions">
            {step.actions.map((a) => (
              <button key={a.panel} type="button" className="txp-btn txp-btn--ink" onClick={() => onAction(a.panel)}>{a.label}</button>
            ))}
          </div>
        )}
        <div className="gs-bar">
          <button type="button" className="gs-stop" onClick={onStop}>{GUIDE.stop}</button>
          <span className="gs-nav">
            {canBack && <button type="button" className="txp-btn txp-btn--ghost" onClick={onBack}>{GUIDE.back}</button>}
            <button type="button" className="txp-btn txp-btn--pink" onClick={onNext} disabled={!canNext}>
              {isLast ? GUIDE.done : GUIDE.next}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
