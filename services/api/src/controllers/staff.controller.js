import { staffService } from '../services/staff.service.js';

export const list = async (_req, res) => {
  const staff = await staffService.list();
  // Contains login codes: never cache, in the browser or anywhere between.
  res.set('Cache-Control', 'no-store');
  res.json({ count: staff.length, staff });
};
