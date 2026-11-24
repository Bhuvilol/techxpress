// Build-time feature flags (Vite inlines import.meta.env at build time).

// Admin → Testing (bulk test-data import). The API only mounts its route when
// ENABLE_TESTING_IMPORT=true, so the page stays hidden unless the portal is
// built with VITE_ENABLE_TESTING=true as well. Off in production.
export const TESTING_ENABLED = import.meta.env.VITE_ENABLE_TESTING === 'true';
