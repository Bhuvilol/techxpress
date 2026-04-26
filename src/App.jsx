import { useEffect, useState } from 'react';
import Lenis from 'lenis';
import TrainScene from './components/TrainScene';
import AboutPage from './components/content/AboutPage';
import RegisterPage from './components/content/RegisterPage';
import AskRajesh from './components/content/AskRajesh';

export default function App() {
  const [currentPage, setCurrentPage] = useState('journey');

  useEffect(() => {
    // Initialize Lenis for smooth momentum scrolling
    const lenis = new Lenis({
      autoRaf: true,
    });

    return () => {
      lenis.destroy();
    };
  }, []);

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="App">
      {currentPage === 'journey' && (
        <TrainScene onNavigate={handleNavigate} />
      )}

      {currentPage === 'about' && (
        <AboutPage onBack={() => setCurrentPage('journey')} />
      )}

      {currentPage === 'register' && (
        <RegisterPage onBack={() => setCurrentPage('journey')} />
      )}

      {currentPage === 'ask' && (
        <AskRajesh onBack={() => setCurrentPage('journey')} />
      )}
    </div>
  );
}
