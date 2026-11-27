import { cn } from '../../utils/cn.js';

// Station Metric Tile.
// Designed like a platform counter / departure board slot with high-visibility numeric readout.

export const StatTile = ({ label, value, hint, icon: Icon, tone = 'default', className }) => {
  const iconTone =
    tone === 'live' ? 'text-status-live group-hover:text-status-live'
    : tone === 'warn' ? 'text-status-warn group-hover:text-status-warn'
    : tone === 'crit' ? 'text-status-crit group-hover:text-status-crit'
    : tone === 'pink' ? 'text-txp-pink group-hover:text-txp-pink'
    : 'text-txp-yellow group-hover:text-txp-yellow';

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-[4px] border border-border-mid bg-bg-surface-1 p-6',
        'transition-all duration-160 ease-out-expo hover:border-txp-yellow/40 hover:bg-bg-surface-2',
        'shadow-[0_4px_16px_rgba(0,0,0,0.4)]',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim group-hover:text-text-secondary transition-colors">
          {label}
        </span>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-border-dim bg-bg-surface-2">
            <Icon size={16} className={cn('transition-all duration-160', iconTone)} />
          </div>
        )}
      </div>
      <div className="mt-4 font-cond text-[48px] font-black leading-none tracking-tight text-text-primary">
        {value}
      </div>
      {hint && (
        <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim">
          {hint}
        </div>
      )}
      {/* Station track highlight on bottom edge */}
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-txp-yellow to-transparent opacity-0 transition-opacity duration-320 group-hover:opacity-100" />
    </div>
  );
};
