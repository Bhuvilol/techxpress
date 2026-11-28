import { useState } from 'react';
import { Link2, Copy, Share2, Check } from 'lucide-react';

// The team's invite link, for any member to pass around. Opening it shows
// the team and lets a logged-in participant send a join request (the leader
// approves it); others are pointed to log in or register.
const teamInviteUrl = (publicId) => `${window.location.origin}/vortex/join/${publicId}`;

export const TeamInviteLink = ({ team }) => {
  const [copied, setCopied] = useState(false);
  const url = teamInviteUrl(team.publicId);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this invite link:', url);
    }
  };

  const share = () =>
    navigator.share({ title: `Join ${team.name} · TechXpress`, text: `Join my team "${team.name}" for SOA TechXpress:`, url }).catch(() => {});

  return (
    <div className="space-y-2 border-t border-white/10 pt-4">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
        <Link2 size={12} className="text-txp-yellow" /> Invite link
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          className="input-glass h-10 flex-1 font-mono text-[12px]"
          aria-label="Team invite link"
        />
        <div className="flex gap-2">
          <button type="button" className="ghost-button inline-flex h-10 flex-1 items-center justify-center gap-2 sm:flex-none" onClick={copy}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
          </button>
          {canShare && (
            <button type="button" className="ghost-button inline-flex h-10 flex-1 items-center justify-center gap-2 sm:flex-none" onClick={share}>
              <Share2 size={14} /> Share
            </button>
          )}
        </div>
      </div>
      <p className="font-mono text-[11px] text-text-dim">
        Anyone registered can use it to ask to join; the leader approves. Not registered yet? The link takes them to registration.
      </p>
    </div>
  );
};
