import { useMemo, useState } from 'react';
import {
  Users, Search, Building2, Layers, UserCheck, UserPlus, ChevronDown, Award, X,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { useApi } from '../../hooks/useApi.js';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { StatTile } from '../../components/ui/StatTile.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Empty } from '../../components/ui/Empty.jsx';
import { CardSkeleton } from '../../components/ui/Skeleton.jsx';
import { initials } from '../../utils/format.js';
import { cn } from '../../utils/cn.js';

// Participant directory: every verified student, segmented by college or
// domain. Visible to any logged-in user. Contact details are intentionally
// not shown — teams form through invites / join requests on the Teams page.

const TEAM_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'looking', label: 'Looking for team' },
  { value: 'inteam', label: 'In a team' },
];

const GROUPINGS = [
  { value: 'institution', label: 'By college', icon: Building2 },
  { value: 'domain', label: 'By domain', icon: Layers },
];

const groupKey = (s, by) => (by === 'institution' ? s.institution : s.domain) ?? { id: '_none', name: by === 'institution' ? 'No college' : 'No domain' };

const matchesSearch = (s, needle) => {
  if (!needle) return true;
  return [
    s.fullName, s.preferredTeamRole, s.technicalSkills, s.degree, s.yearSemester,
    s.institution?.name, s.domain?.name, s.team?.name,
    ...(s.contributionAreas ?? []),
    ...(s.preferredDomains ?? []).map((d) => d.name),
  ].filter(Boolean).some((v) => v.toLowerCase().includes(needle));
};

export const DirectoryPage = () => {
  const { data, loading, error } = useApi(() => api.get('/api/students/directory'), []);
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState('institution');
  const [collegeId, setCollegeId] = useState('');
  const [domainId, setDomainId] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [collapsed, setCollapsed] = useState(() => new Set());

  const students = useMemo(() => data?.students ?? [], [data]);

  const stats = useMemo(() => {
    const inTeam = students.filter((s) => s.team).length;
    return {
      total: students.length,
      colleges: new Set(students.map((s) => s.institution?.id).filter(Boolean)).size,
      inTeam,
      looking: students.length - inTeam,
    };
  }, [students]);

  // College chips — the primary segmentation, sorted by size.
  const colleges = useMemo(() => {
    const map = new Map();
    for (const s of students) {
      const c = s.institution ?? { id: '_none', name: 'No college' };
      const entry = map.get(c.id) ?? { ...c, count: 0 };
      entry.count += 1;
      map.set(c.id, entry);
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [students]);

  const domainOptions = useMemo(() => {
    const map = new Map();
    for (const s of students) {
      for (const d of [s.domain, ...(s.preferredDomains ?? [])]) if (d) map.set(d.id, d);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return students.filter((s) =>
      (!collegeId || (s.institution?.id ?? '_none') === collegeId) &&
      (!domainId || s.domain?.id === domainId || (s.preferredDomains ?? []).some((d) => d.id === domainId)) &&
      (teamFilter === 'all' || (teamFilter === 'inteam' ? !!s.team : !s.team)) &&
      matchesSearch(s, needle),
    );
  }, [students, search, collegeId, domainId, teamFilter]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const s of filtered) {
      const g = groupKey(s, groupBy);
      const entry = map.get(g.id) ?? { id: g.id, name: g.name, items: [] };
      entry.items.push(s);
      map.set(g.id, entry);
    }
    return [...map.values()].sort((a, b) =>
      (a.id === '_none') - (b.id === '_none') || b.items.length - a.items.length || a.name.localeCompare(b.name));
  }, [filtered, groupBy]);

  const hasFilters = !!(search || collegeId || domainId || teamFilter !== 'all');
  const clearFilters = () => { setSearch(''); setCollegeId(''); setDomainId(''); setTeamFilter('all'); };

  const toggleGroup = (id) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHeader
        kicker="Participants"
        title="Verified students"
        description="Everyone cleared to take part, grouped by college or domain. Find teammates here, then invite them or request to join from the Teams page."
      />

      {loading && <CardSkeleton rows={4} />}
      {error && <Empty icon={Users} title="Couldn't load the directory" description={error.message} />}

      {data && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={UserCheck} label="Verified" value={stats.total} />
            <StatTile icon={Building2} label="Colleges" value={stats.colleges} />
            <StatTile icon={Users} label="In a team" value={stats.inTeam} tone="live" />
            <StatTile icon={UserPlus} label="Looking" value={stats.looking} tone="warn" hint="Not in a team yet" />
          </div>

          {/* College segmentation */}
          <div className="mb-5 flex flex-wrap gap-2">
            <Chip active={!collegeId} onClick={() => setCollegeId('')} label="All colleges" count={stats.total} />
            {colleges.map((c) => (
              <Chip key={c.id} active={collegeId === c.id} onClick={() => setCollegeId(collegeId === c.id ? '' : c.id)} label={c.name} count={c.count} />
            ))}
          </div>

          {/* Toolbar */}
          <div className="mb-8 grid gap-3 border border-white/5 bg-[#050505] p-4 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                className="input-glass !pl-10"
                placeholder="Search name, role, skills, domain…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="select-glass lg:!w-56" value={domainId} onChange={(e) => setDomainId(e.target.value)}>
              <option value="">All domains</option>
              {domainOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <Segmented items={TEAM_FILTERS} value={teamFilter} onChange={setTeamFilter} />
            <Segmented items={GROUPINGS} value={groupBy} onChange={setGroupBy} />
          </div>

          <div className="mb-4 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
            <span>{filtered.length} of {stats.total} students · {groups.length} {groupBy === 'institution' ? 'colleges' : 'domains'}</span>
            {hasFilters && (
              <button className="inline-flex items-center gap-1 text-white/60 hover:text-white" onClick={clearFilters}>
                <X size={12} /> Clear filters
              </button>
            )}
          </div>

          {students.length === 0 && (
            <Empty icon={UserCheck} title="No verified students yet" description="Students appear here as soon as a coordinator or organizer approves them." />
          )}
          {students.length > 0 && filtered.length === 0 && (
            <Empty icon={Search} title="No matches" description="No verified student matches these filters." action={<button className="ghost-button" onClick={clearFilters}>Clear filters</button>} />
          )}

          <div className="space-y-6">
            {groups.map((g) => {
              const isCollapsed = collapsed.has(g.id);
              const looking = g.items.filter((s) => !s.team).length;
              return (
                <section key={g.id} className="border border-white/5 bg-black">
                  <button
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    className="flex w-full items-center justify-between gap-3 border-b border-white/5 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {groupBy === 'institution' ? <Building2 size={16} className="shrink-0 text-white/40" /> : <Layers size={16} className="shrink-0 text-white/40" />}
                      <h2 className="truncate font-sans text-[15px] font-black uppercase tracking-[0.08em] text-white">{g.name}</h2>
                      <Badge tone="dim">{g.items.length}</Badge>
                      {looking > 0 && <Badge tone="warn">{looking} looking</Badge>}
                    </div>
                    <ChevronDown size={16} className={cn('shrink-0 text-white/40 transition-transform', isCollapsed && '-rotate-90')} />
                  </button>
                  {!isCollapsed && (
                    <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                      {g.items.map((s) => <StudentCard key={s.id} s={s} groupBy={groupBy} />)}
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

const Chip = ({ active, onClick, label, count }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 font-mono text-[11px] transition-all',
      active ? 'border-white bg-white text-black' : 'border-white/12 bg-white/[0.03] text-white/75 hover:border-white/30',
    )}
  >
    <span>{label}</span>
    <span className={cn('rounded-full px-1.5 text-[10px] font-bold', active ? 'bg-black/10' : 'bg-white/10 text-white/60')}>{count}</span>
  </button>
);

const Segmented = ({ items, value, onChange }) => (
  <div className="flex border border-white/10">
    {items.map((it) => (
      <button
        key={it.value}
        type="button"
        onClick={() => onChange(it.value)}
        className={cn(
          'inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-3 py-2.5 font-mono text-[11px] transition-colors',
          value === it.value ? 'bg-white text-black' : 'text-white/60 hover:bg-white/5 hover:text-white',
        )}
      >
        {it.icon && <it.icon size={12} />}
        {it.label}
      </button>
    ))}
  </div>
);

const StudentCard = ({ s, groupBy }) => {
  const secondary = groupBy === 'institution' ? s.domain?.name : s.institution?.name;
  const extraDomains = (s.preferredDomains ?? []).filter((d) => d.id !== s.domain?.id);
  return (
    <article className="flex flex-col gap-3 border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/30">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center border border-white/10 bg-black font-sans text-[13px] font-black text-white">
          {initials(s.fullName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-sans text-[14px] font-bold text-white">{s.fullName}</div>
          <div className="truncate font-mono text-[11px] text-white/45">{secondary ?? '—'}</div>
        </div>
        {s.isDomainExpert && <Badge tone="cyan"><Award size={10} /> Expert</Badge>}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {s.team
          ? <Badge tone="dim">In team · {s.team.name}</Badge>
          : <Badge tone="warn" dot>Looking for team</Badge>}
        {s.preferredTeamRole && <Badge tone="dim">{s.preferredTeamRole}</Badge>}
      </div>

      {(s.degree || s.yearSemester) && (
        <div className="font-mono text-[11px] text-white/50">{[s.degree, s.yearSemester].filter(Boolean).join(' · ')}</div>
      )}

      {extraDomains.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {extraDomains.slice(0, 3).map((d) => (
            <span key={d.id} className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-white/55">{d.name}</span>
          ))}
          {extraDomains.length > 3 && <span className="px-1 font-mono text-[10px] text-white/40">+{extraDomains.length - 3}</span>}
        </div>
      )}

      {s.technicalSkills && (
        <p className="line-clamp-2 font-mono text-[11px] leading-relaxed text-white/45">{s.technicalSkills}</p>
      )}
    </article>
  );
};
