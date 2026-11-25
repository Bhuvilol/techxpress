import {
  Trophy, Medal, Award, ScrollText, Rocket, Gift, Globe2, Sparkles, Users,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { NeonBorderCard } from '../../components/ui/NeonBorderCard.jsx';
import { cn } from '../../utils/cn.js';

// Static prize-pool page. Edit the amounts and lists here; nothing comes from
// the API, so the page looks the same before, during and after the event.

const TOTAL_POOL = '₹65,000';

// Order is the desktop layout (winner in the middle, raised); on mobile the
// cards stack by rank.
const PODIUM = [
  {
    rank: 2,
    title: '1st Runner-up',
    amount: '₹15,000',
    perks: [
      { icon: Trophy, text: 'Team trophy' },
      { icon: Medal, text: 'Medal for every team member' },
      { icon: ScrollText, text: 'Certificate of merit' },
      { icon: Rocket, text: 'Incubation & mentoring support' },
      { icon: Globe2, text: 'Featured on the college website' },
    ],
  },
  {
    rank: 1,
    title: 'Winner',
    amount: '₹25,000',
    perks: [
      { icon: Trophy, text: 'Winner’s trophy' },
      { icon: Medal, text: 'Medal for every team member' },
      { icon: ScrollText, text: 'Certificate of merit' },
      { icon: Rocket, text: 'Incubation & mentoring support' },
      { icon: Globe2, text: 'Featured on the college website' },
    ],
  },
  {
    rank: 3,
    title: '2nd Runner-up',
    amount: '₹10,000',
    perks: [
      { icon: Trophy, text: 'Team trophy' },
      { icon: Medal, text: 'Medal for every team member' },
      { icon: ScrollText, text: 'Certificate of merit' },
      { icon: Rocket, text: 'Incubation & mentoring support' },
      { icon: Globe2, text: 'Featured on the college website' },
    ],
  },
];

const SPECIAL = {
  count: 3,
  amount: '₹5,000',
  perks: [
    { icon: ScrollText, text: 'Certificate of merit' },
    { icon: Rocket, text: 'Mentoring support' },
    { icon: Globe2, text: 'Featured on the college website' },
  ],
};

const rankOrder = { 1: 'order-1', 2: 'order-2', 3: 'order-3' };

const PerkList = ({ perks }) => (
  <ul className="space-y-3">
    {perks.map(({ icon: Icon, text }) => (
      <li key={text} className="flex items-start gap-3 font-sans text-[13px] leading-snug text-white/70">
        <Icon size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent-cyan" />
        <span>{text}</span>
      </li>
    ))}
  </ul>
);

const PodiumCard = ({ rank, title, amount, perks }) => {
  const winner = rank === 1;
  return (
    <NeonBorderCard
      className={cn(
        'h-full',
        rankOrder[rank],
        'md:order-none',
        winner && 'border-accent-cyan/40 md:-translate-y-4 shadow-[0_0_40px_-12px_var(--accent-glow)]',
      )}
    >
      <div className="flex h-full flex-col gap-6 p-8">
        <div className="flex items-center justify-between">
          <div className={cn('border p-3', winner ? 'border-accent-cyan/40 text-accent-cyan' : 'border-white/10 text-white')}>
            <Trophy size={24} strokeWidth={1.5} />
          </div>
          <span className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
            Rank 0{rank}
          </span>
        </div>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/50">{title}</div>
          <div className={cn('mt-2 font-sans font-black tracking-tight', winner ? 'text-[44px] text-white' : 'text-[36px] text-white')}>
            {amount}
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/30">Cash prize · per team</div>
        </div>
        <div className="border-t border-white/5 pt-6">
          <PerkList perks={perks} />
        </div>
      </div>
    </NeonBorderCard>
  );
};

export const AwardsPage = () => (
  <section className="mx-auto max-w-6xl px-6 py-12">
    <PageHeader
      kicker="Prize Pool"
      title="Hall of Honors"
      description="What the top teams take home: cash prizes, trophies, medals, certificates, and support to take their idea further."
      actions={(
        <div className="min-w-[220px] border border-white/10 bg-[#050505] px-5 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">Total prize pool</div>
          <div className="mt-1 font-sans text-[30px] font-black tracking-tight text-accent-cyan">{TOTAL_POOL}</div>
        </div>
      )}
    />

    <div className="grid gap-6 pt-4 md:grid-cols-3 md:items-stretch">
      {PODIUM.map((p) => <PodiumCard key={p.rank} {...p} />)}
    </div>

    <div className="mt-10 grid gap-6 md:grid-cols-3">
      <NeonBorderCard className="md:col-span-2">
        <div className="flex h-full flex-col gap-6 p-8 md:flex-row md:items-start md:gap-10">
          <div className="md:w-1/2">
            <div className="flex items-center gap-3">
              <div className="border border-white/10 p-3 text-white"><Sparkles size={22} strokeWidth={1.5} /></div>
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Special Awards</span>
            </div>
            <div className="mt-6 font-sans text-[32px] font-black tracking-tight text-white">
              {SPECIAL.count} × {SPECIAL.amount}
            </div>
            <p className="mt-2 font-sans text-[13px] leading-relaxed text-white/50">
              For the three best theme-based ideas, from any theme. Chosen by the jury, separate from the top three places.
            </p>
          </div>
          <div className="md:w-1/2 md:border-l md:border-white/5 md:pl-10">
            <PerkList perks={SPECIAL.perks} />
          </div>
        </div>
      </NeonBorderCard>

      <NeonBorderCard>
        <div className="flex h-full flex-col gap-6 p-8">
          <div className="flex items-center gap-3">
            <div className="border border-white/10 p-3 text-white"><Users size={22} strokeWidth={1.5} /></div>
            <span className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Every participant</span>
          </div>
          <PerkList perks={[
            { icon: Award, text: 'Certificate of participation' },
            { icon: Gift, text: 'Goodies' },
          ]} />
        </div>
      </NeonBorderCard>
    </div>

    <p className="mt-10 font-mono text-[11px] leading-relaxed text-white/30">
      Cash prizes are awarded per team. Results and award decisions are made by the jury and organizers.
    </p>
  </section>
);
