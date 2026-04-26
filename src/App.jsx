import { useEffect } from 'react';
import Lenis from 'lenis';
import TrainScene from './components/TrainScene';

export default function App() {
  useEffect(() => {
    // Initialize Lenis for smooth momentum scrolling
    const lenis = new Lenis({
      autoRaf: true,
    });

    return () => {
      lenis.destroy();
    };
  }, []);

  return <TrainScene />;
}
