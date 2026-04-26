import { useEffect, useState } from 'react';
import Lenis from 'lenis';
import TrainScene from './components/TrainScene';
import InteriorScene from './components/InteriorScene';

export default function App() {
  const [scene, setScene] = useState('station'); // 'station' | 'interior'

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
    <>
      {scene === 'station' ? (
        <TrainScene onComplete={() => setScene('interior')} />
      ) : (
        <InteriorScene />
      )}
    </>
  );
}
