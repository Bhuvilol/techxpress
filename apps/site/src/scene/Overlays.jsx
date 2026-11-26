// Things the stage draws itself on top of the cutouts: real text on the name
// board and LED board, the timetable rows, and the overhead wires. All
// boxes come from the tuning table in overlays.js.

import { useEffect, useLayoutEffect, useRef } from 'react';
import { LED, STATION, TIMETABLE, LABELS } from '../content/station.js';
import { OVERLAYS, ledStatus, subBox } from './overlays.js';

const px = (n) => `${n}px`;
const boxStyle = (b, u) => ({ left: px(b.x * u), top: px(b.y * u), width: px(b.w * u), height: px(b.h * u) });

// One line of text that shrinks to fit its parent's width (never grows).
function FitLine({ size, className, children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    let alive = true;
    const fit = () => {
      if (!alive || !el) return;
      el.style.fontSize = px(size);
      const parent = el.parentElement;
      const cs = getComputedStyle(parent);
      const avail = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const need = el.offsetWidth;
      if (need > avail && avail > 0) el.style.fontSize = px((size * avail) / need);
    };
    fit();
    document.fonts?.ready.then(fit);
    return () => { alive = false; };
  }, [size, children]);
  return <span ref={ref} className={className} style={{ fontSize: px(size) }}>{children}</span>;
}

// ── Name board ─────────────────────────────────────────────────────────────

export function NameBoardText({ box, u, onPlaceholder }) {
  const f = OVERLAYS.nameboard;
  const b = subBox(box, f.box);
  const h = b.h * u;
  return (
    <div className={`ov ov-name${onPlaceholder ? ' ov-name--ph' : ''}`} style={boxStyle(b, u)} aria-hidden="true">
      <FitLine className="ov-name__hi" size={h * f.hindi}>{STATION.hindi}</FitLine>
      <FitLine className="ov-name__en" size={h * f.english}>{STATION.english}</FitLine>
      <FitLine className="ov-name__alt" size={h * f.altitude}>{STATION.altitude}</FitLine>
    </div>
  );
}

// ── LED board ──────────────────────────────────────────────────────────────

// Orange dot-matrix text. The dots are a CSS mask on the text itself; the
// scrolling line moves in whole-dot steps so its dots stay on the grid, like
// a real indicator board.
export function LedText({ box, u, scroll }) {
  const f = OVERLAYS.ledboard;
  const b = subBox(box, f.box);
  const pitch = Math.max(2, b.h * u * f.pitch);
  const rowH = pitch * 11;
  const trackRef = useRef(null);
  const textRef = useRef(null);
  const status = ledStatus();

  useEffect(() => {
    if (!scroll) return undefined;
    const track = trackRef.current;
    const text = textRef.current;
    let anim = null;
    let alive = true;
    // Measure only once the LED font is in, or the travel comes out short.
    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (!alive) return;
      const start = Math.ceil(track.clientWidth / pitch) * pitch;
      const steps = Math.ceil((start + text.offsetWidth) / pitch);
      const speed = 70 * u; // px per second
      anim = text.animate(
        [{ transform: `translateX(${start}px)` }, { transform: `translateX(${start - steps * pitch}px)` }],
        { duration: ((steps * pitch) / speed) * 1000, iterations: Infinity, easing: `steps(${steps}, end)` },
      );
    });
    return () => {
      alive = false;
      anim?.cancel();
    };
  }, [scroll, pitch, u, status]);

  const dots = { '--dot': px(pitch), padding: `${px(pitch)} ${px(pitch * 2)}` };
  return (
    <div className="ov ov-led" style={{ ...boxStyle(b, u), ...dots }} aria-hidden="true">
      <div className="ov-led__row">
        <FitLine className="ov-led__text" size={rowH}>{LED.headline}</FitLine>
      </div>
      <div className={`ov-led__row${scroll ? ' ov-led__row--track' : ''}`} ref={trackRef}>
        {scroll
          ? <span ref={textRef} className="ov-led__text ov-led__scroll" style={{ fontSize: px(rowH * 0.82) }}>{status}</span>
          : <FitLine className="ov-led__text" size={rowH * 0.82}>{status}</FitLine>}
      </div>
    </div>
  );
}

// ── Clock ──────────────────────────────────────────────────────────────────

// Hands show local time. Each hand holds its current angle in `rotate` and
// spins from there with a CSS animation (seconds tick in 60 steps), so no
// timer runs while it is animated. It re-reads the time when the tab comes
// back (animations pause while hidden) and once a minute with reduced motion.
export function Wires({ masts, full, u }) {
  const f = OVERLAYS.mast;
  if (!masts.length) return null;
  const tops = masts
    .map((p) => ({ x: p.box.x + p.box.w * f.wireAt.x, y: p.box.y + p.box.h * f.wireAt.y, drop: p.box.h * f.contactDrop }))
    .sort((a, b) => a.x - b.x);
  // Carry the wire on past the outer masts to the edges of the bleed.
  const pts = [{ ...tops[0], x: full.x - 40 }, ...tops, { ...tops[tops.length - 1], x: full.x + full.w + 40 }];
  let catenary = `M${pts[0].x} ${pts[0].y}`;
  let contact = `M${pts[0].x} ${pts[0].y + pts[0].drop}`;
  let droppers = '';
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1];
    const b = pts[i];
    const span = b.x - a.x;
    const sag = Math.min(40, span * 0.035);
    const mx = (a.x + b.x) / 2;
    catenary += ` Q${mx} ${(a.y + b.y) / 2 + sag * 2} ${b.x} ${b.y}`;
    contact += ` Q${mx} ${(a.y + b.y) / 2 + a.drop + sag * 0.3} ${b.x} ${b.y + b.drop}`;
    // Droppers: short verticals from the catenary down to the contact wire.
    for (let k = 1; k < 6; k += 1) {
      const t = k / 6;
      const x = a.x + span * t;
      const bend = 4 * t * (1 - t);
      const y1 = a.y + (b.y - a.y) * t + sag * 2 * bend;
      const y2 = a.y + a.drop + (b.y - a.y) * t + sag * 0.3 * bend;
      if (y2 - y1 > 3) droppers += `M${x.toFixed(1)} ${y1.toFixed(1)}V${y2.toFixed(1)}`;
    }
  }
  return (
    <svg
      className="ov-wires"
      data-piece="wires"
      viewBox={`${full.x} ${full.y} ${full.w} ${full.h}`}
      style={{ left: px(full.x * u), top: px(full.y * u), width: px(full.w * u), height: px(full.h * u) }}
      aria-hidden="true"
      focusable="false"
    >
      <path d={droppers} strokeWidth="1.4" />
      <path d={catenary} strokeWidth="2.4" />
      <path d={contact} strokeWidth="2.8" />
    </svg>
  );
}

// ── Timetable board ────────────────────────────────────────────────────────
// A few real rows from the timetable, printed on the board's cream face.
export function TimetableText({ box, u }) {
  const f = OVERLAYS.timetable;
  const b = subBox(box, f.box);
  const h = b.h * u;
  const rows = [
    ...TIMETABLE.preDeparture.map((r) => [r.date, r.title]),
    ...TIMETABLE.days[0].stops.filter((r) => r.key).map((r) => [`04 DEC ${r.time}`, r.title]),
  ].slice(0, f.rows);
  return (
    <div className="ov ov-tt" style={boxStyle(b, u)} aria-hidden="true">
      <div className="ov-tt__head">
        <FitLine size={h * 0.07}>
          <span lang="hi">{LABELS.timetable.hindi}</span> · {LABELS.timetable.english.toUpperCase()}
        </FitLine>
      </div>
      {rows.map(([when, what]) => (
        <div key={when + what} className="ov-tt__row" style={{ fontSize: px(h * 0.044) }}>
          <span className="ov-tt__when">{when}</span>
          <span className="ov-tt__what">{what}</span>
        </div>
      ))}
    </div>
  );
}
