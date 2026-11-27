import {
  Trophy, Medal, ScrollText, Rocket, Globe2, Sparkles, Train, Gift
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { NeonBorderCard } from '../../components/ui/NeonBorderCard.jsx';
import { cn } from '../../utils/cn.js';

import logoUrl from '../../assets/logo.webp';
import trainUrl from '../../assets/train-a.webp';

// Static prize-pool & fare chart page, unified with TechXpress Railway Fare structure.

const TOTAL_POOL = '₹65,000';

const PODIUM = [
  {
    rank: 2,
    railClass: '2ND CLASS AC',
    title: '1st Runner-up',
    hindi: 'प्रथम उपविजेता',
    amount: '₹15,000',
    color: 'border-txp-teal/40 text-txp-teal',
    perks: [
      { icon: Trophy, text: 'Team runner-up trophy' },
      { icon: Medal, text: 'Medal for every team member' },
      { icon: ScrollText, text: 'Certificate of merit' },
      { icon: Rocket, text: 'Incubation & mentoring support' },
      { icon: Globe2, text: 'Featured on the SOA website' },
    ],
  },
  {
    rank: 1,
    railClass: '1ST CLASS AC',
    title: 'Grand Champion',
    hindi: 'विजेता',
    amount: '₹25,000',
    color: 'border-txp-yellow text-txp-yellow',
    winner: true,
    perks: [
      { icon: Trophy, text: 'Winner’s grand trophy' },
      { icon: Medal, text: 'Gold medal for every team member' },
      { icon: ScrollText, text: 'Certificate of excellence' },
      { icon: Rocket, text: 'Direct incubation & venture mentoring' },
      { icon: Globe2, text: 'Featured on the SOA university homepage' },
    ],
  },
  {
    rank: 3,
    railClass: '3RD CLASS AC',
    title: '2nd Runner-up',
    hindi: 'द्वितीय उपविजेता',
    amount: '₹10,000',
    color: 'border-txp-pink/40 text-txp-pink',
    perks: [
      { icon: Trophy, text: 'Team runner-up trophy' },
      { icon: Medal, text: 'Medal for every team member' },
      { icon: ScrollText, text: 'Certificate of merit' },
      { icon: Rocket, text: 'Incubation & mentoring support' },
      { icon: Globe2, text: 'Featured on the SOA website' },
    ],
  },
];

const SPECIAL = [
  {
    title: 'Best Interdisciplinary Prototype',
    amount: '₹5,000',
    desc: 'Awarded to the squad uniting distinct domains (e.g. engineering + healthcare/agriculture) with exceptional synergy.',
  },
  {
    title: 'Best Female-Led Innovation',
    amount: '₹5,000',
    desc: 'Recognizing outstanding leadership and technical innovation driven by female participants.',
  },
  {
    title: 'Best Social / Campus Impact',
    amount: '₹5,000',
    desc: 'Awarded to the solution addressing the most pressing real-world campus or regional challenge.',
  },
];

export const AwardsPage = () => {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 overflow-hidden">
      {/* Background Locomotive Watermark */}
      <div className="pointer-events-none absolute -right-20 top-12 hidden w-96 opacity-[0.03] select-none lg:block anim-train-idle">
        <img src={trainUrl} alt="" className="w-full" />
      </div>

      <PageHeader
        kicker="Railway Fare Chart & Awards // किराया सूची एवं पुरस्कार"
        title="Prizes & Recognition"
        description="A total bounty of ₹65,000 across overall championship tiers and specialized category awards, accompanied by incubation and faculty mentoring."
        actions={
          <div className="flex items-center gap-2 rounded-[4px] border-2 border-txp-ink bg-txp-yellow px-4 py-2 text-txp-ink shadow-[0_3px_0_#000]">
            <Sparkles size={16} />
            <span className="font-cond text-[18px] font-black tracking-wider uppercase">Total Pool: {TOTAL_POOL}</span>
          </div>
        }
      />

      {/* Podium Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-end">
        {PODIUM.map((item) => (
          <NeonBorderCard
            key={item.rank}
            className={cn(
              'h-full border-border-mid relative overflow-hidden',
              item.winner && 'md:-translate-y-4 border-txp-yellow/60 shadow-[0_12px_40px_rgba(245,184,0,0.25)]',
            )}
          >
            <div className="flex h-full flex-col justify-between p-5 sm:p-8 relative z-10">
              <div>
                {/* Header Strip */}
                <div className="flex items-center justify-between border-b border-border-dim pb-4">
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-text-dim">
                      {item.railClass}
                    </span>
                    <div className="font-deva text-[13px] text-txp-yellow font-bold">
                      {item.hindi}
                    </div>
                  </div>
                  {item.winner ? (
                    <div className="flex h-11 w-11 items-center justify-center rounded-[4px] border border-txp-yellow bg-txp-yellow/10 p-1.5 anim-train-idle shadow-[0_0_12px_rgba(245,184,0,0.3)]">
                      <img src={logoUrl} alt="Locomotive Winner" className="h-full w-full object-contain" />
                    </div>
                  ) : (
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-[3px] border', item.color)}>
                      <Trophy size={20} />
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div className="mt-6">
                  <div className="font-cond text-[26px] font-black uppercase text-text-primary">
                    {item.title}
                  </div>
                  <div className="mt-1 font-cond text-[48px] font-black tracking-tight text-txp-yellow leading-none">
                    {item.amount}
                  </div>
                </div>

                {/* Perks */}
                <ul className="mt-8 space-y-3.5">
                  {item.perks.map((p, i) => (
                    <li key={i} className="flex items-start gap-3 font-sans text-[13px] text-text-secondary leading-snug">
                      <p.icon size={15} className="mt-0.5 shrink-0 text-txp-yellow" />
                      <span>{p.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 border-t border-border-dim pt-4 text-center font-mono text-[10px] uppercase tracking-widest text-text-dim">
                Awarded at TechXpress Valedictory
              </div>
            </div>
          </NeonBorderCard>
        ))}
      </div>

      {/* Special Category Awards */}
      <div className="mt-16">
        <div className="mb-6 flex items-center gap-3">
          <Train size={18} className="text-txp-teal" />
          <h2 className="font-cond text-[24px] font-black uppercase tracking-[0.06em] text-text-primary">
            Special Category Bounties · 3 × ₹5,000
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {SPECIAL.map((s, idx) => (
            <div
              key={idx}
              className="glass-card p-6 border-border-mid hover:border-txp-teal/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-[2px] border border-txp-teal/40 bg-txp-teal/10 px-2 py-0.5 font-mono text-[10px] font-bold text-txp-teal">
                    SPECIAL CLASS
                  </span>
                  <span className="font-cond text-[24px] font-black text-text-primary">{s.amount}</span>
                </div>
                <h3 className="mt-4 font-cond text-[20px] font-black uppercase tracking-tight text-text-primary">
                  {s.title}
                </h3>
                <p className="mt-2 font-sans text-[13px] leading-relaxed text-text-secondary">
                  {s.desc}
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-text-dim border-t border-border-dim pt-3">
                <Gift size={12} className="text-txp-teal" />
                <span>Certificate + Incubation Mentorship</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
