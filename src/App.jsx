import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import AppLayout from './components/layout/AppLayout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Assignments from './pages/Assignments';
import Subjects from './pages/Subjects';
import NoticeBoard from './pages/NoticeBoard';
import Notifications from './pages/Notifications';
import AIAssistant from './pages/AIAssistant';
import RoleProtectedRoute from './routes/RoleProtectedRoute';
import { ACTIONS } from './permissions/rbac';

export default function App() {
  return (
    <AppProvider>
      <Routes>
        {/* Public Landing */}
        <Route path="/" element={<LandingPage />} />

        {/* Authenticated Application */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/notices" element={<NoticeBoard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route
            path="/ai"
            element={
              <RoleProtectedRoute action={ACTIONS.AI_ACCESS}>
                <AIAssistant />
              </RoleProtectedRoute>
            }
          />
          <Route path="/settings" element={<Dashboard />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProvider>
  );
}
