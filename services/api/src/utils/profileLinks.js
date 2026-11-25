// Checks that a student's profile links point at the right site.
//
// Each check takes a full link (with https://). It must use http or https,
// be on the right host (or a subdomain of it), and have the right path shape.
// The form adds https:// before sending (see apps/site and apps/portal), so
// a bare "linkedin.com/in/x" is rejected here.

const parse = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u : null;
  } catch {
    return null;
  }
};

// "linkedin.com" and "www.linkedin.com", but not "evil-linkedin.com".
const onHost = (u, host) => u.hostname === host || u.hostname.endsWith(`.${host}`);

// GitHub usernames: letters, digits and single hyphens, 1 to 39 characters.
const GITHUB_USER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

export const isLinkedInProfile = (value) => {
  const u = parse(value);
  return Boolean(u && onHost(u, 'linkedin.com') && /^\/in\/[^/]+\/?$/i.test(u.pathname));
};

export const isGitHubProfile = (value) => {
  const u = parse(value);
  // Only github.com itself, not gist.github.com or other subdomains.
  if (!u || !['github.com', 'www.github.com'].includes(u.hostname)) return false;
  const [user, ...rest] = u.pathname.split('/').filter(Boolean);
  return Boolean(user && GITHUB_USER.test(user) && rest.length === 0);
};

// A Drive file link: /file/d/<id>/... Folder links are not a resume.
export const isDriveFileLink = (value) => {
  const u = parse(value);
  return Boolean(u && onHost(u, 'drive.google.com') && /^\/file\/d\/[^/]+/.test(u.pathname));
};
