import { Crown } from 'lucide-react';
import { Badge } from '../ui/Badge.jsx';

// One participant's full registration details, for admins. Used by the team
// details panel (Admin → Teams) and the check-in desk (Admin → Check-in).
// `user` is the shape the API returns from ADMIN_MEMBER_FIELDS.
export const ParticipantDetails = ({ user: u, isLeader = false, joinedAt = null, onViewIdCard }) => (
  <section className="rounded-[4px] border border-white/10 p-4">
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div>
        <div className="flex items-center gap-2 font-sans text-[15px] font-bold">
          {isLeader && <Crown size={14} className="text-status-warn" aria-label="Leader" />}
          {u.fullName}
        </div>
        <div className="font-mono text-[11px] text-text-dim">
          {[joinedAt && `${isLeader ? 'Leader' : 'Member'} · joined ${new Date(joinedAt).toLocaleDateString()}`, u.publicId]
            .filter(Boolean).join(' · ')}
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {u.isDomainExpert && <Badge tone="cyan">Domain expert</Badge>}
        <Badge tone={u.verificationStatus === 'VERIFIED' ? 'live' : 'warn'}>{u.verificationStatus}</Badge>
      </div>
    </div>

    <dl className="grid gap-x-6 gap-y-2 font-mono text-[12px] sm:grid-cols-2">
      <Detail label="Email" value={u.email && <a className="underline" href={`mailto:${u.email}`}>{u.email}</a>} />
      <Detail label="Phone" value={u.phone && <a className="underline" href={`tel:${u.phone}`}>{u.phone}</a>} />
      <Detail label="Registration no." value={u.registrationNo} />
      <Detail label="Institution" value={u.institution?.name} />
      <Detail label="Degree" value={u.degree} />
      <Detail label="Branch" value={u.branch} />
      <Detail label="Year / semester" value={u.yearSemester} />
      <Detail label="Gender" value={u.gender && u.gender.charAt(0) + u.gender.slice(1).toLowerCase().replace(/_/g, " ")} />
      <Detail label="T-shirt" value={u.tshirtSize} />
      <Detail label="Domain" value={u.domain?.name} />
      <Detail label="Team role" value={u.preferredTeamRole} />
      <Detail label="Discord" value={u.discordId} />
      <Detail label="Contribution areas" value={u.contributionAreas?.length ? u.contributionAreas.join(', ') : null} wide />
      <Detail label="Technical skills" value={u.technicalSkills} wide />
      <Detail label="Non-technical skills" value={u.nonTechnicalSkills} wide />
    </dl>

    <div className="mt-3 flex flex-wrap gap-3 font-mono text-[12px]">
      {[['LinkedIn', u.linkedinUrl], ['GitHub', u.githubUrl], ['Portfolio', u.portfolioUrl], ['Resume', u.resumeDriveLink]]
        .filter(([, href]) => href)
        .map(([label, href]) => (
          <a key={label} className="underline" href={href} target="_blank" rel="noopener noreferrer">{label} ↗</a>
        ))}
      {u.hasIdCard && (
        <button type="button" className="ghost-button !py-1" onClick={() => onViewIdCard?.(u)}>View ID card</button>
      )}
    </div>
  </section>
);

const Detail = ({ label, value, wide = false }) => (
  <div className={wide ? 'sm:col-span-2' : undefined}>
    <dt className="text-[10px] uppercase tracking-wider text-text-dim">{label}</dt>
    <dd className="break-words text-text-secondary">{value || '—'}</dd>
  </div>
);
