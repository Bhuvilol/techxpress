import { useState, useMemo } from 'react';
import './SeatNavigation.css';
import { Link } from 'react-router-dom';

/**
 * SeatNavigation Component
 * Pins a digital UI to the physical screen in the train's interior artwork.
 *
 * @param {boolean} isVisible - Whether the screen UI is active
 */
export default function SeatNavigation({ isVisible, onNavigate }) {
  // Calibration Coordinates (Trial & Error starting points)
  // These are % relative to the 8360x4705 image
  const [coords, setCoords] = useState({
    top: 34.5,
    left: 35.2,
    width: 17.5,
    height: 22.0
  });

  const navButtons = [
    { id: 'about', img: '/assets/about_wbg.png', path: '/about' },
    { id: 'register', img: '/assets/register_wbg.png', path: '/register' },
    { id: 'ask', img: '/assets/ask_rajesh_wbg.png', path: '/ask' }
  ];

  if (!isVisible) return null;

  return (
    <div className="seat-navigation-layer">
      <div className="coordinate-match-system">
        <div
          className="seat-screen-container"
          style={{
            top: `${coords.top}%`,
            left: `${coords.left}%`,
            width: `${coords.width}%`,
            height: `${coords.height}%`
          }}
        >
          {/* Digital Navigation Interface */}
          <div className="seat-screen-ui image-nav">
            <div className="screen-grid">
              {navButtons.map(btn => (
                <Link
                  key={btn.id}
                  to={btn.path}
                  className="screen-btn"
                  onClick={() => console.log(`[SeatNavigation] Link clicked: ${btn.id}`)}
                  onMouseEnter={() => console.log(`[SeatNavigation] Hovering over: ${btn.id}`)}
                >
                  <img src={btn.img} alt={btn.id} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
