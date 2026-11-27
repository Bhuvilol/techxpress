import { cn } from '../../utils/cn.js';

// Railway Station Enamel Badge & Ticket Stamp.
// Inspired by Indian Railways status plates, platform stamps, and ticket classifications.

const TONE = {
  cyan:   'border-accent-cyan/40 text-accent-cyan bg-accent-cyan/10 shadow-[0_0_10px_-3px_rgba(34,211,238,0.3)]',
  yellow: 'border-txp-yellow/50 text-txp-yellow bg-txp-yellow/10 shadow-[0_0_10px_-3px_rgba(245,184,0,0.3)]',
  pink:   'border-txp-pink/50 text-txp-pink bg-txp-pink/10 shadow-[0_0_10px_-3px_rgba(232,80,138,0.3)]',
  teal:   'border-txp-teal/50 text-txp-teal bg-txp-teal/10 shadow-[0_0_10px_-3px_rgba(24,179,176,0.3)]',
  live:   'border-status-live/50 text-status-live bg-status-live/10 shadow-[0_0_10px_-3px_rgba(16,185,129,0.3)]',
  warn:   'border-status-warn/50 text-status-warn bg-status-warn/10 shadow-[0_0_10px_-3px_rgba(245,184,0,0.3)]',
  crit:   'border-status-crit/50 text-status-crit bg-status-crit/10 shadow-[0_0_10px_-3px_rgba(239,68,68,0.3)]',
  dim:    'border-border-mid text-text-secondary bg-bg-surface-2',
  paper:  'border-txp-kraft text-txp-ink bg-txp-paper font-cond font-bold',
};

const DOT = {
  cyan:   'bg-accent-cyan shadow-[0_0_6px_#22d3ee]',
  yellow: 'bg-txp-yellow shadow-[0_0_6px_#f5b800]',
  pink:   'bg-txp-pink shadow-[0_0_6px_#e8508a]',
  teal:   'bg-txp-teal shadow-[0_0_6px_#18b3b0]',
  live:   'bg-status-live shadow-[0_0_6px_#10b981]',
  warn:   'bg-status-warn shadow-[0_0_6px_#f5b800]',
  crit:   'bg-status-crit shadow-[0_0_6px_#ef4444]',
  dim:    'bg-text-dim',
  paper:  'bg-txp-ink',
};

export const Badge = ({ tone = 'dim', dot, children, className }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em]',
      TONE[tone] ?? TONE.dim,
      className,
    )}
  >
    {dot && <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse-soft', DOT[tone] ?? DOT.dim)} />}
    {children}
  </span>
);
