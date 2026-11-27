import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PORTAL_EVENT } from './portal.js';
import { prefersLessMotion } from '../lib/station.js';

// Warm light from an opening coach door fills the screen, then the view
// scrolls horizontally into VORTEX on the same site.
export default function DoorTransition() {
  const [phase, setPhase] = useState(null); // null | 'door' | 'fade'
  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    const onGo = () => {
      const less = prefersLessMotion();
      setPhase(less ? 'fade' : 'door');
      timer = setTimeout(() => {
        setPhase(null);
        navigate('/vortex');
      }, less ? 150 : 600);
    };
    const onShow = () => {
      clearTimeout(timer);
      setPhase(null);
    };
    window.addEventListener(PORTAL_EVENT, onGo);
    window.addEventListener('pageshow', onShow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(PORTAL_EVENT, onGo);
      window.removeEventListener('pageshow', onShow);
    };
  }, [navigate]);

  if (!phase) return null;
  return (
    <div className={`txp-door txp-door--${phase}`} aria-hidden="true">
      <div className="txp-door-light" />
      <div className="txp-door-leaf txp-door-leaf--l" />
      <div className="txp-door-leaf txp-door-leaf--r" />
    </div>
  );
}
