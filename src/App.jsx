import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Lenis from 'lenis';
import TrainScene from './components/TrainScene';
import InteriorScene from './components/InteriorScene';
import AboutPage from './components/content/AboutPage';
import AskRajesh from './components/content/AskRajesh';

const TICKETING_URL = 'https://vortex-app.bhuvism003.workers.dev/';

function TicketingRedirect() {
  useEffect(() => {
    window.location.replace(TICKETING_URL);
  }, []);

  return null;
}

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize Lenis for smooth momentum scrolling
    const lenis = new Lenis({
      autoRaf: true,
    });

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <div className="App">
      <Routes>
        {/* The train animation is always the entry point. */}
        <Route path="/" element={<TrainScene onComplete={() => navigate('/interior')} />} />
        <Route path="/interior" element={
          <InteriorScene onNavigate={(path) => {
            if (path === 'register') {
              window.location.assign(TICKETING_URL);
              return;
            }
            navigate(`/${path}`);
          }} />
        } />

        {/* Destination Content Pages */}
        <Route path="/about" element={<AboutPage onBack={() => navigate('/interior')} />} />
        <Route path="/register" element={<TicketingRedirect />} />
        <Route path="/ask" element={<AskRajesh onBack={() => navigate('/interior')} />} />
      </Routes>
    </div>
  );
}
