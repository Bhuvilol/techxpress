import { EVENT, LABELS } from '../content/station.js';
import { PORTAL_URL, goToPortal } from './portal.js';

// The cardboard login ticket that forwards users to the VORTEX login page.
// Matches the exact cardboard ticket geometry and typography as Register here.
export default function LoginButton() {
  return (
    <a
      href={PORTAL_URL}
      className="book-ticket book-ticket--login"
      onClick={goToPortal}
    >
      <span className="book-ticket-face">
        <span className="book-ticket-stub" aria-hidden="true">
          <span>{EVENT.trainNo}</span>
        </span>
        <span className="book-ticket-body">
          <span className="book-ticket-en">{LABELS.login.english}</span>
          <span className="book-ticket-hi" lang="hi">{LABELS.login.hindi}</span>
        </span>
        <span className="book-ticket-arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" focusable="false">
            <path d="M5 12h12M12 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
    </a>
  );
}
