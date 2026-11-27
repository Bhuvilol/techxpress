import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, Train, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { cn } from '../../utils/cn.js';
import { homePathForRole } from '../../utils/authHome.js';
import logoUrl from '../../assets/logo.webp';

const NavItem = ({ to, children, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) => cn(
      'rounded-[4px] px-3.5 py-1.5 font-cond text-[15px] font-bold tracking-[0.06em] uppercase transition-all duration-160',
      'text-text-secondary hover:text-txp-yellow hover:bg-txp-yellow/10',
      isActive && 'text-txp-yellow bg-txp-yellow/15 border-b-2 border-txp-yellow shadow-[0_2px_10px_-2px_rgba(245,184,0,0.35)]',
      'w-full md:w-auto md:text-center',
    )}
  >
    {children}
  </NavLink>
);

// Back to the TechXpress train site (station experience at domain root)
const TechXpressLink = () => (
  <Link
    to="/"
    className={cn(
      'inline-flex items-center gap-2 rounded-[4px] px-3.5 py-1.5 font-cond text-[14px] font-extrabold uppercase tracking-[0.08em]',
      'border border-txp-yellow/50 bg-[#211b3b] text-txp-yellow hover:bg-txp-yellow hover:text-txp-ink transition-all duration-160',
      'w-full md:w-auto md:text-center shadow-[0_2px_6px_rgba(0,0,0,0.5)] group',
    )}
  >
    <Train size={14} className="shrink-0 transition-transform group-hover:-translate-x-0.5" />
    <span>← TechXpress Station</span>
  </Link>
);

export const TopAppBar = () => {
  const { user, isAuth, logout } = useAuth();
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (pathname.startsWith('/vortex/admin') || pathname.startsWith('/vortex/coordinator')) return null;

  const closeMenu = () => setIsOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-txp-yellow/80 bg-[#16122c]/95 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-6">
        {/* Brand Logo with Station Bilingual Styling */}
        <Link to="/vortex" onClick={closeMenu} className="group flex items-center gap-3 transition-opacity duration-160 hover:opacity-90">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-[4px] border-2 border-txp-ink bg-txp-yellow shadow-[0_3px_0_#000] group-hover:bg-[#ffc720] transition-colors overflow-hidden p-1">
            <img src={logoUrl} alt="TechXpress Express" className="h-full w-full object-contain anim-train-idle" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-cond text-[18px] sm:text-[21px] font-black tracking-[0.06em] text-text-primary leading-none">TECHXPRESS</span>
              <span className="rounded-[2px] bg-txp-book px-1.5 py-0.5 font-cond text-[11px] font-extrabold uppercase text-white tracking-widest leading-none">
                VORTEX
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-text-dim mt-0.5">
              <span className="font-deva text-txp-yellow font-bold">टेकएक्सप्रेस</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-status-live font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-status-live animate-pulse-soft shadow-[0_0_6px_#10b981]" />
                PF 1
              </span>
            </div>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-2 md:flex">
          <TechXpressLink />
          <NavItem to="/vortex/leaderboard">Leaderboard</NavItem>
          <NavItem to="/vortex/problem-statements">Problems</NavItem>
          <NavItem to="/vortex/awards">Awards</NavItem>

          {isAuth ? (
            <div className="ml-3 flex items-center gap-2 border-l border-border-mid pl-3">
              <NavItem to={homePathForRole(user.role)}>Dashboard</NavItem>
              <NavItem to="/vortex/directory">Directory</NavItem>
              {user.role === 'STUDENT'  && <NavItem to="/vortex/teams">My Team</NavItem>}
              {user.role === 'JURY'     && <NavItem to="/vortex/jury">Evaluations</NavItem>}
              {user.role === 'ADMIN'    && <NavItem to="/vortex/admin">Admin</NavItem>}
              {user.role === 'COORDINATOR' && <NavItem to="/vortex/coordinator">Coordinator</NavItem>}

              <button
                onClick={logout}
                className="ml-2 inline-flex items-center gap-1.5 rounded-[4px] border border-border-mid bg-bg-surface-2 px-3 py-1.5 font-cond text-[14px] font-bold uppercase tracking-wider text-text-secondary hover:text-status-crit hover:border-status-crit/50 transition-colors"
              >
                <LogOut size={13} />
                Logout
              </button>
            </div>
          ) : (
            <div className="ml-4 flex items-center gap-3">
              <Link
                to="/vortex/login"
                className="inline-flex items-center rounded-[4px] border border-txp-yellow/40 bg-txp-yellow/10 px-3.5 py-1.5 font-cond text-[14px] font-bold uppercase tracking-wider text-txp-yellow hover:bg-txp-yellow hover:text-txp-ink transition-all shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
              >
                Sign in
              </Link>
              <Link
                to="/vortex/register"
                className="inline-flex items-center gap-1.5 rounded-[4px] border border-white/25 bg-txp-book px-4 py-1.5 font-cond text-[14px] font-black uppercase tracking-wider text-white hover:bg-[#d93a72] transition-all shadow-[0_3px_0_#6e0f33]"
              >
                <span>Book Ticket</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile Quick Action + Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          {!isAuth && (
            <Link
              to="/vortex/register"
              className="inline-flex items-center gap-1 rounded-[3px] border border-white/20 bg-txp-book px-2.5 py-1 font-cond text-[13px] font-black uppercase tracking-wider text-white shadow-[0_2px_0_#6e0f33] active:translate-y-0.5 transition-all"
            >
              <span>Book</span>
              <ArrowRight size={12} />
            </Link>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-[4px] border border-txp-yellow/40 bg-bg-surface-2 text-txp-yellow transition-all duration-160 hover:border-txp-yellow hover:bg-txp-yellow/10 shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={cn(
        'fixed inset-x-0 top-16 z-40 border-b-2 border-txp-yellow/80 bg-[#120e24]/98 backdrop-blur-2xl transition-all duration-300 ease-out md:hidden',
        isOpen ? 'h-[calc(100vh-64px)] opacity-100 overflow-y-auto' : 'h-0 overflow-hidden opacity-0 pointer-events-none',
      )}>
        <nav className="flex flex-col gap-2 p-5 sm:p-6">
          <TechXpressLink />
          <div className="kicker mt-4 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-txp-yellow animate-pulse-soft" />
            Station Terminal Menu
          </div>
          <NavItem to="/vortex" onClick={closeMenu}>Station Terminal (Home)</NavItem>
          <NavItem to="/vortex/leaderboard" onClick={closeMenu}>Live Leaderboard</NavItem>
          <NavItem to="/vortex/problem-statements" onClick={closeMenu}>Tracks & Challenges</NavItem>
          <NavItem to="/vortex/awards" onClick={closeMenu}>Awards & Fare Chart</NavItem>

          <div className="my-3 h-px w-full bg-border-mid" />

          {isAuth ? (
            <div className="flex flex-col gap-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim px-3">
                Authenticated: {user?.email} ({user?.role})
              </div>
              <NavItem to={homePathForRole(user.role)} onClick={closeMenu}>Dashboard</NavItem>
              <NavItem to="/vortex/directory" onClick={closeMenu}>Passenger Directory</NavItem>
              {user.role === 'STUDENT'  && <NavItem to="/vortex/teams" onClick={closeMenu}>My Team / Berth</NavItem>}
              {user.role === 'JURY'     && <NavItem to="/vortex/jury" onClick={closeMenu}>Evaluations</NavItem>}
              {user.role === 'ADMIN'    && <NavItem to="/vortex/admin" onClick={closeMenu}>Admin Switchboard</NavItem>}
              {user.role === 'COORDINATOR' && <NavItem to="/vortex/coordinator" onClick={closeMenu}>Coordinator Review</NavItem>}
              <button
                onClick={() => { logout(); closeMenu(); }}
                className="danger-button mt-4 inline-flex w-full items-center justify-center gap-2 !py-2.5 font-cond text-[15px] font-bold uppercase tracking-wider"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 mt-1">
              <Link to="/vortex/login" onClick={closeMenu} className="ghost-button w-full text-center !py-2.5 font-cond text-[15px] font-bold uppercase tracking-wider">
                Passenger Sign In
              </Link>
              <Link to="/vortex/register" onClick={closeMenu} className="glow-button w-full text-center !py-2.5 font-cond text-[15px] font-bold uppercase tracking-wider">
                Book Ticket / Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
