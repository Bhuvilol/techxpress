// One cardboard cutout standing on the stage.
//
//   .piece          positioned box (px). The opening animates its transform;
//                   hover lifts it with the separate `translate` property.
//     .piece__boil  the hand-made "boil" jitter (CSS steps loop)
//       .cut        one <img> (or placeholder card) per drawing, stacked;
//                   stop-motion swaps toggle the B drawing's opacity.
//       overlays    text / clock hands drawn by the stage
//     .tag          hover label (hotspots only)
//
// `hotspotsOn`: null while the opening plays (not clickable yet), true when
// hotspots are live, false while a panel is open (out of the tab order).
//
// Each element animates only transform or opacity, and the cardboard edge +
// shadow filter sits on the static drawings, so nothing repaints per frame.

import { LABELS } from '../content/station.js';
import { LOOPS } from './stage.js';
import { OVERLAYS } from './overlays.js';
import { hash } from './geometry.js';

const px = (n) => `${n}px`;

// Drawing B starts visible for pieces whose resting state is B.
const REST_ON_B = new Set(['train', 'lamp']);

function Placeholder({ piece, state, u, className, style }) {
  const { box, id, states, fit } = piece;
  const label = states > 1 ? `${id} · ${state}` : id;
  // Big enough to read, small enough that the label fits the card's width.
  const size = Math.max(8, Math.min(box.h * 0.16, (box.w * 0.85) / (label.length * 0.55), 140) * u);
  return (
    <div className={`cut ph ${className}${fit === 'cover' ? ' ph--sky' : ''}`} style={style} aria-hidden="true">
      <span className="ph__label" style={{ fontSize: px(fit === 'cover' ? 30 * u : size) }}>{label}</span>
      {states > 1 && <span className="ph__state" style={{ fontSize: px(size * 1.6) }}>{state}</span>}
    </div>
  );
}

// Inline CSS animations for the living stage (stop-motion and lamps).
// Every piece gets its own speed and phase from a hash of its key.
function swapAnimation(piece) {
  const seed = hash(piece.key);
  const jitter = 0.92 + (seed % 17) / 100; // 0.92 .. 1.08
  if (piece.id === 'rajesh') {
    const { period, pauseBetween } = LOOPS.rajesh;
    return `stage-wave ${period + pauseBetween}ms steps(1, end) 1200ms infinite`;
  }
  if (piece.id === 'lamp') {
    return `stage-lamp-on 1500ms steps(1, end) ${300 + piece.index * 450}ms both, `
      + `stage-lamp-dip ${Math.round(11000 * jitter)}ms steps(1, end) ${4000 + (seed % 5000)}ms infinite`;
  }
  const loop = LOOPS[piece.id];
  if (!loop?.period) return undefined;
  const period = Math.round(loop.period * jitter);
  return `stage-swap ${period * 2}ms steps(1, end) ${-(seed % (period * 2))}ms infinite`;
}

function boilStyle(piece) {
  const seed = hash(`${piece.key}:boil`);
  const { period } = LOOPS.boil;
  // Big flat pieces (platforms, train) only shift; turning them would swing
  // their far ends by many units.
  const variant = piece.box.w > 900 ? 'flat' : ['a', 'b', 'c'][seed % 3];
  return {
    animationName: `stage-boil-${variant}`,
    animationDuration: `${period * 4}ms`,
    animationDelay: `${-((seed % 4) * period + (seed % 97))}ms`,
  };
}

export default function Piece({ piece, u, live, motion, overlay, hotspotsOn, onHotspot, children }) {
  const { box, id, key, index, art, states, hotspot } = piece;
  const label = hotspot ? LABELS[hotspot] : null;
  const interactive = Boolean(hotspot) && hotspotsOn !== null;
  const drawings = states > 1 ? ['A', 'B'] : ['A'];
  const animate = live && motion;
  const swap = animate && states > 1 ? swapAnimation(piece) : undefined;

  const activate = (e) => {
    if (e.type === 'keydown') {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
    }
    onHotspot?.(hotspot);
  };

  const hotProps = interactive ? {
    role: 'button',
    tabIndex: hotspotsOn ? 0 : -1,
    'aria-label': `${label.english}, ${label.hint}`,
    onClick: activate,
    onKeyDown: activate,
  } : {};

  return (
    <div
      className={`piece piece--${id}${interactive ? ' hot' : ''}${art ? '' : ' piece--ph'}`}
      data-piece={id}
      data-index={index}
      data-key={key}
      style={{ left: px(box.x * u), top: px(box.y * u), width: px(box.w * u), height: px(box.h * u) }}
      {...hotProps}
    >
      <div className={`piece__boil${animate && id !== 'sky' ? ' is-boiling' : ''}`} style={animate ? boilStyle(piece) : undefined}>
        {drawings.map((state, i) => {
          const cls = `cut--${state.toLowerCase()}${i && REST_ON_B.has(id) ? ' rest-on' : ''}`;
          const style = i ? { animation: swap } : undefined;
          return art ? (
            <img
              key={state}
              className={`cut ${cls}`}
              style={style}
              src={art.srcs[i] ?? art.srcs[0]}
              width={art.w}
              height={art.h}
              alt=""
              aria-hidden="true"
              draggable="false"
              decoding="async"
            />
          ) : (
            <Placeholder key={state} piece={piece} state={state} u={u} className={cls} style={style} />
          );
        })}
        {overlay}
      </div>
      {children}
      {interactive && (
        <span className="tag" aria-hidden="true">
          <span className="tag__en">{label.english}</span>
          <span className="tag__hi">{label.hindi}</span>
        </span>
      )}
    </div>
  );
}

// The open train door, clickable once the train has stopped.
export function TrainDoor({ piece, u, hotspotsOn, onHotspot }) {
  const f = OVERLAYS.trainDoor;
  const { box, doorAt } = piece;
  const label = LABELS.book;
  const w = box.w * f.w;
  const activate = (e) => {
    if (e.type === 'keydown') {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
    }
    onHotspot?.('book');
  };
  return (
    <div
      className="hot hot--door"
      role="button"
      tabIndex={hotspotsOn ? 0 : -1}
      aria-label={`${label.english}, ${label.hint}`}
      onClick={activate}
      onKeyDown={activate}
      style={{ left: px((box.w * doorAt - w / 2) * u), top: px(box.h * f.y * u), width: px(w * u), height: px(box.h * f.h * u) }}
    >
      <span className="tag" aria-hidden="true">
        <span className="tag__en">{label.english}</span>
        <span className="tag__hi">{label.hindi}</span>
      </span>
    </div>
  );
}
