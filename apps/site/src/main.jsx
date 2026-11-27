import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import '@fontsource/noto-sans-devanagari/700.css';
import './styles/base.css';
import App from './App.jsx';

// Back from VORTEX (its "TechXpress Station" link): finish the slide.
try {
  if (sessionStorage.getItem('txp:slide') === 'back') {
    sessionStorage.removeItem('txp:slide');
    document.documentElement.classList.add('txp-from-portal');
    setTimeout(() => document.documentElement.classList.remove('txp-from-portal'), 600);
  }
} catch { /* private mode */ }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
