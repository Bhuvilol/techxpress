import {
  Sprout, FlaskConical, Zap, HeartPulse, Hospital, Scale, Briefcase, Cog, Shapes,
} from 'lucide-react';

// Sections on the Problem Statements page, one per TechXpress 2026 domain
// (services/api/prisma/data/taxonomy.json). Domains are matched by name; a
// domain added later that isn't listed here lands in "Other" until it is
// added below.

export const THEMES = [
  { id: 'agri', label: 'Agriculture', icon: Sprout, domains: ['Agriculture'] },
  { id: 'biotech', label: 'Biotechnology & Pharmacy', icon: FlaskConical, domains: ['Biotechnology & Pharmacy'] },
  { id: 'electrical', label: 'Electrical', icon: Zap, domains: ['Electrical'] },
  { id: 'health', label: 'Health', icon: HeartPulse, domains: ['Health'] },
  { id: 'hospital', label: 'Hospital Management', icon: Hospital, domains: ['Hospital Management'] },
  { id: 'law', label: 'Law', icon: Scale, domains: ['Law'] },
  { id: 'management', label: 'Management', icon: Briefcase, domains: ['Management'] },
  { id: 'mechanical', label: 'Mechanical', icon: Cog, domains: ['Mechanical'] },
];
export const OTHER = { id: 'other', label: 'Other', icon: Shapes, domains: [] };

const themeByDomain = new Map(THEMES.flatMap((t) => t.domains.map((d) => [d, t])));

// Theme for a domain name.
export const themeForDomain = (name) => themeByDomain.get(name) ?? OTHER;
