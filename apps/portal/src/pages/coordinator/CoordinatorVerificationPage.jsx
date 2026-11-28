import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Search, Clock, Building2 } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { Empty } from '../../components/ui/Empty.jsx';
import { CardSkeleton } from '../../components/ui/Skeleton.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { StatTile } from '../../components/ui/StatTile.jsx';
import { formatDate } from '../../utils/format.js';
import { IdCardModal } from '../../components/verification/IdCardModal.jsx';

export const CoordinatorVerificationPage = () => {
  const toast = useToast();
  const { user } = useAuth();
  // A coordinator without an institution reviews every institution.
  const scoped = Boolean(user?.institution?.name);
  const [tab, setTab] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [reject, setReject] = useState(null);
  const [idCardFor, setIdCardFor] = useState(null);
  // Coordinators without an institution can narrow the lists to one.
  const [filterInstitutionId, setFilterInstitutionId] = useState('');
  const institutions = useApi(
    () => (scoped ? Promise.resolve(null) : api.get('/api/taxonomy/institutions')),
    [scoped],
    { refetchOnFocus: false },
  );
  const institutionOptions = institutions.data?.institutions ?? institutions.data ?? [];
  const filterName = institutionOptions.find?.((i) => i.id === filterInstitutionId)?.name;
  const institutionName = user?.institution?.name ?? filterName ?? 'All institutions';
  const listQuery = { search, institutionId: scoped ? undefined : filterInstitutionId || undefined };

  const pending = useApi(
    () => api.get('/api/coordinator/verification/pending', { query: listQuery }),
    [search, filterInstitutionId],
  );

  const verified = useApi(
    () => api.get('/api/coordinator/verification/students', { query: { status: 'VERIFIED', ...listQuery } }),
    [search, filterInstitutionId],
  );

  const stats = useMemo(() => ({
    pending: pending.data?.count ?? 0,
    verified: verified.data?.count ?? 0,
  }), [pending.data, verified.data]);

  const list = tab === 'PENDING' ? (pending.data?.users ?? []) : (verified.data?.users ?? []);
  const loading = tab === 'PENDING' ? pending.loading : verified.loading;

  const refresh = () => {
    pending.refetch();
    verified.refetch();
  };

  const approve = async (student) => {
    try {
      await api.post(`/api/coordinator/verification/students/${student.id}/approve`);
      toast.success(`Approved ${student.fullName}. Credentials emailed to the student.`);
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader
        kicker={`Campus Desk // सत्यापन केंद्र · ${institutionName}`}
        title="Candidate Review Console"
        description={scoped
          ? `Review and verify student registrations from ${institutionName}. Approved candidates receive login codes immediately.`
          : 'Review and verify student registrations across all campuses. Approved candidates receive login codes immediately.'}
        actions={(
          <div className="min-w-[250px] rounded-none border border-white/10 bg-[#050505] px-4 py-3">
            <label htmlFor="scope-institution" className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
              {scoped ? 'Coordinator Scope' : 'Institution filter'}
            </label>
            {scoped ? (
              <div className="mt-1 font-sans text-[16px] font-black uppercase tracking-[0.08em] text-white">
                {institutionName}
              </div>
            ) : (
              <select
                id="scope-institution"
                className="select-glass mt-2 h-10 w-full border-white/10 bg-black font-sans text-[13px] font-bold uppercase tracking-[0.06em] text-white"
                value={filterInstitutionId}
                onChange={(e) => setFilterInstitutionId(e.target.value)}
              >
                <option value="">All institutions</option>
                {institutionOptions.map?.((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            )}
          </div>
        )}
      />

      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.25fr)]">
        <StatTile
          icon={Clock}
          label="Pending / Unverified"
          value={stats.pending}
          hint="Awaiting coordinator decision"
        />
        <StatTile
          icon={ShieldCheck}
          label="Verified Students"
          value={stats.verified}
          hint="Approved for portal access"
        />
        <ScopeCard institutionName={institutionName} scoped={scoped} filtered={Boolean(filterName)} />
      </div>

      <div className="relative mb-4 w-full">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
        <input
          className="input-glass !h-12 !pl-12"
          placeholder="Search name / email / reg # / TXP ref"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'PENDING', label: 'Pending Review', icon: Clock, badge: stats.pending || undefined },
          { value: 'VERIFIED', label: 'Verified Students', icon: ShieldCheck, badge: stats.verified || undefined },
        ]}
      />

      {loading && <CardSkeleton rows={4} />}

      {!loading && list.length === 0 && (
        <Empty
          icon={tab === 'PENDING' ? Clock : ShieldCheck}
          title={tab === 'PENDING' ? 'No pending students' : 'No verified students'}
          description={tab === 'PENDING'
            ? `There are no pending registrations${scoped || filterName ? ` for ${institutionName}` : ''} right now.`
            : `No verified students${scoped || filterName ? ` from ${institutionName}` : ''} match the current filters.`}
        />
      )}

      {list.length > 0 && (
        <div className="overflow-hidden rounded-none border border-white/5 bg-black">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] md:min-w-full">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <Th>Student</Th>
                  <Th>Contact</Th>
                  <Th>Reg #</Th>
                  <Th>Primary Domain</Th>
                  <Th>{tab === 'PENDING' ? 'Submitted' : 'Verified On'}</Th>
                  <Th align="right">{tab === 'PENDING' ? 'Decision' : 'Status'}</Th>
                </tr>
              </thead>
              <tbody>
                {list.map((student) => (
                  <tr key={student.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="font-mono text-[12px] text-text-primary">{student.fullName}</div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">
                          {buildStudentMeta(student)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1 font-mono text-[12px]">
                        <div className="text-text-secondary">{student.email}</div>
                        <div className="text-[10px] uppercase tracking-[0.15em] text-white/30">
                          {student.phone || 'Phone not provided'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-[12px] text-text-secondary">{student.registrationNo || '-'}</td>
                    <td className="px-4 py-4 font-mono text-[12px] text-text-secondary">{student.domain?.name || '-'}</td>
                    <td className="px-4 py-4 font-mono text-[12px] text-text-secondary">
                      {formatDate(tab === 'PENDING' ? student.createdAt : (student.passwordIssuedAt || student.updatedAt))}
                    </td>
                    <td className="px-4 py-4">
                      {tab === 'PENDING' ? (
                        <div className="flex justify-end gap-1.5">
                          <button className="ghost-button text-[10px]" onClick={() => setIdCardFor(student)}>ID card</button>
                          <button className="glow-button text-[10px]" onClick={() => approve(student)}>Approve</button>
                          <button className="danger-button text-[10px]" onClick={() => setReject(student)}>Reject</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button className="ghost-button text-[10px]" onClick={() => setIdCardFor(student)}>ID card</button>
                          <Badge tone="live" dot>Verified</Badge>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <RejectModal target={reject} onClose={() => setReject(null)} onDone={refresh} />
      {idCardFor && (
        <IdCardModal
          student={idCardFor}
          basePath="/api/coordinator/verification"
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

const ScopeCard = ({ institutionName, scoped, filtered }) => (
  <div className="relative overflow-hidden rounded-none border border-white/5 bg-[#050505] p-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/30">{scoped ? 'Institution Lock' : 'Scope'}</div>
        <div className="mt-4 font-sans text-[22px] font-black uppercase leading-tight tracking-[0.04em] text-white">
          {institutionName}
        </div>
      </div>
      <Building2 size={18} className="text-white/15" />
    </div>
    <div className="mt-6 border-t border-white/10 pt-4 font-mono text-[11px] leading-relaxed text-white/40">
      {scoped
        ? 'Coordinator review is restricted to this institution. Both tabs are filtered automatically.'
        : filtered
          ? 'Both tabs show only this institution. Choose “All institutions” in the filter at the top right to see everyone.'
          : 'This coordinator account is not tied to an institution, so both tabs show students from every institution. Use the filter at the top right to narrow them.'}
    </div>
  </div>
);

const buildStudentMeta = (student) => {
  const parts = [student.degree, student.branch, student.yearSemester].filter(Boolean);
  if (!parts.length) return 'Profile details pending';
  return parts.join(' / ');
};

const Th = ({ children, align }) => (
  <th className={`px-4 py-3 font-mono text-[10px] uppercase tracking-[0.15em] text-text-dim ${align === 'right' ? 'text-right' : ''}`}>{children}</th>
);

const RejectModal = ({ target, onClose, onDone }) => {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setReason('');
    setBusy(false);
  }, [target?.id]);

  if (!target) return null;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/api/coordinator/verification/students/${target.id}/reject`, { reason: reason.trim() || undefined });
      toast.success('Rejection sent.');
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Reject ${target.fullName}?`} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Reason" hint="Optional. This appears in the rejection email.">
          <textarea
            className="input-glass min-h-[100px]"
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </FormField>
        <div className="flex justify-end gap-2">
          <button type="button" className="ghost-button" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={busy} className="danger-button">
            {busy ? <Spinner size={12} /> : 'Reject'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

