import { Trophy, EyeOff, Radio, Train } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useSocketEvent } from '../../hooks/useSocketEvent.js';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Empty } from '../../components/ui/Empty.jsx';
import { CardSkeleton } from '../../components/ui/Skeleton.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { ApiError } from '../../lib/api.js';

const RANK_BADGE = (rank) => {
  if (rank === 1) return <Badge tone="yellow" dot className="!text-[11px] !py-1 !px-2.5">#1 1ST CLASS</Badge>;
  if (rank === 2) return <Badge tone="cyan" dot className="!text-[11px] !py-1 !px-2.5">#2 2ND CLASS</Badge>;
  if (rank === 3) return <Badge tone="warn" dot className="!text-[11px] !py-1 !px-2.5">#3 3RD CLASS</Badge>;
  return <Badge tone="dim" className="!text-[11px] !py-1 !px-2">#{rank ?? '—'}</Badge>;
};

export const LeaderboardPage = () => {
  // Logged-in users get live socket updates; everyone also polls every 30 s
  const { data, loading, error, refetch } = useApi(() => api.get('/api/leaderboard'), [], { pollMs: 30000 });

  // Server informs when a jury score lands → refetch
  useSocketEvent('leaderboard:changed', () => refetch(), []);

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <PageHeader
        kicker="Live Departure Standings // परिणाम तालिका"
        title="Live Leaderboard"
        description="Aggregated standings across Round 1, Round 2, and Final Round evaluations. Live updates as juries submit scores."
        actions={
          <div className="flex items-center gap-2 rounded-[3px] border border-status-live/40 bg-status-live/10 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-status-live">
            <Radio size={14} className="animate-pulse-soft" />
            <span>Telemetry Online</span>
          </div>
        }
      />

      {loading && <CardSkeleton rows={6} />}

      {error && error instanceof ApiError && error.status === 403 && (
        <Empty
          icon={EyeOff}
          title="Leaderboard Closed"
          description="The organizers have temporarily masked the leaderboard during active judging. Standings will be revealed shortly."
        />
      )}

      {error && !(error instanceof ApiError && error.status === 403) && (
        <Empty icon={EyeOff} title="Could not retrieve leaderboard" description={error.message} />
      )}

      {data && data.entries.length === 0 && (
        <Empty
          icon={Trophy}
          title="No evaluations submitted yet"
          description="Scores and squad rankings will stream here live as soon as the first round evaluations conclude."
        />
      )}

      {data && data.entries.length > 0 && (
        <div className="overflow-hidden rounded-[4px] border border-border-mid bg-bg-surface-1 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {/* Header strip */}
          <div className="flex items-center justify-between border-b border-border-mid bg-bg-surface-2 px-6 py-3">
            <div className="flex items-center gap-2 font-cond text-[15px] font-extrabold uppercase tracking-wider text-txp-yellow">
              <Train size={15} />
              <span>OFFICIAL TEAM STANDINGS · 12026 TECHXPRESS</span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-text-dim">
              {data.entries.length} SQUADS RANKED
            </div>
          </div>

          <div className="overflow-x-auto scroll-panel">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border-dim text-left bg-bg-surface-1/50">
                  <th className="px-5 py-3.5 font-cond text-[13px] font-black uppercase tracking-[0.14em] text-text-dim">Rank</th>
                  <th className="px-5 py-3.5 font-cond text-[13px] font-black uppercase tracking-[0.14em] text-text-dim">Squad Name</th>
                  <th className="hidden px-5 py-3.5 font-cond text-[13px] font-black uppercase tracking-[0.14em] text-text-dim sm:table-cell">Domain</th>
                  <th className="hidden px-5 py-3.5 font-cond text-[13px] font-black uppercase tracking-[0.14em] text-text-dim md:table-cell">Challenge</th>
                  <th className="px-4 py-3.5 text-right font-cond text-[13px] font-black uppercase tracking-[0.14em] text-text-dim">Round 1</th>
                  <th className="px-4 py-3.5 text-right font-cond text-[13px] font-black uppercase tracking-[0.14em] text-text-dim">Round 2</th>
                  <th className="px-4 py-3.5 text-right font-cond text-[13px] font-black uppercase tracking-[0.14em] text-text-dim">Round 3</th>
                  <th className="px-6 py-3.5 text-right font-cond text-[14px] font-black uppercase tracking-[0.14em] text-txp-yellow">Total Score</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e) => (
                  <tr
                    key={e.team.id}
                    className="border-b border-border-dim/60 last:border-0 hover:bg-txp-yellow/[0.04] transition-colors"
                  >
                    <td className="px-5 py-4">
                      {RANK_BADGE(e.rank)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-cond text-[18px] font-black uppercase tracking-tight text-text-primary">
                        {e.team.name}
                      </div>
                      <div className="sm:hidden font-mono text-[11px] text-text-dim mt-0.5">
                        {e.team.domain.name}
                      </div>
                    </td>
                    <td className="hidden px-5 py-4 sm:table-cell">
                      <span className="rounded-[2px] border border-border-dim bg-bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-text-secondary">
                        {e.team.domain.name}
                      </span>
                    </td>
                    <td className="hidden px-5 py-4 font-sans text-[12px] text-text-secondary max-w-[200px] truncate md:table-cell">
                      {e.team.problemStatement?.title ?? '—'}
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-[13px] text-text-secondary">
                      {data.showMarks ? (e.r1Score ?? '—') : '••'}
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-[13px] text-text-secondary">
                      {data.showMarks ? (e.r2Score ?? '—') : '••'}
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-[13px] text-text-secondary">
                      {data.showMarks ? (e.r3Score ?? '—') : '••'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-cond text-[22px] font-black text-txp-yellow tracking-tight">
                        {data.showMarks ? (e.finalScore ?? '—') : '••'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!data.showMarks && (
            <div className="border-t border-border-mid bg-bg-surface-2/60 px-6 py-3 text-center font-mono text-[11px] uppercase tracking-widest text-text-dim">
              Numerical marks are confidential during early rounds. Team ranks remain live.
            </div>
          )}
        </div>
      )}
    </section>
  );
};
