import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { ShieldCheck, LogOut, Menu, IdCard, Train } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { cn } from '../../utils/cn.js';

const NAV = [
  { to: '/vortex/coordinator', end: true, label: 'Candidate Verification', icon: ShieldCheck },
  { to: '/vortex/directory', label: 'Passenger Directory', icon: IdCard },
];

export const CoordinatorShell = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const close = () => setIsOpen(false);

  return (
    <div className="flex min-h-screen bg-bg-void text-text-primary">
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-bg-void/80 backdrop-blur-sm md:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-border-mid bg-bg-surface-1 transition-transform duration-320 ease-out-expo md:translate-x-0 shadow-[4px_0_24px_rgba(0,0,0,0.5)]',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="border-b border-border-mid px-5 py-4 bg-bg-surface-2/60">
          <Link to="/" onClick={close} className="group flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[3px] border-2 border-txp-ink bg-txp-teal text-txp-ink font-cond font-black text-[16px] shadow-[0_2px_0_#000]">
              12026
            </div>
            <div>
              <div className="font-cond text-[17px] font-black tracking-[0.08em] text-text-primary">
                TECHXPRESS <span className="text-txp-teal font-normal">· COORDINATOR</span>
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-dim flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-status-live animate-pulse-soft" />
                Campus Desk · {user?.institution?.name || 'SOA'}
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Link back to Station */}
        <div className="px-4 pt-3 pb-1">
          <a
            href="/"
            className="flex items-center justify-center gap-1.5 rounded-[3px] border border-txp-teal/30 bg-txp-teal/10 px-3 py-1.5 font-cond text-[13px] font-bold uppercase tracking-wider text-txp-teal hover:bg-txp-teal hover:text-txp-ink transition-all"
          >
            <Train size={13} />
            <span>← TechXpress Station</span>
          </a>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 scroll-panel">
          <div className="px-4 mb-2 font-mono text-[9px] uppercase tracking-[0.25em] text-text-dim">
            Campus Desk
          </div>
          <div className="space-y-0.5">
            {NAV.map(({ to, end, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={close}
                className={({ isActive }) => cn(
                  'group relative flex items-center gap-3 rounded-[3px] px-4 py-2.5 font-cond text-[15px] font-bold uppercase tracking-[0.05em] transition-all duration-160 ease-out-expo',
                  'text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary',
                  isActive && 'bg-txp-teal/15 text-txp-teal border-r-2 border-txp-teal shadow-[inset_2px_0_0_#18b3b0]',
                )}
              >
                <Icon size={16} className="shrink-0 text-text-dim group-hover:text-txp-teal transition-colors" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="border-t border-border-mid bg-bg-surface-2/40 px-5 py-4">
          <div className="mb-3 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
            Coordinator: <span className="text-text-primary font-bold">{user?.fullName || user?.email?.split('@')[0]}</span>
          </div>
          <button
            onClick={logout}
            className="ghost-button inline-flex w-full items-center justify-center gap-2 !py-1.5 font-cond text-[14px] font-bold uppercase tracking-wider text-status-crit/90 hover:border-status-crit/50 hover:bg-status-crit/10 hover:text-status-crit"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col md:pl-[270px]">
        <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border-mid bg-bg-void/90 px-4 backdrop-blur-md md:hidden">
          <button
            onClick={() => setIsOpen(true)}
            className="rounded-[3px] border border-border-mid p-2 text-text-primary hover:border-txp-teal hover:text-txp-teal"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <div className="font-cond text-[16px] font-black uppercase tracking-wider text-txp-teal">
            Coordinator Desk
          </div>
          <div className="w-8" />
        </div>

        <main className="flex-1 p-6 md:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
