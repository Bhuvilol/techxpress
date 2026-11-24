import { useMemo, useState } from 'react';
import {
  Users, Plus, UserPlus, Send, ShieldCheck, AlertTriangle, LogOut,
  UserMinus, Crown, Search, CheckCircle2, XCircle,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { useSocketEvent } from '../../hooks/useSocketEvent.js';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Empty } from '../../components/ui/Empty.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { CardSkeleton } from '../../components/ui/Skeleton.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { confirm } from '../../components/ui/Confirm.jsx';
import { issueLabel, formatRelative } from '../../utils/format.js';
import { TeamChat } from '../../components/team/TeamChat.jsx';
import { normalizeRegistrationNo } from '../../utils/registrationNo.js';

// ── Status banner derived from rules engine evaluation ─────────────────────
const StatusBanner = ({ status, issues }) => {
  if (status === 'DISQUALIFIED') {
    return (
      <div className="flex items-center gap-3 rounded-[4px] border border-status-crit/40 bg-status-crit/5 px-4 py-3">
        <XCircle size={16} className="text-status-crit" />
        <div className="font-mono text-[12px] text-status-crit">This team has been disqualified by the organizers. Contact them if you think this is a mistake.</div>
      </div>
    );
  }
  if (status === 'FINALIZED') {
    return (
      <div className="flex items-center gap-3 rounded-[4px] border border-status-live/40 bg-status-live/5 px-4 py-3">
        <ShieldCheck size={16} className="text-status-live" />
        <div className="font-mono text-[12px] text-status-live">Team finalized — no further changes.</div>
      </div>
    );
  }
  if (status === 'QUALIFIED') {
    return (
      <div className="flex items-center gap-3 rounded-[4px] border border-status-live/40 bg-status-live/5 px-4 py-3">
        <CheckCircle2 size={16} className="text-status-live" />
        <div className="font-mono text-[12px] text-status-live">All rules met — leader can finalize.</div>
      </div>
    );
  }
  return (
    <div className="space-y-2 rounded-none border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <AlertTriangle size={16} className="text-status-warn" />
        <div className="font-mono text-[12px] text-status-warn">Not yet qualified.</div>
      </div>
      <div className="flex flex-wrap gap-2 pl-7">
        {issues.map((i) => (
          <Badge key={i.code} tone="warn">{issueLabel(i.code)} ({i.have}/{i.need})</Badge>
        ))}
      </div>
    </div>
  );
};

// ── Create-team ───────────────────────────────────────────────────────────
const CreateTeamForm = ({ onCreated }) => {
  const toast = useToast();
  const [name, setName] = useState('');
  const [domainId, setDomainId] = useState('');
  const [psId, setPsId] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: domData } = useApi(() => api.get('/api/taxonomy/domains'), []);
  const { data: psData } = useApi(
    () => domainId ? api.get('/api/taxonomy/problem-statements', { query: { domainId } }) : Promise.resolve({ problemStatements: [] }),
    [domainId],
  );

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { team } = await api.post('/api/teams', { name, domainId, psId: psId || undefined });
      toast.success(`Team "${team.name}" created. You're the leader.`);
      onCreated?.();
    } catch (err) {
      toast.error(err.message);
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="glass-card space-y-4">
      <div className="flex items-center gap-3">
        <Plus size={16} className="text-accent-cyan" />
        <h2 className="font-sans text-[14px] uppercase tracking-[0.15em]">Create a team</h2>
      </div>

      <FormField label="Team name" required hint="Visible to the whole event. 2–60 chars.">
        <input className="input-glass" minLength={2} maxLength={60} required value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Domain" required>
          <select className="select-glass" required value={domainId} onChange={(e) => { setDomainId(e.target.value); setPsId(''); }}>
            <option value="">Select…</option>
            {domData?.domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </FormField>

        <FormField label="Problem statement" hint={!domainId ? 'Pick a domain first' : 'Optional, can be set later by admins.'}>
          <select className="select-glass" disabled={!domainId} value={psId} onChange={(e) => setPsId(e.target.value)}>
            <option value="">— None —</option>
            {psData?.problemStatements?.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </FormField>
      </div>

      <button type="submit" disabled={busy} className="glow-button inline-flex items-center gap-2">
        {busy ? <Spinner size={14} /> : <Plus size={14} />}
        {busy ? 'Creating…' : 'Create team'}
      </button>
    </form>
  );
};

// ── Joinable list ─────────────────────────────────────────────────────────
const JoinableList = () => {
  const toast = useToast();
  const [filter, setFilter] = useState('');
  const [busyTeamId, setBusyTeamId] = useState('');
  const { data, loading, refetch } = useApi(() => api.get('/api/teams/joinable'), []);
  // My pending join requests, so a team I've already asked shows "Request sent".
  const outgoing = useApi(() => api.get('/api/join-requests/me'), []);

  const teams = useMemo(
    () => (data?.teams ?? []).filter((t) => t.name.toLowerCase().includes(filter.toLowerCase())),
    [data, filter],
  );

  // teamId → pending request id
  const pendingByTeam = useMemo(
    () => new Map((outgoing.data?.requests ?? []).map((r) => [r.team.id, r.id])),
    [outgoing.data],
  );

  const requestJoin = async (teamId) => {
    setBusyTeamId(teamId);
    try {
      await api.post(`/api/teams/${teamId}/join-requests`);
      toast.success('Join request sent.');
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      // Re-sync either way (e.g. a request sent from another tab → 409).
      await outgoing.refetch();
      setBusyTeamId('');
    }
  };

  const cancelRequest = async (teamId) => {
    const requestId = pendingByTeam.get(teamId);
    if (!requestId) return;
    setBusyTeamId(teamId);
    try {
      await api.post(`/api/join-requests/${requestId}/cancel`);
      toast.info('Join request cancelled.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      await outgoing.refetch();
      setBusyTeamId('');
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-label">Open teams</h2>
        <div className="relative w-full max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <input className="input-glass !pl-10" placeholder="Filter by name…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
      </div>
      {loading && <CardSkeleton rows={2} />}
      {!loading && teams.length === 0 && (
        <Empty icon={Users} title="No teams to join" description="Either none have been created yet, or your filter excludes them all." />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {teams.map((t) => (
          <article key={t.id} className="glass-card flat space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-sans text-[15px] font-bold text-text-primary">{t.name}</div>
                <div className="font-mono text-[12px] text-text-secondary">{t.domain?.name} · led by {t.leader?.fullName}</div>
              </div>
              <Badge tone="cyan">{t.memberCount} member{t.memberCount !== 1 && 's'}</Badge>
            </div>
            {t.missing?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {t.missing.map((m) => (
                  <Badge key={m.code} tone="warn">{issueLabel(m.code)}</Badge>
                ))}
              </div>
            )}
            {pendingByTeam.has(t.id) ? (
              <div className="flex flex-wrap items-center gap-2">
                <button className="ghost-button inline-flex cursor-default items-center gap-2 !border-status-live/50 !text-status-live" disabled>
                  <CheckCircle2 size={12} /> Request sent
                </button>
                <button
                  className="ghost-button inline-flex items-center gap-1 text-[11px]"
                  disabled={busyTeamId === t.id}
                  onClick={() => cancelRequest(t.id)}
                >
                  {busyTeamId === t.id ? <Spinner size={12} /> : <XCircle size={12} />} Cancel
                </button>
              </div>
            ) : (
              <button
                className="glow-button inline-flex items-center gap-2"
                disabled={busyTeamId === t.id}
                onClick={() => requestJoin(t.id)}
              >
                {busyTeamId === t.id ? <Spinner size={12} /> : <Send size={12} />}
                {busyTeamId === t.id ? 'Sending…' : 'Request to join'}
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};

// ── Invite modal (leader only) ────────────────────────────────────────────
const InviteModal = ({ open, onClose, teamId, onSent }) => {
  const toast = useToast();
  const [registrationNo, setRegistrationNo] = useState('');
  const [busyId, setBusyId] = useState('');

  const close = () => {
    setRegistrationNo('');
    setBusyId('');
    onClose();
  };

  const lookup = useApi(
    () => registrationNo.trim()
      ? api.get('/api/teams/explore/members', { query: { search: registrationNo.trim() } })
      : Promise.resolve({ users: [] }),
    [registrationNo],
    { refetchOnFocus: false },
  );

  const candidates = useMemo(() => {
    // Same canonical form the server uses, so "2024 ps01" finds "2024PS01".
    const needle = normalizeRegistrationNo(registrationNo);
    if (!needle) return [];
    const users = lookup.data?.users ?? [];
    const exact = users.filter((user) => user.registrationNo === needle);
    if (exact.length) return exact;
    return users.filter((user) => (user.registrationNo ?? '').includes(needle));
  }, [lookup.data, registrationNo]);

  const sendInvite = async (inviteeId) => {
    setBusyId(inviteeId);
    try {
      await api.post(`/api/teams/${teamId}/invites`, { inviteeId });
      toast.success('Invite sent.');
      onSent?.();
      close();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId('');
    }
  };

  return (
    <Modal open={open} onClose={close} title="Invite a member" size="sm">
      <div className="space-y-4">
        <FormField label="Registration ID" required hint="Search by registration number to find the matching candidate.">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              className="input-glass !pl-10"
              required
              value={registrationNo}
              onChange={(e) => setRegistrationNo(e.target.value)}
              placeholder="Registration number..."
            />
          </div>
        </FormField>

        {!registrationNo.trim() && (
            <Empty
              icon={Search}
              title="Search by registration ID"
              description="Enter a registration number and the matching candidate will appear here."
              className="rounded-none border border-white/10 bg-white/5 px-4 py-8"
            />
        )}

        {registrationNo.trim() && lookup.loading && <CardSkeleton rows={1} />}

        {registrationNo.trim() && !lookup.loading && candidates.length === 0 && (
            <Empty
              icon={Users}
              title="No matching candidate"
              description="No student matched that registration number."
              className="rounded-none border border-white/10 bg-white/5 px-4 py-8"
            />
        )}

        <div className="space-y-3">
          {candidates.map((candidate) => {
            const blockedReason = candidate.membership?.team
              ? `${candidate.fullName} is already in ${candidate.membership.team.name}.`
              : candidate.verificationStatus !== 'VERIFIED'
                ? 'This student must be verified before they can be invited.'
                : null;

            return (
              <article key={candidate.id} className="glass-card flat space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-sans text-[14px] font-bold text-text-primary">{candidate.fullName}</div>
                    {candidate.email && <div className="font-mono text-[11px] text-text-secondary">{candidate.email}</div>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone="cyan">{candidate.domain?.name ?? 'No domain'}</Badge>
                    {blockedReason && <Badge tone="dim">Unavailable</Badge>}
                  </div>
                </div>

                <div className="font-mono text-[11px] text-text-secondary">
                  Reg #: {candidate.registrationNo ?? '-'}
                  {candidate.institution?.name ? ` · ${candidate.institution.name}` : ''}
                </div>

                {blockedReason && (
                  <div className="font-mono text-[11px] text-text-dim">{blockedReason}</div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    className="glow-button inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={Boolean(blockedReason) || busyId === candidate.id}
                    onClick={() => sendInvite(candidate.id)}
                  >
                    {busyId === candidate.id ? <Spinner size={14} /> : <UserPlus size={14} />}
                    {busyId === candidate.id ? 'Sending...' : 'Send invite'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button type="button" className="ghost-button" onClick={close}>Close</button>
        </div>
      </div>
    </Modal>
  );
};

// ── My team detail (in-team mode) ─────────────────────────────────────────
const MyTeamView = ({ team, evaluation, onMutate }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);

  const isLeader = team.leader.id === user.id;
  const isFinalized = team.status === 'FINALIZED';
  const dissolveBlockedReason = team.status === 'FINALIZED'
    ? 'Finalized teams cannot be dissolved.'
    : team.status === 'DISQUALIFIED'
      ? 'Disqualified teams cannot be dissolved.'
      : null;

  const invites  = useApi(() => api.get(`/api/teams/${team.id}/invites`), [team.id]);
  const requests = useApi(() => api.get(`/api/teams/${team.id}/join-requests`), [team.id]);

  // Membership-change requests I've started — used to swap the "Request to
  // leave" button for "Cancel leave request" while one is in flight, so
  // users don't keep clicking and getting 409s.
  const myChanges = useApi(
    () => api.get('/api/membership-changes/initiated-me'),
    [],
    { pollMs: 5000 },
  );
  const initiatedChanges = myChanges.data?.changes ?? [];
  const myPendingLeave = initiatedChanges.find(
    (c) => c.team?.id === team.id && c.kind === 'LEAVE',
  );
  const myDisbandChanges = initiatedChanges.filter(
    (c) => c.team?.id === team.id && c.kind === 'DISBAND',
  );
  const teamDisbandPending = myDisbandChanges.length > 0;
  const disbandApprovedCount = myDisbandChanges.filter((c) => c.status === 'APPROVED').length;
  const disbandPendingCount = myDisbandChanges.filter((c) => c.status === 'PENDING').length;

  // Leader-side: change requests awaiting MY approval (leave requests
  // from members of this team, plus dismissals where I'm the target —
  // although as leader I'd never receive a dismissal).
  const awaitingMe = useApi(
    () => api.get('/api/membership-changes/awaiting-me'),
    [],
    { pollMs: 5000 },
  );
  const myApprovalChanges = awaitingMe.data?.changes ?? [];
  const myDisbandApproval = myApprovalChanges.find(
    (c) => c.team?.id === team.id && c.kind === 'DISBAND',
  );
  const teamPendingForMe = myApprovalChanges.filter(
    (c) => c.team?.id === team.id && c.kind !== 'DISBAND',
  );

  const [busyId, setBusyId] = useState('');
  const pendingInvites  = (invites.data?.invites ?? []).filter((i) => i.status === 'PENDING');
  const pendingRequests = (requests.data?.requests ?? []).filter((r) => r.status === 'PENDING');

  // Run a team action, then refresh the team AND the invite / join-request
  // lists (they live in this component, so onMutate alone doesn't reload
  // them). Refresh even on failure so a stale card never lingers.
  const action = async (label, fn, id = '') => {
    setBusyId(id);
    try { await fn(); toast.success(label); }
    catch (err) { toast.error(err.message); }
    finally {
      invites.refetch();
      requests.refetch();
      onMutate();
      setBusyId('');
    }
  };

  const finalize       = () => action('Team finalized.', () => api.post(`/api/teams/${team.id}/finalize`));
  const cancelInvite   = (id) => action('Invite cancelled.', () => api.post(`/api/invites/${id}/cancel`), id);
  const approveRequest = (id) => action('Request approved — member added.', () => api.post(`/api/join-requests/${id}/approve`), id);
  const denyRequest    = (id) => action('Request denied.',   () => api.post(`/api/join-requests/${id}/deny`), id);

  const approveChange = async (id, kind) => {
    try {
      const res = await api.post(`/api/membership-changes/${id}/approve`);
      if (kind === 'DISBAND') {
        toast.success(res.disbanded ? 'Team dissolved.' : 'Dissolution approval recorded.');
      } else {
        toast.success(kind === 'LEAVE' ? 'Member removed.' : 'Dismissal acknowledged.');
      }
      myChanges.refetch();
      awaitingMe.refetch();
      onMutate();
    } catch (err) { toast.error(err.message); }
  };
  const denyChange = async (id, kind) => {
    try {
      await api.post(`/api/membership-changes/${id}/deny`);
      toast.success(kind === 'DISBAND' ? 'Dissolution request denied.' : 'Request denied.');
      myChanges.refetch();
      awaitingMe.refetch();
      onMutate();
    } catch (err) { toast.error(err.message); }
  };

  const requestLeave = async () => {
    const ok = await confirm({
      title: 'Leave the team?',
      message: 'Your leader must approve this. You\'ll stay a member until then.',
      confirmLabel: 'Submit request',
    });
    if (!ok) return;
    try {
      await api.post(`/api/teams/${team.id}/leave`, {});
      toast.success('Leave request submitted.');
      myChanges.refetch();
      onMutate();
    } catch (err) {
      toast.error(err.message);
      // Sync UI in case backend already had a pending one (race / stale tab).
      myChanges.refetch();
    }
  };

  const cancelLeaveRequest = async () => {
    if (!myPendingLeave) return;
    const ok = await confirm({
      title: 'Cancel leave request?',
      message: 'You\'ll stay a member of the team. You can submit another request later.',
      confirmLabel: 'Cancel request',
    });
    if (!ok) return;
    try {
      await api.post(`/api/membership-changes/${myPendingLeave.id}/cancel`);
      toast.success('Leave request withdrawn.');
      myChanges.refetch();
      onMutate();
    } catch (err) { toast.error(err.message); }
  };

  const dismissMember = async (memberId, name) => {
    const ok = await confirm({
      title: `Dismiss ${name}?`,
      message: 'They must acknowledge the dismissal before they\'re removed.',
      tone: 'crit', confirmLabel: 'Send dismissal',
    });
    if (!ok) return;
    action('Dismissal sent.', () => api.post(`/api/teams/${team.id}/dismiss`, { targetUserId: memberId }));
  };

  const transferLeader = async (newLeaderId, name) => {
    const ok = await confirm({
      title: `Transfer leadership to ${name}?`,
      message: 'You\'ll become a regular member. The new leader can manage invites and finalization.',
      confirmLabel: 'Transfer',
    });
    if (!ok) return;
    action('Leadership transferred.', () => api.post(`/api/teams/${team.id}/transfer-leadership`, { newLeaderId }));
  };

  const dissolveTeam = async () => {
    if (dissolveBlockedReason) return;
    if (teamDisbandPending) {
      const ok = await confirm({
        title: 'Cancel dissolve request?',
        message: 'This keeps the team intact and clears every pending member approval for dissolution.',
        confirmLabel: 'Cancel request',
      });
      if (!ok) return;
      try {
        await api.post(`/api/membership-changes/${myDisbandChanges[0].id}/cancel`);
        toast.success('Dissolution request cancelled.');
        myChanges.refetch();
        awaitingMe.refetch();
        onMutate();
      } catch (err) { toast.error(err.message); }
      return;
    }

    const ok = await confirm({
      title: `Dissolve ${team.name}?`,
      message: 'Each non-leader member will receive an approval request. The team will dissolve only after every member approves.',
      tone: 'crit',
      confirmLabel: 'Send requests',
    });
    if (!ok) return;

    try {
      const res = await api.delete(`/api/teams/${team.id}`);
      if (res.disbanded) {
        toast.success('Team dissolved.');
      } else {
        const count = res.pendingApprovals ?? 0;
        toast.success(`Dissolution request sent to ${count} member${count === 1 ? '' : 's'}.`);
      }
      myChanges.refetch();
      awaitingMe.refetch();
      onMutate();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      {/* Most urgent: membership changes waiting on THIS viewer — a member's
          leave request (leader decides) or a dismissal (the member acknowledges). */}
      {!isFinalized && !teamDisbandPending && teamPendingForMe.length > 0 && (
        <section className="border border-status-warn/60 bg-status-warn/[0.07] shadow-[0_0_0_1px_rgba(251,191,36,0.08),0_0_32px_-12px_rgba(251,191,36,0.45)]">
          <header className="flex items-center justify-between gap-3 border-b border-status-warn/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-warn opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-status-warn" />
              </span>
              <AlertTriangle size={15} className="text-status-warn" />
              <h3 className="font-sans text-[13px] font-black uppercase tracking-[0.16em] text-status-warn">Action needed</h3>
            </div>
            <Badge tone="warn">{teamPendingForMe.length}</Badge>
          </header>
          <div className="divide-y divide-status-warn/15">
            {teamPendingForMe.map((c) => {
              const isLeave = c.kind === 'LEAVE';
              return (
                <div key={c.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-sans text-[14px] font-bold text-text-primary">
                      {isLeave
                        ? <>{c.target?.fullName} wants to leave the team</>
                        : <>Your team leader wants to remove you from {team.name}</>}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-text-secondary">
                      {isLeave
                        ? 'Approve to remove them now, or deny to keep them in the team.'
                        : 'Accept to leave the team, or decline to stay.'}
                      {' · '}{formatRelative(c.createdAt)}
                    </div>
                    {c.reason && <div className="mt-1.5 font-mono text-[12px] text-white/70">“{c.reason}”</div>}
                  </div>
                  <div className="flex shrink-0 justify-end gap-2">
                    <button className={`ghost-button ${COMPACT_BTN}`} onClick={() => denyChange(c.id, c.kind)}>
                      <XCircle size={12} /> {isLeave ? 'Keep in team' : 'Decline'}
                    </button>
                    <button className={`danger-button ${COMPACT_BTN}`} onClick={() => approveChange(c.id, c.kind)}>
                      <CheckCircle2 size={12} /> {isLeave ? 'Approve leave' : 'Accept removal'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <header className="glass-card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="kicker mb-1">{team.domain?.name}{team.problemStatement && ` · ${team.problemStatement.title}`}</div>
            <h2 className="font-sans text-[24px] font-bold">{team.name}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={team.status === 'FINALIZED' ? 'live' : team.status === 'QUALIFIED' ? 'live' : 'warn'} dot>
              {team.status}
            </Badge>
            {isLeader && <Badge tone="cyan"><Crown size={10} className="mr-0.5"/> Leader</Badge>}
            {team.adminOverride && <Badge tone="warn">Admin override</Badge>}
          </div>
        </div>

        <StatusBanner status={team.status} issues={evaluation?.issues ?? []} />

        <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
          <Stat label="Members" value={`${team.memberCount}`} />
          <Stat label="Female"  value={`${team.femaleCount}`} />
          <Stat label="Experts" value={`${team.domainExpertCount}`} />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
          {isLeader && !isFinalized && !teamDisbandPending && (
            <button className="glow-button inline-flex items-center gap-2" onClick={finalize} disabled={team.status !== 'QUALIFIED'}>
              <ShieldCheck size={14} /> Finalize team
            </button>
          )}
          {isLeader && !isFinalized && !teamDisbandPending && (
            <button className="ghost-button inline-flex items-center gap-2" onClick={() => setInviteOpen(true)}>
              <UserPlus size={12} /> Invite member
            </button>
          )}
          {isLeader && (
            <button
              className="danger-button inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={dissolveTeam}
              disabled={Boolean(dissolveBlockedReason)}
              title={dissolveBlockedReason ?? (teamDisbandPending ? 'Cancel team dissolution request' : 'Dissolve this team')}
            >
              <XCircle size={12} /> {teamDisbandPending ? 'Cancel dissolve request' : 'Dissolve team'}
            </button>
          )}
          {!isLeader && !isFinalized && !myDisbandApproval && (
            myPendingLeave ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="warn" dot>Leave request pending leader approval</Badge>
                <button className="ghost-button inline-flex items-center gap-2" onClick={cancelLeaveRequest}>
                  <XCircle size={12} /> Cancel request
                </button>
              </div>
            ) : (
              <button className="danger-button inline-flex items-center gap-2" onClick={requestLeave}>
                <LogOut size={12} /> Request to leave
              </button>
            )
          )}
        </div>

        {isLeader && dissolveBlockedReason && (
          <div className="font-mono text-[11px] text-text-dim">{dissolveBlockedReason}</div>
        )}
      </header>

      {isLeader && teamDisbandPending && (
        <section className="glass-card flat space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="section-label">Team dissolution pending</h3>
              <div className="font-mono text-[11px] text-text-secondary">
                The team will dissolve automatically after every non-leader member approves.
              </div>
            </div>
            <Badge tone="warn">
              {disbandApprovedCount}/{myDisbandChanges.length} approved
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {myDisbandChanges.map((c) => (
              <div key={c.id} className="rounded-none border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-sans text-[13px] font-bold text-text-primary">{c.target?.fullName}</div>
                  <Badge tone={c.status === 'APPROVED' ? 'live' : 'warn'}>{c.status}</Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="font-mono text-[11px] text-text-dim">
            {disbandPendingCount} approval{disbandPendingCount === 1 ? '' : 's'} still pending.
          </div>
        </section>
      )}

      {!isLeader && myDisbandApproval && (
        <section className="glass-card flat space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="section-label">Team dissolution request</h3>
              <div className="font-mono text-[11px] text-text-secondary">
                {myDisbandApproval.status === 'PENDING'
                  ? 'The leader has requested to dissolve this team. It will be removed only if every non-leader member approves.'
                  : 'You approved dissolution. Waiting for the remaining approvals.'}
              </div>
              {myDisbandApproval.reason && (
                <div className="mt-1 font-mono text-[11px] text-text-dim">"{myDisbandApproval.reason}"</div>
              )}
            </div>
            <Badge tone={myDisbandApproval.status === 'APPROVED' ? 'live' : 'warn'}>
              {myDisbandApproval.status === 'APPROVED' ? 'Approved' : 'Approval required'}
            </Badge>
          </div>

          {myDisbandApproval.status === 'PENDING' && (
            <div className="flex justify-end gap-2">
              <button className={`ghost-button ${COMPACT_BTN}`} onClick={() => denyChange(myDisbandApproval.id, 'DISBAND')}>
                <XCircle size={12}/> Deny
              </button>
              <button className={`danger-button ${COMPACT_BTN}`} onClick={() => approveChange(myDisbandApproval.id, 'DISBAND')}>
                <CheckCircle2 size={12}/> Approve
              </button>
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h3 className="section-label">Members</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {team.members.map((m) => {
            const isMe = m.user.id === user.id;
            const isThisLeader = m.role === 'LEADER';
            // If this member already has an open change request, hide the
            // leader's start-a-new-one buttons — they should approve the
            // existing one in the panel below instead. Prevents the dual-
            // dismiss / leave-then-dismiss 409 you can otherwise get.
            const memberHasOpenChange = teamPendingForMe.some(
              (c) => c.target?.id === m.user.id,
            );
            return (
              <article key={m.user.id} className="glass-card flat flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-none border border-white/10 bg-black font-sans text-[13px] font-bold text-white">
                    {(m.user.fullName ?? '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 font-sans text-[14px] font-bold">
                      {m.user.fullName} {isMe && <Badge tone="dim">you</Badge>}
                    </div>
                    <div className="font-mono text-[11px] text-text-secondary">{m.user.email}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge tone={isThisLeader ? 'cyan' : 'dim'}>{m.role}</Badge>
                  {isLeader && !isThisLeader && !isFinalized && !teamDisbandPending && (
                    memberHasOpenChange ? (
                      <Badge tone="warn">Awaiting your decision ↑</Badge>
                    ) : (
                      <div className="flex gap-1">
                        <button className="ghost-button text-[10px]" onClick={() => transferLeader(m.user.id, m.user.fullName)}>
                          Make leader
                        </button>
                        <button className="danger-button text-[10px]" onClick={() => dismissMember(m.user.id, m.user.fullName)}>
                          Dismiss
                        </button>
                      </div>
                    )
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Leader's queues — shown only when something needs attention, above the chat. */}
      {isLeader && !isFinalized && !teamDisbandPending && (pendingRequests.length > 0 || pendingInvites.length > 0) && (
        <div className={`grid gap-6 ${pendingRequests.length > 0 && pendingInvites.length > 0 ? 'lg:grid-cols-2' : ''}`}>
          {pendingRequests.length > 0 && (
          <QueuePanel
            title="Join requests"
            icon={UserMinus}
            count={pendingRequests.length}
            loading={requests.loading}
            emptyText="No one has asked to join yet."
          >
            {pendingRequests.map((r) => (
              <QueueRow
                key={r.id}
                name={r.requester.fullName}
                sub={r.requester.email}
                badges={(
                  <>
                    {r.requester.domain?.name && <Badge tone="dim">{r.requester.domain.name}</Badge>}
                    {r.requester.gender === 'FEMALE' && <Badge tone="live">Female</Badge>}
                    {r.requester.isDomainExpert && <Badge tone="cyan">Expert</Badge>}
                  </>
                )}
                actions={(
                  <>
                    <button className={`ghost-button ${COMPACT_BTN}`} disabled={busyId === r.id} onClick={() => denyRequest(r.id)}>
                      <XCircle size={12} /> Deny
                    </button>
                    <button className={`glow-button ${COMPACT_BTN}`} disabled={busyId === r.id} onClick={() => approveRequest(r.id)}>
                      {busyId === r.id ? <Spinner size={12} /> : <CheckCircle2 size={12} />} Approve
                    </button>
                  </>
                )}
              />
            ))}
          </QueuePanel>
          )}

          {pendingInvites.length > 0 && (
          <QueuePanel
            title="Pending invites"
            icon={UserPlus}
            count={pendingInvites.length}
            loading={invites.loading}
            emptyText="No invites waiting for a reply."
          >
            {pendingInvites.map((i) => (
              <QueueRow
                key={i.id}
                name={i.invitee.fullName}
                sub={i.invitee.email}
                badges={<Badge tone="warn" dot>Awaiting reply</Badge>}
                actions={(
                  <button className={`ghost-button ${COMPACT_BTN}`} disabled={busyId === i.id} onClick={() => cancelInvite(i.id)}>
                    {busyId === i.id ? <Spinner size={12} /> : <XCircle size={12} />} Cancel
                  </button>
                )}
              />
            ))}
          </QueuePanel>
          )}
        </div>
      )}

      <TeamChat key={team.id} teamId={team.id} />


      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} teamId={team.id} onSent={onMutate} />
    </div>
  );
};

// Small, single-line action buttons (icon beside the label).
const COMPACT_BTN = 'inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-[12px] disabled:opacity-60';

// Bordered panel with a header + count, used for the leader's queues.
const QueuePanel = ({ title, icon: Icon, count, loading, emptyText, children }) => (
  <section className="border border-white/10 bg-white/[0.02]">
    <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="text-white/40" />}
        <h3 className="section-label !text-white/70">{title}</h3>
      </div>
      <Badge tone={count ? 'warn' : 'dim'}>{count}</Badge>
    </header>
    {loading ? (
      <div className="p-4"><CardSkeleton rows={1} /></div>
    ) : count === 0 ? (
      <p className="px-4 py-5 text-center font-mono text-[12px] text-white/35">{emptyText}</p>
    ) : (
      <div className="divide-y divide-white/5">{children}</div>
    )}
  </section>
);

// One person per row: avatar, name + subline, badges, actions on the right.
const QueueRow = ({ name, sub, badges, actions }) => (
  <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center border border-white/10 bg-black font-sans text-[12px] font-bold text-white">
        {(name ?? '?').slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="truncate font-sans text-[13px] font-bold text-text-primary">{name}</div>
        {sub && <div className="truncate font-mono text-[11px] text-text-secondary">{sub}</div>}
        {badges && <div className="mt-1.5 flex flex-wrap gap-1">{badges}</div>}
      </div>
    </div>
    <div className="flex shrink-0 justify-end gap-2">{actions}</div>
  </div>
);

const Stat = ({ label, value }) => (
  <div>
    <div className="section-label">{label}</div>
    <div className="font-sans text-[22px] font-bold text-text-primary">{value}</div>
  </div>
);

// ── Page entry ────────────────────────────────────────────────────────────
export const TeamFormationPage = () => {
  const myTeam = useApi(() => api.get('/api/teams/mine'), [], { pollMs: 5000 });

  // Need full detail (with members) — list is light. Refetch detail when needed.
  const detail = useApi(
    () => myTeam.data?.team ? api.get(`/api/teams/${myTeam.data.team.id}`) : Promise.resolve(null),
    [myTeam.data?.team?.id],
  );
  const evaluation = useApi(
    () => myTeam.data?.team ? api.get(`/api/teams/${myTeam.data.team.id}/evaluation`) : Promise.resolve(null),
    [myTeam.data?.team?.id],
  );

  // Refetch my-team detail when invite/request events touch us.
  useSocketEvent('invite:received', () => { myTeam.refetch(); }, []);

  const refresh = () => {
    myTeam.refetch();
    detail.refetch();
    evaluation.refetch();
  };

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <PageHeader
        kicker="Team Hub"
        title="Squad formation"
        description="Create a team, send invites, request to join, transfer leadership, and finalize when ready."
      />

      {myTeam.loading && <CardSkeleton rows={3} />}

      {!myTeam.loading && !myTeam.data?.team && (
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <CreateTeamForm onCreated={refresh} />
          <JoinableList />
        </div>
      )}

      {detail.data?.team && (
        <MyTeamView
          team={detail.data.team}
          evaluation={evaluation.data}
          onMutate={refresh}
        />
      )}
    </section>
  );
};
