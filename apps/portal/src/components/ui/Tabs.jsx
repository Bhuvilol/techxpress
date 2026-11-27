import { cn } from '../../utils/cn.js';

// Station Route & Platform Tabs.
// Designed with Indian Railways platform selectors and illuminated amber underline indicators.

export const Tabs = ({ value, onChange, items, className }) => (
  <div className={cn('flex justify-start md:justify-center overflow-x-auto flex-nowrap gap-1 border-b border-border-mid no-scrollbar', className)}>
    {items.map((item) => {
      const active = value === item.value;
      return (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            'relative flex items-center gap-2 px-5 py-3.5 font-cond text-[16px] font-bold uppercase tracking-[0.06em] transition-colors duration-160 ease-out-expo whitespace-nowrap',
            active ? 'text-txp-yellow bg-txp-yellow/5' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.02]',
          )}
        >
          {item.icon && <item.icon size={16} className={active ? 'text-txp-yellow' : 'text-text-dim'} />}
          <span>{item.label}</span>
          {item.badge != null && (
            <span className={cn(
              'rounded-[2px] px-1.5 py-0.2 font-mono text-[10px] font-bold tracking-wider transition-all duration-160',
              active ? 'bg-txp-yellow text-txp-ink' : 'bg-bg-surface-3 text-text-dim',
            )}>
              {item.badge}
            </span>
          )}
          {active && (
            <span className="absolute inset-x-0 -bottom-px h-[3px] bg-txp-yellow shadow-[0_0_12px_#f5b800]" />
          )}
        </button>
      );
    })}
  </div>
);
