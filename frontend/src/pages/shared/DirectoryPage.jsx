import { useEffect, useMemo, useState } from 'react';
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
import { Pagination } from '../../components/ui/Pagination.jsx';
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

export const DirectoryPage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(24);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [groupBy, setGroupBy] = useState('institution');
  const [collegeId, setCollegeId] = useState('');
  const [domainId, setDomainId] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [collapsed, setCollapsed] = useState(() => new Set());

  // Debounce search input to avoid request flooding on keystrokes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Query parameters memoized for server-side pagination & filtering
  const query = useMemo(() => {
    const q = { page, limit };
    if (debouncedSearch.trim()) q.search = debouncedSearch.trim();
    if (collegeId) q.institutionId = collegeId;
    if (domainId) q.domainId = domainId;
    if (teamFilter !== 'all') q.teamFilter = teamFilter;
    return q;
  }, [page, limit, debouncedSearch, collegeId, domainId, teamFilter]);

  const { data, loading, error } = useApi(
    () => api.get('/api/students/directory', { query }),
    [query],
  );

  const students = useMemo(() => data?.students ?? [], [data]);

  const stats = useMemo(() => data?.stats ?? {
    total: 0,
    colleges: 0,
    inTeam: 0,
    looking: 0,
  }, [data]);

  const colleges = useMemo(() => data?.colleges ?? [], [data]);
  const domainOptions = useMemo(() => data?.domains ?? [], [data]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const s of students) {
      const g = groupKey(s, groupBy);
      const entry = map.get(g.id) ?? { id: g.id, name: g.name, items: [] };
      entry.items.push(s);
      map.set(g.id, entry);
    }
    return [...map.values()].sort((a, b) =>
      (a.id === '_none') - (b.id === '_none') || b.items.length - a.items.length || a.name.localeCompare(b.name));
  }, [students, groupBy]);

  const hasFilters = !!(search || collegeId || domainId || teamFilter !== 'all');

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setCollegeId('');
    setDomainId('');
    setTeamFilter('all');
    setPage(1);
  };

  const handleCollegeToggle = (id) => {
    setCollegeId((prev) => (prev === id ? '' : id));
    setPage(1);
  };

  const handleDomainChange = (e) => {
    setDomainId(e.target.value);
    setPage(1);
  };

  const handleTeamFilterChange = (val) => {
    setTeamFilter(val);
    setPage(1);
  };

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

      {loading && !data && <CardSkeleton rows={4} />}
      {error && <Empty icon={Users} title="Couldn't load the directory" description={error.message} />}

      {data && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={UserCheck} label="Verified" value={stats.total} />
            <StatTile icon={Building2} label="Colleges" value={stats.colleges} />
            <StatTile icon={Users} label="In a team" value={stats.inTeam} tone="live" />
            <StatTile icon={UserPlus} label="Looking" value={stats.looking} tone="warn" hint="Not in a team yet" />
          </div>

          {/* College segmentation chips */}
          <div className="mb-5 flex flex-wrap gap-2">
            <Chip active={!collegeId} onClick={() => { setCollegeId(''); setPage(1); }} label="All colleges" count={stats.total} />
            {colleges.map((c) => (
              <Chip key={c.id} active={collegeId === c.id} onClick={() => handleCollegeToggle(c.id)} label={c.name} count={c.count} />
            ))}
          </div>

          {/* Toolbar */}
          <div className="mb-8 grid gap-3 border border-white/5 bg-[#050505] p-4 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                className="input-glass !pl-10"
                placeholder="Search name, role, skills, college, domain…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="select-glass lg:!w-56" value={domainId} onChange={handleDomainChange}>
              <option value="">All domains</option>
              {domainOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <Segmented items={TEAM_FILTERS} value={teamFilter} onChange={handleTeamFilterChange} />
            <Segmented items={GROUPINGS} value={groupBy} onChange={setGroupBy} />
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
            <span>
              Showing {students.length} of {data.total} students {data.totalPages > 1 && `(Page ${page} of ${data.totalPages})`} · {groups.length} {groupBy === 'institution' ? 'colleges' : 'domains'}
            </span>
            {hasFilters && (
              <button className="inline-flex items-center gap-1 text-white/60 hover:text-white" onClick={clearFilters}>
                <X size={12} /> Clear filters
              </button>
            )}
          </div>

          {data.total === 0 && (
            <Empty icon={UserCheck} title="No verified students found" description={hasFilters ? "No verified student matches these filter criteria." : "Students appear here as soon as a coordinator or organizer approves them."} action={hasFilters && <button className="ghost-button" onClick={clearFilters}>Clear filters</button>} />
          )}

          {data.total > 0 && (
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
          )}

          {/* Pagination Controls */}
          {data.total > 0 && (
            <div className="mt-8">
              <Pagination
                page={page}
                totalPages={data.totalPages}
                total={data.total}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }}
                limits={[12, 24, 48, 96]}
                itemLabel="students"
              />
            </div>
          )}
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
