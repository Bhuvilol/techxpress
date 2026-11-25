import {
  HeartPulse, Sprout, Leaf, Cpu, Briefcase, Scale, Lightbulb, Shapes,
} from 'lucide-react';

// Domains grouped into a handful of themes, used by the Problem Statements
// page and the registration form's domain picker. Domains are matched by
// name; any domain an organizer adds later that isn't listed here lands in
// "Other" (add it to a theme below to place it).

export const THEMES = [
  { id: 'health', label: 'Health & Life Sciences', icon: HeartPulse, domains: [
    'Healthcare & Medical Technology', 'Pharmaceutical Innovation', 'Nursing & Patient Care',
    'Mental Health & Wellness', 'Dental Healthcare', 'Public Health Systems', 'Veterinary & Animal Welfare',
  ] },
  { id: 'agri', label: 'Agriculture, Food & Rural', icon: Sprout, domains: [
    'Agriculture & Smart Farming', 'Food Technology', 'Rural Development',
  ] },
  { id: 'env', label: 'Environment & Climate', icon: Leaf, domains: [
    'Environmental Sustainability', 'Climate & Green Technology',
  ] },
  { id: 'tech', label: 'Technology & Innovation', icon: Cpu, domains: [
    'Artificial Intelligence', 'Cybersecurity & Digital Safety', 'IoT & Smart Devices',
    'Productivity & Workflow Automation', 'Smart Campus Solutions', 'Research & Innovation',
  ] },
  { id: 'biz', label: 'Business & Commerce', icon: Briefcase, domains: [
    'Business & Finance', 'Marketing & Consumer Experience', 'E-Commerce & Retail',
    'Hospitality & Tourism', 'Supply Chain & Logistics',
  ] },
  { id: 'society', label: 'Society, Law & Education', icon: Scale, domains: [
    'Legal Technology', 'Education Technology', 'Social Impact & Community Development',
    'Women Safety & Empowerment', 'Accessibility & Inclusion',
  ] },
  { id: 'open', label: 'Open Innovation', icon: Lightbulb, domains: ['Open Innovation'] },
];
export const OTHER = { id: 'other', label: 'Other', icon: Shapes, domains: [] };

const themeByDomain = new Map(THEMES.flatMap((t) => t.domains.map((d) => [d, t])));

// Theme for a domain name.
export const themeForDomain = (name) => themeByDomain.get(name) ?? OTHER;
