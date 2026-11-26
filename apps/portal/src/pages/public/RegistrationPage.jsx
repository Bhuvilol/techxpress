import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  FileText,
  Github,
  IdCard,
  ImagePlus,
  Linkedin,
  Mail,
  Phone,
  School,
  User,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { useApi } from '../../hooks/useApi.js';
import { normalizeRegistrationNo } from '../../utils/registrationNo.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { ScrambleText } from '../../components/ui/ScrambleText.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { compressImage } from '../../utils/imageCompress.js';
import { DomainPicker } from '../../components/registration/DomainPicker.jsx';

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

const EMPTY = {
  fullName: '',
  email: '',
  registrationNo: '',
  idCard: '', // data URL of the shrunk ID card photo
  institutionId: '',
  domainId: '',
  preferredDomains: [],
  degree: '',
  phone: '',
  gender: '', // no default: a guessed value would feed the team gender rules
  yearSemester: '',
  contributionAreas: [],
  preferredTeamRole: '',
  technicalSkills: '',
  nonTechnicalSkills: '',
  linkedinUrl: '',
  githubUrl: '',
  resumeDriveLink: '',
  certificationsAchievements: '',
  researchPublicationUrl: '',
  projectInitiative: '',
  participationExperience: '',
  bio: '',
  achievements: '',
  hackathonExperience: '',
  website: '', // honeypot — hidden from humans; must stay empty
};

// ── Validation ────────────────────────────────────────────────────────────
// Clear, human messages for every rule the server enforces
// (backend/src/validators/registration.schema.js), checked before submit.

const URL_FIELDS = ['linkedinUrl', 'githubUrl', 'resumeDriveLink', 'researchPublicationUrl'];

const URL_EXAMPLES = {
  linkedinUrl: 'https://linkedin.com/in/yourname',
  githubUrl: 'https://github.com/yourname',
  resumeDriveLink: 'https://drive.google.com/file/d/…',
  researchPublicationUrl: 'https://doi.org/…',
};

// Order fields appear on the page — used to jump to the first problem.
const FIELD_ORDER = [
  'fullName', 'email', 'registrationNo', 'phone', 'gender', 'idCard',
  'institutionId', 'preferredDomains', 'domainId', 'yearSemester', 'degree',
  'contributionAreas', 'nonTechnicalSkills', 'technicalSkills', 'preferredTeamRole',
  'linkedinUrl', 'githubUrl', 'resumeDriveLink', 'researchPublicationUrl',
  'certificationsAchievements', 'projectInitiative', 'participationExperience',
  'bio', 'achievements', 'hackathonExperience',
];

const FIELD_LABELS = {
  fullName: 'Name', email: 'Email', registrationNo: 'Registration number', phone: 'Phone',
  gender: 'Gender', idCard: 'College ID card', institutionId: 'Institution', preferredDomains: 'Preferred domain',
  domainId: 'Preferred domain', yearSemester: 'Year / Semester', degree: 'Degree',
  contributionAreas: 'Contribution areas', preferredTeamRole: 'Preferred team role',
  technicalSkills: 'Technical skills', nonTechnicalSkills: 'Non-technical skills',
  linkedinUrl: 'LinkedIn profile', githubUrl: 'GitHub profile',
  resumeDriveLink: 'Resume link', researchPublicationUrl: 'Publication link',
  certificationsAchievements: 'Certifications', projectInitiative: 'Project / initiative',
  participationExperience: 'Participation experience', bio: 'Bio',
  achievements: 'Achievements', hackathonExperience: 'Hackathon experience',
};

// Same list as the server (services/api/src/validators/registration.schema.js).
const YEAR_SEMESTER_OPTIONS = [
  '1st Year / Semester 1',
  '1st Year / Semester 2',
  '2nd Year / Semester 3',
  '2nd Year / Semester 4',
  '3rd Year / Semester 5',
  '3rd Year / Semester 6',
  '4th Year / Semester 7',
  '4th Year / Semester 8',
  '5th Year / Semester 9',
  '5th Year / Semester 10',
  '6th Year / Semester 11',
  '6th Year / Semester 12',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const normalizeUrl = (value) => {
  const v = (value ?? '').trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
};

const isValidUrl = (value) => {
  try {
    const u = new URL(value);
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.') && value.length <= 500;
  } catch {
    return false;
  }
};

// Profile links must point at the right site. Same rules as the server
// (services/api/src/utils/profileLinks.js).
const parseLink = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u : null;
  } catch {
    return null;
  }
};
const onHost = (u, host) => u.hostname === host || u.hostname.endsWith(`.${host}`);
const GITHUB_USER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

const isLinkedInProfile = (value) => {
  const u = parseLink(value);
  return Boolean(u && onHost(u, 'linkedin.com') && /^\/in\/[^/]+\/?$/i.test(u.pathname));
};
const isGitHubProfile = (value) => {
  const u = parseLink(value);
  if (!u || !['github.com', 'www.github.com'].includes(u.hostname)) return false;
  const [user, ...rest] = u.pathname.split('/').filter(Boolean);
  return Boolean(user && GITHUB_USER.test(user) && rest.length === 0);
};
const isDriveFileLink = (value) => {
  const u = parseLink(value);
  return Boolean(u && onHost(u, 'drive.google.com') && /^\/file\/d\/[^/]+/.test(u.pathname));
};

// Each profile field: the check and the message shown when it fails.
const PROFILE_CHECKS = {
  linkedinUrl: { valid: isLinkedInProfile, message: 'LinkedIn' },
  githubUrl: { valid: isGitHubProfile, message: 'GitHub' },
  resumeDriveLink: { valid: isDriveFileLink, message: 'Google Drive file' },
};

const validateRegistration = (f) => {
  const e = {};
  const name = f.fullName.trim();
  if (name.length < 2) e.fullName = 'Enter your full name (at least 2 characters).';
  else if (name.length > 120) e.fullName = 'Name is too long — 120 characters at most.';

  const email = f.email.trim();
  if (!email) e.email = 'Email is required — your login details are sent here.';
  else if (!EMAIL_RE.test(email)) e.email = 'That doesn’t look like a valid email. Use the format name@college.edu.';

  const reg = f.registrationNo.trim();
  if (!reg) e.registrationNo = 'Registration number is required — use the one issued by your institution.';
  else if (reg.length > 50) e.registrationNo = 'Registration number is too long — 50 characters at most.';

  const phone = f.phone.trim();
  // Optional, but when given it must be exactly 10 digits (same rule as the server).
  if (phone && !/^\d{10}$/.test(phone)) e.phone = 'Phone number must be exactly 10 digits, with no spaces, dashes or +.';

  if (!f.gender) e.gender = 'Select your gender.';
  if (!f.idCard) e.idCard = 'Upload a photo of your college ID card.';
  if (!f.institutionId) e.institutionId = 'Select your institution from the list.';
  if (f.preferredDomains.length !== 4) e.preferredDomains = 'Pick exactly 4 domains. Your first pick is your primary domain.';
  if (!YEAR_SEMESTER_OPTIONS.includes(f.yearSemester)) e.yearSemester = 'Select your year / semester.';
  if (!f.degree) e.degree = 'Select your degree.';
  if (!f.contributionAreas.length) e.contributionAreas = 'Pick at least one area you can contribute to.';
  if (!f.preferredTeamRole) e.preferredTeamRole = 'Select the role you’d like to play in a team.';
  if (f.technicalSkills.length > 500) e.technicalSkills = 'Keep technical skills under 500 characters.';
  if (f.nonTechnicalSkills.length > 500) e.nonTechnicalSkills = 'Keep non-technical skills under 500 characters.';

  for (const key of URL_FIELDS) {
    if (!f[key]) continue;
    const profile = PROFILE_CHECKS[key];
    if (profile) {
      if (!profile.valid(f[key])) e[key] = `Enter your ${profile.message} link, e.g. ${URL_EXAMPLES[key]}`;
    } else if (!isValidUrl(f[key])) {
      e[key] = `Enter a complete link, e.g. ${URL_EXAMPLES[key]}`;
    }
  }

  const bio = f.bio.trim();
  if (!bio) e.bio = 'Bio is required — a few lines about what you build, study or care about.';
  else if (bio.length > 1000) e.bio = `Bio is too long — ${bio.length}/1000 characters.`;

  for (const key of ['certificationsAchievements', 'projectInitiative', 'participationExperience', 'achievements', 'hackathonExperience']) {
    if (f[key].length > 1500) e[key] = `Too long — ${f[key].length}/1500 characters.`;
  }
  return e;
};

// Scroll the field into view and put the cursor in it.
const focusField = (key) => {
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-field="${key}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.querySelector('input:not([tabindex="-1"]), select, textarea, button')?.focus({ preventScroll: true });
  });
};

const sanitizePayload = (form) =>
  Object.fromEntries(
    Object.entries(form)
      .map(([key, value]) => {
        if (Array.isArray(value)) return [key, value.length ? value : undefined];
        return [key, value === '' ? undefined : value];
      })
      .filter(([, value]) => value !== undefined),
  );

const toggleListValue = (list, value) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

const Section = ({ number, title, children }) => (
  <section className="space-y-7 border-t border-white/5 pt-10 first:border-t-0 first:pt-0 md:space-y-8 md:pt-12">
    <div className="flex items-center gap-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center border border-white/15 bg-white/[0.04] font-mono text-[11px] font-bold text-white/70">
        {number}
      </div>
      <div className="space-y-1">
        <h2 className="font-sans text-[18px] font-black uppercase tracking-[0.16em] text-white md:text-[20px]">{title}</h2>
      </div>
    </div>
    {children}
  </section>
);

const requiredLabel = (text) => (
  <>
    {text}
    <span style={{ color: '#ef4444' }}> *</span>
  </>
);

const ChoiceGrid = ({ options, values, onToggle, columns = 'xl:grid-cols-3' }) => (
  <div className={`flex flex-wrap gap-2.5 md:gap-3 ${columns.includes('xl:grid-cols-4') ? 'xl:gap-3' : ''}`}>
    {options.map((option) => {
      const active = values.includes(option);
      return (
        <button
          key={option}
          type="button"
          className={`rounded-full border px-4 py-2.5 text-left font-mono text-[11px] leading-none transition-all ${
            active
              ? 'border-white bg-white text-black shadow-[0_0_0_1px_rgba(255,255,255,0.12)]'
              : 'border-white/12 bg-white/[0.03] text-white/78 hover:border-white/30 hover:bg-white/[0.05]'
          }`}
          onClick={() => onToggle(option)}
        >
          {option}
        </button>
      );
    })}
  </div>
);

// College ID card photo: pick or take a picture, shrink it in the browser,
// preview it. The value is a JPEG data URL (see utils/imageCompress.js).
const IdCardUpload = ({ value, onChange, onError }) => {
  const inputRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [info, setInfo] = useState('');

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    setProcessing(true);
    try {
      const { dataUrl, bytes } = await compressImage(file);
      onChange(dataUrl);
      setInfo(`${file.name} · ${Math.max(1, Math.round(bytes / 1024))} KB after resizing`);
    } catch (err) {
      onError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 border border-dashed border-white/15 bg-black p-4 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="grid h-32 w-full shrink-0 place-items-center overflow-hidden border border-white/10 bg-white/[0.03] transition-colors hover:border-white/30 sm:w-52"
        aria-label={value ? 'Change ID card photo' : 'Upload ID card photo'}
      >
        {processing ? <Spinner /> : value
          ? <img src={value} alt="Your ID card" className="h-full w-full object-contain" />
          : <ImagePlus size={28} strokeWidth={1.5} className="text-white/30" />}
      </button>
      <div className="min-w-0 space-y-2">
        <p className="font-sans text-[13px] leading-relaxed text-white/70">
          A clear photo or scan of the <span className="text-white">front of your college ID card</span>, showing your name and photo.
          Coordinators use it to verify you; only organizers can see it.
        </p>
        <p className="font-mono text-[11px] text-white/35">{info || 'JPG, PNG or WebP. Large photos are resized automatically.'}</p>
        <button type="button" className="ghost-button !py-2 !text-[11px]" onClick={() => inputRef.current?.click()} disabled={processing}>
          {value ? 'Change photo' : 'Choose photo'}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="hidden" onChange={pick} />
    </div>
  );
};

export const RegistrationPage = () => {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [errors, setErrors] = useState({});

  // Editing a field clears its error straight away.
  const clearError = (...keys) => setErrors((prev) => {
    if (!keys.some((k) => prev[k])) return prev;
    const next = { ...prev };
    keys.forEach((k) => delete next[k]);
    return next;
  });
  const set = (key) => (e) => {
    // Registration numbers are shown in their canonical form as you type
    // (no spaces, upper-case) — the same form the server stores.
    const value = key === 'registrationNo' ? normalizeRegistrationNo(e.target.value) : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    clearError(key);
  };
  const setList = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: toggleListValue(prev[key], value) }));
    clearError(key);
  };
  const setPreferredDomain = (domainId) => {
    setForm((prev) => {
      const next = toggleListValue(prev.preferredDomains, domainId).slice(0, 4);
      return { ...prev, preferredDomains: next, domainId: next[0] ?? '' };
    });
    clearError('preferredDomains', 'domainId');
  };
  // Add https:// when someone types "linkedin.com/in/…".
  const normalizeUrlField = (key) => () => setForm((prev) => ({ ...prev, [key]: normalizeUrl(prev[key]) }));

  const { data: instData, loading: instLoading } = useApi(() => api.get('/api/taxonomy/institutions'), []);
  const { data: domData, loading: domLoading } = useApi(() => api.get('/api/taxonomy/domains'), []);
  const { data: regStatus } = useApi(() => api.get('/api/registration/status'), [], { refetchOnFocus: false });
  const registrationClosed = regStatus?.open === false;

  // Show every problem, then take the user to the first one.
  const reportErrors = (errs) => {
    setErrors(errs);
    const keys = FIELD_ORDER.filter((k) => errs[k]);
    const first = keys[0] ?? Object.keys(errs)[0];
    const n = Object.keys(errs).length;
    toast.error(
      n === 1
        ? `${FIELD_LABELS[first] ?? 'A field'}: ${errs[first]}`
        : `Please fix ${n} fields — starting with ${FIELD_LABELS[first] ?? 'the highlighted field'}.`,
      { ttl: 7000 },
    );
    focusField(first === 'domainId' ? 'preferredDomains' : first);
  };

  const submit = async (e) => {
    e.preventDefault();
    const normalized = { ...form };
    for (const key of URL_FIELDS) normalized[key] = normalizeUrl(normalized[key]);
    setForm(normalized);

    const clientErrors = validateRegistration(normalized);
    if (Object.keys(clientErrors).length) {
      reportErrors(clientErrors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const payload = sanitizePayload(normalized);
      if (form.preferredDomains.length) {
        payload.preferredDomains = form.preferredDomains;
        payload.domainId = form.preferredDomains[0];
      }
      const res = await api.post('/api/registration', payload);
      setDone(res);
      toast.success('Registration submitted. Awaiting campus or organizer verification.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err.code === 'VALIDATION_ERROR') {
        const fieldErrs = err.details?.body ?? err.details ?? {};
        const flat = {};
        for (const [key, value] of Object.entries(fieldErrs)) flat[key] = Array.isArray(value) ? value[0] : String(value);
        reportErrors(flat);
      } else {
        // Duplicates come back as one generic CONFLICT with no field name (by design).
        toast.error(err.message || 'Registration failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-xl flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 flex h-20 w-20 items-center justify-center border border-white/20 bg-white/5">
          <CheckCircle2 size={40} className="text-white" />
        </div>
        <h1 className="text-center font-sans text-[32px] font-black uppercase tracking-tight text-white">Registration Queued</h1>
        <p className="mt-4 max-w-md text-center font-mono text-[13px] leading-relaxed text-white/40">
          Your profile is now in review. Campus coordinators or organizers will verify the details and issue access after approval.
        </p>

        <div className="mt-8">
          <Badge tone="warn">Pending review</Badge>
        </div>

        <Link to="/" className="glow-button mt-12 flex items-center gap-3 px-10">
          <span>Return to control</span>
          <ArrowRight size={18} />
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-10 md:px-6 md:py-16 xl:py-20">
      <div className="flex flex-col items-center text-center">
        <div className="kicker mb-4 border border-white/20 px-3 py-1 text-white/60">
          <span className="h-1.5 w-1.5 bg-white" />
          New Operative
        </div>
        <h1 className="font-sans text-[42px] font-black text-white sm:text-[56px]">
          <ScrambleText text="REGISTRATION" duration={0.45} />
        </h1>
        <p className="mt-6 max-w-2xl font-mono text-[13px] leading-relaxed text-white/40">
          Build your Vortex profile for verification, team discovery, and collaboration. Domain and institution options are controlled by the organizers.
        </p>
      </div>

      {registrationClosed && (
        <div className="mt-10 border border-status-warn/40 bg-status-warn/5 px-5 py-4 text-center font-mono text-[13px] leading-relaxed text-status-warn">
          Registration is currently closed. Please check back later or contact the organizers.
        </div>
      )}

      <form onSubmit={submit} noValidate className="glass-card mt-12 space-y-12 border-white/10 bg-[#050505] p-5 sm:p-6 md:mt-14 md:space-y-14 md:p-8 xl:p-10">
        {/* Honeypot: off-screen, skipped by keyboard and screen readers.
            Bots that fill every input get silently discarded server-side. */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
          </label>
        </div>

        <Section number="01" title="Identity">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            <FormField field="fullName" label={requiredLabel('Name')} error={errors.fullName}>
              <div className="group relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-white" />
                <input className="input-glass !pl-14 h-12 border-white/10 bg-black transition-all focus:border-white" required minLength={2} maxLength={120} value={form.fullName} onChange={set('fullName')} placeholder="John Doe" />
              </div>
            </FormField>

            <FormField field="email" label={requiredLabel('Email')} error={errors.email}>
              <div className="group relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-white" />
                <input type="email" className="input-glass !pl-14 h-12 border-white/10 bg-black transition-all focus:border-white" required value={form.email} onChange={set('email')} placeholder="john@university.edu" />
              </div>
            </FormField>

            <FormField field="registrationNo" label={requiredLabel('Regd Number')} error={errors.registrationNo} hint="Use the registration number issued by your institution.">
              <div className="group relative">
                <IdCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-white" />
                <input className="input-glass !pl-14 h-12 border-white/10 bg-black transition-all focus:border-white" required maxLength={50} value={form.registrationNo} onChange={set('registrationNo')} placeholder="2024PS12345" />
              </div>
            </FormField>

            <FormField field="phone" label="Phone" error={errors.phone}>
              <div className="group relative">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-white" />
                <input className="input-glass !pl-14 h-12 border-white/10 bg-black transition-all focus:border-white" maxLength={10} inputMode="numeric" value={form.phone} onChange={set('phone')} placeholder="9876543210" />
              </div>
            </FormField>

            <FormField field="gender" label={requiredLabel('Gender')} error={errors.gender}>
              <div className="group relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-white" />
                <select className="select-glass !pl-14 h-12 border-white/10 bg-black transition-all focus:border-white" required value={form.gender} onChange={set('gender')}>
                  <option value="" disabled>Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other / prefer not to say</option>
                </select>
              </div>
            </FormField>

            <div className="md:col-span-2">
              <FormField field="idCard" label={requiredLabel('College ID Card')} error={errors.idCard}>
                <IdCardUpload
                  value={form.idCard}
                  onChange={(dataUrl) => { setForm((prev) => ({ ...prev, idCard: dataUrl })); clearError('idCard'); }}
                  onError={(msg) => setErrors((prev) => ({ ...prev, idCard: msg }))}
                />
              </FormField>
            </div>
          </div>
        </Section>

        <Section number="02" title="Academic">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            <FormField field="institutionId" label={requiredLabel('Institution')} error={errors.institutionId}>
              <div className="group relative">
                <School size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-white" />
                {instLoading ? (
                  <div className="input-glass !pl-14 flex h-12 items-center gap-2 text-white/40"><Spinner size={12} /> Loading...</div>
                ) : (
                  <select className="select-glass !pl-14 h-12 border-white/10 bg-black transition-all focus:border-white" required value={form.institutionId} onChange={set('institutionId')}>
                    <option value="">Select institution...</option>
                    {instData?.institutions.map((institution) => (
                      <option key={institution.id} value={institution.id}>{institution.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </FormField>

            <div className="md:col-span-2">
              <FormField
                field="domainId" label={requiredLabel('Preferred Domain')}
                field="preferredDomains"
                error={errors.domainId ?? errors.preferredDomains}
                hint="Pick exactly 4. Your first pick (#1) is your primary domain, used for team formation and qualification."
              >
                {domLoading ? (
                  <div className="input-glass flex h-12 items-center gap-2 text-white/40"><Spinner size={12} /> Loading...</div>
                ) : (
                  <DomainPicker
                    domains={domData?.domains ?? []}
                    value={form.preferredDomains}
                    max={4}
                    onToggle={setPreferredDomain}
                  />
                )}
              </FormField>
            </div>

            <FormField field="yearSemester" label={requiredLabel('Year / Semester')} error={errors.yearSemester}>
              <div className="group relative">
                <BookOpen size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-white" />
                <select className="select-glass !pl-14 h-12 border-white/10 bg-black transition-all focus:border-white" required value={form.yearSemester} onChange={set('yearSemester')}>
                  <option value="" disabled>Select year / semester</option>
                  {YEAR_SEMESTER_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </FormField>

            <FormField field="degree" label={requiredLabel('Degree')} error={errors.degree}>
              <div className="group relative">
                <School size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-white" />
                <select className="select-glass !pl-14 h-12 border-white/10 bg-black transition-all focus:border-white" required value={form.degree} onChange={set('degree')}>
                  <option value="">Select degree...</option>
                  {DEGREE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </FormField>
          </div>
        </Section>

        <Section number="03" title="Skills & Contribution">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            <div className="md:col-span-2">
              <FormField field="contributionAreas" label={requiredLabel('Contribution Areas')} error={errors.contributionAreas}>
                <ChoiceGrid options={CONTRIBUTION_AREA_OPTIONS} values={form.contributionAreas} onToggle={setList('contributionAreas')} columns="xl:grid-cols-4" />
              </FormField>
            </div>

            <FormField field="nonTechnicalSkills" label="Non-Technical Skills" error={errors.nonTechnicalSkills}>
              <textarea
                className="input-glass min-h-[120px] border-white/10 bg-black px-4 py-4 transition-all focus:border-white"
                maxLength={500}
                value={form.nonTechnicalSkills}
                onChange={set('nonTechnicalSkills')}
                placeholder="Leadership, communication, pitching, outreach, documentation..."
              />
            </FormField>

            <FormField field="technicalSkills" label="Technical Skills" error={errors.technicalSkills} hint="Optional free text. Stack, tools, methods, labs, platforms.">
              <textarea
                className="input-glass min-h-[120px] border-white/10 bg-black px-4 py-4 transition-all focus:border-white"
                maxLength={500}
                value={form.technicalSkills}
                onChange={set('technicalSkills')}
                placeholder="React, Node, Figma, Python, SQL, Prompting, Prototyping..."
              />
            </FormField>

            <FormField field="preferredTeamRole" label={requiredLabel('Preferred Team Role')} error={errors.preferredTeamRole}>
              <div className="group relative">
                <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-white" />
                <select className="select-glass !pl-14 h-12 border-white/10 bg-black transition-all focus:border-white" required value={form.preferredTeamRole} onChange={set('preferredTeamRole')}>
                  <option value="">Select role...</option>
                  {TEAM_ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </FormField>
          </div>
        </Section>

        <Section number="04" title="Profiles, Work & Achievements (Optional)">
          <div className="mb-1 px-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Add only what you have. Every field in this section is optional.
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            <FormField field="linkedinUrl" label="LinkedIn Profile" error={errors.linkedinUrl}>
              <div className="group relative">
                <Linkedin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-white" />
                <input type="text" inputMode="url" autoComplete="url" className="input-glass !pl-14 h-12 border-white/10 bg-black transition-all focus:border-white" value={form.linkedinUrl} onChange={set('linkedinUrl')} onBlur={normalizeUrlField('linkedinUrl')} placeholder="https://linkedin.com/in/..." />
              </div>
            </FormField>

            <FormField field="githubUrl" label="GitHub / Technical Profile" error={errors.githubUrl}>
              <div className="group relative">
                <Github size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-white" />
                <input type="text" inputMode="url" autoComplete="url" className="input-glass !pl-14 h-12 border-white/10 bg-black transition-all focus:border-white" value={form.githubUrl} onChange={set('githubUrl')} onBlur={normalizeUrlField('githubUrl')} placeholder="https://github.com/..." />
              </div>
            </FormField>

            <FormField field="resumeDriveLink" label="Resume / CV Drive Link" error={errors.resumeDriveLink} hint="Paste a shared Google Drive link instead of uploading a file.">
              <div className="group relative">
                <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-white" />
                <input type="text" inputMode="url" autoComplete="url" className="input-glass !pl-14 h-12 border-white/10 bg-black transition-all focus:border-white" value={form.resumeDriveLink} onChange={set('resumeDriveLink')} onBlur={normalizeUrlField('resumeDriveLink')} placeholder="https://drive.google.com/..." />
              </div>
            </FormField>

            <FormField field="researchPublicationUrl" label="Research Paper / Publication Link" error={errors.researchPublicationUrl}>
              <div className="group relative">
                <BookOpen size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-white" />
                <input type="text" inputMode="url" autoComplete="url" className="input-glass !pl-14 h-12 border-white/10 bg-black transition-all focus:border-white" value={form.researchPublicationUrl} onChange={set('researchPublicationUrl')} onBlur={normalizeUrlField('researchPublicationUrl')} placeholder="https://..." />
              </div>
            </FormField>

            <FormField field="certificationsAchievements" label="Certifications / Achievements" error={errors.certificationsAchievements}>
              <textarea
                className="input-glass min-h-[120px] border-white/10 bg-black px-4 py-4 transition-all focus:border-white"
                maxLength={1500}
                value={form.certificationsAchievements}
                onChange={set('certificationsAchievements')}
                placeholder="Licenses, certifications, awards, fellowships..."
              />
            </FormField>

            <FormField field="projectInitiative" label="Project / Startup / Initiative" error={errors.projectInitiative}>
              <textarea
                className="input-glass min-h-[120px] border-white/10 bg-black px-4 py-4 transition-all focus:border-white"
                maxLength={1500}
                value={form.projectInitiative}
                onChange={set('projectInitiative')}
                placeholder="Describe any startup, project, clinic, society, campaign, or initiative you are building."
              />
            </FormField>

            <div className="md:col-span-2">
              <FormField field="participationExperience" label="Participation Experience" error={errors.participationExperience}>
                <textarea
                  className="input-glass min-h-[120px] border-white/10 bg-black px-4 py-4 transition-all focus:border-white"
                  maxLength={1500}
                  value={form.participationExperience}
                  onChange={set('participationExperience')}
                  placeholder="Past hackathons, competitions, moot courts, case challenges, paper presentations, community work..."
                />
              </FormField>
            </div>
          </div>
        </Section>

        <Section number="05" title="About You">
          <div className="mb-1 px-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            Bio is required. The remaining fields in this section are optional.
          </div>
          <div className="grid grid-cols-1 gap-5 md:gap-6">
            <FormField field="bio" label={requiredLabel('Bio')} error={errors.bio} hint="Up to 1000 characters.">
              <textarea
                className="input-glass min-h-[140px] border-white/10 bg-black px-4 py-4 transition-all focus:border-white"
                required
                maxLength={1000}
                value={form.bio}
                onChange={set('bio')}
                placeholder="Tell us what you build, study, care about, and what kind of team you want to work with."
              />
            </FormField>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
              <FormField field="achievements" label="Achievements" error={errors.achievements}>
                <div className="group relative">
                  <Award size={18} className="absolute left-4 top-6 text-white/20 transition-colors group-focus-within:text-white" />
                  <textarea
                    className="input-glass !pl-14 min-h-[120px] border-white/10 bg-black py-4 transition-all focus:border-white"
                    maxLength={1500}
                    value={form.achievements}
                    onChange={set('achievements')}
                    placeholder="Highlight the work you are proud of."
                  />
                </div>
              </FormField>

              <FormField field="hackathonExperience" label="Hackathon Experience" error={errors.hackathonExperience}>
                <div className="group relative">
                  <Briefcase size={18} className="absolute left-4 top-6 text-white/20 transition-colors group-focus-within:text-white" />
                  <textarea
                    className="input-glass !pl-14 min-h-[120px] border-white/10 bg-black py-4 transition-all focus:border-white"
                    maxLength={1500}
                    value={form.hackathonExperience}
                    onChange={set('hackathonExperience')}
                    placeholder="Share prior hackathons, roles, outcomes, or what you learned."
                  />
                </div>
              </FormField>
            </div>
          </div>
        </Section>

        <div className="flex flex-col items-start justify-between gap-6 border-t border-white/5 pt-8 sm:flex-row sm:items-center md:gap-8 md:pt-10">
          <p className="max-w-sm font-mono text-[11px] uppercase tracking-wider text-white/20">
            By registering, you agree to the event rules, code of conduct, and organizer review of the submitted profile.
          </p>
          <button type="submit" disabled={busy || registrationClosed} className="glow-button flex h-14 w-full items-center justify-center gap-4 font-sans text-[15px] font-black uppercase tracking-[0.2em] sm:min-w-[280px] sm:w-auto">
            {busy ? <Spinner size={20} /> : (
              <>
                <span>Initialize Profile</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
};
