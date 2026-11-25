import { useMemo } from 'react';
import { X } from 'lucide-react';
import { THEMES, OTHER, themeForDomain } from '../../lib/themes.js';
import { cn } from '../../utils/cn.js';

// Registration "Preferred Domain" picker: domains grouped by theme in an even
// grid, plus a strip showing the picks in order (#1 is the primary domain).
//
// Props: domains [{ id, name }], value [domainId] (ordered), max, onToggle(id)
export const DomainPicker = ({ domains, value, max = 4, onToggle }) => {
  const groups = useMemo(() => {
    const byTheme = new Map();
    for (const d of domains) {
      const theme = themeForDomain(d.name);
      if (!byTheme.has(theme.id)) byTheme.set(theme.id, { theme, items: [] });
      byTheme.get(theme.id).items.push(d);
    }
    return [...THEMES, OTHER]
      .filter((t) => byTheme.has(t.id))
      .map((t) => {
        const g = byTheme.get(t.id);
        g.items.sort((a, b) => a.name.localeCompare(b.name));
        return g;
      });
  }, [domains]);

  const nameById = useMemo(() => new Map(domains.map((d) => [d.id, d.name])), [domains]);
  const full = value.length >= max;

  return (
    <div className="space-y-5">
      {/* Picks, in order */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          Selected <span className="text-white/80">{value.length}/{max}</span>
        </div>
        {value.length === 0 ? (
          <p className="font-mono text-[11px] text-white/40">
            Pick up to {max} below. Your first pick becomes your primary domain.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {value.map((id, i) => (
              <span
                key={id}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[11px]',
                  i === 0 ? 'border-white bg-white text-black' : 'border-white/20 bg-white/[0.04] text-white/85',
                )}
              >
                <span className={cn('text-[10px] font-bold', i === 0 ? 'text-black/60' : 'text-white/45')}>#{i + 1}</span>
                {nameById.get(id) ?? 'Unknown domain'}
                {i === 0 && <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-black/50">Primary</span>}
                <button
                  type="button"
                  onClick={() => onToggle(id)}
                  className={cn('-mr-1 p-0.5', i === 0 ? 'text-black/50 hover:text-black' : 'text-white/40 hover:text-white')}
                  aria-label={`Remove ${nameById.get(id) ?? 'domain'}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Options by theme */}
      {groups.map(({ theme, items }) => {
        const Icon = theme.icon;
        return (
          <div key={theme.id} className="space-y-2.5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
              <Icon size={13} className="text-accent-cyan" />
              {theme.label}
            </div>
            <div className="flex flex-wrap gap-2.5 md:gap-3">
              {items.map((d) => {
                const rank = value.indexOf(d.id);
                const active = rank !== -1;
                const disabled = !active && full;
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={disabled}
                    aria-pressed={active}
                    onClick={() => onToggle(d.id)}
                    title={disabled ? `You've picked ${max}. Remove one to choose another.` : undefined}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-left font-mono text-[11px] leading-none transition-all',
                      'disabled:cursor-not-allowed disabled:opacity-40',
                      active
                        ? 'border-white bg-white text-black shadow-[0_0_0_1px_rgba(255,255,255,0.12)]'
                        : 'border-white/12 bg-white/[0.03] text-white/78 hover:border-white/30 hover:bg-white/[0.05]',
                    )}
                  >
                    <span>{d.name}</span>
                    {active ? (
                      <span className="shrink-0 rounded-full bg-black/10 px-1.5 py-0.5 text-[9px] font-bold text-black/70">#{rank + 1}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
