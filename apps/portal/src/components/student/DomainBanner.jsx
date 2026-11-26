import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { DomainPicker, DOMAIN_PICKS, DOMAINS_SAVED_EVENT } from './DomainPicker.jsx';
import { TshirtSizePicker } from './TshirtSizePicker.jsx';

// Shown on every page to a signed-in student who has fewer than 4 domains
// (for example after the domain list was replaced and everyone's picks were
// cleared), until they choose again.
const Banner = () => {
  const me = useApi(() => api.get('/api/auth/me'), []);
  const [open, setOpen] = useState(false);
  const { refetch } = me;

  useEffect(() => {
    window.addEventListener(DOMAINS_SAVED_EVENT, refetch);
    return () => window.removeEventListener(DOMAINS_SAVED_EVENT, refetch);
  }, [refetch]);

  const user = me.data?.user;
  if (!user || user.role !== 'STUDENT') return null;
  const needDomains = (user.preferredDomains?.length ?? 0) < DOMAIN_PICKS;
  const needSize = !user.tshirtSize;
  if (!needDomains && !needSize) return null;

  return (
    <div role="alert" className="relative z-20 border-b border-status-warn/40 bg-status-warn/10">
      {needDomains && (
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <AlertTriangle size={16} className="shrink-0 text-status-warn" />
          <p className="flex-1 font-sans text-[13px] text-white">
            The domains have changed. Please choose your {DOMAIN_PICKS} domains again.
          </p>
          <button type="button" className="glow-button" onClick={() => setOpen(true)}>Choose domains</button>
        </div>
      )}
      {needSize && (
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <AlertTriangle size={16} className="shrink-0 text-status-warn" />
          <p className="flex-1 font-sans text-[13px] text-white">Please tell us your T-shirt size.</p>
          <TshirtSizePicker compact />
        </div>
      )}
      <DomainPicker open={open} onClose={() => setOpen(false)} initial={user.preferredDomains ?? []} />
    </div>
  );
};

export const DomainBanner = () => {
  const { user } = useAuth();
  return user?.role === 'STUDENT' ? <Banner /> : null;
};
