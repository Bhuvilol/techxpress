import { useEffect, useState } from 'react';
import { IdCard } from 'lucide-react';
import { api } from '../../lib/api.js';
import { Modal } from '../ui/Modal.jsx';
import { Spinner } from '../ui/Spinner.jsx';

// Shows a student's college ID card next to the details to compare it with.
// `basePath` is the verification API for the viewer's role, e.g.
// "/api/admin/verification" or "/api/coordinator/verification".
// The image is fetched with the login token and shown from memory; it is
// never cached and the object URL is released when the modal closes.
export const IdCardModal = ({ student, basePath, onClose, footer }) => {
  const [state, setState] = useState({ url: null, error: null });

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
