import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { can } from '../permissions/rbac';

/**
 * Route wrapper that verifies whether the current authenticated user
 * has permission to access a specific route or action.
 * Redirects to /dashboard if unauthorized.
 */
export default function RoleProtectedRoute({ action, children }) {
  const { currentUser } = useApp();

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if (action && !can(currentUser, action)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
