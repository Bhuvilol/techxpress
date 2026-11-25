import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Lenis from 'lenis';
import TrainScene from './components/TrainScene';
import InteriorScene from './components/InteriorScene';
import AboutPage from './components/content/AboutPage';
import RegisterPage from './components/content/RegisterPage';
import AskRajesh from './components/content/AskRajesh';
import TimelinePage from './components/content/TimelinePage';

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
        <Route
          path="/interior"
          element={<InteriorScene onNavigate={(path) => navigate(`/${path}`)} />}
        />

        {/* Destination Content Pages */}
        <Route path="/about" element={<AboutPage onBack={() => navigate('/interior')} />} />
        <Route path="/register" element={<RegisterPage onBack={() => navigate('/interior')} />} />
        <Route path="/ask" element={<AskRajesh onBack={() => navigate('/interior')} />} />
        <Route path="/timeline" element={<TimelinePage onBack={() => navigate('/interior')} />} />
      </Routes>
    </div>
  );
}
