import { Navigate, Route, Routes } from 'react-router-dom';
import PanoramicWorld from './ui/PanoramicWorld.jsx';

export default function App() {
  return (
    <Routes>
      {/* Station panels legacy shortcuts */}
      <Route path="/register" element={<Navigate to="/#book" replace />} />
      <Route path="/about" element={<Navigate to="/#about" replace />} />
      <Route path="/timeline" element={<Navigate to="/#timetable" replace />} />
      <Route path="/ask" element={<Navigate to="/#faq" replace />} />

      {/* VORTEX shortcut routes */}
      <Route path="/login" element={<Navigate to="/vortex/login" replace />} />
      <Route path="/dashboard" element={<Navigate to="/vortex/dashboard" replace />} />
      <Route path="/teams" element={<Navigate to="/vortex/teams" replace />} />
      <Route path="/leaderboard" element={<Navigate to="/vortex/leaderboard" replace />} />
      <Route path="/awards" element={<Navigate to="/vortex/awards" replace />} />
      <Route path="/problem-statements" element={<Navigate to="/vortex/problem-statements" replace />} />
      <Route path="/directory" element={<Navigate to="/vortex/directory" replace />} />
      <Route path="/jury" element={<Navigate to="/vortex/jury" replace />} />
      <Route path="/admin" element={<Navigate to="/vortex/admin" replace />} />
      <Route path="/coordinator" element={<Navigate to="/vortex/coordinator" replace />} />

      {/* Panoramic Unified Frontend hosting Station (0vw) and VORTEX (100vw) */}
      <Route path="/*" element={<PanoramicWorld />} />
    </Routes>
  );
}
