import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { Spinner } from '../ui/Spinner.jsx';

// Kept in step with TSHIRT_SIZES in services/api/src/validators/registration.schema.js.
export const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
export const PROFILE_SAVED_EVENT = 'txp:domains-saved';

// A size dropdown with a Save button, for students to set or change their size.
export const TshirtSizePicker = ({ current = '', onSaved, compact = false }) => {
  const toast = useToast();
  const [size, setSize] = useState(current ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const { user } = await api.patch('/api/students/me/tshirt-size', { tshirtSize: size });
      toast.success('T-shirt size saved.');
      window.dispatchEvent(new CustomEvent(PROFILE_SAVED_EVENT));
      onSaved?.(user);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="T-shirt size"
        className={`select-glass ${compact ? 'h-11 w-28' : 'h-12 w-32'} border-white/10 bg-black`}
        value={size}
        onChange={(e) => setSize(e.target.value)}
      >
        <option value="" disabled>Size</option>
        {TSHIRT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <button type="button" className="glow-button inline-flex items-center gap-2 disabled:opacity-60" disabled={!size || size === current || busy} onClick={save}>
        {busy && <Spinner size={12} />} Save
      </button>
    </div>
  );
};
