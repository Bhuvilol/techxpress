import { Link } from 'react-router-dom';
import { ArrowRight, Trophy, Users, FileText, Gavel, Shield, MapPin } from 'lucide-react';
import { ScrambleText } from '../../components/ui/ScrambleText.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { homePathForRole } from '../../utils/authHome.js';

import trainUrl from '../../assets/train-a.webp';
import logoUrl from '../../assets/logo.webp';
import birdsUrl from '../../assets/birds-a.webp';
import chaiUrl from '../../assets/chai-a.webp';
import lampUrl from '../../assets/lamp-a.webp';
import kioskUrl from '../../assets/kiosk.webp';

const TILES = [
  {
    to: '/register',
    label: 'Reservation Counter',
    hindi: 'टिकट आरक्षण',
    desc: 'Register as a passenger with your SOA credentials, select contribution areas, and upload ID card for verification.',
    icon: Users,
    tag: 'OPEN',
  },
  {
    to: '/login',
    label: 'Passenger Terminal',
    hindi: 'प्रवेश द्वार',
    desc: 'Sign in with your email and 6-digit access pass to view your boarding pass, join teams, or score projects.',
    icon: Shield,
    tag: 'SECURE',
  },
  {
    to: '/problem-statements',
    label: 'Tracks & Challenges',
    hindi: 'चुनौतियां',
    desc: 'Explore real-world challenges curated across 29 specialized domains from 8 SOA campuses.',
    icon: FileText,
    tag: 'CATALOGUE',
  },
  {
    to: '/leaderboard',
    label: 'Live Departure Board',
    hindi: 'परिणाम तालिका',
    desc: 'Track team standings in real time as evaluations and round scores stream in from the jury.',
    icon: Trophy,
    tag: 'LIVE SCORES',
  },
  {
    to: '/awards',
    label: 'Fare Chart & Prizes',
    hindi: 'पुरस्कार',
    desc: '₹65,000 cash pool, 1st & 2nd class trophies, merit certificates, and incubation support.',
    icon: Gavel,
    tag: '₹65,000',
  },
];

export const HomePage = () => {
  const { isAuth, user } = useAuth();

  return (
    <section className="relative mx-auto flex max-w-[1240px] flex-col items-center px-6 py-12 md:py-20 overflow-hidden">
      {/* Background Gliding Birds */}
      <div className="pointer-events-none absolute top-6 right-8 hidden w-36 opacity-35 select-none lg:block anim-birds">
        <img src={birdsUrl} alt="" className="w-full" />
      </div>

      {/* LED Departure Board Ticker */}
      <div className="led-ticker anim-led-breathe mb-8 inline-flex items-center gap-3 text-[11px] md:text-[13px]">
        <span className="h-2 w-2 rounded-full bg-txp-yellow animate-pulse-soft" />
        <span className="font-bold">12026 TECHXPRESS · VORTEX // PLATFORM 1</span>
        <span className="hidden sm:inline text-txp-yellow/60">·</span>
        <span className="hidden sm:inline text-white/80">BOARDING NOW · ALL ABOARD</span>
      </div>

      {/* Hero Header with Station Bilingual Enamel Styling */}
      <div className="flex flex-col items-center text-center relative z-10">
        <div className="mb-4 inline-flex items-center gap-2.5 rounded-[3px] border border-txp-yellow/40 bg-txp-yellow/10 px-3.5 py-1 font-cond text-[13px] font-extrabold uppercase tracking-[0.16em] text-txp-yellow shadow-[0_2px_8px_rgba(245,184,0,0.15)]">
          <img src={logoUrl} alt="" className="h-4 w-4 object-contain" />
          <span>TECHXPRESS JN. · PLATFORM 1</span>
        </div>

        <h1 className="font-cond text-[54px] font-black uppercase tracking-[0.04em] sm:text-[76px] md:text-[104px] text-text-primary leading-[0.95]">
          <ScrambleText text="TECHXPRESS" duration={0.6} />
          <span className="block text-txp-yellow">VORTEX</span>
        </h1>

        <div className="mt-2 font-deva text-[18px] md:text-[22px] font-bold text-text-secondary tracking-widest">
          टेकएक्सप्रेस · वोर्टेक्स
        </div>

        <p className="mt-5 max-w-xl text-center font-sans text-[14px] md:text-[16px] leading-relaxed text-text-secondary md:max-w-2xl">
          The central hackathon hub of Siksha 'O' Anusandhan. Register your ticket,
          form your interdisciplinary squad across 8 campuses, and prepare for departure.
        </p>
      </div>

      {/* Authentic Locomotive Showcase on Platform Track */}
      <div className="relative my-8 flex w-full max-w-2xl flex-col items-center justify-center">
        {/* Subtle Platform Lamp */}
        <div className="pointer-events-none absolute -left-4 bottom-2 hidden h-44 w-auto select-none sm:block anim-lamp">
          <img src={lampUrl} alt="Platform Lamp" className="h-full object-contain" />
        </div>

        {/* Train Locomotive with subtle engine idle movement */}
        <div className="relative flex flex-col items-center">
          <div className="anim-train-idle relative z-10 w-64 sm:w-80 md:w-96 drop-shadow-[0_16px_28px_rgba(0,0,0,0.7)]">
            <img src={trainUrl} alt="12026 TechXpress Locomotive" className="w-full object-contain" />
          </div>
          {/* Subtle Railway Track Bed */}
          <div className="mt-[-6px] h-1.5 w-72 sm:w-96 md:w-[440px] rounded-full bg-gradient-to-r from-transparent via-border-mid to-transparent" />
        </div>
      </div>

      {/* Primary Actions */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 relative z-10">
        {isAuth ? (
          <Link
            to={homePathForRole(user.role)}
            className="glow-button flex items-center gap-3 !px-8 !py-3 !text-[17px]"
          >
            <span>Continue to Dashboard</span>
            <ArrowRight size={18} />
          </Link>
        ) : (
          <>
            <Link to="/register" className="glow-button flex items-center justify-center gap-3 w-52 !py-3 !text-[17px]">
              <span>Book Ticket</span>
              <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="ghost-button flex items-center justify-center w-52 !py-3 font-cond !text-[17px] font-bold uppercase tracking-wider">
              Passenger Sign In
            </Link>
          </>
        )}
      </div>

      {/* Station Status Strip */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-6 md:gap-10 border-y border-border-dim py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-text-dim">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-status-live animate-pulse-soft" />
          <span className="text-text-primary font-bold">Signal Green</span>
        </span>
        <span className="hidden sm:inline">·</span>
        <span className="flex items-center gap-1.5">
          <MapPin size={13} className="text-txp-yellow" />
          Bhubaneswar, Odisha
        </span>
        <span className="hidden sm:inline">·</span>
        <span>8 Campuses Interconnected</span>
      </div>

      {/* Enamel Platform Feature Tiles */}
      <div className="mt-16 grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((t) => (
          <div
            key={t.to}
            className="glass-card group flex h-full flex-col justify-between p-7 border-border-mid hover:border-txp-yellow/50 transition-all duration-200"
          >
            <Link to={t.to} className="flex h-full flex-col justify-between gap-6">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[4px] border border-border-mid bg-bg-surface-2 group-hover:border-txp-yellow/50 group-hover:bg-txp-yellow/10 transition-all">
                    <t.icon size={22} className="text-txp-yellow transition-transform group-hover:scale-110" />
                  </div>
                  <span className="rounded-[2px] border border-border-mid bg-bg-surface-2 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-text-dim group-hover:text-txp-yellow group-hover:border-txp-yellow/40 transition-colors">
                    {t.tag}
                  </span>
                </div>

                <div className="mt-6 space-y-2">
                  <div className="font-deva text-[13px] font-semibold text-txp-yellow/80">
                    {t.hindi}
                  </div>
                  <h3 className="font-cond text-[24px] font-black uppercase tracking-[0.04em] text-text-primary group-hover:text-txp-yellow transition-colors">
                    {t.label}
                  </h3>
                  <p className="font-sans text-[13px] leading-relaxed text-text-secondary">
                    {t.desc}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 font-cond text-[14px] font-bold uppercase tracking-wider text-txp-yellow group-hover:translate-x-1 transition-transform">
                <span>Enter Terminal</span>
                <ArrowRight size={15} />
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Station Amenities & Information Strip */}
      <div className="mt-12 grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="glass-card flat flex items-center gap-5 p-6 border-border-mid bg-bg-surface-1">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[4px] border border-txp-yellow/30 bg-txp-yellow/5 p-2 anim-lamp">
            <img src={chaiUrl} alt="Station Chai" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="font-deva text-[12px] font-bold text-txp-yellow">चाय एवं जलपान · Platform Pantry</div>
            <h4 className="font-cond text-[18px] font-black uppercase text-text-primary">24/7 Hacker Sustenance</h4>
            <p className="font-sans text-[12px] text-text-secondary">Hot canteen tea, snacks, and midnight refreshments provided throughout all hackathon phases.</p>
          </div>
        </div>

        <div className="glass-card flat flex items-center gap-5 p-6 border-border-mid bg-bg-surface-1">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[4px] border border-txp-teal/30 bg-txp-teal/5 p-2">
            <img src={kioskUrl} alt="Station Kiosk" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="font-deva text-[12px] font-bold text-txp-teal">पूछताछ केंद्र · Help Desk</div>
            <h4 className="font-cond text-[18px] font-black uppercase text-text-primary">Campus Facilitation Kiosks</h4>
            <p className="font-sans text-[12px] text-text-secondary">Dedicated student coordinators and faculty desks active across all 8 SOA campuses.</p>
          </div>
        </div>
      </div>

      {/* Station Platform Footer Note */}
      <div className="mt-20 flex flex-col items-center gap-2 text-center">
        <div className="h-px w-36 bg-gradient-to-r from-transparent via-txp-yellow/40 to-transparent" />
        <div className="mt-4 font-mono text-[11px] uppercase tracking-[0.3em] text-text-dim">
          TechXpress 12026 · Siksha 'O' Anusandhan
        </div>
      </div>
    </section>
  );
};
