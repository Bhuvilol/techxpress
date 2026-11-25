import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { compressImage } from '../../utils/imageCompress';
import { normalizeRegistrationNo } from '../../utils/registrationNo';
import {
  FIELD_LABELS,
  INITIAL_FORM,
  FIELD_ORDER,
  URL_FIELDS,
  URL_EXAMPLES,
  buildSubmitPayload,
  normalizeUrl,
  validateRegistration,
} from '../../utils/registrationForm';
import './ContentPages.css';

const CONTRIBUTION_AREA_OPTIONS = [
  'Research & Documentation',
  'Problem Solving',
  'Idea Generation & Innovation',
  'Technical Development',
  'UI / UX Design',
  'Graphic Design',
  'Presentation & Pitching',
  'Public Speaking',
  'Content Writing',
  'Data Analysis',
  'Business Strategy',
  'Marketing & Outreach',
  'Project Coordination',
  'Leadership & Team Management',
  'Healthcare Knowledge',
  'Clinical Understanding',
  'Pharmaceutical Knowledge',
  'Legal Understanding',
  'Agricultural Knowledge',
  'Animal Care Knowledge',
  'Financial Planning',
  'Operations Management',
  'Hospitality Coordination',
  'Community Engagement',
  'Social Impact Planning',
  'Event Coordination',
  'Cybersecurity Awareness',
  'AI / Technology Awareness',
  'Field Research',
  'User Research',
  'Communication & Collaboration',
];

const TEAM_ROLE_OPTIONS = [
  'Developer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'AI/ML Engineer',
  'Cybersecurity Specialist',
  'UI/UX Designer',
  'Researcher',
  'Healthcare Specialist',
  'Pharmaceutical Researcher',
  'Legal Advisor',
  'Business Strategist',
  'Marketing Lead',
  'Financial Analyst',
  'Operations Coordinator',
  'Hospitality Coordinator',
  'Agriculture Domain Expert',
  'Veterinary Domain Expert',
  'Presentation Lead',
  'Content Writer',
  'Project Manager',
  'Team Leader',
  'Product Strategist',
  'Data Analyst',
  'Innovation Lead',
  'Open to Any Role',
];

const DEGREE_OPTIONS = [
  'Undergraduate',
  'Postgraduate',
  'Doctoral / Research',
  'Diploma',
  'Other',
];


const toggleListValue = (list, value) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

const focusField = (key) => {
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-field="${key}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.querySelector('input:not([tabindex="-1"]), select, textarea, button')?.focus({ preventScroll: true });
  });
};

function FieldWrap({ field, label, required, hint, error, children, fullWidth = false }) {
  return (
    <div data-field={field} className={`input-group ${fullWidth ? 'reg-span-2' : ''} ${error ? 'has-error' : ''}`}>
      <label>
        {label}
        {required && <span className="req-star"> *</span>}
      </label>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

function IdCardUpload({ value, onChange, onError, disabled }) {
  const inputRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [info, setInfo] = useState('');

  const handlePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setProcessing(true);
    try {
      const { dataUrl, bytes } = await compressImage(file);
      onChange(dataUrl);
      setInfo(`${file.name} · ${Math.max(1, Math.round(bytes / 1024))} KB ready`);
    } catch (err) {
      onError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="idcard-upload-box">
      <button
        type="button"
        className="idcard-preview-btn"
        onClick={() => inputRef.current?.click()}
        disabled={processing || disabled}
        aria-label={value ? 'Change college ID card photo' : 'Upload college ID card photo'}
      >
        {processing ? (
          <span className="idcard-status-txt">PROCESSING...</span>
        ) : value ? (
          <img src={value} alt="College ID card preview" className="idcard-preview-img" />
        ) : (
          <div className="idcard-placeholder">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="9" cy="10" r="2" />
              <path d="M15 8h2M15 12h2M7 16h10" />
            </svg>
            <span>UPLOAD ID</span>
          </div>
        )}
      </button>

      <div className="idcard-meta">
        <p>
          Upload a clear photo or scan of the <strong>front of your college ID card</strong> showing your name and photo.
          Only organizers and campus coordinators see it during verification.
        </p>
        <span className="idcard-file-info">{info || 'JPG, PNG, or WebP · Auto-resized under 1.5 MB.'}</span>
        <button
          type="button"
          className="reg-secondary-btn"
          onClick={() => inputRef.current?.click()}
          disabled={processing || disabled}
        >
          {value ? 'CHANGE PHOTO' : 'CHOOSE PHOTO'}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="sr-only-input"
        onChange={handlePick}
      />
    </div>
  );
}

export default function RegisterPage({ onBack }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [bannerError, setBannerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const [institutions, setInstitutions] = useState([]);
  const [domains, setDomains] = useState([]);
  const [registrationClosed, setRegistrationClosed] = useState(false);
  const [taxonomyLoading, setTaxonomyLoading] = useState(true);
  const [taxonomyError, setTaxonomyError] = useState('');

  const fetchMetadata = useCallback(async () => {
    const [instRes, domRes, statusRes] = await Promise.all([
      api.get('/api/taxonomy/institutions'),
      api.get('/api/taxonomy/domains'),
      api.get('/api/registration/status').catch(() => ({ open: true })),
    ]);
    return {
      institutions: instRes?.institutions ?? [],
      domains: domRes?.domains ?? [],
      registrationClosed: statusRes?.open === false,
    };
  }, []);

  const loadMetadata = useCallback(async () => {
    setTaxonomyLoading(true);
    setTaxonomyError('');
    try {
      const data = await fetchMetadata();
      setInstitutions(data.institutions);
      setDomains(data.domains);
      setRegistrationClosed(data.registrationClosed);
    } catch (err) {
      setTaxonomyError(err.message || 'Unable to connect to the TechXpress registration API.');
    } finally {
      setTaxonomyLoading(false);
    }
  }, [fetchMetadata]);

  useEffect(() => {
    let active = true;
    fetchMetadata()
      .then((data) => {
        if (!active) return;
        setInstitutions(data.institutions);
        setDomains(data.domains);
        setRegistrationClosed(data.registrationClosed);
      })
      .catch((err) => {
        if (!active) return;
        setTaxonomyError(err.message || 'Unable to connect to the TechXpress registration API.');
      })
      .finally(() => {
        if (active) setTaxonomyLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchMetadata]);

  const sortedDomains = useMemo(
    () => [...domains].sort((a, b) => a.name.localeCompare(b.name)),
    [domains],
  );

  const clearError = (...keys) => {
    setErrors((prev) => {
      if (!keys.some((k) => prev[k])) return prev;
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });
    if (bannerError) setBannerError('');
  };

  const setField = (key) => (e) => {
    const raw = e.target.value;
    const value = key === 'registrationNo' ? normalizeRegistrationNo(raw) : raw;
    setForm((prev) => ({ ...prev, [key]: value }));
    clearError(key);
  };

  const toggleContribution = (area) => {
    setForm((prev) => {
      const exists = prev.contributionAreas.includes(area);
      if (!exists && prev.contributionAreas.length >= 12) return prev;
      return { ...prev, contributionAreas: toggleListValue(prev.contributionAreas, area) };
    });
    clearError('contributionAreas');
  };

  const toggleDomain = (domainId) => {
    setForm((prev) => {
      const next = toggleListValue(prev.preferredDomains, domainId).slice(0, 4);
      return { ...prev, preferredDomains: next, domainId: next[0] ?? '' };
    });
    clearError('preferredDomains', 'domainId');
  };

  const handleNormalizeUrl = (key) => () => {
    setForm((prev) => ({ ...prev, [key]: normalizeUrl(prev[key]) }));
  };

  const reportErrors = (errs) => {
    setErrors(errs);
    const keys = FIELD_ORDER.filter((k) => errs[k]);
    const first = keys[0] ?? Object.keys(errs)[0];
    const count = Object.keys(errs).length;
    setBannerError(
      count === 1
        ? `${FIELD_LABELS[first] ?? 'Field'}: ${errs[first]}`
        : `Please fix ${count} highlighted fields — starting with ${FIELD_LABELS[first] ?? 'the first error'}.`,
    );
    focusField(first === 'domainId' ? 'preferredDomains' : first);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy || registrationClosed) return;

    const normalized = { ...form };
    for (const key of URL_FIELDS) normalized[key] = normalizeUrl(normalized[key]);
    setForm(normalized);

    const clientErrors = validateRegistration(normalized);
    if (Object.keys(clientErrors).length) {
      reportErrors(clientErrors);
      return;
    }

    setErrors({});
    setBannerError('');
    setBusy(true);

    try {
      const res = await api.post('/api/registration', buildSubmitPayload(normalized));
      const selectedInstitution = institutions.find((i) => i.id === normalized.institutionId)?.name ?? '';
      const primaryDomain = domains.find((d) => d.id === normalized.domainId)?.name ?? '';
      setSubmitted({
        response: res,
        registrationNo: normalized.registrationNo,
        institutionName: selectedInstitution,
        primaryDomain,
      });
    } catch (err) {
      if (err.code === 'VALIDATION_ERROR') {
        const fieldErrs = err.details?.body ?? err.details ?? {};
        const flat = {};
        for (const [key, value] of Object.entries(fieldErrs)) {
          flat[key] = Array.isArray(value) ? value[0] : String(value);
        }
        reportErrors(flat);
      } else if (err.code === 'CONFLICT') {
        const field = err.details?.field;
        const msg =
          field === 'email'
            ? 'This email is already registered. Wait for verification or contact the organizers.'
            : field === 'registrationNo'
              ? 'This registration number is already registered. Check for typos or contact the organizers.'
              : err.message;
        if (field) reportErrors({ [field]: msg });
        else setBannerError(msg);
      } else if (err.code === 'REGISTRATION_CLOSED') {
        setRegistrationClosed(true);
        setBannerError(err.message);
      } else {
        setBannerError(err.message || 'Registration submission failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    const user = submitted.response?.user;
    return (
      <div className="content-page register-page" data-lenis-prevent>
        <button className="back-btn" onClick={onBack}>← BACK TO SEAT</button>
        <div className="content-container animate-slide-up">
          <div className="register-form-box register-success-card glass">
            <div className="reg-board-banner">
              <span className="reg-banner-train" aria-hidden="true">🎫</span>
              <span className="reg-banner-title">EXPEDITION BOARDING PASS</span>
              <span className="reg-banner-sub">PENDING REVIEW</span>
            </div>
            <header className="form-header">
              <h2>REGISTRATION QUEUED</h2>
              <p>{submitted.response?.message || 'Registration submitted. Awaiting organizer verification.'}</p>
            </header>

            <div className="boarding-summary-grid">
              <div className="summary-cell">
                <span className="summary-label">PASSENGER</span>
                <strong className="summary-val">{user?.fullName || form.fullName}</strong>
              </div>
              <div className="summary-cell">
                <span className="summary-label">EMAIL</span>
                <strong className="summary-val">{user?.email || form.email}</strong>
              </div>
              <div className="summary-cell">
                <span className="summary-label">REGD. NUMBER</span>
                <strong className="summary-val highlight-cyan">{submitted.registrationNo}</strong>
              </div>
              {submitted.institutionName && (
                <div className="summary-cell">
                  <span className="summary-label">INSTITUTION</span>
                  <strong className="summary-val">{submitted.institutionName}</strong>
                </div>
              )}
              {submitted.primaryDomain && (
                <div className="summary-cell">
                  <span className="summary-label">PRIMARY DOMAIN</span>
                  <strong className="summary-val">{submitted.primaryDomain}</strong>
                </div>
              )}
              {user?.id && (
                <div className="summary-cell">
                  <span className="summary-label">PASSENGER REF</span>
                  <strong className="summary-val code-mono">{user.id}</strong>
                </div>
              )}
            </div>

            <div className="ticket-status-note">
              Your profile and college ID card are now in the verification queue. Once approved by campus coordinators or organizers, your login credentials will be sent to your email.
            </div>

            <div className="ticket-actions">
              <button type="button" className="submit-btn" onClick={onBack}>
                RETURN TO COMPARTMENT
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-page register-page" data-lenis-prevent>
      <button className="back-btn" onClick={onBack}>← BACK TO SEAT</button>

      <div className="content-container animate-slide-up">
        <div className="register-form-box register-portal-box glass">
          <div className="reg-board-banner">
            <span className="reg-banner-train" aria-hidden="true">🚂</span>
            <span className="reg-banner-title">TECHXPRESS STUDENT REGISTRATION</span>
            <span className="reg-banner-sub">CARRIAGE Nº 4</span>
          </div>

          <header className="form-header">
            <h2>JOIN THE <span>JOURNEY</span></h2>
            <p>Initialize your TechXpress passenger credentials for verification, team discovery, and boarding.</p>
          </header>

          {registrationClosed && (
            <div className="reg-alert reg-alert-warn">
              Registration is currently closed. Please check back later or contact the organizers.
            </div>
          )}

          {taxonomyError && (
            <div className="reg-alert reg-alert-error">
              <span>{taxonomyError}</span>
              <button type="button" className="reg-retry-btn" onClick={loadMetadata}>
                RETRY CONNECTION
              </button>
            </div>
          )}

          {bannerError && (
            <div className="reg-alert reg-alert-error" role="alert">
              {bannerError}
            </div>
          )}

          <form className="premium-form" onSubmit={handleSubmit} noValidate>
            {/* Honeypot against automated bots */}
            <div aria-hidden="true" className="honeypot-field">
              <label>
                Website
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={setField('website')}
                />
              </label>
            </div>

            {/* 01. Identity */}
            <section className="reg-section">
              <div className="reg-section-head">
                <span className="reg-step-num">01</span>
                <div>
                  <h3>PASSENGER IDENTITY</h3>
                  <p>Required credentials and institutional ID card verification.</p>
                </div>
              </div>

              <div className="reg-grid">
                <FieldWrap field="fullName" label="FULL NAME" required error={errors.fullName}>
                  <input
                    type="text"
                    placeholder="John Doe"
                    maxLength={120}
                    value={form.fullName}
                    onChange={setField('fullName')}
                    disabled={busy}
                  />
                </FieldWrap>

                <FieldWrap field="email" label="EMAIL ADDRESS" required error={errors.email}>
                  <input
                    type="email"
                    placeholder="name@college.edu"
                    value={form.email}
                    onChange={setField('email')}
                    disabled={busy}
                  />
                </FieldWrap>

                <FieldWrap
                  field="registrationNo"
                  label="REGISTRATION NUMBER"
                  required
                  hint="Issued by your institution (auto-formatted)."
                  error={errors.registrationNo}
                >
                  <input
                    type="text"
                    placeholder="2024PS12345"
                    maxLength={50}
                    value={form.registrationNo}
                    onChange={setField('registrationNo')}
                    disabled={busy}
                  />
                </FieldWrap>

                <FieldWrap field="phone" label="PHONE NUMBER" error={errors.phone}>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="9876543210"
                    maxLength={10}
                    value={form.phone}
                    onChange={setField('phone')}
                    disabled={busy}
                  />
                </FieldWrap>

                <FieldWrap field="gender" label="GENDER" required error={errors.gender}>
                  <select value={form.gender} onChange={setField('gender')} disabled={busy}>
                    <option value="" disabled>Select gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other / Prefer not to say</option>
                  </select>
                </FieldWrap>

                <FieldWrap field="idCard" label="COLLEGE ID CARD PHOTO" required error={errors.idCard} fullWidth>
                  <IdCardUpload
                    value={form.idCard}
                    onChange={(dataUrl) => {
                      setForm((prev) => ({ ...prev, idCard: dataUrl }));
                      clearError('idCard');
                    }}
                    onError={(msg) => setErrors((prev) => ({ ...prev, idCard: msg }))}
                    disabled={busy}
                  />
                </FieldWrap>
              </div>
            </section>

            {/* 02. Academic */}
            <section className="reg-section">
              <div className="reg-section-head">
                <span className="reg-step-num">02</span>
                <div>
                  <h3>ACADEMIC STATION</h3>
                  <p>Institution, preferred domains (up to 4), and academic standing.</p>
                </div>
              </div>

              <div className="reg-grid">
                <FieldWrap field="institutionId" label="INSTITUTION" required error={errors.institutionId}>
                  <select
                    value={form.institutionId}
                    onChange={setField('institutionId')}
                    disabled={busy || taxonomyLoading}
                  >
                    <option value="">
                      {taxonomyLoading ? 'Loading institutions...' : 'Select institution...'}
                    </option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                </FieldWrap>

                <FieldWrap field="degree" label="DEGREE" required error={errors.degree}>
                  <select value={form.degree} onChange={setField('degree')} disabled={busy}>
                    <option value="">Select degree...</option>
                    {DEGREE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </FieldWrap>

                <FieldWrap
                  field="yearSemester"
                  label="YEAR / SEMESTER"
                  required
                  error={errors.yearSemester}
                  fullWidth
                >
                  <input
                    type="text"
                    placeholder="3rd Year / Semester 6"
                    maxLength={80}
                    value={form.yearSemester}
                    onChange={setField('yearSemester')}
                    disabled={busy}
                  />
                </FieldWrap>

                <FieldWrap
                  field="preferredDomains"
                  label="PREFERRED DOMAINS (PICK 1 TO 4)"
                  required
                  hint="Your #1 pick is your primary domain for qualification and team matching."
                  error={errors.preferredDomains ?? errors.domainId}
                  fullWidth
                >
                  {taxonomyLoading ? (
                    <div className="pill-loading">Loading domains from station registry...</div>
                  ) : (
                    <div className="reg-pill-grid">
                      {sortedDomains.map((dom) => {
                        const rank = form.preferredDomains.indexOf(dom.id);
                        const active = rank !== -1;
                        const atCap = !active && form.preferredDomains.length >= 4;
                        return (
                          <button
                            key={dom.id}
                            type="button"
                            disabled={busy || atCap}
                            aria-pressed={active}
                            className={`reg-pill ${active ? 'active' : ''}`}
                            onClick={() => toggleDomain(dom.id)}
                          >
                            <span>{dom.name}</span>
                            {active && <span className="pill-rank">#{rank + 1}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </FieldWrap>
              </div>
            </section>

            {/* 03. Skills & Contribution */}
            <section className="reg-section">
              <div className="reg-section-head">
                <span className="reg-step-num">03</span>
                <div>
                  <h3>SKILLS &amp; CREW ROLE</h3>
                  <p>How you contribute on board and your preferred team role.</p>
                </div>
              </div>

              <div className="reg-grid">
                <FieldWrap
                  field="contributionAreas"
                  label="CONTRIBUTION AREAS (PICK AT LEAST 1, UP TO 12)"
                  required
                  error={errors.contributionAreas}
                  fullWidth
                >
                  <div className="reg-pill-grid">
                    {CONTRIBUTION_AREA_OPTIONS.map((area) => {
                      const active = form.contributionAreas.includes(area);
                      const atCap = !active && form.contributionAreas.length >= 12;
                      return (
                        <button
                          key={area}
                          type="button"
                          disabled={busy || atCap}
                          aria-pressed={active}
                          className={`reg-pill ${active ? 'active' : ''}`}
                          onClick={() => toggleContribution(area)}
                        >
                          {area}
                        </button>
                      );
                    })}
                  </div>
                </FieldWrap>

                <FieldWrap
                  field="preferredTeamRole"
                  label="PREFERRED TEAM ROLE"
                  required
                  error={errors.preferredTeamRole}
                  fullWidth
                >
                  <select value={form.preferredTeamRole} onChange={setField('preferredTeamRole')} disabled={busy}>
                    <option value="">Select preferred role...</option>
                    {TEAM_ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </FieldWrap>

                <FieldWrap
                  field="technicalSkills"
                  label="TECHNICAL SKILLS"
                  hint="Optional — stack, tools, labs, platforms (max 500 chars)."
                  error={errors.technicalSkills}
                >
                  <textarea
                    rows={3}
                    maxLength={500}
                    placeholder="React, Node.js, Python, Figma, SQL, Embedded..."
                    value={form.technicalSkills}
                    onChange={setField('technicalSkills')}
                    disabled={busy}
                  />
                </FieldWrap>

                <FieldWrap
                  field="nonTechnicalSkills"
                  label="NON-TECHNICAL SKILLS"
                  hint="Optional — pitching, leadership, research, outreach (max 500 chars)."
                  error={errors.nonTechnicalSkills}
                >
                  <textarea
                    rows={3}
                    maxLength={500}
                    placeholder="Leadership, communication, product strategy, documentation..."
                    value={form.nonTechnicalSkills}
                    onChange={setField('nonTechnicalSkills')}
                    disabled={busy}
                  />
                </FieldWrap>
              </div>
            </section>

            {/* 04. Profiles & Experience (Optional) */}
            <section className="reg-section">
              <div className="reg-section-head">
                <span className="reg-step-num">04</span>
                <div>
                  <h3>PROFILES &amp; WORK (OPTIONAL)</h3>
                  <p>Share any links, projects, or prior participation you want evaluators to see.</p>
                </div>
              </div>

              <div className="reg-grid">
                <FieldWrap field="linkedinUrl" label="LINKEDIN PROFILE" error={errors.linkedinUrl}>
                  <input
                    type="text"
                    inputMode="url"
                    placeholder="https://linkedin.com/in/..."
                    value={form.linkedinUrl}
                    onChange={setField('linkedinUrl')}
                    onBlur={handleNormalizeUrl('linkedinUrl')}
                    disabled={busy}
                  />
                </FieldWrap>

                <FieldWrap field="githubUrl" label="GITHUB / TECHNICAL PROFILE" error={errors.githubUrl}>
                  <input
                    type="text"
                    inputMode="url"
                    placeholder="https://github.com/..."
                    value={form.githubUrl}
                    onChange={setField('githubUrl')}
                    onBlur={handleNormalizeUrl('githubUrl')}
                    disabled={busy}
                  />
                </FieldWrap>

                <FieldWrap
                  field="resumeDriveLink"
                  label="RESUME / CV DRIVE LINK"
                  hint="Paste a shared Google Drive link."
                  error={errors.resumeDriveLink}
                >
                  <input
                    type="text"
                    inputMode="url"
                    placeholder="https://drive.google.com/..."
                    value={form.resumeDriveLink}
                    onChange={setField('resumeDriveLink')}
                    onBlur={handleNormalizeUrl('resumeDriveLink')}
                    disabled={busy}
                  />
                </FieldWrap>

                <FieldWrap field="researchPublicationUrl" label="PUBLICATION LINK" error={errors.researchPublicationUrl}>
                  <input
                    type="text"
                    inputMode="url"
                    placeholder="https://doi.org/..."
                    value={form.researchPublicationUrl}
                    onChange={setField('researchPublicationUrl')}
                    onBlur={handleNormalizeUrl('researchPublicationUrl')}
                    disabled={busy}
                  />
                </FieldWrap>

                <FieldWrap
                  field="certificationsAchievements"
                  label="CERTIFICATIONS / LICENSES"
                  error={errors.certificationsAchievements}
                >
                  <textarea
                    rows={3}
                    maxLength={1500}
                    placeholder="Licenses, certifications, fellowships..."
                    value={form.certificationsAchievements}
                    onChange={setField('certificationsAchievements')}
                    disabled={busy}
                  />
                </FieldWrap>

                <FieldWrap field="projectInitiative" label="PROJECT / INITIATIVE" error={errors.projectInitiative}>
                  <textarea
                    rows={3}
                    maxLength={1500}
                    placeholder="Startup, project, society, or initiative you are building..."
                    value={form.projectInitiative}
                    onChange={setField('projectInitiative')}
                    disabled={busy}
                  />
                </FieldWrap>

                <FieldWrap
                  field="participationExperience"
                  label="PARTICIPATION EXPERIENCE"
                  error={errors.participationExperience}
                  fullWidth
                >
                  <textarea
                    rows={3}
                    maxLength={1500}
                    placeholder="Competitions, moot courts, case challenges, paper presentations, community work..."
                    value={form.participationExperience}
                    onChange={setField('participationExperience')}
                    disabled={busy}
                  />
                </FieldWrap>
              </div>
            </section>

            {/* 05. Bio & Background */}
            <section className="reg-section">
              <div className="reg-section-head">
                <span className="reg-step-num">05</span>
                <div>
                  <h3>PASSENGER BRIEFING</h3>
                  <p>Bio is required; achievements and hackathon experience are optional.</p>
                </div>
              </div>

              <div className="reg-grid">
                <FieldWrap
                  field="bio"
                  label="SHORT BIO"
                  required
                  hint={`${form.bio.length}/1000 characters`}
                  error={errors.bio}
                  fullWidth
                >
                  <textarea
                    rows={4}
                    maxLength={1000}
                    placeholder="Tell us what you build, study, care about, and the kind of team you want to join."
                    value={form.bio}
                    onChange={setField('bio')}
                    disabled={busy}
                  />
                </FieldWrap>

                <FieldWrap field="achievements" label="ACHIEVEMENTS" error={errors.achievements}>
                  <textarea
                    rows={3}
                    maxLength={1500}
                    placeholder="Highlight work or awards you are proud of..."
                    value={form.achievements}
                    onChange={setField('achievements')}
                    disabled={busy}
                  />
                </FieldWrap>

                <FieldWrap field="hackathonExperience" label="HACKATHON EXPERIENCE" error={errors.hackathonExperience}>
                  <textarea
                    rows={3}
                    maxLength={1500}
                    placeholder="Prior hackathons, roles, outcomes..."
                    value={form.hackathonExperience}
                    onChange={setField('hackathonExperience')}
                    disabled={busy}
                  />
                </FieldWrap>
              </div>
            </section>

            <div className="reg-submit-footer">
              <p>
                By submitting, you agree to organizer verification of your college ID and TechXpress event guidelines.
              </p>
              <button
                type="submit"
                className="submit-btn highlight-btn"
                disabled={busy || registrationClosed || taxonomyLoading}
              >
                {busy ? 'ISSUING BOARDING REQUEST...' : 'SUBMIT STUDENT REGISTRATION'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
