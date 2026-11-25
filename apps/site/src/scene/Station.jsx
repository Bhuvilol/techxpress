// The landing stage: a paper theatre of cardboard cutouts in depth layers.
// Props and behaviour are the contract at the bottom of stage.js.
//
// Layout: everything is placed in scene units (layout.js) multiplied by `u`,
// the px size of one unit for this screen, so images are laid out at their
// real screen size and stay crisp (no scaled-down parent to blur them).
// The rig is a 3D group: each layer is a flat plane pushed back by its depth
// and scaled up again so it looks unchanged at rest; tilting the rig a few
// degrees then gives real parallax between the planes.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { COMPOSITIONS, TALL_QUERY, fullBox } from './layout.js';
import { STAGE_LAYERS } from './stage.js';
import { allSources, placePieces } from './geometry.js';
import { preload } from './assets.js';
import { markIntroPlayed, markVisited, playIntro, shouldPlayIntro } from './intro.js';
import Piece, { TrainDoor } from './Piece.jsx';
import { ClockHands, LedText, NameBoardText, Wires } from './Overlays.jsx';
import useStageTilt from '../motion/useStageTilt.js';
import { HINTS } from '../content/station.js';
import '../styles/scene.css';

// 3D set-up, in scene units. PERSPECTIVE is the viewer's distance; layer
// planes sit between Z_NEAR (front) and Z_FAR (back); the rig turns around
// a point PIVOT deep, so front and back slide in opposite directions.
const PERSPECTIVE = 2200;
const Z_RANGE = 640;
const PIVOT = 380;
const layerZ = (depth) => -(1 - depth) * Z_RANGE;

const useMedia = (query) => {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatch(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return match;
};

// px per scene unit and the offset of the composition's safe area (meet fit).
const measure = (name) => {
  const c = COMPOSITIONS[name];
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const u = Math.min(vw / c.width, vh / c.height);
  return { u, vw, vh, ox: (vw - c.width * u) / 2, oy: (vh - c.height * u) / 2 };
};

const useView = (composition) => {
  const [view, setView] = useState(() => measure(composition));
  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setView(measure(composition)));
    };
    update();
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
    };
  }, [composition]);
  return view;
};

// Pauses every animation on the stage (CSS loops, the opening, the LED
// scroll) while the tab is hidden, and resumes exactly those afterwards.
const usePauseWhenHidden = (rootRef) => {
  useEffect(() => {
    let paused = [];
    const onVisibility = () => {
      const root = rootRef.current;
      if (!root) return;
      if (document.hidden) {
        paused = root.getAnimations({ subtree: true }).filter((a) => a.playState === 'running');
        paused.forEach((a) => a.pause());
      } else {
        paused.forEach((a) => { if (a.playState === 'paused') a.play(); });
        paused = [];
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [rootRef]);
};

export default function Station({ onHotspot, dimmed = false, onIntroDone }) {
  const composition = useMedia(TALL_QUERY) ? 'tall' : 'wide';
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const view = useView(composition);
  const { u } = view;
  const placements = useMemo(() => placePieces(composition), [composition]);
  const full = fullBox(composition);
  const c = COMPOSITIONS[composition];

  // 'loading' (images decoding) -> 'intro' -> 'done'. Decided once at mount.
  const [phase, setPhase] = useState(() => (shouldPlayIntro() ? 'loading' : 'done'));
  const rootRef = useRef(null);
  const rigRef = useRef(null);
  const introRef = useRef(null);

  // onIntroDone exactly once, whatever path we take.
  const doneCalled = useRef(false);
  const onIntroDoneRef = useRef(onIntroDone);
  useEffect(() => { onIntroDoneRef.current = onIntroDone; });
  const announceDone = useCallback(() => {
    if (doneCalled.current) return;
    doneCalled.current = true;
    markVisited();
    onIntroDoneRef.current?.();
  }, []);

  useEffect(() => {
    if (phase === 'done') announceDone();
  }, [phase, announceDone]);

  // Decode the art before the opening so nothing rises as an empty box.
  useEffect(() => {
    if (phase !== 'loading') return undefined;
    let alive = true;
    preload(allSources(placements)).then(() => { if (alive) setPhase('intro'); });
    return () => { alive = false; };
  }, [phase, placements]);

  // The opening. Runs before paint so no piece flashes in its final place.
  // `view` is read once at the start (a resize mid-intro is harmless).
  const viewRef = useRef(view);
  useLayoutEffect(() => { viewRef.current = view; }, [view]);
  useLayoutEffect(() => {
    if (phase !== 'intro') return undefined;
    markIntroPlayed();
    const intro = playIntro(rootRef.current, viewRef.current);
    introRef.current = intro;
    let alive = true;
    intro.ui.then((ok) => { if (alive && ok) announceDone(); });
    intro.done.then((ok) => { if (alive && ok) setPhase('done'); });
    return () => {
      alive = false;
      intro.anims.forEach((a) => a.cancel());
      introRef.current = null;
    };
  }, [phase, announceDone]);

  const skip = useCallback(() => {
    if (introRef.current) introRef.current.anims.forEach((a) => a.finish());
    else setPhase('done');
  }, []);

  // Any key skips the opening (taps are handled on the stage itself).
  useEffect(() => {
    if (phase === 'done') return undefined;
    window.addEventListener('keydown', skip);
    return () => window.removeEventListener('keydown', skip);
  }, [phase, skip]);

  usePauseWhenHidden(rootRef);
  useStageTilt(rigRef, !reduced);

  const live = phase === 'done';
  const motion = !reduced;
  const hotspotsOn = live ? !dimmed : null;

  const overlayFor = (p) => {
    const ph = !p.art;
    if (p.id === 'nameboard') return <NameBoardText box={p.box} u={u} onPlaceholder={ph} />;
    if (p.id === 'ledboard') return <LedText box={p.box} u={u} scroll={live && motion} />;
    if (p.id === 'clock') return <ClockHands box={p.box} u={u} onPlaceholder={ph} live={motion} />;
    return null;
  };

  return (
    <main
      ref={rootRef}
      className={`stage stage--${composition} stage--${phase}${live && motion ? ' is-live' : ''}${dimmed ? ' is-dimmed' : ''}`}
      data-composition={composition}
      style={{ '--u': u, perspective: `${PERSPECTIVE * u}px` }}
      onPointerDown={live ? undefined : skip}
    >
      <div
        ref={rigRef}
        className="stage__rig"
        style={{
          left: view.ox,
          top: view.oy,
          width: c.width * u,
          height: c.height * u,
          transformOrigin: `50% 50% ${-PIVOT * u}px`,
        }}
      >
        {STAGE_LAYERS.map((layer) => {
          const z = layerZ(layer.depth);
          return (
            <div
              key={layer.id}
              className={`stage__layer stage__layer--${layer.id}`}
              style={{
                transform: `translateZ(${z * u}px) scale(${(PERSPECTIVE - z) / PERSPECTIVE})`,
                '--depth': layer.depth,
              }}
            >
              {placements.filter((p) => p.layer === layer.id).map((p) => (
                <Piece
                  key={p.key}
                  piece={p}
                  u={u}
                  live={live}
                  motion={motion}
                  hotspotsOn={hotspotsOn}
                  onHotspot={onHotspot}
                  overlay={overlayFor(p)}
                >
                  {p.id === 'train' && live && (
                    <TrainDoor piece={p} u={u} hotspotsOn={hotspotsOn} onHotspot={onHotspot} />
                  )}
                </Piece>
              ))}
              {layer.id === 'masts' && <Wires masts={placements.filter((p) => p.id === 'mast')} full={full} u={u} />}
            </div>
          );
        })}
      </div>
      <div className="stage__dim" aria-hidden="true" />
      {!live && (
        <button type="button" className="stage__skip" onClick={skip}>
          {HINTS.skip}
        </button>
      )}
    </main>
  );
}
