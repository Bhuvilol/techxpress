// Panels live in the URL hash (#about, #book, ...), so a phone's back button
// closes the open panel and a shared link opens the right one.
//
// The rules, kept free of React and the DOM so they can be unit tested:
//   - opening a panel from the stage PUSHES a history entry marked as ours;
//   - opening a panel while another is open REPLACES the entry (back still
//     returns to the stage, not to the previous panel);
//   - closing goes BACK when the entry is ours, otherwise (the visitor landed
//     on /#faq from a link) it REPLACES the URL with the bare page, because
//     going back would leave the site.

export const PANELS = ['about', 'timetable', 'prizes', 'faq', 'pnr', 'countdown', 'book'];

// Marker stored in history state on entries this module pushed.
export const PUSHED_KEY = 'txpPanel';

// '#faq' / 'faq' / '#FAQ ' -> 'faq'; anything else -> null.
export const panelFromHash = (hash) => {
  const name = String(hash ?? '').replace(/^#/, '').trim().toLowerCase();
  return PANELS.includes(name) ? name : null;
};

export const isPushedByUs = (state) => Boolean(state && typeof state === 'object' && state[PUSHED_KEY]);

// What to do with history to show `next` when `current` is open.
// Returns { type: 'none' } | { type: 'push' | 'replace', hash, state }.
export const planOpen = (current, next, state) => {
  if (!PANELS.includes(next)) return { type: 'none' };
  if (current === next) return { type: 'none' };
  if (!current) return { type: 'push', hash: `#${next}`, state: { [PUSHED_KEY]: true } };
  // Keep the "ours" marker of the entry we are replacing.
  return { type: 'replace', hash: `#${next}`, state: { [PUSHED_KEY]: isPushedByUs(state) } };
};

// What to do with history to close the open panel.
export const planClose = (current, state) => {
  if (!current) return { type: 'none' };
  return isPushedByUs(state) ? { type: 'back' } : { type: 'replace', hash: '', state: null };
};

// Applies the plans to a history-like object:
//   { getHash(), getState(), push(hash, state), replace(hash, state), back() }
// (the React hook adapts react-router's navigate to this shape).
export const createPanelHistory = (h) => ({
  current: () => panelFromHash(h.getHash()),
  open(next) {
    const plan = planOpen(panelFromHash(h.getHash()), next, h.getState());
    if (plan.type === 'push') h.push(plan.hash, plan.state);
    else if (plan.type === 'replace') h.replace(plan.hash, plan.state);
    return plan.type;
  },
  close() {
    const plan = planClose(panelFromHash(h.getHash()), h.getState());
    if (plan.type === 'back') h.back();
    else if (plan.type === 'replace') h.replace(plan.hash, plan.state);
    return plan.type;
  },
});
