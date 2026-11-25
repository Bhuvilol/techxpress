import { EVENT, LABELS, TIMETABLE, UI } from '../../content/station.js';

// A printed railway timetable: ruled columns, day headers, key junctions in
// bold with a junction mark.
export default function Timetable({ titleId }) {
  return (
    <article className="m-timetable">
      <header className="tt-head" data-grab>
        <p className="tt-head-train">{EVENT.trainNo} · {EVENT.trainName}</p>
        <h2 id={titleId} tabIndex={-1} className="tt-head-title">
          <span lang="hi" className="tt-head-hindi">{LABELS.timetable.hindi}</span>
          <span>{LABELS.timetable.english}</span>
        </h2>
        <p className="tt-head-note">{LABELS.timetable.hint}</p>
      </header>
      <div className="paper paper--timetable">
        <section aria-labelledby="tt-pre">
          <h3 id="tt-pre" className="tt-day">{UI.preDepartureTitle}</h3>
          <ol className="tt-pre">
            {TIMETABLE.preDeparture.map((s) => (
              <li key={s.title} className={s.key ? 'is-key' : undefined}>
                <span className="tt-pre-date">{s.date}</span>
                <span className="tt-pre-title">{s.title}</span>
                <span className="tt-pre-detail">{s.detail}</span>
              </li>
            ))}
          </ol>
        </section>
        {TIMETABLE.days.map((day) => (
          <table key={day.id} className="tt-table">
            <caption className="tt-day">{day.title}</caption>
            <thead>
              <tr>
                <th scope="col">{UI.timetableCols.time}</th>
                <th scope="col">{UI.timetableCols.event}</th>
                <th scope="col">{UI.timetableCols.venue}</th>
              </tr>
            </thead>
            <tbody>
              {day.stops.map((stop) => (
                <tr key={stop.time + stop.title} className={stop.key ? 'is-key' : undefined}>
                  <td className="tt-time">{stop.time}</td>
                  <td className="tt-event">
                    <span className="tt-junction" aria-hidden="true" />
                    {stop.title}
                  </td>
                  <td className="tt-venue">{stop.venue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    </article>
  );
}
