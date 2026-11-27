import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import '@fontsource/noto-sans-devanagari/700.css';
import { App } from './App.jsx';

// Arriving from the station's slide: finish it (the page slides in the last
// few centimetres). Read once, then cleared.
try {
  if (sessionStorage.getItem('txp:slide') === 'in') {
    sessionStorage.removeItem('txp:slide');
    document.documentElement.classList.add('vortex-slide-in');
    setTimeout(() => document.documentElement.classList.remove('vortex-slide-in'), 700);
  }
} catch { /* private mode */ }
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ToastProvider } from './contexts/ToastContext.jsx';
import { BroadcastProvider } from './contexts/BroadcastContext.jsx';
import { ConfirmHost } from './components/ui/Confirm.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Served under /vortex on the TechXpress domain (see vite.config.js base). */}
    <BrowserRouter basename="/vortex">
      <ToastProvider>
        <AuthProvider>
          <BroadcastProvider>
            <App />
            <ConfirmHost />
          </BroadcastProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
