import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MatchTrackerPage from './pages/MatchTrackerPage';
import ArchivePage from './pages/ArchivePage';

function App() {
  return (
    <BrowserRouter basename="/owtracker">
      <Routes>
        <Route path="/" element={<MatchTrackerPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
