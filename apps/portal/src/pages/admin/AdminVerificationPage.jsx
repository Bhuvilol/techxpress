import { useEffect, useState } from 'react';
import {
  ShieldCheck, Search, Users, ShieldAlert, ShieldOff, Clock, Mail,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Empty } from '../../components/ui/Empty.jsx';
import { CardSkeleton } from '../../components/ui/Skeleton.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { StatTile } from '../../components/ui/StatTile.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { confirm } from '../../components/ui/Confirm.jsx';
import { titleCase } from '../../utils/format.js';
import { IdCardModal } from '../../components/verification/IdCardModal.jsx';

const STATUS_TONE = { PENDING: 'warn', VERIFIED: 'live', REJECTED: 'crit', REVOKED: 'crit' };

export const AdminVerificationPage = () => {
  const toast = useToast();
  const [tab, setTab] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [reject, setReject] = useState(null);
  // { user, password } shown after approve / reissue
  const [idCardFor, setIdCardFor] = useState(null);
  const [reregisterFor, setReregisterFor] = useState(null);

  // Debounce search query to prevent N requests on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Dedicated, fast server-side stats calculation for cards & tab badges
  const statsApi = useApi(() => api.get('/api/admin/verification/stats'), []);
  const stats = statsApi.data?.stats ?? { total: 0, PENDING: 0, VERIFIED: 0, REJECTED: 0, REVOKED: 0 };

  // Query only the active tab with server-side pagination & search
  const isPendingTab = tab === 'PENDING';
  const queryData = useApi(
    () => isPendingTab
      ? api.get('/api/admin/verification/pending', {
          query: { search: debouncedSearch.trim() || undefined, page, limit },
        })
      : api.get('/api/admin/verification/students', {
          query: {
            status: tab === 'ALL' ? undefined : tab,
            search: debouncedSearch.trim() || undefined,
            page,
            limit,
          },
        }),
    [isPendingTab, tab, debouncedSearch, page, limit],
  );

  const list = queryData.data?.users ?? [];
  const loading = queryData.loading;
  const total = queryData.data?.total ?? 0;
  const totalPages = queryData.data?.totalPages ?? 1;

  // Approving/rejecting the last row of the last page empties it — step back
  // to the new last page instead of stranding the admin on an empty one.
  if (queryData.data && page > totalPages) setPage(totalPages);

  const refresh = () => {
    queryData.refetch();
    statsApi.refetch();
  };

  const handleTabChange = (nextTab) => {
    setTab(nextTab);
    setPage(1);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // ── actions ───────────────────────────────────────────────────────────
  const approve = async (u, { allowRegistryMismatch = false } = {}) => {
    try {
      await api.post(`/api/admin/verification/students/${u.id}/approve`, allowRegistryMismatch ? { allowRegistryMismatch: true } : undefined);
      toast.success(`Approved ${u.fullName}. Credentials emailed to the student.`);
      refresh();
    } catch (e) {
      if (e.code === 'REGISTRY_MISMATCH') {
        // The college registry disagrees with the form. Ask before overriding.
        const lines = (e.details?.mismatches ?? []).map((m) => `${m.field}: form says “${m.actual}”, registry says “${m.expected}”`);
        const ok = await confirm({
          title: `Registry mismatch for ${u.fullName}`,
          message: `${lines.join('. ')}. Approve anyway? The login code will be emailed to ${u.email}.`,
          tone: 'crit',
          confirmLabel: 'Approve anyway',
        });
        if (ok) approve(u, { allowRegistryMismatch: true });
        return;
      }
      toast.error(e.message);
    }
  };

  // A rejection is otherwise final; this approves the student after all.
  const approveRejected = async (u) => {
    const ok = await confirm({
      title: `Approve ${u.fullName} anyway?`,
      message: 'They were rejected earlier. Approving issues a login code, emails it to them and shows it to you once.',
      confirmLabel: 'Approve',
    });
    if (ok) approve(u);
  };

  const revoke = async (u) => {
    const ok = await confirm({
      title: `Revoke ${u.fullName}?`,
      message: 'They are signed out immediately and removed from their team (if they lead it, leadership passes to the longest-standing member). The team keeps its scores.',
      tone: 'crit', confirmLabel: 'Revoke',
    });
    if (!ok) return;
    try {
      const res = await api.post(`/api/admin/verification/students/${u.id}/revoke`);
      toast.success(res?.message ?? 'Access revoked.', { ttl: 7000 });
      refresh();
    } catch (e) { toast.error(e.message); }
  };

  // Issues a new password and emails it. The old one stops working. Nothing is
  // shown on screen; if the email cannot be sent, the password is not changed.
  const sendNewPassword = async (u) => {
    const ok = await confirm({
      title: `Send a new password to ${u.fullName}?`,
      message: 'This replaces their current password. The new 6-digit password is emailed to them.',
      confirmLabel: 'Send new password',
    });
    if (!ok) return;
    try {
      await api.post(`/api/admin/verification/students/${u.id}/reissue-password`);
      toast.success('New password emailed.');
    } catch (e) { toast.error(e.message); }
  };

  const restore = async (u) => {
    const ok = await confirm({
      title: `Undo revoke for ${u.fullName}?`,
      message: 'This restores login access and emails the student a fresh 6-digit password.',
      confirmLabel: 'Undo revoke',
    });
    if (!ok) return;
    try {
      await api.post(`/api/admin/verification/students/${u.id}/restore`);
      toast.success('Access restored and password emailed.');
      refresh();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <>
      <PageHeader
        kicker="VERIFICATION QUEUE"
        title="OPERATIVE REVIEW"
        description="Approve or reject self-registered students. Approving issues a 6-digit password that is emailed to the student and also shown to you once on this screen as a backup."
      />

      <div className="relative mb-8 w-full">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
        <input
          className="input-glass !h-14 !pl-12 !bg-[#050505] border-white/10 focus:border-white/40"
          placeholder="Search name / email / reg #"
          value={search}
          onChange={handleSearchChange}
        />
      </div>

      {/* ── Stat tiles ─────────────────────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile icon={Users}        label="Total"     value={stats.total} />
        <StatTile icon={ShieldCheck}  label="Verified"  value={stats.VERIFIED} tone="live" hint="Cleared to log in" />
        <StatTile icon={Clock}        label="Pending"   value={stats.PENDING}  tone="warn" hint="Awaiting review" />
        <StatTile icon={ShieldAlert}  label="Rejected"  value={stats.REJECTED} tone="crit" />
        <StatTile icon={ShieldOff}    label="Revoked"   value={stats.REVOKED}  tone="crit" />
      </div>

      <Tabs
        className="mb-4"
        value={tab}
        onChange={handleTabChange}
        items={[
          { value: 'PENDING',  label: 'Pending',  badge: stats.PENDING  || undefined },
          { value: 'VERIFIED', label: 'Verified', badge: stats.VERIFIED || undefined },
          { value: 'REJECTED', label: 'Rejected', badge: stats.REJECTED || undefined },
          { value: 'REVOKED',  label: 'Revoked',  badge: stats.REVOKED  || undefined },
          { value: 'ALL',      label: 'All',      badge: stats.total    || undefined },
        ]}
      />

      {loading && <CardSkeleton rows={4} />}
      {!loading && list.length === 0 && (
        <Empty
          icon={ShieldCheck}
          title="Nothing here"
          description={tab === 'PENDING'
            ? 'No pending registrations. New self-registrations land here for review.'
            : `No ${tab.toLowerCase()} accounts match your filters.`}
        />
      )}

      {list.length > 0 && (
        <div className="overflow-hidden rounded-none border border-white/5 bg-black">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] md:min-w-full">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <Th>Operative</Th>
                <Th>Email</Th>
                <Th>Reg #</Th>
                <Th>Institution</Th>
                <Th>Domain</Th>
                {tab === 'PENDING' && <Th>Match</Th>}
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-[12px] text-text-primary">{u.fullName}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-text-secondary">{u.email}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-text-secondary">{u.registrationNo ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-text-secondary">{u.institution?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-text-secondary">{u.domain?.name ?? '—'}</td>
                  {tab === 'PENDING' && (
                    <td className="px-4 py-3">
                      {u.registryMatch?.matched
                        ? (u.registryMatch.mismatches?.length
                            ? <Badge tone="warn" dot title={u.registryMatch.mismatches.map((m) => m.field).join(', ')}>
                                {u.registryMatch.mismatches.map((m) => (m.field === 'email' ? 'Email' : 'Institution')).join(' & ')} mismatch
                              </Badge>
                            : <Badge tone="live" dot>Matched</Badge>)
                        : <Badge tone="warn">No match</Badge>}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[u.verificationStatus]} dot>{titleCase(u.verificationStatus)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button className="ghost-button text-[10px]" onClick={() => setIdCardFor(u)} title="View the college ID card uploaded at registration">ID card</button>
                      {u.verificationStatus === 'PENDING' && (
                        <>
                          <button className="glow-button text-[10px]" onClick={() => approve(u)}>Approve</button>
                          <button className="danger-button text-[10px]" onClick={() => setReject(u)}>Reject</button>
                        </>
                      )}
                      {u.verificationStatus === 'VERIFIED' && (
                        <>
                          <button
                            className="ghost-button inline-flex items-center gap-1 text-[10px]"
                            onClick={() => sendNewPassword(u)}
                            title="Issue a new 6-digit password and email it"
                          >
                            <Mail size={10}/> New password
                          </button>
                          <button className="danger-button text-[10px]" onClick={() => revoke(u)}>Revoke</button>
                        </>
                      )}
                      {u.verificationStatus === 'REJECTED' && (
                        <>
                          <button className="glow-button text-[10px]" onClick={() => approveRejected(u)} title="Approve this student after all and issue a login code">Approve anyway</button>
                          <button className="ghost-button text-[10px]" onClick={() => setReregisterFor(u)} title="Clear the registration so the student can register again">Allow to re-register</button>
                        </>
                      )}
                      {u.verificationStatus === 'REVOKED' && (
                        <button className="glow-button text-[10px]" onClick={() => restore(u)}>Undo revoke</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {list.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
          limits={[10, 25, 50, 100]}
          itemLabel="operatives"
        />
      )}

      <RejectModal target={reject} onClose={() => setReject(null)} onDone={refresh} />
      {reregisterFor && (
        <IdCardModal
          student={reregisterFor}
          basePath="/api/admin/verification"
          onClose={() => setReregisterFor(null)}
          onReregistered={refresh}
          startAsking
        />
      )}
      {idCardFor && (
        <IdCardModal
          student={idCardFor}
          basePath="/api/admin/verification"
          onClose={() => setIdCardFor(null)}
          // Decision buttons only for students still waiting for review.
          {...((idCardFor.verificationStatus ?? (tab === 'PENDING' ? 'PENDING' : null)) === 'PENDING' && {
            onApprove: approve,
            onReject: setReject,
            onReregistered: refresh,
          })}
        />
      )}
    </>
  );
};

const Th = ({ children, align }) => (
  <th className={`px-4 py-3 font-mono text-[10px] uppercase tracking-[0.15em] text-text-dim ${align === 'right' ? 'text-right' : ''}`}>{children}</th>
);

const RejectModal = ({ target, onClose, onDone }) => {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (!target) return null;
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/api/admin/verification/students/${target.id}/reject`, { reason: reason.trim() || undefined });
      toast.success('Rejection sent.');
      onDone();
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Reject ${target.fullName}?`} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Reason" hint="Optional. Surfaces in the rejection email.">
          <textarea className="input-glass min-h-[100px]" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
        <div className="flex justify-end gap-2">
          <button type="button" className="ghost-button" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={busy} className="danger-button">{busy ? <Spinner size={12}/> : 'Reject'}</button>
        </div>
      </form>
    </Modal>
  );
};

