import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Spinner } from '../ui/Spinner.jsx';

export const DOMAIN_PICKS = 4;
export const DOMAINS_SAVED_EVENT = 'txp:domains-saved';

// Pick exactly 4 domains, in order. The first pick is the main domain.
export const DomainPicker = ({ open, onClose, initial = [], onSaved }) => {
  const toast = useToast();
  const domains = useApi(() => (open ? api.get('/api/taxonomy/domains') : Promise.resolve({ domains: [] })), [open], { refetchOnFocus: false });
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);

  // Each time the list loads for an opening, start from the student's
  // current picks that still exist.
  const [startedFrom, setStartedFrom] = useState(null);
  if (open && domains.data && startedFrom !== domains.data) {
    const known = new Set(domains.data.domains.map((d) => d.id));
    setStartedFrom(domains.data);
    setPicked(initial.filter((id) => known.has(id)).slice(0, DOMAIN_PICKS));
  }

  const toggle = (id) => setPicked((p) => {
    if (p.includes(id)) return p.filter((x) => x !== id);
    return p.length < DOMAIN_PICKS ? [...p, id] : p;
  });

  const save = async () => {
    setBusy(true);
    try {
      const { user } = await api.patch('/api/students/me/domains', { preferredDomains: picked });
      toast.success('Your domains are saved.');
      window.dispatchEvent(new CustomEvent(DOMAINS_SAVED_EVENT));
      onSaved?.(user);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const list = domains.data?.domains ?? [];
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Choose your 4 domains"
      size="lg"
      footer={(
        <>
          <span className="mr-auto font-mono text-[11px] text-text-secondary">{picked.length} of {DOMAIN_PICKS} picked</span>
          <button type="button" className="ghost-button" onClick={onClose}>Cancel</button>
          <button type="button" className="glow-button inline-flex items-center gap-2 disabled:opacity-60" disabled={picked.length !== DOMAIN_PICKS || busy} onClick={save}>
            {busy && <Spinner size={12} />} Save domains
          </button>
        </>
      )}
    >
      <p className="mb-4 font-mono text-[12px] text-text-secondary">
        Pick exactly 4. Your first pick is your main domain.
      </p>
      {domains.loading ? <Spinner /> : (
        <div className="grid gap-2 sm:grid-cols-2">
          {list.map((d) => {
            const order = picked.indexOf(d.id);
            const on = order >= 0;
            const full = !on && picked.length >= DOMAIN_PICKS;
            return (
              <button
                key={d.id}
                type="button"
                aria-pressed={on}
                disabled={full}
                onClick={() => toggle(d.id)}
                className={`flex items-center gap-3 border px-3 py-2 text-left font-sans text-[13px] transition ${on ? 'border-white bg-white/10 text-white' : 'border-white/10 text-text-secondary hover:border-white/40'} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <span className={`grid h-6 w-6 shrink-0 place-items-center border font-mono text-[11px] ${on ? 'border-white bg-white text-black' : 'border-white/20'}`}>
                  {on ? order + 1 : ''}
                </span>
                <span>{d.name}{order === 0 && <span className="ml-2 font-mono text-[10px] uppercase text-text-secondary">main</span>}</span>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
};
