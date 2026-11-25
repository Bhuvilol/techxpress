import { useEffect, useState } from 'react';
import { IdCard } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Spinner } from '../ui/Spinner.jsx';

// Shows a student's college ID card next to the details to compare it with.
// `basePath` is the verification API for the viewer's role, e.g.
// "/api/admin/verification" or "/api/coordinator/verification".
// The image is fetched with the login token and shown from memory; it is
// never cached and the object URL is released when the modal closes.
//
// For a PENDING student it also offers the decision: Approve and Reject hand
// back to the page's own flows; "Ask to re-register" removes the registration
// and emails the student (with an optional note) to register again.
const DEFAULT_NOTE = 'Your ID card photo was blurry or unreadable. Please upload a clear photo of the front of the card, with your name, photo and registration number visible.';

// For a REJECTED student (admins only) the re-register note defaults to a
// second-chance message instead; `startAsking` opens straight on the note.
const REJECTED_NOTE = 'Your registration has been reviewed again. Please register once more and make sure your details match your college ID card.';

export const IdCardModal = ({ student, basePath, onClose, onApprove, onReject, onReregistered, startAsking = false }) => {
  const toast = useToast();
  const wasRejected = student.verificationStatus === 'REJECTED';
  const [state, setState] = useState({ url: null, error: null });
  const [asking, setAsking] = useState(startAsking);
  const [note, setNote] = useState(wasRejected ? REJECTED_NOTE : DEFAULT_NOTE);
  const [busy, setBusy] = useState(false);

  const sendBack = async () => {
    setBusy(true);
    try {
      const res = await api.post(`${basePath}/students/${student.id}/request-reregistration`, { note: note.trim() || undefined });
      if (res?.emailDelivered) toast.success(`${student.fullName} was emailed to register again.`);
      else toast.error(`Registration removed, but the email to ${student.email} could not be sent. Contact the student directly.`, { ttl: 9000 });
      onReregistered?.();
      onClose();
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  const footer = onApprove || onReject || onReregistered ? (
    asking ? (
      <div className="w-full space-y-3">
        <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-white/40" htmlFor="reregister-note">
          Note to the student (included in the email)
        </label>
        <textarea
          id="reregister-note"
          className="input-glass min-h-[84px] w-full"
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <p className="font-mono text-[11px] text-white/40">
          This removes {student.fullName}'s {wasRejected ? 'rejected ' : ''}registration so they can register again with the same email and registration number.
        </p>
        <div className="flex justify-end gap-2">
          <button className="ghost-button text-[11px]" onClick={() => setAsking(false)} disabled={busy}>Back</button>
          <button className="glow-button text-[11px]" onClick={sendBack} disabled={busy}>
            {busy ? <Spinner /> : 'Remove & email student'}
          </button>
        </div>
      </div>
    ) : (
      <div className="flex w-full flex-wrap justify-end gap-2">
        {onReregistered && (
          <button className="ghost-button text-[11px]" onClick={() => setAsking(true)} title="ID card not clear: ask the student to register again">
            {wasRejected ? 'Allow to re-register' : 'Ask to re-register'}
          </button>
        )}
        {onReject && <button className="danger-button text-[11px]" onClick={() => { onClose(); onReject(student); }}>Reject</button>}
        {onApprove && <button className="glow-button text-[11px]" onClick={() => { onClose(); onApprove(student); }}>{wasRejected ? 'Approve anyway' : 'Approve'}</button>}
      </div>
    )
  ) : null;

  useEffect(() => {
    let url = null;
    let cancelled = false;
    api.blob(`${basePath}/students/${student.id}/id-card`)
      .then((b) => {
        if (cancelled) return;
        url = URL.createObjectURL(b);
        setState({ url, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ url: null, error: err.status === 404 ? 'No ID card was uploaded for this student.' : err.message });
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [basePath, student.id]);

  return (
    <Modal open onClose={onClose} title={`ID card · ${student.fullName}`} size="xl" footer={footer}>
      <div className="grid gap-6 md:grid-cols-[1fr_240px]">
        <div className="grid min-h-[260px] place-items-center border border-white/10 bg-black p-2">
          {state.url && <img src={state.url} alt={`College ID card of ${student.fullName}`} className="max-h-[65vh] w-full object-contain" />}
          {!state.url && !state.error && <Spinner />}
          {state.error && (
            <div className="flex flex-col items-center gap-3 p-6 text-center font-mono text-[12px] text-white/50">
              <IdCard size={28} strokeWidth={1.5} className="text-white/25" />
              {state.error}
            </div>
          )}
        </div>
        <dl className="space-y-4 font-mono text-[12px]">
          {[
            ['Name', student.fullName],
            ['Registration no.', student.registrationNo],
            ['Institution', student.institution?.name],
            ['Email', student.email],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[10px] uppercase tracking-[0.18em] text-white/35">{label}</dt>
              <dd className="mt-1 break-words text-white/85">{value || '—'}</dd>
            </div>
          ))}
          <p className="border-t border-white/10 pt-4 text-[11px] leading-relaxed text-white/40">
            Check that the name, registration number and institution on the card match.
          </p>
        </dl>
      </div>
    </Modal>
  );
};
