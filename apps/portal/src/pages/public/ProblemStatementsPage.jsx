import { useMemo, useState } from 'react';
import { FileText, Search, ChevronDown, X } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useApi } from '../../hooks/useApi.js';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Empty } from '../../components/ui/Empty.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { CardSkeleton } from '../../components/ui/Skeleton.jsx';
import { cn } from '../../utils/cn.js';
import { THEMES, OTHER, themeForDomain } from '../../lib/themes.js';

const themeOf = (ps) => themeForDomain(ps.domain?.name);

export const ProblemStatementsPage = () => {
  const { data, loading, error } = useApi(() => api.get('/api/taxonomy/problem-statements'), []);
  const [search, setSearch] = useState('');
  const [themeId, setThemeId] = useState('');
  const [domainId, setDomainId] = useState('');
  const [openedIds, setOpenedIds] = useState(() => new Set());
  const [closedWhileFiltering, setClosedWhileFiltering] = useState(() => new Set());

  const all = useMemo(() => data?.problemStatements ?? [], [data]);

  const domains = useMemo(() => {
    const map = new Map();
    for (const ps of all) if (ps.domain) map.set(ps.domain.id, ps.domain);
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [all]);

  // Counts per theme (before filters) for the chips.
  const themeCounts = useMemo(() => {
    const counts = new Map();
    for (const ps of all) counts.set(themeOf(ps).id, (counts.get(themeOf(ps).id) ?? 0) + 1);
    return counts;
  }, [all]);
  const themes = [...THEMES, OTHER].filter((t) => themeCounts.get(t.id));

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return all.filter((ps) =>
      (!themeId || themeOf(ps).id === themeId) &&
      (!domainId || ps.domain?.id === domainId) &&
      (!needle || [ps.title, ps.description, ps.domain?.name].filter(Boolean).some((v) => v.toLowerCase().includes(needle))),
    );
  }, [all, search, themeId, domainId]);

  const groups = useMemo(() => {
    const byTheme = new Map();
    for (const ps of filtered) {
      const t = themeOf(ps);
      if (!byTheme.has(t.id)) byTheme.set(t.id, { theme: t, items: [] });
      byTheme.get(t.id).items.push(ps);
    }
    return [...THEMES, OTHER]
      .filter((t) => byTheme.has(t.id))
      .map((t) => {
        const g = byTheme.get(t.id);
        g.items.sort((a, b) => (a.domain?.name ?? '').localeCompare(b.domain?.name ?? '') || a.title.localeCompare(b.title));
        return g;
      });
  }, [filtered]);

  const hasFilters = !!(search || themeId || domainId);
  const clearFilters = () => { setSearch(''); setThemeId(''); setDomainId(''); };
  const flip = (prev, id) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  };
  const isOpen = (id) => (hasFilters ? !closedWhileFiltering.has(id) : openedIds.has(id));
  const toggle = (id) => (hasFilters
    ? setClosedWhileFiltering((prev) => flip(prev, id))
    : setOpenedIds((prev) => flip(prev, id)));

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <PageHeader
        kicker="Tracks & Challenges // ट्रैक और चुनौतियां"
        title="Challenge Catalogue"
        description="Every participating squad picks one challenge statement from their preferred domain. Browse by track themes, or search across keywords."
      />

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} rows={3} />)}
        </div>
      )}
      {error && <Empty icon={FileText} title="Could not load catalogue" description={error.message} />}

      {data && all.length === 0 && (
        <Empty icon={FileText} title="No challenges published yet" description="Organizers are finalizing the problem statements for this edition." />
      )}

      {all.length > 0 && (
        <>
          {/* Theme chips */}
          <div className="mb-6 flex flex-wrap gap-2">
            <Chip active={!themeId} onClick={() => setThemeId('')} label="All Tracks" count={all.length} />
            {themes.map((t) => (
              <Chip key={t.id} icon={t.icon} active={themeId === t.id} onClick={() => setThemeId(themeId === t.id ? '' : t.id)} label={t.label} count={themeCounts.get(t.id)} />
            ))}
          </div>

          {/* Search + domain filter bar */}
          <div className="mb-6 grid gap-3 rounded-[4px] border border-border-mid bg-bg-surface-1 p-4 md:grid-cols-[1fr_auto] shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
              <input
                className="input-glass !pl-10 h-11"
                placeholder="Search challenges, keywords, domains…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="select-glass md:!w-64 h-11"
              value={domainId}
              onChange={(e) => setDomainId(e.target.value)}
            >
              <option value="">All SOA Domains</option>
              {domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="mb-5 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-text-dim">
            <span>{filtered.length} of {all.length} challenges · {groups.length} active {groups.length === 1 ? 'track' : 'tracks'}</span>
            {hasFilters && (
              <button className="inline-flex items-center gap-1.5 text-txp-yellow hover:underline" onClick={clearFilters}>
                <X size={13} /> Clear filters
              </button>
            )}
          </div>

          {filtered.length === 0 && (
            <Empty
              icon={Search}
              title="No matching challenges"
              description="No challenge matches your current filter or search criteria."
              action={<button className="ghost-button" onClick={clearFilters}>Reset Filters</button>}
            />
          )}

          <div className="space-y-5">
            {groups.map(({ theme, items }) => {
              const isCollapsed = !isOpen(theme.id);
              const Icon = theme.icon;
              const domainCount = new Set(items.map((ps) => ps.domain?.id)).size;
              return (
                <section key={theme.id} className="overflow-hidden rounded-[4px] border border-border-mid bg-bg-surface-1 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                  <button
                    type="button"
                    onClick={() => toggle(theme.id)}
                    aria-expanded={!isCollapsed}
                    className="flex w-full items-center justify-between gap-3 border-b border-border-mid bg-bg-surface-2/70 px-5 py-4 text-left transition-colors hover:bg-bg-surface-2"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-txp-yellow/30 bg-txp-yellow/10 text-txp-yellow">
                        <Icon size={16} />
                      </div>
                      <h2 className="truncate font-cond text-[19px] font-black uppercase tracking-[0.05em] text-text-primary">{theme.label}</h2>
                      <Badge tone="yellow">{items.length} {items.length === 1 ? 'task' : 'tasks'}</Badge>
                      <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim sm:inline">{domainCount} {domainCount === 1 ? 'domain' : 'domains'}</span>
                    </div>
                    <ChevronDown size={18} className={cn('shrink-0 text-text-dim transition-transform duration-200', isCollapsed && '-rotate-90')} />
                  </button>
                  {!isCollapsed && (
                    <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((ps) => <StatementCard key={ps.id} ps={ps} />)}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
};

const Chip = ({ active, onClick, label, count, icon: Icon }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'inline-flex items-center gap-2 rounded-[3px] border px-3.5 py-1.5 font-cond text-[14px] font-bold uppercase tracking-wider transition-all duration-160',
      active
        ? 'border-txp-ink bg-txp-yellow text-txp-ink shadow-[0_2px_0_#000]'
        : 'border-border-mid bg-bg-surface-2 text-text-secondary hover:border-txp-yellow/40 hover:text-text-primary',
    )}
  >
    {Icon && <Icon size={13} className={active ? 'text-txp-ink' : 'text-txp-yellow'} />}
    <span>{label}</span>
    <span className={cn('rounded-[2px] px-1.5 text-[10px] font-mono font-bold', active ? 'bg-txp-ink/15 text-txp-ink' : 'bg-bg-surface-3 text-text-dim')}>
      {count}
    </span>
  </button>
);

const StatementCard = ({ ps }) => {
  const [expanded, setExpanded] = useState(false);
  const long = (ps.description?.length ?? 0) > 160;
  return (
    <article className="flex flex-col justify-between gap-3 rounded-[3px] border border-border-dim bg-bg-surface-2/40 p-4 transition-all hover:border-txp-yellow/40 hover:bg-bg-surface-2">
      <div>
        <span className="inline-block rounded-[2px] border border-txp-teal/30 bg-txp-teal/10 px-2 py-0.5 font-mono text-[10px] font-bold text-txp-teal uppercase tracking-wider mb-2">
          {ps.domain?.name ?? 'General'}
        </span>
        <h3 className="font-cond text-[18px] font-black uppercase tracking-tight text-text-primary leading-snug">
          {ps.title}
        </h3>
        {ps.description && (
          <p className={cn('mt-2 font-sans text-[13px] leading-relaxed text-text-secondary', !expanded && 'line-clamp-4')}>
            {ps.description}
          </p>
        )}
      </div>
      {long && (
        <button
          className="self-start font-cond text-[13px] font-bold uppercase tracking-wider text-txp-yellow hover:underline"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? '▲ Show less' : '▼ Read full statement'}
        </button>
      )}
    </article>
  );
};
