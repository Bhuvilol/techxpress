// The opening sequence: builds the stage piece by piece from INTRO in
// stage.js, using the Web Animations API. Every animation uses
// fill: 'backwards' (hidden / off-stage until its cue, then back to the
// element's own style when done), so skipping is just finish() on all of them.

import { INTRO, INTRO_TOTAL_MS } from './stage.js';

const SESSION_KEY = 'txp.intro';
const VISITED_KEY = 'txp.visited';

const read = (store, key) => {
  try { return window[store].getItem(key); } catch { return null; }
};

// Play once per session, never for returning visitors, deep links (a URL
// hash opens a panel straight away) or reduced motion.
export function shouldPlayIntro() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (window.location.hash) return false;
  if (read('localStorage', VISITED_KEY)) return false;
  if (read('sessionStorage', SESSION_KEY)) return false;
  return true;
}

export function markIntroPlayed() {
  try { window.sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* private mode */ }
}

// Once someone has seen the station (intro finished, skipped or not shown),
// later visits open straight on the finished stage.
export function markVisited() {
  try { window.localStorage.setItem(VISITED_KEY, '1'); } catch { /* private mode */ }
}

const RISE_MS = 820;
const SWING_MS = 900;
const FADE_MS = 700;
const WOBBLE_MS = 420;

// Keyframes per entry type. `ctx` has the screen geometry in px.
function riseFrames(el, ctx) {
  // From just below the bottom of the screen up to its place, with a spring.
  const top = el.offsetTop + ctx.oy;
  const d = ctx.vh - top + 30 * ctx.u;
  const o = 14 * ctx.u;
  return [
    { transform: `translateY(${d}px)`, easing: 'cubic-bezier(.2,.7,.3,1)' },
    { transform: `translateY(${-o}px)`, offset: 0.6, easing: 'ease-in-out' },
    { transform: `translateY(${o * 0.35}px)`, offset: 0.8, easing: 'ease-in-out' },
    { transform: 'translateY(0px)' },
  ];
}

function swingFrames(ctx) {
  // Folded flat toward the audience, then stands up on its bottom edge.
  const p = `perspective(${1400 * ctx.u}px)`;
  const o = '50% 100%';
  return [
    { transform: `${p} rotateX(-88deg)`, transformOrigin: o, opacity: 0, easing: 'cubic-bezier(.3,.6,.4,1)' },
    { transform: `${p} rotateX(-70deg)`, transformOrigin: o, opacity: 1, offset: 0.12, easing: 'cubic-bezier(.3,.6,.4,1)' },
    { transform: `${p} rotateX(9deg)`, transformOrigin: o, opacity: 1, offset: 0.66, easing: 'ease-in-out' },
    { transform: `${p} rotateX(-3deg)`, transformOrigin: o, opacity: 1, offset: 0.85, easing: 'ease-in-out' },
    { transform: `${p} rotateX(0deg)`, transformOrigin: o, opacity: 1 },
  ];
}

function slideFrames(el, ctx, travel) {
  // From off the left edge to the stop, slowing down like a train braking,
  // then the cardboard leans forward and settles.
  const right = el.offsetLeft + el.offsetWidth + ctx.ox;
  const dx = -(right + 40 * ctx.u);
  const total = travel + WOBBLE_MS;
  const stop = travel / total;
  const o = '50% 100%';
  return {
    duration: total,
    frames: [
      { transform: `translateX(${dx}px) skewX(0deg)`, transformOrigin: o, easing: 'cubic-bezier(.18,.6,.3,1)' },
      { transform: 'translateX(0px) skewX(0deg)', transformOrigin: o, offset: stop, easing: 'ease-out' },
      { transform: 'translateX(0px) skewX(-1.6deg)', transformOrigin: o, offset: stop + (1 - stop) * 0.3, easing: 'ease-in-out' },
      { transform: 'translateX(0px) skewX(0.7deg)', transformOrigin: o, offset: stop + (1 - stop) * 0.65, easing: 'ease-in-out' },
      { transform: 'translateX(0px) skewX(0deg)', transformOrigin: o },
    ],
  };
}

// Runs the opening on the stage root. Returns the animations (to finish on
// skip or cancel on unmount) and promises for the 'ui' cue and the end.
export function playIntro(root, ctx) {
  const anims = [];
  const run = (el, frames, opts) => {
    anims.push(el.animate(frames, { fill: 'backwards', ...opts }));
  };
  const pieces = (id) => [...root.querySelectorAll(`[data-piece="${id}"]`)]
    .sort((a, b) => Number(a.dataset.index ?? 0) - Number(b.dataset.index ?? 0));

  for (const cue of INTRO) {
    if (!cue.piece) continue;
    pieces(cue.piece).forEach((el, i) => {
      const delay = cue.at + i * (cue.stagger ?? 0);
      switch (cue.enter) {
        case 'fade':
          run(el, [{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS, delay, easing: 'ease-out' });
          break;
        case 'rise':
          run(el, riseFrames(el, ctx), { duration: RISE_MS, delay });
          break;
        case 'swing':
          run(el, swingFrames(ctx), { duration: SWING_MS, delay });
          break;
        case 'slide-in': {
          const { duration, frames } = slideFrames(el, ctx, cue.duration ?? 1000);
          run(el, frames, { duration, delay });
          break;
        }
        case 'state:B': {
          // Hard cut to drawing B: stop-motion, no cross-fade.
          const b = el.querySelector('.cut--b');
          if (b) run(b, [{ opacity: 0 }, { opacity: 1 }], { duration: 60, delay, easing: 'steps(1, end)' });
          break;
        }
        default:
          break;
      }
    });
    // The wires appear once the last mast is up.
    if (cue.piece === 'mast') {
      const n = pieces('mast').length;
      const wires = root.querySelector('[data-piece="wires"]');
      if (wires) run(wires, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: cue.at + (n - 1) * (cue.stagger ?? 0) + RISE_MS * 0.7 });
    }
  }

  // Two empty "clock" animations on the root carry the cue times, so pausing
  // (hidden tab) and skipping (finish) treat them like everything else.
  const clock = (duration) => {
    const a = new Animation(new KeyframeEffect(root, null, { duration }));
    a.play();
    anims.push(a);
    return a.finished.then(() => true, () => false);
  };
  const uiCue = INTRO.find((c) => c.enter === 'ui');
  return {
    anims,
    ui: clock(uiCue ? uiCue.at : INTRO_TOTAL_MS),
    done: clock(INTRO_TOTAL_MS),
  };
}
