export const homePathForRole = (role) => {
  if (role === 'ADMIN') return '/vortex/admin';
  if (role === 'JURY') return '/vortex/jury';
  if (role === 'COORDINATOR') return '/vortex/coordinator';
  return '/vortex/dashboard';
};
