import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Lenis from 'lenis';
import TrainScene from './components/TrainScene';
import InteriorScene from './components/InteriorScene';
import AboutPage from './components/content/AboutPage';
import AskRajesh from './components/content/AskRajesh';

// "Register" opens the VORTEX portal's home page. The portal is a separate app
// on the same domain, so going there is a full page load, not a client-side
// route change.
const REGISTER_PATH = '/vortex/';

function RegisterRedirect() {
  useEffect(() => {
    window.location.replace(REGISTER_PATH);
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
              window.location.assign(REGISTER_PATH);
              return;
            }
            navigate(`/${path}`);
          }} />
        } />

        {/* Destination Content Pages */}
        <Route path="/about" element={<AboutPage onBack={() => navigate('/interior')} />} />
        <Route path="/register" element={<RegisterRedirect />} />
        <Route path="/ask" element={<AskRajesh onBack={() => navigate('/interior')} />} />
      </Routes>
    </div>
  );
}
