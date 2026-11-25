import React from 'react';
import './ContentPages.css';

const ABOUT_PARAGRAPHS = [
  "SOA TechXpress is an intra-university hackathon designed to bring together innovative minds, aspiring developers, problem-solvers and technology enthusiasts from eight different domains/campuses of Siksha 'O' Anusandhan.",
  'The event aims to establish a collaborative ecosystem where students can identify real-world challenges, exchange ideas, develop innovative solutions and transform concepts into working prototypes.',
  'By bringing together diverse academic backgrounds and technical expertise, TechXpress seeks to encourage interdisciplinary collaboration, creativity, technical excellence and practical problem-solving.',
  'More than just a competition, TechXpress is a platform to learn, connect, innovate and build solutions that can make a difference.',
];

const VISION_OBJECTIVES = [
  'Encourage innovation, creativity and entrepreneurial thinking among students.',
  'Promote interdisciplinary collaboration across all eight participating domains/campuses.',
  'Provide students with an opportunity to work on real-world challenges.',
  'Bridge the gap between theoretical knowledge and practical implementation.',
  'Encourage teamwork, leadership and technical problem-solving.',
  'Create opportunities for interaction between students, faculty members and industry professionals.',
  'Build a culture of innovation and technology-driven development within the SOA community.',
];

export default function AboutPage({ onBack }) {
  return (
    <div className="content-page about-page" data-lenis-prevent>
      <button className="back-btn" onClick={onBack}>← BACK TO SEAT</button>

      <div className="content-container animate-fade-in">
        <div className="station-board-sheet">
          <div className="reg-board-banner">
            <span className="reg-banner-train" aria-hidden="true">🚂</span>
            <span className="reg-banner-title">ABOUT TECHXPRESS</span>
            <span className="reg-banner-sub">CARRIAGE Nº 4</span>
          </div>

          <header className="page-header">
            <h1>SOA <span>TECHXPRESS</span></h1>
            <p className="subtitle">Siksha &apos;O&apos; Anusandhan · Intra-University Hackathon</p>
          </header>

          <section className="about-sections-stack">
            <article className="about-card">
              <div className="about-card-head">
                <span className="about-step-badge">01</span>
                <h3>ABOUT</h3>
              </div>
              <div className="about-paragraphs">
                {ABOUT_PARAGRAPHS.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </article>

            <article className="about-card">
              <div className="about-card-head">
                <span className="about-step-badge about-step-gold">02</span>
                <h3>OUR VISION &amp; OBJECTIVES</h3>
              </div>
              <p className="about-objectives-intro">Through SOA TechXpress, we aim to:</p>
              <ul className="about-objectives-list">
                {VISION_OBJECTIVES.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </article>
          </section>

          <footer className="page-footer">
            <p>© 2026 SOA TECHXPRESS · SIKSHA &apos;O&apos; ANUSANDHAN. ALL RIGHTS RESERVED.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
