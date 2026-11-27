import { cn } from '../../utils/cn.js';

// Station Enamel Board Card.
// Clean enamel board with 1px tactile borders, corner rivet details,
// and smooth station-light hover response.

export const NeonBorderCard = ({ children, className }) => (
  <div
    className={cn(
      'group relative overflow-hidden rounded-[4px] border border-border-mid bg-bg-surface-1',
      'shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]',
      'transition-all duration-240 hover:border-txp-yellow/40 hover:bg-bg-surface-2 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_20px_-4px_rgba(245,184,0,0.2)]',
      className,
    )}
  >
    {/* Corner rivet styling */}
    <span className="pointer-events-none absolute left-1.5 top-1.5 h-1 w-1 rounded-full bg-white/20 group-hover:bg-txp-yellow/40 transition-colors" />
    <span className="pointer-events-none absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-white/20 group-hover:bg-txp-yellow/40 transition-colors" />
    <span className="pointer-events-none absolute left-1.5 bottom-1.5 h-1 w-1 rounded-full bg-white/20 group-hover:bg-txp-yellow/40 transition-colors" />
    <span className="pointer-events-none absolute right-1.5 bottom-1.5 h-1 w-1 rounded-full bg-white/20 group-hover:bg-txp-yellow/40 transition-colors" />

    {/* Subtle warm station ambient sheen */}
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-320" />
    <div className="relative z-10 h-full w-full">{children}</div>
  </div>
);
