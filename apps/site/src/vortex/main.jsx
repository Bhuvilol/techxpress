import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import '@fontsource/noto-sans-devanagari/700.css';
import { App } from './App.jsx';
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
