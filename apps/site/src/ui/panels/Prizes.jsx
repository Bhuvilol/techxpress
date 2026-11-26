import { FARES, LABELS, UI } from '../../content/station.js';

const Row = ({ row }) => (
  <li className={`fare-row fare-row--${row.cls.toLowerCase()}`}>
    <span className="fare-cls" aria-label={`${UI.fareCols.cls} ${row.cls}`}>{row.cls}</span>
    <span className="fare-who">
      <span className="fare-class-name">{row.className}</span>
      <strong className="fare-title">{row.title}</strong>
    </span>
    {row.fare && <span className="fare-amount">{row.fare}</span>}
    <span className="fare-extra">{row.extra}</span>
  </li>
);

// Prizes as a railway fare chart.
export default function Prizes({ titleId }) {
  return (
    <article className="m-prizes">
      <header className="fare-head" data-grab>
        <p className="fare-head-hindi" lang="hi">{LABELS.prizes.hindi}</p>
        <h2 id={titleId} tabIndex={-1} className="fare-head-title">{UI.fareTitle}</h2>
        <p className="fare-head-sub">{LABELS.prizes.hint}</p>
      </header>
      <div className="paper paper--fare">
        <div className="fare-cols" aria-hidden="true">
          <span>{UI.fareCols.cls}</span>
          <span>{UI.fareCols.title}</span>
          <span>{UI.fareCols.fare}</span>
        </div>
        <ul className="fare-rows">
          {FARES.rows.map((row) => (
            <Row key={row.cls} row={row} />
          ))}
          <Row row={FARES.general} />
        </ul>
        <p className="fare-total">
          <span>{UI.fareTotal}</span>
          <strong>{FARES.total}</strong>
        </p>
        <p className="fare-perks">{FARES.perks}</p>
      </div>
    </article>
  );
}
