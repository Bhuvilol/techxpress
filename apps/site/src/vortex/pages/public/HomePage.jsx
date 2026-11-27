import { useState, useRef, useEffect } from 'react';
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
    to: '/vortex/register',
    label: 'Reservation Counter',
    hindi: 'टिकट आरक्षण',
    desc: 'Register as a passenger with your SOA credentials, select contribution areas, and upload ID card for verification.',
    icon: Users,
    tag: 'OPEN',
  },
  {
    to: '/vortex/login',
    label: 'Passenger Terminal',
    hindi: 'प्रवेश द्वार',
    desc: 'Sign in with your email and 6-digit access pass to view your boarding pass, join teams, or score projects.',
    icon: Shield,
    tag: 'SECURE',
  },
  {
    to: '/vortex/problem-statements',
    label: 'Tracks & Challenges',
    hindi: 'चुनौतियां',
    desc: 'Explore real-world challenges curated across 29 specialized domains from 8 SOA campuses.',
    icon: FileText,
    tag: 'CATALOGUE',
  },
  {
    to: '/vortex/leaderboard',
    label: 'Live Departure Board',
    hindi: 'परिणाम तालिका',
    desc: 'Track team standings in real time as evaluations and round scores stream in from the jury.',
    icon: Trophy,
    tag: 'LIVE SCORES',
  },
  {
    to: '/vortex/awards',
    label: 'Fare Chart & Prizes',
    hindi: 'पुरस्कार',
    desc: '₹65,000 cash pool, 1st & 2nd class trophies, merit certificates, and incubation support.',
    icon: Gavel,
    tag: '₹65,000',
  },
];

// Smooth 3D tilt and optical parallax hook matching the main station stage
function useVortexParallax(enabled = true) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let raf = 0;
    let running = false;
    const EASE = 0.065;
    const MAX_ROT = { x: 3.2, y: 2.4 };

    const update = () => {
      cur.x += (target.x - cur.x) * EASE;
      cur.y += (target.y - cur.y) * EASE;

      container.style.setProperty('--vortex-tilt-x', cur.x.toFixed(4));
      container.style.setProperty('--vortex-tilt-y', cur.y.toFixed(4));
      container.style.setProperty('--vortex-rot-x', `${(cur.y * MAX_ROT.y).toFixed(3)}deg`);
      container.style.setProperty('--vortex-rot-y', `${(-cur.x * MAX_ROT.x).toFixed(3)}deg`);

      const settled = Math.abs(target.x - cur.x) < 0.0004 && Math.abs(target.y - cur.y) < 0.0004;
      if (settled) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(update);
    };

    const start = () => {
      if (running || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(update);
    };

    const onPointer = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
      start();
    };

    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      start();
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        running = false;
      } else {
        start();
      }
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);

  return containerRef;
}

export const HomePage = () => {
  const { isAuth, user } = useAuth();
  const stageRef = useVortexParallax(true);

  // Train interactive motion: 'arriving' (on page mount) | 'idle' | 'cruising' (when user clicks)
  const [trainState, setTrainState] = useState('arriving');
  // Interactive lamp spotlight beam toggle
  const [lampLit, setLampLit] = useState(true);
  // Interactive chai stall brew state
  const [chaiBrewing, setChaiBrewing] = useState(false);

  // Train arrival on mount: settles into berth after 2.2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setTrainState('idle');
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  const handleTrainClick = () => {
    if (trainState === 'cruising') return;
    setTrainState('cruising');
    setTimeout(() => {
      setTrainState('idle');
    }, 3400);
  };

  const toggleLamp = () => setLampLit((v) => !v);

  const handleChaiClick = () => {
    setChaiBrewing(true);
    setTimeout(() => setChaiBrewing(false), 2600);
  };

  const handleStationBoardClick = () => {
    const platformEl = document.querySelector('.vortex-platform-stage');
    if (platformEl) {
      platformEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (trainState === 'idle') {
      handleTrainClick();
    }
  };

  return (
    <div className="vortex-stage-wrapper" ref={stageRef}>
      {/* 3D Tilt Rig that smoothly responds to mouse movement */}
      <div className="vortex-stage-rig">
        <section className="relative mx-auto flex max-w-[1240px] flex-col items-center px-3.5 sm:px-6 pt-6 sm:pt-8 md:pt-14 pb-12 sm:pb-16 md:pb-24 z-10">
          {/* Parallax Gliding Birds in Upper Sky */}
          <div className="vortex-stage-birds hidden lg:block anim-birds" aria-hidden="true">
            <img src={birdsUrl} alt="" className="w-full" />
          </div>

          {/* Authentic Indian Railways Yellow Enamel Station Board */}
          <div
            className="vortex-enamel-stationboard"
            role="button"
            tabIndex={0}
            onClick={handleStationBoardClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleStationBoardClick();
              }
            }}
            aria-label="TechXpress Junction Vortex Terminal Station Board"
          >
            <span className="vortex-rivet rivet-tl" />
            <span className="vortex-rivet rivet-tr" />
            <span className="vortex-rivet rivet-bl" />
            <span className="vortex-rivet rivet-br" />
            <div className="flex items-center gap-2 sm:gap-2.5">
              <img src={logoUrl} alt="" className="h-4 w-4 sm:h-6 sm:w-6 object-contain" />
              <span className="vortex-board-en">TECHXPRESS JN. · VORTEX TERMINAL</span>
            </div>
            <div className="vortex-board-hi" lang="hi">
              टेकएक्सप्रेस जं. · वोर्टेक्स टर्मिनल · मंच 1
            </div>
          </div>

          {/* Hero Header with 3D Depth & High-Contrast Bold Typography */}
          <div className="vortex-hero-text mt-1 sm:mt-2 px-2">
            <h1 className="font-cond font-black uppercase tracking-[0.03em] text-[38px] sm:text-[72px] md:text-[100px] lg:text-[116px] leading-[0.88] select-none">
              <span className="block vortex-title-techxpress">
                <ScrambleText text="TECHXPRESS" duration={0.6} className="font-cond font-black tracking-[0.03em]" />
              </span>
              <span className="block vortex-title-vortex mt-1 sm:mt-2">
                VORTEX
              </span>
            </h1>

            <div className="vortex-hero-deva mt-2 sm:mt-3">
              टेकएक्सप्रेस · वोर्टेक्स
            </div>

            <p className="vortex-hero-desc mt-3 sm:mt-5">
              The central hackathon hub of Siksha 'O' Anusandhan. Register your ticket,
              form your interdisciplinary squad across 8 campuses, and prepare for departure.
            </p>
          </div>

          {/* Edge-to-Edge Full-Screen Platform Stage */}
          <div className="vortex-platform-stage">
            <div className="vortex-platform-actors">
              {/* Victorian Platform Lamp - strictly on left edge, interactive toggle */}
              <div
                className={`vortex-platform-lamp${lampLit ? ' is-lit' : ''}`}
                onClick={toggleLamp}
                role="button"
                tabIndex={0}
                aria-label="Toggle Station Platform Lamp"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleLamp(); }}
              >
                <span className="vortex-actor-tag">
                  {lampLit ? 'Platform Lamp · Click to Dim' : 'Platform Lamp · Click to Light'}
                </span>
                <div className="vortex-lamp-glow" aria-hidden="true" />
                {lampLit && <div className="vortex-lamp-beam" aria-hidden="true" />}
                <img src={lampUrl} alt="Station Platform Lamp" className="vortex-lamp-img anim-lamp" />
              </div>

              {/* Locomotive on Platform Track with arrival and cruise run past platform */}
              <div
                className={`vortex-platform-train is-${trainState}`}
                onClick={handleTrainClick}
                role="button"
                tabIndex={0}
                aria-label="12026 TechXpress Locomotive - Click to Cruise Past Platform"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTrainClick(); }}
              >
                <span className="vortex-actor-tag">
                  {trainState === 'cruising'
                    ? '⚡ 12026 TechXpress Moving Past Platform!'
                    : '12026 TechXpress · Click to Run Past Platform →'}
                </span>
                {trainState === 'cruising' && (
                  <>
                    <span className="vortex-train-steam" />
                    <span className="vortex-train-steam" style={{ left: '26%', animationDelay: '0.3s' }} />
                    <span className="vortex-train-steam" style={{ left: '32%', animationDelay: '0.6s' }} />
                  </>
                )}
                <img
                  src={trainUrl}
                  alt="12026 TechXpress Locomotive"
                  className={`vortex-train-img${trainState === 'idle' ? ' anim-train-idle' : ''}`}
                />
              </div>

              {/* Station Chai Pantry on Platform Edge */}
              <div
                className={`vortex-platform-amenity${chaiBrewing ? ' anim-lamp' : ''}`}
                onClick={handleChaiClick}
                role="button"
                tabIndex={0}
                aria-label="Station Platform Chai Pantry"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleChaiClick(); }}
              >
                <span className="vortex-actor-tag">
                  {chaiBrewing ? '☕ Garam Chai Freshly Brewed!' : 'Garam Chai · Click to Brew'}
                </span>
                <img src={chaiUrl} alt="Platform Chai Stall" className="vortex-chai-img" />
              </div>
            </div>

            {/* Edge-to-Edge Solid Platform Stone Deck */}
            <div className="vortex-platform-bed">
              <div className="vortex-platform-safeline" />
            </div>
            {/* Edge-to-Edge Iron Rails Bed */}
            <div className="vortex-rails-bed" />
            {/* Edge-to-Edge Ballast Gravel Bed */}
            <div className="vortex-ballast-bed" />
          </div>

          {/* Primary Action Buttons: Edmondson Cardboard Ticket & Enamel Sign In */}
          <div className="mt-6 sm:mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-6 relative z-10 w-full px-2 sm:px-4">
            {isAuth ? (
              <Link
                to={homePathForRole(user.role)}
                className="edmondson-ticket"
                aria-label="Continue to Passenger Dashboard"
              >
                <div className="edmondson-ticket-face">
                  <div className="edmondson-stub">
                    <div>№ 12026</div>
                    <div>TXP-SOA</div>
                  </div>
                  <div className="edmondson-body">
                    <span className="edmondson-en">CONTINUE TO DASHBOARD</span>
                    <span className="edmondson-hi" lang="hi">यात्री डैशबोर्ड · प्रवेश</span>
                  </div>
                  <ArrowRight size={18} className="edmondson-arrow" />
                </div>
              </Link>
            ) : (
              <>
                {/* Authentic Edmondson Ticket Stub */}
                <Link
                  to="/vortex/register"
                  className="edmondson-ticket"
                  aria-label="Book Hackathon Ticket"
                >
                  <div className="edmondson-ticket-face">
                    <div className="edmondson-stub">
                      <div>№ 12026</div>
                      <div>TXP-SOA</div>
                    </div>
                    <div className="edmondson-body">
                      <span className="edmondson-en">BOOK TICKET</span>
                      <span className="edmondson-hi" lang="hi">टिकट आरक्षण · मंच 1</span>
                    </div>
                    <ArrowRight size={18} className="edmondson-arrow" />
                  </div>
                </Link>

                {/* Authentic Enamel Passenger Sign In Plate */}
                <Link
                  to="/vortex/login"
                  className="enamel-signin-btn"
                  aria-label="Passenger Sign In"
                >
                  <span className="vortex-rivet rivet-tl" />
                  <span className="vortex-rivet rivet-tr" />
                  <span className="vortex-rivet rivet-bl" />
                  <span className="vortex-rivet rivet-br" />
                  <div className="flex flex-col text-left pointer-events-none">
                    <span className="vortex-signin-en">
                      PASSENGER SIGN IN
                    </span>
                    <span className="vortex-signin-hi" lang="hi">
                      प्रवेश द्वार · डिजिटल पास
                    </span>
                  </div>
                  <ArrowRight size={17} className="vortex-signin-arrow" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Quick-Navigation Ribbon (Mobile Only - Fast & Simple Navigation) */}
          <div className="mt-6 flex w-full items-center justify-center gap-2 overflow-x-auto pb-1 pt-1 scroll-panel sm:hidden select-none">
            <Link
              to="/vortex/leaderboard"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[4px] border border-txp-yellow/50 bg-[#1e1938] px-3 py-1.5 font-cond text-[12px] font-bold uppercase tracking-wider text-txp-yellow shadow-[0_2px_6px_rgba(0,0,0,0.4)] active:scale-95 transition-transform"
            >
              <Trophy size={13} />
              <span>Standings</span>
            </Link>
            <Link
              to="/vortex/problem-statements"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[4px] border border-border-mid bg-[#1e1938] px-3 py-1.5 font-cond text-[12px] font-bold uppercase tracking-wider text-text-primary shadow-[0_2px_6px_rgba(0,0,0,0.4)] active:scale-95 transition-transform"
            >
              <FileText size={13} />
              <span>Challenges</span>
            </Link>
            <Link
              to="/vortex/awards"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[4px] border border-border-mid bg-[#1e1938] px-3 py-1.5 font-cond text-[12px] font-bold uppercase tracking-wider text-text-primary shadow-[0_2px_6px_rgba(0,0,0,0.4)] active:scale-95 transition-transform"
            >
              <Gavel size={13} />
              <span>₹65k Prizes</span>
            </Link>
          </div>

          {/* Station Status Strip */}
          <div className="mt-6 sm:mt-12 flex flex-wrap items-center justify-center gap-2.5 sm:gap-5 md:gap-10 border-y border-border-dim/80 bg-bg-surface-1/40 backdrop-blur-md px-3 sm:px-6 py-2 sm:py-3 font-mono text-[9.5px] sm:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.2em] text-text-dim rounded-[4px] shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-status-live animate-pulse-soft shadow-[0_0_8px_#10b981]" />
              <span className="text-text-primary font-bold">Signal Green</span>
            </span>
            <span className="text-txp-yellow/40">·</span>
            <span className="flex items-center gap-1">
              <MapPin size={12} className="text-txp-yellow" />
              Bhubaneswar, Odisha
            </span>
            <span className="hidden xs:inline text-txp-yellow/40">·</span>
            <span className="hidden xs:inline">8 Campuses Interconnected</span>
          </div>

          {/* Cardboard Feature Tiles */}
          <div className="mt-10 sm:mt-16 grid w-full grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TILES.map((t) => (
              <div
                key={t.to}
                className="vortex-cardboard-tile group flex h-full flex-col justify-between p-4 sm:p-7"
              >
                <Link to={t.to} className="flex h-full flex-col justify-between gap-4 sm:gap-6">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-[4px] border border-txp-yellow/30 bg-txp-yellow/10 group-hover:border-txp-yellow group-hover:bg-txp-yellow/20 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                        <t.icon size={20} className="text-txp-yellow transition-transform group-hover:scale-110" />
                      </div>
                      <span className="rounded-[2px] border border-txp-yellow/40 bg-bg-surface-2 px-2 py-0.5 font-mono text-[9px] sm:text-[10px] font-bold tracking-widest text-txp-yellow shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
                        {t.tag}
                      </span>
                    </div>

                    <div className="mt-4 sm:mt-6 space-y-1 sm:space-y-2">
                      <div className="font-deva text-[12px] sm:text-[13px] font-semibold text-txp-yellow/85">
                        {t.hindi}
                      </div>
                      <h3 className="font-cond text-[21px] sm:text-[25px] font-black uppercase tracking-[0.04em] text-text-primary group-hover:text-txp-yellow transition-colors leading-tight">
                        {t.label}
                      </h3>
                      <p className="font-sans text-[12px] sm:text-[13px] leading-relaxed text-text-secondary line-clamp-3 sm:line-clamp-none">
                        {t.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 pt-1 sm:pt-2 font-cond text-[14px] sm:text-[15px] font-extrabold uppercase tracking-wider text-txp-yellow group-hover:translate-x-1.5 transition-transform">
                    <span>Enter Terminal</span>
                    <ArrowRight size={15} />
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* Station Amenities & Information Strip */}
          <div className="mt-8 sm:mt-12 grid w-full grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
            <div className="vortex-cardboard-tile flex items-center gap-3.5 sm:gap-5 p-4 sm:p-6">
              <div className="flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-[4px] border border-txp-yellow/40 bg-txp-yellow/10 p-1.5 sm:p-2 anim-lamp shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                <img src={chaiUrl} alt="Station Chai" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="font-deva text-[11px] sm:text-[12px] font-bold text-txp-yellow">चाय एवं जलपान · Platform Pantry</div>
                <h4 className="font-cond text-[17px] sm:text-[19px] font-black uppercase text-text-primary">24/7 Hacker Sustenance</h4>
                <p className="font-sans text-[11px] sm:text-[12px] text-text-secondary">Hot canteen tea, snacks, and midnight refreshments provided throughout all hackathon phases.</p>
              </div>
            </div>

            <div className="vortex-cardboard-tile flex items-center gap-3.5 sm:gap-5 p-4 sm:p-6">
              <div className="flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-[4px] border border-txp-teal/40 bg-txp-teal/10 p-1.5 sm:p-2 shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                <img src={kioskUrl} alt="Station Kiosk" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="font-deva text-[11px] sm:text-[12px] font-bold text-txp-teal">पूछताछ केंद्र · Help Desk</div>
                <h4 className="font-cond text-[17px] sm:text-[19px] font-black uppercase text-text-primary">Campus Facilitation Kiosks</h4>
                <p className="font-sans text-[11px] sm:text-[12px] text-text-secondary">Dedicated student coordinators and faculty desks active across all 8 SOA campuses.</p>
              </div>
            </div>
          </div>

          {/* Station Platform Footer Note */}
          <div className="mt-12 sm:mt-20 flex flex-col items-center gap-2 text-center">
            <div className="h-0.5 w-40 bg-gradient-to-r from-transparent via-txp-yellow/50 to-transparent" />
            <div className="mt-4 font-mono text-[11px] uppercase tracking-[0.3em] text-text-dim">
              TechXpress 12026 · Siksha 'O' Anusandhan
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
