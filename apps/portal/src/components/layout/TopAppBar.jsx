import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, Train } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { cn } from '../../utils/cn.js';
import { homePathForRole } from '../../utils/authHome.js';
import logoUrl from '../../assets/logo.webp';

const NavItem = ({ to, children, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) => cn(
      'inline-flex h-9 items-center whitespace-nowrap rounded-[3px] px-3 font-cond text-[15px] font-bold tracking-[0.06em] uppercase transition-colors duration-160 ease-out-expo',
      'text-text-secondary hover:text-txp-yellow hover:bg-txp-yellow/10',
      isActive && 'text-txp-yellow bg-txp-yellow/15 shadow-[inset_0_-2px_0_rgb(245,184,0)]',
      'w-full xl:w-auto xl:justify-center',
    )}
  >
    {children}
  </NavLink>
);

// Back to the TechXpress train site (station experience at domain root)
// A plain click slides the portal away to the right first (the station then
// slides in from the left); modified clicks behave normally.
const goToStation = (event) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  event.preventDefault();
  try { sessionStorage.setItem('txp:slide', 'back'); } catch { /* private mode */ }
  document.documentElement.classList.add('vortex-slide-out');
  setTimeout(() => window.location.assign('/'), 380);
};

const TechXpressLink = ({ compact = false }) => (
  <a
    href="/"
    onClick={goToStation}
    className={cn(
      'inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[3px] px-3 font-cond text-[14px] font-bold uppercase tracking-[0.08em]',
      'border border-txp-yellow/30 bg-txp-yellow/10 text-txp-yellow hover:bg-txp-yellow hover:text-txp-ink transition-all duration-160',
      'w-full xl:w-auto xl:justify-center',
    )}
    title="Back to the TechXpress station"
  >
    <Train size={14} className="shrink-0" />
    <span>{compact ? '← Station' : '← TechXpress Station'}</span>
  </a>
);

export const TopAppBar = () => {
  const { user, isAuth, logout } = useAuth();
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (pathname.startsWith('/admin') || pathname.startsWith('/coordinator')) return null;

  const closeMenu = () => setIsOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border-mid bg-bg-void/90 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-6">
        {/* Brand Logo with Station Bilingual Styling */}
        <Link to="/" onClick={closeMenu} className="group flex items-center gap-3 transition-opacity duration-160 hover:opacity-90">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-[4px] border-2 border-txp-ink bg-txp-yellow shadow-[0_3px_0_#000] group-hover:bg-[#ffc720] transition-colors overflow-hidden p-1">
            <img src={logoUrl} alt="TechXpress Express" className="h-full w-full object-contain anim-train-idle" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-cond text-[20px] font-black tracking-[0.1em] text-text-primary">TECHXPRESS</span>
              <span className="rounded-[2px] bg-txp-book px-1.5 py-0.2 font-cond text-[11px] font-extrabold uppercase text-white tracking-widest">
                VORTEX
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-text-dim">
              <span className="font-deva text-txp-yellow">टेकएक्सप्रेस</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-status-live">
                <span className="h-1.5 w-1.5 rounded-full bg-status-live animate-pulse-soft" />
                PF 1
              </span>
            </div>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 xl:flex">
          <TechXpressLink compact />
          <NavItem to="/leaderboard">Leaderboard</NavItem>
          <NavItem to="/problem-statements">Problems</NavItem>
          <NavItem to="/awards">Awards</NavItem>

          {isAuth ? (
            <div className="ml-2 flex items-center gap-1 border-l border-border-mid pl-2">
              <NavItem to={homePathForRole(user.role)}>Dashboard</NavItem>
              <NavItem to="/directory">Directory</NavItem>
              {user.role === 'STUDENT'  && <NavItem to="/teams">My Team</NavItem>}
              {user.role === 'JURY'     && <NavItem to="/jury">Evaluations</NavItem>}
              {user.role === 'ADMIN'    && <NavItem to="/admin">Admin</NavItem>}
              {user.role === 'COORDINATOR' && <NavItem to="/coordinator">Coordinator</NavItem>}

              <button
                onClick={logout}
                className="ghost-button ml-2 !h-9 !py-0 !px-3 whitespace-nowrap font-cond text-[14px] font-bold uppercase tracking-wider text-text-secondary hover:text-status-crit hover:border-status-crit/40"
              >
                <LogOut size={13} />
                Logout
              </button>
            </div>
          ) : (
            <div className="ml-4 flex items-center gap-2.5">
              <NavItem to="/login">Sign in</NavItem>
              <Link to="/register" className="glow-button !h-9 !py-0 !px-4 !text-[14px] whitespace-nowrap">
                Book Ticket
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-[3px] border border-border-mid bg-bg-surface-2 text-text-primary transition-all duration-160 hover:border-txp-yellow hover:text-txp-yellow xl:hidden shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={cn(
        'fixed inset-x-0 top-16 z-40 border-b border-border-mid bg-bg-void/95 backdrop-blur-xl transition-all duration-320 ease-out-expo xl:hidden',
        isOpen ? 'h-[calc(100vh-64px)] opacity-100 overflow-y-auto' : 'h-0 overflow-hidden opacity-0',
      )}>
        <nav className="flex flex-col gap-2 p-6">
          <TechXpressLink />
          <div className="kicker mt-4 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-txp-yellow animate-pulse-soft" />
            Station Terminal Menu
          </div>
          <NavItem to="/leaderboard" onClick={closeMenu}>Leaderboard</NavItem>
          <NavItem to="/problem-statements" onClick={closeMenu}>Problems</NavItem>
          <NavItem to="/awards" onClick={closeMenu}>Awards & Fare Chart</NavItem>

          <div className="my-4 h-px w-full bg-border-mid" />

          {isAuth ? (
            <div className="flex flex-col gap-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim px-3">
                Authenticated: {user?.email} ({user?.role})
              </div>
              <NavItem to={homePathForRole(user.role)} onClick={closeMenu}>Dashboard</NavItem>
              <NavItem to="/directory" onClick={closeMenu}>Passenger Directory</NavItem>
              {user.role === 'STUDENT'  && <NavItem to="/teams" onClick={closeMenu}>My Team / Berth</NavItem>}
              {user.role === 'JURY'     && <NavItem to="/jury" onClick={closeMenu}>Evaluations</NavItem>}
              {user.role === 'ADMIN'    && <NavItem to="/admin" onClick={closeMenu}>Admin</NavItem>}
              {user.role === 'COORDINATOR' && <NavItem to="/coordinator" onClick={closeMenu}>Coordinator</NavItem>}
              <button
                onClick={() => { logout(); closeMenu(); }}
                className="danger-button mt-6 inline-flex w-full items-center justify-center gap-2 !py-2.5 font-cond text-[16px] font-bold uppercase tracking-wider"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 mt-2">
              <Link to="/login" onClick={closeMenu} className="ghost-button w-full text-center !py-2.5 font-cond text-[16px] font-bold uppercase tracking-wider">
                Sign In
              </Link>
              <Link to="/register" onClick={closeMenu} className="glow-button w-full text-center !py-2.5 font-cond text-[16px] font-bold uppercase tracking-wider">
                Book Ticket / Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
