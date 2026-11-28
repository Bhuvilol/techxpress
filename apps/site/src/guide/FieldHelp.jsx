import RajeshAvatar from './RajeshAvatar.jsx';
import { FIELD_GUIDE } from '../content/fieldGuide.js';
import '../styles/fieldhelp.css';

// The "?" beside a field's label and the note it opens under the label. Both
// halves are driven by the field's own state (in FieldWrap), so the note can
// sit under the label instead of floating: nothing to clip inside the panel's
// scroll area, and it works the same on a phone.

export function HelpButton({ field, open, onToggle }) {
  return (
    <button
      type="button"
      className={`fh-btn${open ? ' is-open' : ''}`}
      aria-expanded={open}
      aria-controls={`fh-${field}`}
      aria-label="What should I enter here?"
      onClick={onToggle}
      onKeyDown={(e) => {
        // Esc closes the note first; a second Esc closes the panel as before.
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          onToggle();
        }
      }}
    >
      ?
    </button>
  );
}

export function HelpNote({ field, open }) {
  const g = FIELD_GUIDE[field];
  if (!open || !g) return null;
  return (
    <div className="fh-note" id={`fh-${field}`} role="note">
      <p className="fh-who"><RajeshAvatar size={22} />Rajesh says</p>
      <p className="fh-row"><strong>Enter</strong> {g.what}</p>
      {g.example && <p className="fh-row"><strong>Example</strong> <span className="fh-ex">{g.example}</span></p>}
      {g.avoid && <p className="fh-row fh-row--avoid"><strong>Avoid</strong> {g.avoid}</p>}
    </div>
  );
}
