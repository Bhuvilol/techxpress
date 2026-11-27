import { AuthProvider } from './contexts/AuthContext.jsx';
import { ToastProvider } from './contexts/ToastContext.jsx';
import { BroadcastProvider } from './contexts/BroadcastContext.jsx';
import { ConfirmHost } from './components/ui/Confirm.jsx';
import { VortexApp } from './App.jsx';
import './index.css';

export default function VortexWorld() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BroadcastProvider>
          <div className="vortex-root min-h-screen text-text-primary font-sans antialiased selection:bg-txp-yellow selection:text-txp-ink">
            <VortexApp />
            <ConfirmHost />
          </div>
        </BroadcastProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
