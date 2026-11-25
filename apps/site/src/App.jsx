import { Navigate, Route, Routes } from 'react-router-dom';
import Station from './scene/Station.jsx';

// One page. Old routes from the previous site land on the matching object.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Station />} />
      <Route path="/register" element={<Navigate to="/#book" replace />} />
      <Route path="/about" element={<Navigate to="/#about" replace />} />
      <Route path="/timeline" element={<Navigate to="/#timetable" replace />} />
      <Route path="/ask" element={<Navigate to="/#faq" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
