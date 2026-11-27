import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { Spinner } from '../ui/Spinner.jsx';
import { PROFILE_SAVED_EVENT } from './TshirtSizePicker.jsx';

// Kept in step with BRANCH_INSTITUTION_NAME / BRANCH_OPTIONS in
// services/api/src/validators/registration.schema.js.
export const BRANCH_INSTITUTION_NAME = 'ITER | SOA';
export const BRANCH_OPTIONS = ['CSE Core', 'CSE AIML', 'CSE CS', 'CSE DS', 'CSE IOT', 'EE', 'ECE', 'EEE', 'Mech'];

// A branch dropdown with a Save button, for ITER | SOA students.
export const BranchPicker = ({ current = '', onSaved, compact = false }) => {
  const toast = useToast();
  const [branch, setBranch] = useState(current ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const { user } = await api.patch('/api/students/me/branch', { branch });
      toast.success('Branch saved.');
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
        aria-label="Branch"
        className={`select-glass ${compact ? 'h-11 w-36' : 'h-12 w-40'} border-white/10 bg-black`}
        value={branch}
        onChange={(e) => setBranch(e.target.value)}
      >
        <option value="" disabled>Branch</option>
        {BRANCH_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
      </select>
      <button type="button" className="glow-button inline-flex items-center gap-2 disabled:opacity-60" disabled={!branch || branch === current || busy} onClick={save}>
        {busy && <Spinner size={12} />} Save
      </button>
    </div>
  );
};
