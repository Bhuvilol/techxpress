import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Users, Search, Building2, Layers, UserCheck, ChevronDown, Award, X, CheckCircle2,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { useApi } from '../../hooks/useApi.js';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
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
  const [collapsedOverrides, setCollapsedOverrides] = useState({});
  const isFirstMount = useRef(true);

  // Automatically scroll back to top when switching pages
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  // Debounce search input to avoid request flooding on keystrokes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Query parameters memoized for server-side pagination & filtering
  const isPerCollege = groupBy === 'institution' && !collegeId;

  const query = useMemo(() => {
    const q = { page, groupBy };
    if (isPerCollege) {
      q.perCollegeLimit = 6;
    } else {
      q.limit = limit;
    }
    if (debouncedSearch.trim()) q.search = debouncedSearch.trim();
    if (collegeId) q.institutionId = collegeId;
    if (domainId) q.domainId = domainId;
    if (teamFilter !== 'all') q.teamFilter = teamFilter;
    return q;
  }, [page, limit, debouncedSearch, collegeId, domainId, teamFilter, groupBy, isPerCollege]);

  const { data, loading, error } = useApi(
    () => api.get('/api/students/directory', { query }),
    [query],
  );

  const students = useMemo(() => data?.students ?? [], [data]);

  const colleges = useMemo(() => data?.colleges ?? [], [data]);
  const domainOptions = useMemo(() => data?.domains ?? [], [data]);

  const groups = useMemo(() => {
    if (isPerCollege && data?.collegeGroups) {
      return data.collegeGroups.map((g) => ({
        id: g.id,
        name: g.name,
        total: g.total,
        shownCount: g.shownCount,
        allShownEarlier: g.allShownEarlier,
        lastPage: g.lastPage,
        items: g.students || [],
      }));
    }

    const map = new Map();
    for (const s of students) {
      const g = groupKey(s, groupBy);
      const entry = map.get(g.id) ?? { id: g.id, name: g.name, items: [] };
      entry.items.push(s);
      map.set(g.id, entry);
    }
    return [...map.values()].sort((a, b) =>
      (a.id === '_none') - (b.id === '_none') || b.items.length - a.items.length || a.name.localeCompare(b.name));
  }, [students, groupBy, isPerCollege, data]);

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

  const handleGroupByChange = (val) => {
    setGroupBy(val);
    setPage(1);
  };

  const toggleGroup = (id, currentlyCollapsed) => {
    const overrideKey = `${page}_${id}`;
    setCollapsedOverrides((prev) => ({
      ...prev,
      [overrideKey]: !currentlyCollapsed,
    }));
  };

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
          {/* College segmentation chips */}
          <div className="mb-5 flex flex-wrap gap-2">
            <Chip active={!collegeId} onClick={() => { setCollegeId(''); setPage(1); }} label="All colleges" />
            {colleges.map((c) => (
              <Chip key={c.id} active={collegeId === c.id} onClick={() => handleCollegeToggle(c.id)} label={c.name} />
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
            <Segmented items={GROUPINGS} value={groupBy} onChange={handleGroupByChange} />
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
            <span />
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
                const defaultCollapsed = g.items.length === 0;
                const overrideKey = `${page}_${g.id}`;
                const isCollapsed = collapsedOverrides[overrideKey] ?? defaultCollapsed;
                const looking = g.items.filter((s) => !s.team).length;

                return (
                  <section
                    key={g.id}
                    className={cn(
                      'border transition-colors',
                      g.items.length > 0
                        ? 'border-white/10 bg-black'
                        : 'border-white/5 bg-white/[0.01] opacity-75 hover:opacity-100',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleGroup(g.id, isCollapsed)}
                      className="flex w-full items-center justify-between gap-3 border-b border-white/5 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
                    >
                      <div className="flex min-w-0 flex-wrap items-center gap-2.5 sm:gap-3">
                        {groupBy === 'institution' ? (
                          <Building2 size={16} className={cn('shrink-0', g.items.length > 0 ? 'text-white/60' : 'text-white/30')} />
                        ) : (
                          <Layers size={16} className={cn('shrink-0', g.items.length > 0 ? 'text-white/60' : 'text-white/30')} />
                        )}
                        <h2 className={cn(
                          'truncate font-sans text-[15px] font-black uppercase tracking-[0.08em]',
                          g.items.length > 0 ? 'text-white' : 'text-white/70',
                        )}>
                          {g.name}
                        </h2>

                        {/* Badges */}
                        {isPerCollege ? (
                          <>
                            {g.items.length > 0 ? (
                              <Badge tone="dim">
                                Showing {(page - 1) * 6 + 1}–{(page - 1) * 6 + g.items.length} of {g.total}
                              </Badge>
                            ) : g.allShownEarlier ? (
                              <Badge tone="dim">All {g.total} shown</Badge>
                            ) : (
                              <Badge tone="dim">0 students</Badge>
                            )}
                            {looking > 0 && <Badge tone="warn">{looking} looking</Badge>}
                          </>
                        ) : (
                          <>
                            <Badge tone="dim">{g.items.length}</Badge>
                            {looking > 0 && <Badge tone="warn">{looking} looking</Badge>}
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isPerCollege && g.allShownEarlier && isCollapsed && (
                          <span className="hidden font-mono text-[10px] text-white/40 sm:inline">
                            Shown on {g.lastPage === 1 ? 'Page 1' : `Pages 1–${g.lastPage}`}
                          </span>
                        )}
                        <ChevronDown
                          size={16}
                          className={cn('shrink-0 text-white/40 transition-transform', isCollapsed && '-rotate-90')}
                        />
                      </div>
                    </button>

                    {!isCollapsed && (
                      <>
                        {g.items.length > 0 ? (
                          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                            {g.items.map((s) => (
                              <StudentCard key={s.id} s={s} groupBy={groupBy} />
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center border-t border-white/5 bg-white/[0.01] px-4 py-8 text-center sm:px-6">
                            <div className="mb-2 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-white/40">
                              <CheckCircle2 size={16} />
                            </div>
                            <h3 className="font-sans text-[13px] font-bold text-white">
                              {g.allShownEarlier
                                ? `All ${g.total} students from ${g.name} were shown on earlier pages`
                                : `No students from ${g.name} match current filters`}
                            </h3>
                            <p className="mt-1 max-w-md font-mono text-[11px] text-white/40">
                              {g.allShownEarlier
                                ? `Students for this college were displayed on ${g.lastPage === 1 ? 'Page 1' : `Pages 1–${g.lastPage}`}. No remaining students for Page ${page}.`
                                : 'Try clearing your search or switching filters.'}
                            </p>
                            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
                              {g.allShownEarlier && (
                                <button
                                  type="button"
                                  onClick={() => setPage(1)}
                                  className="ghost-button !px-3 !py-1 font-mono text-[11px]"
                                >
                                  Go to Page 1
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCollegeToggle(g.id)}
                                className="ghost-button !px-3 !py-1 font-mono text-[11px]"
                              >
                                Filter only {g.name.split('|')[0].trim()}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </section>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {data.total > 0 && (
            <div className="mt-8">
              {isPerCollege ? (
                <Pagination
                  page={page}
                  totalPages={data.totalPages}
                  total={data.total}
                  limit={6}
                  onPageChange={(nextPage) => {
                    setPage(nextPage);
                  }}
                  customSummary={
                    <span>
                      Showing <strong className="font-bold text-text-primary">{students.length}</strong> students on this page (Page <strong className="font-bold text-text-primary">{page}</strong> of <strong className="font-bold text-text-primary">{data.totalPages}</strong>) · <span className="text-white/60">6 per college</span>
                    </span>
                  }
                  itemLabel="students"
                />
              ) : (
                <Pagination
                  page={page}
                  totalPages={data.totalPages}
                  total={data.total}
                  limit={limit}
                  onPageChange={(nextPage) => {
                    setPage(nextPage);
                  }}
                  onLimitChange={(newLimit) => {
                    setLimit(newLimit);
                    setPage(1);
                  }}
                  limits={[12, 24, 48, 96]}
                  itemLabel="students"
                />
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
};

const Chip = ({ active, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 font-mono text-[11px] transition-all',
      active ? 'border-white bg-white text-black' : 'border-white/12 bg-white/[0.03] text-white/75 hover:border-white/30',
    )}
  >
    <span>{label}</span>
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

