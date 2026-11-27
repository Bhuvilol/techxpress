import { EVENT, LABELS } from '../content/station.js';

// The big cardboard ticket that opens the booking counter. The outer link
// carries the drop shadow, the inner face is masked into a ticket shape.
export default function BookButton({ onOpen }) {
  return (
    <a
      href="#book"
      className="book-ticket book-ticket--register"
      onClick={(e) => {
        e.preventDefault();
        onOpen('book', null, e.currentTarget);
      }}
    >
      <span className="book-ticket-face">
        <span className="book-ticket-stub" aria-hidden="true">
          <span>{EVENT.trainNo}</span>
        </span>
        <span className="book-ticket-body">
          <span className="book-ticket-en">{LABELS.book.english}</span>
          <span className="book-ticket-hi" lang="hi">{LABELS.book.hindi}</span>
        </span>
        <span className="book-ticket-arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" focusable="false"><path d="M5 12h12M12 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </span>
    </a>
  );
}
