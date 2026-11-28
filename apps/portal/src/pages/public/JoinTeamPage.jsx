import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Users, LogIn, UserPlus, Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';

// A team's invite link: /vortex/join/TXT-XXXX-XXXX. Shows which team it is
// (public preview, no contacts), then:
//   - logged-in student  -> "Request to join" (the usual join request; the
//     leader approves it on their team page)
//   - not logged in      -> log in (comes back here) or register
// Registration is the booking form on the main site.
const REGISTER_URL = '/#book';
const STATUS_TONE = { FORMING: 'warn', QUALIFIED: 'live', FINALIZED: 'cyan', DISQUALIFIED: 'crit' };

export const JoinTeamPage = () => {
  const { ref } = useParams();
  const { isAuth, user } = useAuth();
  const preview = useApi(() => api.get(`/api/teams/invite/${encodeURIComponent(ref)}`), [ref]);
  const mine = useApi(() => (isAuth && user?.role === 'STUDENT' ? api.get('/api/teams/mine') : Promise.resolve(null)), [isAuth, user?.role]);
  const [state, setState] = useState({ busy: false, sent: false, error: '' });

  const team = preview.data?.team;
  const myTeam = mine.data?.team ?? null;
  const inThisTeam = myTeam && team && myTeam.id === team.id;

  const requestToJoin = async () => {
    setState({ busy: true, sent: false, error: '' });
    try {
      await api.post(`/api/teams/${team.id}/join-requests`);
      setState({ busy: false, sent: true, error: '' });
    } catch (e) {
      setState({ busy: false, sent: false, error: e.message });
    }
  };

  return (
    <section className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <div className="kicker mb-2"><Users size={12} /> Team invite</div>

      {preview.loading && <div className="flex justify-center py-16"><Spinner /></div>}

      {preview.error && (
        <div className="glass-card flat flex items-start gap-3 text-status-crit">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p className="font-mono text-[13px]">{preview.error.message ?? 'This invite link is not valid.'}</p>
        </div>
      )}

      {team && (
        <article className="glass-card flat space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="kicker mb-1">{team.domain?.name}</div>
              <h1 className="font-cond text-[28px] font-black uppercase leading-tight text-text-primary">{team.name}</h1>
              {team.problemStatement && (
                <p className="mt-1 font-mono text-[12px] text-text-secondary">{team.problemStatement.title}</p>
              )}
            </div>
            <Badge tone={STATUS_TONE[team.status]} dot>{team.status}</Badge>
          </div>

          <p className="font-mono text-[12px] text-text-secondary">
            {team.leaderFirstName ? `${team.leaderFirstName}'s team` : 'Team'} · {team.memberCount}/{team.maxTeamSize} members · {team.publicId}
          </p>

          <div className="border-t border-white/5 pt-5">
            {!team.acceptingRequests ? (
              <p className="font-mono text-[13px] text-text-dim">
                {team.status === 'FINALIZED' || team.status === 'DISQUALIFIED'
                  ? 'This team is closed and no longer takes new members.'
                  : 'This team is full.'}
              </p>
            ) : !isAuth ? (
              <div className="space-y-3">
                <p className="text-[14px] text-text-secondary">Log in to ask to join this team. The team leader approves requests.</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link to="/login" state={{ from: `/join/${team.publicId}` }} className="glow-button inline-flex items-center justify-center gap-2">
                    <LogIn size={14} /> Log in to request
                  </Link>
                  <a href={REGISTER_URL} className="ghost-button inline-flex items-center justify-center gap-2">
                    <UserPlus size={14} /> Not registered? Register
                  </a>
                </div>
                <p className="font-mono text-[11px] text-text-dim">
                  After registering, your account is verified first. Once you can log in, open this link again.
                </p>
              </div>
            ) : user.role !== 'STUDENT' ? (
              <p className="font-mono text-[13px] text-text-dim">Only participants can join teams.</p>
            ) : inThisTeam ? (
              <p className="inline-flex items-center gap-2 font-mono text-[13px] text-status-live">
                <CheckCircle2 size={14} /> You're in this team. <Link to="/teams" className="underline">Go to My Team</Link>
              </p>
            ) : myTeam ? (
              <p className="font-mono text-[13px] text-text-dim">
                You're already in a team ({myTeam.name}). Leave it first to join another.
              </p>
            ) : state.sent ? (
              <p className="inline-flex items-center gap-2 font-mono text-[13px] text-status-live">
                <CheckCircle2 size={14} /> Request sent. The leader will see it on their team page.
              </p>
            ) : (
              <div className="space-y-3">
                <button type="button" className="glow-button inline-flex w-full items-center justify-center gap-2 sm:w-auto" onClick={requestToJoin} disabled={state.busy}>
                  {state.busy ? <Spinner size={14} /> : <Send size={14} />} Request to join
                </button>
                {state.error && <p className="font-mono text-[12px] text-status-crit">{state.error}</p>}
              </div>
            )}
          </div>
        </article>
      )}
    </section>
  );
};
