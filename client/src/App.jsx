import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import GhostBrowsePage from './pages/ghost/GhostBrowsePage.jsx';
import GhostExperimentPage from './pages/ghost/GhostExperimentPage.jsx';
import StudentDashboard from './pages/student/StudentDashboard.jsx';
import ScanPage from './pages/student/ScanPage.jsx';
import SessionPage from './pages/student/SessionPage.jsx';
import LabsPage from './pages/admin/LabsPage.jsx';
import ExperimentsPage from './pages/admin/ExperimentsPage.jsx';
import ContentEditorPage from './pages/admin/ContentEditorPage.jsx';
import StudentsPage from './pages/admin/StudentsPage.jsx';
import AuditLogPage from './pages/admin/AuditLogPage.jsx';

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route path="/student/login" element={<LoginPage role="student" />} />
        <Route path="/admin/login" element={<LoginPage role="admin" />} />

        {/* Ghost mode — public */}
        <Route path="/ghost" element={<GhostBrowsePage />} />
        <Route path="/ghost/experiments/:id" element={<GhostExperimentPage />} />

        {/* Student */}
        <Route
          path="/student"
          element={
            <ProtectedRoute role="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/scan/:marker"
          element={
            <ProtectedRoute role="student">
              <ScanPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/sessions/:id"
          element={
            <ProtectedRoute role="student">
              <SessionPage />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route path="/admin" element={<Navigate to="/admin/labs" replace />} />
        <Route
          path="/admin/labs"
          element={
            <ProtectedRoute role="admin">
              <LabsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/labs/:labId/experiments"
          element={
            <ProtectedRoute role="admin">
              <ExperimentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/experiments/:experimentId/content"
          element={
            <ProtectedRoute role="admin">
              <ContentEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/students"
          element={
            <ProtectedRoute role="admin">
              <StudentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <ProtectedRoute role="admin">
              <AuditLogPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
