// "Log in to VORTEX" links: the portal is a separate app, so it is a full
// page load. A plain left click plays the coach-door transition first
// (DoorTransition listens for this event); modified clicks behave normally.
export const PORTAL_URL = '/vortex/login';
export const PORTAL_EVENT = 'txp:portal';

export function goToPortal(event) {
  if (event && (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
  event?.preventDefault();
  window.dispatchEvent(new CustomEvent(PORTAL_EVENT));
}
