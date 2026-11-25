import { C } from './palette.js';

// Gradients and patterns shared by every layer <svg>. IDs are document-wide,
// so they're defined once in a zero-size (not display:none) svg.
export default function Defs() {
  return (
    <svg className="scene-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.sky0} />
          <stop offset="0.45" stopColor={C.sky1} />
          <stop offset="0.72" stopColor={C.sky2} />
          <stop offset="0.9" stopColor={C.sky3} />
          <stop offset="1" stopColor={C.horizon} />
        </linearGradient>

        <linearGradient id="g-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.stoneLight} />
          <stop offset="0.25" stopColor={C.stone} />
          <stop offset="1" stopColor={C.stoneDark} />
        </linearGradient>

        <linearGradient id="g-cabin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.cabinDeep} />
          <stop offset="0.55" stopColor="#B4524E" />
          <stop offset="1" stopColor={C.cabinWarm} />
        </linearGradient>

        <linearGradient id="g-window-lit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD994" />
          <stop offset="1" stopColor="#F2994A" />
        </linearGradient>

        <linearGradient id="g-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.glassHi} />
          <stop offset="0.6" stopColor={C.glass} />
        </linearGradient>

        <radialGradient id="g-lamp-glow" cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.08">
          <stop offset="0" stopColor={C.lamp} stopOpacity="0.6" />
          <stop offset="0.4" stopColor={C.lamp} stopOpacity="0.2" />
          <stop offset="1" stopColor={C.lamp} stopOpacity="0" />
        </radialGradient>

        <radialGradient id="g-point-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={C.lamp} stopOpacity="0.9" />
          <stop offset="0.3" stopColor={C.lamp} stopOpacity="0.35" />
          <stop offset="1" stopColor={C.lamp} stopOpacity="0" />
        </radialGradient>

        <radialGradient id="g-headlight" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF4C2" stopOpacity="1" />
          <stop offset="0.25" stopColor={C.yellow} stopOpacity="0.6" />
          <stop offset="1" stopColor={C.yellow} stopOpacity="0" />
        </radialGradient>

        <linearGradient id="g-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.sky2} stopOpacity="0" />
          <stop offset="0.5" stopColor={C.sky3} stopOpacity="0.16" />
          <stop offset="1" stopColor={C.sky2} stopOpacity="0" />
        </linearGradient>

        {/* Tactile paving: rows of raised dots */}
        <pattern id="p-tactile" width="18" height="14" patternUnits="userSpaceOnUse">
          <rect width="18" height="14" fill={C.tactile} />
          <circle cx="5" cy="4" r="2.4" fill="#F2C230" />
          <circle cx="14" cy="10" r="2.4" fill="#F2C230" />
        </pattern>

        {/* LED board: a dot grid used as a mask so real text shows as lit dots */}
        <pattern id="p-led-dots" width="4.5" height="4.5" patternUnits="userSpaceOnUse">
          <circle cx="2.25" cy="2.25" r="1.85" fill="#fff" />
        </pattern>
        <mask id="m-led-dots" maskContentUnits="userSpaceOnUse">
          <rect x="-4000" y="-4000" width="8000" height="8000" fill="url(#p-led-dots)" />
        </mask>

        {/* Hard sticker shadow (offset, no blur) for static boards */}
        <filter id="f-sticker" x="-10%" y="-10%" width="130%" height="140%">
          <feOffset in="SourceAlpha" dx="7" dy="9" result="off" />
          <feFlood floodColor={C.shadow} floodOpacity="0.85" />
          <feComposite in2="off" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}
