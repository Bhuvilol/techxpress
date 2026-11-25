import { ABOUT, LABELS, STATION } from '../../content/station.js';

// Yellow enamel station board on top, cream notice paper below.
export default function About({ titleId }) {
  return (
    <article className="m-about">
      <header className="enamel-board" data-grab>
        <span className="rivet rivet--tl" aria-hidden="true" />
        <span className="rivet rivet--tr" aria-hidden="true" />
        <span className="rivet rivet--bl" aria-hidden="true" />
        <span className="rivet rivet--br" aria-hidden="true" />
        <p className="enamel-board-hindi" lang="hi">{LABELS.about.hindi} · {STATION.hindi}</p>
        <h2 id={titleId} tabIndex={-1} className="enamel-board-title">{ABOUT.title}</h2>
        <p className="enamel-board-sub">{STATION.english}</p>
      </header>
      <div className="paper paper--cream">
        <p className="paper-lede">{ABOUT.subtitle}</p>
        {ABOUT.paragraphs.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
        <h3 className="paper-h3">{ABOUT.whyTitle}</h3>
        <ul className="ticked-list">
          {ABOUT.why.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
        <h3 className="paper-h3">{ABOUT.whoTitle}</h3>
        <p className="notice-box">{ABOUT.who}</p>
        <p className="paper-altitude">{STATION.altitude}</p>
      </div>
    </article>
  );
}
