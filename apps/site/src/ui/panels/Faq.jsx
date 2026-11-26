import { EVENT, FAQ, UI } from '../../content/station.js';

// The enquiry counter: a plate over the window, questions as slips that open.
export default function Faq({ titleId }) {
  return (
    <article className="m-faq">
      <header className="enquiry-plate" data-grab>
        <h2 id={titleId} tabIndex={-1} className="enquiry-plate-title">
          <span lang="hi" className="enquiry-plate-hindi">{UI.enquiryPlate.hindi}</span>
          <span className="enquiry-plate-sep" aria-hidden="true">/</span>
          <span>{UI.enquiryPlate.english}</span>
        </h2>
        <p className="enquiry-plate-sub">{UI.enquiryTitle}</p>
      </header>
      <div className="paper paper--counter">
        <div className="faq-list">
          {FAQ.map((item, i) => (
            <details key={item.q} className="faq-item">
              <summary>
                <span className="faq-token" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <span className="faq-q">{item.q}</span>
                <span className="faq-chevron" aria-hidden="true" />
              </summary>
              <p className="faq-a">{item.a}</p>
            </details>
          ))}
        </div>
        <p className="faq-contact">
          <a href={`mailto:${EVENT.contactEmail}`}>{EVENT.contactEmail}</a>
        </p>
      </div>
    </article>
  );
}
