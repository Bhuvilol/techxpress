import RajeshAvatar from './RajeshAvatar.jsx';
import { GUIDE } from '../content/guide.js';

// The floating "Need help?" chip and its menu of journeys. Lives outside the
// stage chrome on purpose: the chrome fades out and goes inert while a panel
// is open, and help is most wanted inside the form.
export default function Launcher({ journeys, open, onToggle, onPick, compact }) {
  return (
    <div className={`gs-launcher${compact ? ' gs-launcher--compact' : ''}`}>
      {open && (
        <div className="gs-menu" role="dialog" aria-label={GUIDE.menuTitle}>
          <p className="gs-menu-title">{GUIDE.menuTitle}</p>
          <p className="gs-menu-intro">{GUIDE.menuIntro}</p>
          <ul>
            {journeys.map((j) => (
              <li key={j.id}>
                <button type="button" className="gs-menu-item" onClick={() => onPick(j.id)}>
                  <strong>{j.title}</strong>
                  <span>{j.blurb}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button type="button" className="gs-chip" onClick={onToggle} aria-expanded={open} aria-label={GUIDE.launcher}>
        <RajeshAvatar size={34} />
        <span className="gs-chip-text">{open ? 'Close' : GUIDE.launcher}</span>
      </button>
    </div>
  );
}
