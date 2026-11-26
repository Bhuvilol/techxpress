// The opening sequence (BOOT and INTRO in stage.js), using the Web
// Animations API. Every animation uses fill: 'backwards' (hidden / off-stage
// until its cue, then back to the element's own style when done), so
// skipping is just finish() on all of them.

import { BOOT, INTRO, INTRO_TOTAL_MS } from './stage.js';

// Plays on every visit, except deep links (a URL hash opens a panel straight
// away) and reduced motion.
export function shouldPlayIntro() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (window.location.hash) return false;
  return true;
}

const DROP_MS = 1700;
const SUNRISE_MS = 1400;
const REVEAL_MS = 1300;
const WOBBLE_MS = 420;

// Falls from above the screen on its chains, overshoots, then swings to rest
// from its top edge like a hanging board.
function dropFrames(el, ctx) {
  const d = el.offsetTop + el.offsetHeight + ctx.oy + 1000 * ctx.u;
  const o = '50% 0%';
  return [
    { transform: `translateY(${-d}px) rotate(0deg)`, transformOrigin: o, easing: 'cubic-bezier(.5,0,.75,.4)' },
    { transform: 'translateY(0px) rotate(0deg)', transformOrigin: o, offset: 0.34, easing: 'ease-out' },
    { transform: `translateY(${-22 * ctx.u}px) rotate(2.6deg)`, transformOrigin: o, offset: 0.46, easing: 'ease-in' },
    { transform: 'translateY(0px) rotate(-2deg)', transformOrigin: o, offset: 0.58, easing: 'ease-in-out' },
    { transform: 'translateY(0px) rotate(1.1deg)', transformOrigin: o, offset: 0.72, easing: 'ease-in-out' },
    { transform: 'translateY(0px) rotate(-0.5deg)', transformOrigin: o, offset: 0.86, easing: 'ease-in-out' },
    { transform: 'translateY(0px) rotate(0deg)', transformOrigin: o },
  ];
}

// The sun comes in from the side it sits on (left on phones, right on wide
// screens), from just off the screen, on a low arc that eases to a stop.
function sunriseFrames(el, ctx) {
  const left = el.offsetLeft + ctx.ox;
  const fromLeft = left + el.offsetWidth / 2 < ctx.vw / 2;
  const dx = fromLeft ? -(left + el.offsetWidth + 20 * ctx.u) : ctx.vw - left + 20 * ctx.u;
  const lift = 90 * ctx.u;
  return [
    { transform: `translate(${dx}px, ${lift}px)`, easing: 'cubic-bezier(.25,.6,.35,1)' },
    { transform: `translate(${dx * 0.35}px, ${lift * 0.15}px)`, offset: 0.55, easing: 'cubic-bezier(.3,.6,.4,1)' },
    { transform: 'translate(0px, 0px)' },
  ];
}

// Centre of the sun on screen (px).
function sunCentre(root) {
  const sun = root.querySelector('.stage__front [data-piece="sun"]');
  if (!sun) return { x: 0, y: 0 };
  const r = sun.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
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

const piecesOf = (root, id) => [...root.querySelectorAll(`[data-piece="${id}"]`)]
  .sort((a, b) => Number(a.dataset.index ?? 0) - Number(b.dataset.index ?? 0));

function runCues(root, ctx, cues, anims) {
  const run = (el, frames, opts) => {
    anims.push(el.animate(frames, { fill: 'backwards', ...opts }));
  };
  for (const cue of cues) {
    if (cue.enter === 'reveal') {
      // One soft-edged hole in the black curtain, growing from the sun's
      // centre until it passes every corner of the screen. Only the curtain
      // repaints, so the reveal stays smooth.
      const curtain = root.querySelector('.stage__curtain');
      if (curtain) {
        const sun = sunCentre(root);
        curtain.style.setProperty('--sx', `${sun.x}px`);
        curtain.style.setProperty('--sy', `${sun.y}px`);
        const radius = Math.hypot(Math.max(sun.x, ctx.vw - sun.x), Math.max(sun.y, ctx.vh - sun.y)) + 200;
        anims.push(curtain.animate(
          [{ '--r': '0px' }, { '--r': `${radius}px` }],
          { duration: REVEAL_MS, delay: cue.at, easing: 'cubic-bezier(.5,0,.25,1)', fill: 'both' },
        ));
      }
      continue;
    }
    if (!cue.piece) continue;
    piecesOf(root, cue.piece).forEach((el, i) => {
      const delay = cue.at + i * (cue.stagger ?? 0);
      switch (cue.enter) {
        case 'drop':
          run(el, dropFrames(el, ctx), { duration: DROP_MS, delay });
          break;
        case 'sunrise':
          run(el, sunriseFrames(el, ctx), { duration: SUNRISE_MS, delay });
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
          // ...and drawing A goes at the same instant, so the two never overlap.
          const a = el.querySelector('.cut--a');
          if (a) run(a, [{ opacity: 1 }, { opacity: 0 }], { duration: 60, delay, easing: 'steps(1, end)' });
          break;
        }
        default:
          break;
      }
    });
  }
}

// Part 1: the LED board drops in on the black screen. Returns its animations.
export function playBoard(root, ctx) {
  const anims = [];
  runCues(root, ctx, BOOT, anims);
  return anims;
}

// Part 2. Returns the animations (to finish on skip or cancel on unmount)
// and promises for the 'ui' cue and the end.
export function playIntro(root, ctx) {
  const anims = [];
  runCues(root, ctx, INTRO, anims);

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
