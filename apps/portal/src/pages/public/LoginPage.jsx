import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { ScrambleText } from '../../components/ui/ScrambleText.jsx';
import { homePathForRole } from '../../utils/authHome.js';

import logoUrl from '../../assets/logo.webp';
import trainUrl from '../../assets/train-a.webp';

export const LoginPage = () => {
  const { login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      toast.success(`Welcome aboard, ${u.fullName.split(' ')[0]}.`);
      const dest = loc.state?.from ?? homePathForRole(u.role);
      nav(dest, { replace: true });
    } catch (apiErr) {
      // Account-status codes arrive in details.code (top-level code is FORBIDDEN).
      const code = apiErr.details?.code ?? apiErr.code;
      const messages = {
        ACCOUNT_PENDING: 'Your application is awaiting campus coordinator verification.',
        ACCOUNT_REJECTED: 'Your registration was not approved.',
        ACCOUNT_REVOKED: 'Your access pass has been revoked. Contact station organizers.',
        RATE_LIMITED: 'Too many failed attempts. Please wait 15 minutes before trying again.',
      };
      setErr(messages[code] ?? apiErr.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-[calc(100vh-80px)] max-w-lg flex-col justify-center px-6 py-16">
      {/* Station Terminal Header */}
      <div className="flex flex-col items-center text-center">
        {/* Authentic Locomotive Crest */}
        <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-[4px] border border-txp-yellow/50 bg-bg-surface-2 p-2.5 shadow-[0_4px_20px_rgba(245,184,0,0.2)] anim-train-idle">
          <img src={logoUrl} alt="TechXpress Locomotive" className="h-full w-full object-contain" />
        </div>

        <div className="mb-3 inline-flex items-center gap-2 rounded-[3px] border border-txp-yellow/30 bg-txp-yellow/10 px-3.5 py-1 font-cond text-[13px] font-bold uppercase tracking-[0.14em] text-txp-yellow">
          <span>PASSENGER ACCESS TERMINAL · PLATFORM 1</span>
        </div>

        <h1 className="font-cond text-[44px] font-black uppercase tracking-[0.04em] text-text-primary sm:text-[56px] leading-[1]">
          <ScrambleText text="SIGN IN" duration={0.4} />
        </h1>

        <div className="mt-1 font-deva text-[16px] font-bold text-text-secondary tracking-wider">
          प्रवेश द्वार // यात्री प्रमाणीकरण
        </div>

        <p className="mt-3 font-sans text-[14px] leading-relaxed text-text-secondary">
          Enter your registered email and 6-digit access code issued by the organizers.
        </p>
      </div>

      {/* Ticket Requisition Login Card */}
      <div className="glass-card relative mt-8 overflow-hidden p-8 border-border-mid bg-bg-surface-1 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
        {/* Train Watermark Stamp */}
        <img
          src={trainUrl}
          alt=""
          className="pointer-events-none absolute -bottom-10 -right-10 w-64 opacity-[0.04] select-none"
        />

        <form onSubmit={submit} className="relative z-10 space-y-6">
          <FormField label="Passenger Email" required>
            <div className="group relative">
              <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-dim transition-colors group-focus-within:text-txp-yellow">
                <Mail size={18} />
              </div>
              <input
                type="email"
                autoComplete="email"
                required
                className="input-glass h-12 !pl-12 font-sans"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="passenger@soa.ac.in"
              />
            </div>
          </FormField>

          <FormField label="6-Digit Access Code" required hint="Issued upon campus coordinator verification.">
            <div className="group relative">
              <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-dim transition-colors group-focus-within:text-txp-yellow">
                <Lock size={18} />
              </div>
              <input
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                className="input-glass h-12 !pl-12 tracking-[0.4em] font-mono text-[16px]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
              />
            </div>
          </FormField>

          {err && (
            <div className="flex items-start gap-3 rounded-[3px] border border-status-crit/50 bg-status-crit/10 p-4 text-[13px] text-status-crit">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div className="leading-snug">{err}</div>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="glow-button w-full !py-3 !text-[16px] shadow-[0_3px_0_#000]"
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size={16} />
                <span>Verifying credentials...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>Authenticate & Board</span>
                <ArrowRight size={17} />
              </span>
            )}
          </button>
        </form>

        <div className="relative z-10 mt-8 border-t border-border-dim pt-6 text-center">
          <p className="font-sans text-[13px] text-text-secondary">
            Haven't registered for TechXpress yet?
          </p>
          <Link
            to="/register"
            className="mt-2 inline-flex items-center gap-1.5 font-cond text-[15px] font-bold uppercase tracking-wider text-txp-yellow hover:underline"
          >
            <span>Book Ticket / Register Now</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
};
