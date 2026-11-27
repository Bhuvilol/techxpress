import { useLocation } from 'react-router-dom';
import StationShell from './StationShell.jsx';
import VortexWorld from '../vortex/VortexWorld.jsx';
import '../styles/panorama.css';

export default function PanoramicWorld() {
  const location = useLocation();
  const path = location.pathname;

  const isVortex = path.startsWith('/vortex') ||
    path === '/login' ||
    path === '/dashboard' ||
    path === '/teams' ||
    path === '/leaderboard' ||
    path === '/awards' ||
    path === '/problem-statements' ||
    path === '/directory' ||
    path.startsWith('/admin') ||
    path.startsWith('/coordinator');

  return (
    <div className="txp-panoramic-viewport">
      <div className={`txp-panoramic-track ${isVortex ? 'is-vortex' : 'is-station'}`}>
        {/* ZONE 1: TECHXPRESS STATION */}
        <div className="txp-zone txp-zone--station" inert={isVortex ? '' : undefined}>
          <StationShell />
        </div>

        {/* ZONE 2: VORTEX PLATFORM & TERMINAL */}
        <div className="txp-zone txp-zone--vortex" inert={!isVortex ? '' : undefined}>
          <VortexWorld />
        </div>
      </div>

      {/* Atmospheric Railway Track Bed */}
      <div className="txp-panoramic-trackbed" />
    </div>
  );
}
